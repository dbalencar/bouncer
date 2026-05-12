import React, { useState, useEffect } from 'react';
import { grantRequestApi, roleApi, resourceGroupApi, resourceApi as resourceServiceApi } from '../../services/api';
import { GrantRequest, Role, ResourceGroup, Resource } from '../../types';
import './GrantRequestList.css';

interface GrantRequestListProps {
  schemaName: string;
  tenantId: string;
  subjectUid: string;
  onRequestDelete?: () => void;
}

interface GrantRequestWithDetails extends GrantRequest {
  roleName?: string;
  resourceName?: string;
  resourceType?: 'resource' | 'group';
}

const GrantRequestList: React.FC<GrantRequestListProps> = ({ schemaName, tenantId, subjectUid, onRequestDelete }) => {
  const [requests, setRequests] = useState<GrantRequestWithDetails[]>([]);
  const [roles, setRoles] = useState<Role[]>([]);
  const [resources, setResources] = useState<Resource[]>([]);
  const [resourceGroups, setResourceGroups] = useState<ResourceGroup[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    loadRequests();
    loadRoles();
    loadResourcesAndGroups();
  }, [schemaName, tenantId, subjectUid]);

  const loadRequests = async () => {
    try {
      setLoading(true);
      const data = await grantRequestApi.getBySubject(schemaName, subjectUid);
      
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
      
      setRequests(requestsWithDetails);
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

  const handleDelete = async (uid: string) => {
    if (!window.confirm('Are you sure you want to delete this grant request?')) return;

    try {
      await grantRequestApi.delete(schemaName, uid);
      loadRequests();
      if (onRequestDelete) onRequestDelete();
    } catch (err) {
      setError('Failed to delete grant request');
      console.error(err);
    }
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
                <button
                  onClick={() => handleDelete(request.uid)}
                  className="button button-danger"
                >
                  Delete Request
                </button>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
};

export default GrantRequestList;
