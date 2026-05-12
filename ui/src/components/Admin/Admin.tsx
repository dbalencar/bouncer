import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useTenant } from '../../context/TenantContext';
import { useSubject } from '../../context/SubjectContext';
import { tenantApi } from '../../services/api';
import { Tenant } from '../../types';
import './Admin.css';

const Admin: React.FC = () => {
  const [adminTenants, setAdminTenants] = useState<Tenant[]>([]);
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
      setLoading(false);
      return;
    }

    try {
      setLoading(true);
      const allTenants = await tenantApi.getAll();
      const tenantsWhereAdmin = allTenants.filter(t => t.admin_uid === selectedSubject.uid);
      setAdminTenants(tenantsWhereAdmin);
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
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
};

export default Admin;
