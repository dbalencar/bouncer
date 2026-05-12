import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useTenant } from '../../context/TenantContext';
import { useSubject } from '../../context/SubjectContext';
import { tenantApi, grantApi, grantRequestApi } from '../../services/api';
import { Tenant, Grant, GrantRequest } from '../../types';
import GrantRequestList from '../GrantRequestList/GrantRequestList';
import GrantRequestForm from '../GrantRequestForm/GrantRequestForm';
import './Me.css';

interface TenantWithGrants extends Tenant {
  grants: Grant[];
}

const Me: React.FC = () => {
  const [tenantsWithGrants, setTenantsWithGrants] = useState<TenantWithGrants[]>([]);
  const [currentTenantGrants, setCurrentTenantGrants] = useState<Grant[]>([]);
  const [showRequestForm, setShowRequestForm] = useState(false);
  const [loading, setLoading] = useState(true);
  const { selectedTenant, setTenant } = useTenant();
  const { selectedSubject } = useSubject();
  const navigate = useNavigate();

  useEffect(() => {
    loadTenantsWithGrants();
  }, [selectedSubject]);

  useEffect(() => {
    if (selectedTenant && selectedSubject) {
      loadCurrentTenantGrants();
    }
  }, [selectedTenant, selectedSubject]);

  const loadTenantsWithGrants = async () => {
    if (!selectedSubject) {
      setTenantsWithGrants([]);
      setLoading(false);
      return;
    }

    try {
      setLoading(true);
      const allTenants = await tenantApi.getAll();
      const tenantsWithGrantsData: TenantWithGrants[] = [];

      for (const tenant of allTenants) {
        try {
          const grants = await grantApi.getBySubject(tenant.id, selectedSubject.uid);
          if (grants.length > 0) {
            tenantsWithGrantsData.push({
              ...tenant,
              grants,
            });
          }
        } catch (err) {
          // Skip tenant if grant check fails
          console.error(`Failed to check grants for tenant ${tenant.id}:`, err);
        }
      }

      setTenantsWithGrants(tenantsWithGrantsData);
    } catch (err) {
      console.error('Failed to load tenants with grants:', err);
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
      loadTenantsWithGrants();
    } catch (err) {
      console.error('Failed to remove grant:', err);
    }
  };

  const handleRequestCreated = () => {
    if (selectedSubject && selectedTenant) {
      loadCurrentTenantGrants();
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
              tenantId={selectedTenant.id} 
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
                  tenantId={selectedTenant.id}
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
        <h3>Tenants With Access</h3>
        {tenantsWithGrants.length === 0 ? (
          <p className="no-context">You do not have access to any tenants.</p>
        ) : (
          <div className="tenant-grid">
            {tenantsWithGrants.map((tenant) => (
              <div key={tenant.id} className="tenant-card">
                <h3>{tenant.name}</h3>
                <p><strong>Schema:</strong> {tenant.schema_name}</p>
                <p><strong>ID:</strong> {tenant.id}</p>
                <p><strong>Grants:</strong> {tenant.grants.length}</p>
                <button
                  onClick={() => handleManageTenant(tenant)}
                  className="button button-primary"
                >
                  Manage
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
