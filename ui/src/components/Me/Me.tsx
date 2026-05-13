import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useTenant } from '../../context/TenantContext';
import { useSubject } from '../../context/SubjectContext';
import { tenantApi, grantApi, roleApi, resourceGroupApi, resourceApi as resourceServiceApi } from '../../services/api';
import { Tenant, Grant, Role, ResourceGroup, Resource } from '../../types';
import './Me.css';

interface TenantWithAccess extends Tenant {
  hasAccess: boolean;
  grants: Grant[];
}

const Me: React.FC = () => {
  const [allTenants, setAllTenants] = useState<TenantWithAccess[]>([]);
  const [tenants, setTenants] = useState<Tenant[]>([]);
  const [expandedTenants, setExpandedTenants] = useState<Set<string>>(new Set());
  const [resources, setResources] = useState<Record<string, Resource[]>>({});
  const [resourceGroups, setResourceGroups] = useState<Record<string, ResourceGroup[]>>({});
  const [roles, setRoles] = useState<Record<string, Role[]>>({});
  const [loading, setLoading] = useState(true);
  const [initialTenantSet, setInitialTenantSet] = useState(false);
  const { selectedTenant, setTenant } = useTenant();
  const { selectedSubject } = useSubject();
  const navigate = useNavigate();

  const isSubjectAdmin = selectedSubject
    ? tenants.some(t => t.admin_uid === selectedSubject.uid)
    : false;

  useEffect(() => {
    loadTenants();
    loadAllTenants();
  }, [selectedSubject]);

  useEffect(() => {
    // Load resources, resource groups, and roles for all tenants
    if (allTenants.length > 0) {
      loadTenantData();
    }
  }, [allTenants]);

  useEffect(() => {
    // Redirect non-admin subjects to /requests when tenant is selected
    // Only redirect after initial load to avoid redirecting on page load
    if (selectedTenant && selectedSubject && tenants.length > 0 && !isSubjectAdmin && initialTenantSet) {
      navigate('/requests');
    }
  }, [selectedTenant, selectedSubject, tenants, isSubjectAdmin, initialTenantSet, navigate]);

  useEffect(() => {
    // Mark that we've seen the initial tenant state
    if (selectedTenant) {
      setInitialTenantSet(true);
    }
  }, [selectedTenant]);

  const loadTenants = async () => {
    try {
      const data = await tenantApi.getAll();
      setTenants(data);
    } catch (err) {
      console.error('Failed to load tenants:', err);
    }
  };

  const loadTenantData = async () => {
    const resourcesData: Record<string, Resource[]> = {};
    const resourceGroupsData: Record<string, ResourceGroup[]> = {};
    const rolesData: Record<string, Role[]> = {};

    for (const tenant of allTenants) {
      try {
        const [resourcesRes, groupsRes, rolesRes] = await Promise.all([
          resourceServiceApi.getByTenant(tenant.id),
          resourceGroupApi.getByTenant(tenant.id),
          roleApi.getByTenant(tenant.id),
        ]);
        resourcesData[tenant.id] = resourcesRes;
        resourceGroupsData[tenant.id] = groupsRes;
        rolesData[tenant.id] = rolesRes;
      } catch (err) {
        console.error(`Failed to load data for tenant ${tenant.id}:`, err);
        resourcesData[tenant.id] = [];
        resourceGroupsData[tenant.id] = [];
        rolesData[tenant.id] = [];
      }
    }

    setResources(resourcesData);
    setResourceGroups(resourceGroupsData);
    setRoles(rolesData);
  };

  const loadAllTenants = async () => {
    if (!selectedSubject) {
      setAllTenants([]);
      setLoading(false);
      return;
    }

    try {
      setLoading(true);
      const tenantsData = await tenantApi.getAll();
      const tenantsWithAccessData: TenantWithAccess[] = [];

      for (const tenant of tenantsData) {
        try {
          const grants = await grantApi.getBySubject(tenant.id, selectedSubject.uid);
          tenantsWithAccessData.push({
            ...tenant,
            hasAccess: grants.length > 0,
            grants,
          });
        } catch (err) {
          // If grant check fails, assume no access
          console.error(`Failed to check grants for tenant ${tenant.id}:`, err);
          tenantsWithAccessData.push({
            ...tenant,
            hasAccess: false,
            grants: [],
          });
        }
      }

      // Sort: tenants with access first, then others
      tenantsWithAccessData.sort((a, b) => {
        if (a.hasAccess && !b.hasAccess) return -1;
        if (!a.hasAccess && b.hasAccess) return 1;
        return a.name.localeCompare(b.name);
      });

      setAllTenants(tenantsWithAccessData);
    } catch (err) {
      console.error('Failed to load tenants:', err);
    } finally {
      setLoading(false);
    }
  };

  const handleManageTenant = (tenant: Tenant) => {
    setTenant(tenant);
    // Non-admins go to /requests, admins go to grants
    if (isSubjectAdmin) {
      navigate(`/tenants/${tenant.id}/grants`);
    } else {
      navigate('/requests');
    }
  };

  const toggleExpand = (tenantId: string) => {
    setExpandedTenants(prev => {
      const newSet = new Set(prev);
      if (newSet.has(tenantId)) {
        newSet.delete(tenantId);
      } else {
        newSet.add(tenantId);
      }
      return newSet;
    });
  };

  const handleRevokeGrant = async (tenantId: string, grantUid: string) => {
    if (!window.confirm('Are you sure you want to revoke this grant?')) return;

    try {
      await grantApi.delete(tenantId, grantUid);
      // Reload the tenant data
      await loadAllTenants();
    } catch (err) {
      console.error('Failed to revoke grant:', err);
      alert('Failed to revoke grant. Please try again.');
    }
  };

  const getGrantDetails = (grant: Grant, tenantId: string) => {
    const tenantResources = resources[tenantId] || [];
    const tenantResourceGroups = resourceGroups[tenantId] || [];
    const tenantRoles = roles[tenantId] || [];

    const role = tenantRoles.find(r => r.uid === grant.role_uid);
    const resource = tenantResources.find(r => r.path === grant.path);
    const resourceGroup = tenantResourceGroups.find(rg => rg.path === grant.path);

    let resourceName: string | undefined;
    let resourceType: 'resource' | 'group' | undefined;

    if (resource) {
      resourceName = resource.name;
      resourceType = 'resource';
    } else if (resourceGroup) {
      resourceName = resourceGroup.name;
      resourceType = 'group';
    }

    return {
      roleName: role?.name || grant.role_uid,
      resourceName: resourceName || grant.path,
      resourceType: resourceType,
    };
  };

  if (!selectedSubject) {
    return (
      <div className="me">
        <h2>Current Context</h2>
        <p className="no-context">No subject selected. Please select a subject to act as.</p>
      </div>
    );
  }

  if (loading) {
    return <div className="loading">Loading...</div>;
  }

  return (
    <div className="me">
      <h2>Current Context</h2>

      <div className="context-card">
        <h3>All Tenants</h3>
        {allTenants.length === 0 ? (
          <p className="no-context">No tenants available.</p>
        ) : (
          <div className="tenant-grid">
            {allTenants.map((tenant) => (
              <div key={tenant.id} className={`tenant-card ${tenant.hasAccess ? 'has-access' : 'no-access'}`}>
                <div className="tenant-header">
                  <h3>{tenant.name}</h3>
                  {tenant.hasAccess && (
                    <span className="access-badge">Has Access</span>
                  )}
                </div>
                <p><strong>Schema:</strong> {tenant.schema_name}</p>
                <p><strong>ID:</strong> {tenant.id}</p>
                {tenant.hasAccess ? (
                  <>
                    <p><strong>Grants:</strong> {tenant.grants.length}</p>
                    {tenant.grants.length > 0 && (
                      <button
                        onClick={() => toggleExpand(tenant.id)}
                        className="button button-secondary"
                      >
                        {expandedTenants.has(tenant.id) ? 'Hide Grants' : 'Show Grants'}
                      </button>
                    )}
                    {expandedTenants.has(tenant.id) && tenant.grants.length > 0 && (
                      <div className="grants-list">
                        {tenant.grants.map((grant) => {
                          const details = getGrantDetails(grant, tenant.id);
                          return (
                            <div key={grant.uid} className="grant-item">
                              <div className="grant-info">
                                <span className="grant-resource">{details.resourceName}</span>
                                {details.resourceType && (
                                  <span className={`resource-type-badge ${details.resourceType}`}>
                                    {details.resourceType}
                                  </span>
                                )}
                                <span className="grant-role">{details.roleName}</span>
                              </div>
                              <button
                                onClick={() => handleRevokeGrant(tenant.id, grant.uid)}
                                className="button button-danger button-small"
                              >
                                Revoke
                              </button>
                            </div>
                          );
                        })}
                      </div>
                    )}
                  </>
                ) : (
                  <p className="no-access-text">No access - request access to manage this tenant</p>
                )}
                <button
                  onClick={() => handleManageTenant(tenant)}
                  className="button button-primary"
                >
                  {tenant.hasAccess ? 'Manage' : 'Request Access'}
                </button>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
};

export default Me;
