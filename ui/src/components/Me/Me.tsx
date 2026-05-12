import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useTenant } from '../../context/TenantContext';
import { useSubject } from '../../context/SubjectContext';
import { tenantApi, grantApi, grantRequestApi } from '../../services/api';
import { Tenant, Grant, GrantRequest } from '../../types';
import GrantRequestList from '../GrantRequestList/GrantRequestList';
import GrantRequestForm from '../GrantRequestForm/GrantRequestForm';
import './Me.css';

interface TenantWithAccess extends Tenant {
  hasAccess: boolean;
  grants: Grant[];
}

const Me: React.FC = () => {
  const [allTenants, setAllTenants] = useState<TenantWithAccess[]>([]);
  const [currentTenantGrants, setCurrentTenantGrants] = useState<Grant[]>([]);
  const [showRequestForm, setShowRequestForm] = useState(false);
  const [loading, setLoading] = useState(true);
  const { selectedTenant, setTenant } = useTenant();
  const { selectedSubject } = useSubject();
  const navigate = useNavigate();

  useEffect(() => {
    loadAllTenants();
  }, [selectedSubject]);

  useEffect(() => {
    if (selectedTenant && selectedSubject) {
      loadCurrentTenantGrants();
    }
  }, [selectedTenant, selectedSubject]);

  const loadAllTenants = async () => {
    if (!selectedSubject) {
      setAllTenants([]);
      setLoading(false);
      return;
    }

    try {
      setLoading(true);
      const tenants = await tenantApi.getAll();
      const tenantsWithAccessData: TenantWithAccess[] = [];

      for (const tenant of tenants) {
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

  const loadCurrentTenantGrants = async () => {
    if (!selectedTenant || !selectedSubject) {
      setCurrentTenantGrants([]);
      return;
    }

    try {
      const grants = await grantApi.getBySubject(selectedTenant.id, selectedSubject.uid);
      setCurrentTenantGrants(grants);
    } catch (err) {
      console.error('Failed to load current tenant grants:', err);
    }
  };

  const handleManageTenant = (tenant: Tenant) => {
    setTenant(tenant);
    navigate(`/tenants/${tenant.id}/policies`);
  };

  const handleRemoveGrant = async (grantUid: string) => {
    if (!selectedTenant) return;
    if (!window.confirm('Are you sure you want to remove this grant?')) return;

    try {
      await grantApi.delete(selectedTenant.id, grantUid);
      loadCurrentTenantGrants();
      loadAllTenants();
    } catch (err) {
      console.error('Failed to remove grant:', err);
    }
  };

  const handleRequestCreated = () => {
    if (selectedSubject && selectedTenant) {
      loadCurrentTenantGrants();
      loadAllTenants();
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
        <h3>Selected Tenant</h3>
        {selectedTenant ? (
          <div className="context-info">
            <p><strong>Name:</strong> {selectedTenant.name}</p>
            <p><strong>Schema:</strong> {selectedTenant.schema_name}</p>
            <p><strong>ID:</strong> {selectedTenant.id}</p>
          </div>
        ) : (
          <p className="no-context">No tenant selected</p>
        )}
      </div>

      {selectedTenant && selectedSubject && (
        <>
          <div className="context-card">
            <GrantRequestList
              schemaName={selectedTenant.schema_name}
              subjectUid={selectedSubject.uid}
              onRequestCreated={handleRequestCreated}
            />
          </div>

          <div className="context-card">
            <h3>Current Grants</h3>
            {currentTenantGrants.length === 0 ? (
              <p className="no-context">You have no grants in this tenant.</p>
            ) : (
              <div className="grant-grid">
                {currentTenantGrants.map((grant) => (
                  <div key={grant.uid} className="grant-card">
                    <p><strong>Path:</strong> {grant.path}</p>
                    <p><strong>Role UID:</strong> {grant.role_uid}</p>
                    <button
                      onClick={() => handleRemoveGrant(grant.uid)}
                      className="button button-danger"
                    >
                      Remove Grant
                    </button>
                  </div>
                ))}
              </div>
            )}
          </div>

          <div className="context-card">
            {showRequestForm ? (
              <>
                <div className="form-header">
                  <h3>Request New Grant</h3>
                  <button
                    onClick={() => setShowRequestForm(false)}
                    className="button"
                  >
                    Cancel
                  </button>
                </div>
                <GrantRequestForm
                  schemaName={selectedTenant.schema_name}
                  subjectUid={selectedSubject.uid}
                  onRequestCreated={() => {
                    handleRequestCreated();
                    setShowRequestForm(false);
                  }}
                />
              </>
            ) : (
              <button
                onClick={() => setShowRequestForm(true)}
                className="button button-primary"
              >
                Request New Grant
              </button>
            )}
          </div>
        </>
      )}

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
