import React, { useState, useEffect } from 'react';
import { useParams } from 'react-router-dom';
import { useTenant } from '../../context/TenantContext';
import { grantApi, subjectApi, roleApi } from '../../services/api';
import { Grant, Subject, Role } from '../../types';
import './GrantList.css';

interface GrantFormData {
  subject_uid: string;
  path: string;
  role_uid: string;
}

const GrantList: React.FC = () => {
  const { tenantId } = useParams<{ tenantId: string }>();
  const { selectedTenant } = useTenant();
  const [grants, setGrants] = useState<Grant[]>([]);
  const [subjects, setSubjects] = useState<Subject[]>([]);
  const [roles, setRoles] = useState<Role[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [showForm, setShowForm] = useState(false);
  const [editingGrant, setEditingGrant] = useState<Grant | null>(null);
  const [formData, setFormData] = useState<GrantFormData>({
    subject_uid: '',
    path: '',
    role_uid: '',
  });

  useEffect(() => {
    if (selectedTenant) {
      loadGrants();
      loadSubjects();
      loadRoles();
    }
  }, [selectedTenant]);

  const loadGrants = async () => {
    if (!selectedTenant) return;
    try {
      setLoading(true);
      const data = await grantApi.getByTenant(selectedTenant.id);
      setGrants(data);
      setError(null);
    } catch (err) {
      setError('Failed to load grants');
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const loadSubjects = async () => {
    try {
      const data = await subjectApi.getAll();
      setSubjects(data);
    } catch (err) {
      console.error('Failed to load subjects:', err);
    }
  };

  const loadRoles = async () => {
    if (!selectedTenant) return;
    try {
      const data = await roleApi.getByTenant(selectedTenant.id);
      setRoles(data);
    } catch (err) {
      console.error('Failed to load roles:', err);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedTenant) return;

    try {
      if (editingGrant) {
        await grantApi.update(selectedTenant.id, editingGrant.uid, formData);
      } else {
        await grantApi.create(selectedTenant.id, formData);
      }
      await loadGrants();
      resetForm();
    } catch (err: any) {
      setError(err.response?.data?.message || 'Failed to save grant');
    }
  };

  const handleEdit = (grant: Grant) => {
    setEditingGrant(grant);
    setFormData({
      subject_uid: grant.subject_uid,
      path: grant.path,
      role_uid: grant.role_uid,
    });
    setShowForm(true);
  };

  const handleDelete = async (uid: string) => {
    if (!selectedTenant) return;
    if (!window.confirm('Are you sure you want to delete this grant?')) return;

    try {
      await grantApi.delete(selectedTenant.id, uid);
      await loadGrants();
    } catch (err) {
      setError('Failed to delete grant');
    }
  };

  const resetForm = () => {
    setFormData({ subject_uid: '', path: '', role_uid: '' });
    setEditingGrant(null);
    setShowForm(false);
    setError(null);
  };

  const getSubjectName = (subjectUid: string) => {
    const subject = subjects.find(s => s.uid === subjectUid);
    return subject ? subject.username : 'Unknown';
  };

  const getSubjectEmail = (subjectUid: string) => {
    const subject = subjects.find(s => s.uid === subjectUid);
    return subject ? subject.email : '';
  };

  const getRoleName = (roleUid: string) => {
    const role = roles.find(r => r.uid === roleUid);
    return role ? role.name : 'Unknown';
  };

  if (!selectedTenant) {
    return <div className="grant-list">Please select a tenant first</div>;
  }

  if (loading) {
    return <div className="grant-list loading">Loading grants...</div>;
  }

  return (
    <div className="grant-list">
      <h2>Grants</h2>

      {error && <div className="error">{error}</div>}

      {!showForm && (
        <div className="grant-header">
          <button className="button button-primary" onClick={() => setShowForm(true)}>
            Add Grant
          </button>
        </div>
      )}

      {showForm && (
        <div className="grant-form">
          <h3>{editingGrant ? 'Edit Grant' : 'Add New Grant'}</h3>
          <form onSubmit={handleSubmit}>
            <div className="form-group">
              <label>Subject:</label>
              <select
                className="input"
                value={formData.subject_uid}
                onChange={(e) => setFormData({ ...formData, subject_uid: e.target.value })}
                required
              >
                <option value="">Select a subject</option>
                {subjects.map(subject => (
                  <option key={subject.uid} value={subject.uid}>
                    {subject.username} ({subject.email})
                  </option>
                ))}
              </select>
            </div>
            <div className="form-group">
              <label>Path:</label>
              <input
                type="text"
                className="input"
                value={formData.path}
                onChange={(e) => setFormData({ ...formData, path: e.target.value })}
                placeholder="/path/to/resource or /path/*"
                required
              />
              <small className="form-hint">Use * for wildcard matching (e.g., /servers/*)</small>
            </div>
            <div className="form-group">
              <label>Role:</label>
              <select
                className="input"
                value={formData.role_uid}
                onChange={(e) => setFormData({ ...formData, role_uid: e.target.value })}
                required
              >
                <option value="">Select a role</option>
                {roles.map(role => (
                  <option key={role.uid} value={role.uid}>
                    {role.name}
                  </option>
                ))}
              </select>
            </div>
            <div className="form-actions">
              <button type="submit" className="button button-primary">
                {editingGrant ? 'Update' : 'Create'}
              </button>
              <button type="button" className="button" onClick={resetForm}>
                Cancel
              </button>
            </div>
          </form>
        </div>
      )}

      <div className="grants-grid">
        {grants.length === 0 ? (
          <div className="empty-state">No grants found</div>
        ) : (
          grants.map(grant => (
            <div key={grant.uid} className="grant-card">
              <h3>{getSubjectName(grant.subject_uid)}</h3>
              <div className="grant-meta">
                <div>Email: {getSubjectEmail(grant.subject_uid)}</div>
                <div>Path: {grant.path}</div>
                <div>Role: {getRoleName(grant.role_uid)}</div>
              </div>
              <div className="grant-actions">
                <button className="button button-primary" onClick={() => handleEdit(grant)}>
                  Edit
                </button>
                <button className="button button-danger" onClick={() => handleDelete(grant.uid)}>
                  Delete
                </button>
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  );
};

export default GrantList;
