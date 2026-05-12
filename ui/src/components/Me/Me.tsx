import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useTenant } from '../../context/TenantContext';
import { useSubject } from '../../context/SubjectContext';
import { tenantApi, grantApi } from '../../services/api';
import { Tenant, Grant } from '../../types';
import './Me.css';

interface TenantWithAccess extends Tenant {
  hasAccess: boolean;
  grants: Grant[];
}

const Me: React.FC = () => {
  const [allTenants, setAllTenants] = useState<TenantWithAccess[]>([]);
  const [tenants, setTenants] = useState<Tenant[]>([]);
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
    // Redirect non-admin subjects to /access when tenant is selected
    // Only redirect after initial load to avoid redirecting on page load
    if (selectedTenant && selectedSubject && tenants.length > 0 && !isSubjectAdmin && initialTenantSet) {
      navigate('/access');
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
    // Non-admins go to /access, admins go to policies
    if (isSubjectAdmin) {
      navigate(`/tenants/${tenant.id}/policies`);
    } else {
      navigate('/access');
    }
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
        <h3>Acting As Subject</h3>
        {selectedSubject ? (
          <div className="context-info">
            <p><strong>Username:</strong> {selectedSubject.username}</p>
            <p><strong>Name:</strong> {selectedSubject.name}</p>
            <p><strong>Email:</strong> {selectedSubject.email}</p>
            <p><strong>UID:</strong> {selectedSubject.uid}</p>
          </div>
        ) : (
          <p className="no-context">No subject selected</p>
        )}
      </div>



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
                  <p><strong>Grants:</strong> {tenant.grants.length}</p>
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
