import React, { useState, useEffect } from 'react';
import { useParams } from 'react-router-dom';
import { policyApi } from '../../services/api';
import { useTenant } from '../../context/TenantContext';
import { Policy } from '../../types';
import './PolicyList.css';

const PolicyList: React.FC = () => {
  const { tenantId } = useParams<{ tenantId: string }>();
  const { selectedTenant } = useTenant();
  const [policies, setPolicies] = useState<Policy[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [showCreateForm, setShowCreateForm] = useState(false);
  const [editingPolicy, setEditingPolicy] = useState<Policy | null>(null);
  const [formData, setFormData] = useState({
    name: '',
    description: '',
    rego_policy: '',
    is_active: true
  });

  useEffect(() => {
    if (tenantId) {
      loadPolicies();
    }
  }, [tenantId]);

  const loadPolicies = async () => {
    if (!tenantId) return;

    try {
      setLoading(true);
      const data = await policyApi.getByTenant(tenantId);
      setPolicies(data);
      setError(null);
    } catch (err) {
      setError('Failed to load policies');
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!tenantId) return;

    try {
      await policyApi.create(tenantId, formData);
      setShowCreateForm(false);
      setFormData({ name: '', description: '', rego_policy: '', is_active: true });
      loadPolicies();
    } catch (err) {
      setError('Failed to create policy');
      console.error(err);
    }
  };

  const handleUpdate = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!tenantId || !editingPolicy) return;

    try {
      await policyApi.update(tenantId, editingPolicy.id, formData);
      setEditingPolicy(null);
      setFormData({ name: '', description: '', rego_policy: '', is_active: true });
      loadPolicies();
    } catch (err) {
      setError('Failed to update policy');
      console.error(err);
    }
  };

  const handleDelete = async (policyId: string) => {
    if (!tenantId) return;
    if (!window.confirm('Are you sure you want to delete this policy?')) return;

    try {
      await policyApi.delete(tenantId, policyId);
      loadPolicies();
    } catch (err) {
      setError('Failed to delete policy');
      console.error(err);
    }
  };

  const startEdit = (policy: Policy) => {
    setEditingPolicy(policy);
    setFormData({
      name: policy.name,
      description: policy.description || '',
      rego_policy: policy.rego_policy,
      is_active: policy.is_active
    });
  };

  if (loading) return <div className="loading">Loading...</div>;

  if (!selectedTenant) {
    return <div className="error">No tenant selected</div>;
  }

  return (
    <div className="policy-list">
      <div className="policy-header">
        <h2>Policies for {selectedTenant.name}</h2>
        <button 
          onClick={() => setShowCreateForm(!showCreateForm)}
          className="button button-primary"
        >
          {showCreateForm ? 'Cancel' : 'Create Policy'}
        </button>
      </div>

      {error && <div className="error">{error}</div>}

      {(showCreateForm || editingPolicy) && (
        <div className="policy-form">
          <h3>{editingPolicy ? 'Edit Policy' : 'Create New Policy'}</h3>
          <form onSubmit={editingPolicy ? handleUpdate : handleCreate}>
            <div className="form-group">
              <label>Name:</label>
              <input
                type="text"
                value={formData.name}
                onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                className="input"
                required
              />
            </div>
            <div className="form-group">
              <label>Description:</label>
              <input
                type="text"
                value={formData.description}
                onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                className="input"
              />
            </div>
            <div className="form-group">
              <label>Rego Policy:</label>
              <textarea
                value={formData.rego_policy}
                onChange={(e) => setFormData({ ...formData, rego_policy: e.target.value })}
                className="textarea"
                rows={10}
                required
                placeholder={`package bouncer

default allow = false

allow {
  input.action == "read"
}`}
              />
            </div>
            <div className="form-group">
              <label>
                <input
                  type="checkbox"
                  checked={formData.is_active}
                  onChange={(e) => setFormData({ ...formData, is_active: e.target.checked })}
                />
                Active
              </label>
            </div>
            <div className="form-actions">
              <button type="submit" className="button button-primary">
                {editingPolicy ? 'Update' : 'Create'}
              </button>
              <button 
                type="button" 
                onClick={() => {
                  setShowCreateForm(false);
                  setEditingPolicy(null);
                  setFormData({ name: '', description: '', rego_policy: '', is_active: true });
                }}
                className="button"
              >
                Cancel
              </button>
            </div>
          </form>
        </div>
      )}

      <div className="policy-grid">
        {policies.map((policy) => (
          <div key={policy.id} className="policy-card">
            <div className="policy-header">
              <h3>{policy.name}</h3>
              <span className={`status ${policy.is_active ? 'active' : 'inactive'}`}>
                {policy.is_active ? 'Active' : 'Inactive'}
              </span>
            </div>
            {policy.description && <p className="policy-description">{policy.description}</p>}
            <pre className="policy-code">{policy.rego_policy.substring(0, 200)}...</pre>
            <div className="policy-actions">
              <button onClick={() => startEdit(policy)} className="button button-primary">
                Edit
              </button>
              <button onClick={() => handleDelete(policy.id)} className="button button-danger">
                Delete
              </button>
            </div>
          </div>
        ))}
      </div>

      {policies.length === 0 && (
        <p className="empty-state">No policies found. Create one to get started.</p>
      )}
    </div>
  );
};

export default PolicyList;
