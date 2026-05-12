import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useTenant } from '../../context/TenantContext';
import { useSubject } from '../../context/SubjectContext';
import { tenantApi, grantRequestApi } from '../../services/api';
import { Tenant, GrantRequest } from '../../types';
import './Admin.css';

const Admin: React.FC = () => {
  const [adminTenants, setAdminTenants] = useState<Tenant[]>([]);
  const [tenantRequests, setTenantRequests] = useState<Record<string, GrantRequest[]>>({});
  const [loading, setLoading] = useState(true);
  const { selectedTenant, setTenant } = useTenant();
  const { selectedSubject } = useSubject();
  const navigate = useNavigate();

  useEffect(() => {
    loadAdminTenants();
  }, [selectedSubject]);

  const loadAdminTenants = async () => {
    if (!selectedSubject) {
      setAdminTenants([]);
      setTenantRequests({});
      setLoading(false);
      return;
    }

    try {
      setLoading(true);
      const allTenants = await tenantApi.getAll();
      const tenantsWhereAdmin = allTenants.filter(t => t.admin_uid === selectedSubject.uid);
      setAdminTenants(tenantsWhereAdmin);

      // Load pending grant requests for each admin tenant
      const requestsByTenant: Record<string, GrantRequest[]> = {};
      for (const tenant of tenantsWhereAdmin) {
        try {
          const requests = await grantRequestApi.getByTenant(tenant.schema_name, 'pending');
          requestsByTenant[tenant.id] = requests;
        } catch (err) {
          console.error(`Failed to load requests for tenant ${tenant.schema_name}:`, err);
          requestsByTenant[tenant.id] = [];
        }
      }
      setTenantRequests(requestsByTenant);
    } catch (err) {
      console.error('Failed to load admin tenants:', err);
    } finally {
      setLoading(false);
    }
  };

  const handleManageTenant = (tenant: Tenant) => {
    setTenant(tenant);
    navigate(`/tenants/${tenant.id}/policies`);
  };

  const handleApproveRequest = async (schemaName: string, requestUid: string) => {
    if (!window.confirm('Are you sure you want to approve this grant request?')) return;
    if (!selectedSubject) return;

    try {
      await grantRequestApi.approve(schemaName, requestUid, selectedSubject.uid);
      loadAdminTenants();
    } catch (err) {
      console.error('Failed to approve request:', err);
    }
  };

  const handleRejectRequest = async (schemaName: string, requestUid: string) => {
    if (!window.confirm('Are you sure you want to reject this grant request?')) return;
    if (!selectedSubject) return;

    try {
      await grantRequestApi.reject(schemaName, requestUid, selectedSubject.uid);
      loadAdminTenants();
    } catch (err) {
      console.error('Failed to reject request:', err);
    }
  };

  if (!selectedSubject) {
    return (
      <div className="admin">
        <h2>Admin Dashboard</h2>
        <p className="no-context">No subject selected. Please select a subject to act as.</p>
      </div>
    );
  }

  if (loading) {
    return <div className="loading">Loading...</div>;
  }

  return (
    <div className="admin">
      <h2>Admin Dashboard</h2>

      <div className="admin-info">
        <h3>Acting As</h3>
        <div className="subject-details">
          <p><strong>Username:</strong> {selectedSubject.username}</p>
          <p><strong>Name:</strong> {selectedSubject.name}</p>
          <p><strong>Email:</strong> {selectedSubject.email}</p>
        </div>
      </div>

      <div className="admin-tenants">
        <h3>Tenants You Administer</h3>
        {adminTenants.length === 0 ? (
          <p className="no-tenants">You are not an admin for any tenants.</p>
        ) : (
          <div className="tenant-grid">
            {adminTenants.map((tenant) => (
              <div key={tenant.id} className="tenant-card">
                <h3>{tenant.name}</h3>
                <p><strong>Schema:</strong> {tenant.schema_name}</p>
                <p><strong>ID:</strong> {tenant.id}</p>
                <button
                  onClick={() => handleManageTenant(tenant)}
                  className="button button-primary"
                >
                  Manage
                </button>
                {tenantRequests[tenant.id] && tenantRequests[tenant.id].length > 0 && (
                  <div className="pending-requests">
                    <h4>Pending Requests ({tenantRequests[tenant.id].length})</h4>
                    {tenantRequests[tenant.id].map((request) => (
                      <div key={request.uid} className="request-item">
                        <p><strong>Path:</strong> {request.path}</p>
                        <p><strong>Role:</strong> {request.role_uid}</p>
                        <div className="request-actions">
                          <button
                            onClick={() => handleApproveRequest(tenant.schema_name, request.uid)}
                            className="button button-success"
                          >
                            Approve
                          </button>
                          <button
                            onClick={() => handleRejectRequest(tenant.schema_name, request.uid)}
                            className="button button-danger"
                          >
                            Reject
                          </button>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
};

export default Admin;
