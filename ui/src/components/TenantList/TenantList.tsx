import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { tenantApi } from '../../services/api';
import { useTenant } from '../../context/TenantContext';
import { Tenant } from '../../types';
import './TenantList.css';

const TenantList: React.FC = () => {
  const [tenants, setTenants] = useState<Tenant[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [newTenantName, setNewTenantName] = useState('');
  const { setTenant } = useTenant();
  const navigate = useNavigate();

  useEffect(() => {
    loadTenants();
  }, []);

  const loadTenants = async () => {
    try {
      setLoading(true);
      const data = await tenantApi.getAll();
      setTenants(data);
      setError(null);
    } catch (err) {
      setError('Failed to load tenants');
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const handleCreateTenant = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newTenantName.trim()) return;

    try {
      await tenantApi.create(newTenantName);
      setNewTenantName('');
      loadTenants();
    } catch (err) {
      setError('Failed to create tenant');
      console.error(err);
    }
  };

  const handleSelectTenant = (tenant: Tenant) => {
    setTenant(tenant);
    navigate(`/tenants/${tenant.id}/policies`);
  };

  const handleDeleteTenant = async (id: string) => {
    if (!window.confirm('Are you sure you want to delete this tenant?')) return;

    try {
      await tenantApi.delete(id);
      loadTenants();
    } catch (err) {
      setError('Failed to delete tenant');
      console.error(err);
    }
  };

  if (loading) return <div className="loading">Loading...</div>;

  return (
    <div className="tenant-list">
      <h2>Tenants</h2>
      
      {error && <div className="error">{error}</div>}

      <form onSubmit={handleCreateTenant} className="create-form">
        <input
          type="text"
          value={newTenantName}
          onChange={(e) => setNewTenantName(e.target.value)}
          placeholder="New tenant name"
          className="input"
        />
        <button type="submit" className="button">Create Tenant</button>
      </form>

      <div className="tenant-grid">
        {tenants.map((tenant) => (
          <div key={tenant.id} className="tenant-card">
            <h3>{tenant.name}</h3>
            <p>Schema: {tenant.schema_name}</p>
            <p>Created: {new Date(tenant.created_at).toLocaleDateString()}</p>
            <div className="tenant-actions">
              <button 
                onClick={() => handleSelectTenant(tenant)}
                className="button button-primary"
              >
                Manage Policies
              </button>
              <button 
                onClick={() => handleDeleteTenant(tenant.id)}
                className="button button-danger"
              >
                Delete
              </button>
            </div>
          </div>
        ))}
      </div>

      {tenants.length === 0 && (
        <p className="empty-state">No tenants found. Create one to get started.</p>
      )}
    </div>
  );
};

export default TenantList;
