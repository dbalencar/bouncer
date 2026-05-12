import React, { useState, useEffect } from 'react';
import { grantRequestApi, roleApi, resourceGroupApi, resourceApi as resourceServiceApi, grantApi } from '../../services/api';
import { GrantRequest, Role, ResourceGroup, Resource, Grant } from '../../types';
import './GrantRequestList.css';

interface GrantRequestListProps {
  schemaName: string;
  tenantId: string;
  subjectUid: string;
  onRequestDelete?: () => void;
  onRequestCreated?: () => void;
}

interface GrantRequestWithDetails extends GrantRequest {
  roleName?: string;
  resourceName?: string;
  resourceType?: 'resource' | 'group';
  canApprove?: boolean;
}

const GrantRequestList: React.FC<GrantRequestListProps> = ({ schemaName, tenantId, subjectUid, onRequestDelete, onRequestCreated }) => {
  const [allRequests, setAllRequests] = useState<GrantRequestWithDetails[]>([]);
  const [requests, setRequests] = useState<GrantRequestWithDetails[]>([]);
  const [roles, setRoles] = useState<Role[]>([]);
  const [resources, setResources] = useState<Resource[]>([]);
  const [resourceGroups, setResourceGroups] = useState<ResourceGroup[]>([]);
  const [subjectGrants, setSubjectGrants] = useState<Grant[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    loadRequests();
    loadRoles();
    loadResourcesAndGroups();
    loadSubjectGrants();
  }, [schemaName, tenantId, subjectUid]);

  // Re-filter requests when roles or subjectGrants change
  useEffect(() => {
    if (allRequests.length > 0) {
      const filteredRequests = allRequests.filter(request => {
        const isOwnRequest = request.subject_uid === subjectUid;
        const canApprove = canApproveRequestHelper(request, subjectGrants, roles);
        return isOwnRequest || canApprove;
      });
      setRequests(filteredRequests);
    }
  }, [roles, subjectGrants, allRequests, subjectUid]);

  const loadRequests = async () => {
    try {
      setLoading(true);
      // Get all pending requests for the tenant
      const data = await grantRequestApi.getByTenant(schemaName, 'pending');
      
      // Enrich requests with resource/group and role details
      const requestsWithDetails: GrantRequestWithDetails[] = await Promise.all(
        data.map(async (request) => {
          try {
            // Load resources and groups
            const [resourcesData, groupsData] = await Promise.all([
              resourceServiceApi.getByTenant(tenantId),
              resourceGroupApi.getByTenant(tenantId),
            ]);
            
            // Load role
            const role = await roleApi.getByUid(tenantId, request.role_uid);
            
            // Match path to resource or group
            let resourceName: string | undefined;
            let resourceType: 'resource' | 'group' | undefined;
            
            const resource = resourcesData.find(r => r.path === request.path);
            if (resource) {
              resourceName = resource.name;
              resourceType = 'resource';
            } else {
              const group = groupsData.find(g => g.path === request.path);
              if (group) {
                resourceName = group.name;
                resourceType = 'group';
              }
            }
            
            return {
              ...request,
              roleName: role?.name,
              resourceName: resourceName,
              resourceType: resourceType,
            };
          } catch (err) {
            console.error(`Failed to enrich request ${request.uid}:`, err);
            return request;
          }
        })
      );
      
      setAllRequests(requestsWithDetails);
      setError(null);
    } catch (err) {
      setError('Failed to load grant requests');
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const loadRoles = async () => {
    try {
      const data = await roleApi.getByTenant(tenantId);
      setRoles(data);
    } catch (err) {
      console.error('Failed to load roles:', err);
    }
  };

  const loadResourcesAndGroups = async () => {
    try {
      const [resourcesData, groupsData] = await Promise.all([
        resourceServiceApi.getByTenant(tenantId),
        resourceGroupApi.getByTenant(tenantId),
      ]);
      setResources(resourcesData);
      setResourceGroups(groupsData);
    } catch (err) {
      console.error('Failed to load resources and groups:', err);
    }
  };

  const loadSubjectGrants = async () => {
    try {
      const data = await grantApi.getBySubject(tenantId, subjectUid);
      setSubjectGrants(data);
    } catch (err) {
      console.error('Failed to load subject grants:', err);
    }
  };

  const handleDelete = async (uid: string) => {
    if (!window.confirm('Are you sure you want to delete this grant request?')) return;

    try {
      await grantRequestApi.delete(schemaName, uid);
      await loadRequests();
      if (onRequestDelete) onRequestDelete();
    } catch (err) {
      setError('Failed to delete grant request');
      console.error(err);
    }
  };

  const handleApprove = async (uid: string) => {
    if (!window.confirm('Are you sure you want to approve this grant request?')) return;

    try {
      await grantRequestApi.approve(schemaName, uid, subjectUid);
      await loadRequests();
      if (onRequestCreated) onRequestCreated();
    } catch (err) {
      setError('Failed to approve grant request');
      console.error(err);
    }
  };

  const handleReject = async (uid: string) => {
    if (!window.confirm('Are you sure you want to reject this grant request?')) return;

    try {
      await grantRequestApi.reject(schemaName, uid, subjectUid);
      await loadRequests();
      if (onRequestCreated) onRequestCreated();
    } catch (err) {
      setError('Failed to reject grant request');
      console.error(err);
    }
  };

  const canApproveRequestHelper = (request: GrantRequestWithDetails, grants: Grant[], roleList: Role[]): boolean => {
    // Check if the subject has admin permission on the requested path
    for (const grant of grants) {
      // Check if the grant path matches or is a parent of the requested path
      if (request.path.startsWith(grant.path) || grant.path.startsWith(request.path)) {
        // Check if the grant's role has admin permission
        const role = roleList.find(r => r.uid === grant.role_uid);
        // For now, check if role name indicates admin permission
        // TODO: Check actual role permissions instead of role name
        if (role && (role.name === 'Application Owner' || role.name === 'Tenant Admin')) {
          return true;
        }
      }
    }
    return false;
  };

  const canApproveRequest = (request: GrantRequestWithDetails): boolean => {
    return canApproveRequestHelper(request, subjectGrants, roles);
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'pending':
        return '#ffc107';
      case 'approved':
        return '#28a745';
      case 'rejected':
        return '#dc3545';
      default:
        return '#6c757d';
    }
  };

  if (loading) return <div className="loading">Loading...</div>;

  return (
    <div className="grant-request-list">
      <h3>Grant Requests</h3>
      {error && <div className="error">{error}</div>}

      {requests.length === 0 ? (
        <p className="no-requests">No grant requests found.</p>
      ) : (
        <div className="request-grid">
          {requests.map((request) => (
            <div key={request.uid} className="request-card">
              <div className="request-header">
                <span className="request-resource">{request.resourceName || request.path}</span>
                {request.resourceType && (
                  <span className={`resource-type-badge ${request.resourceType}`}>
                    {request.resourceType}
                  </span>
                )}
                <span 
                  className="request-status" 
                  style={{ backgroundColor: getStatusColor(request.status) }}
                >
                  {request.status}
                </span>
              </div>
              <div className="request-details">
                <p><strong>Role:</strong> {request.roleName || request.role_uid}</p>
                <p><strong>Created:</strong> {new Date(request.created_at).toLocaleString()}</p>
                {request.status !== 'pending' && (
                  <p><strong>Updated:</strong> {new Date(request.updated_at).toLocaleString()}</p>
                )}
              </div>
              {request.status === 'pending' && (
                <div className="request-actions">
                  {canApproveRequest(request) && (
                    <>
                      <button
                        onClick={() => handleApprove(request.uid)}
                        className="button button-success"
                      >
                        Approve
                      </button>
                      <button
                        onClick={() => handleReject(request.uid)}
                        className="button button-danger"
                      >
                        Reject
                      </button>
                    </>
                  )}
                  {request.subject_uid === subjectUid && (
                    <button
                      onClick={() => handleDelete(request.uid)}
                      className="button button-danger"
                    >
                      Delete Request
                    </button>
                  )}
                </div>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
};

export default GrantRequestList;
