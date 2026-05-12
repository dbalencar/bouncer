import React, { useState, useEffect } from 'react';
import { useParams } from 'react-router-dom';
import { roleApi, permissionApi } from '../../services/api';
import { useTenant } from '../../context/TenantContext';
import { Role, Permission } from '../../types';
import './RoleList.css';

const RoleList: React.FC = () => {
  const { tenantId } = useParams<{ tenantId: string }>();
  const { selectedTenant } = useTenant();
  const [roles, setRoles] = useState<Role[]>([]);
  const [permissions, setPermissions] = useState<Permission[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [showCreateForm, setShowCreateForm] = useState(false);
  const [editingRole, setEditingRole] = useState<Role | null>(null);
  const [formData, setFormData] = useState({
    name: '',
    permission_uids: [] as string[]
  });

  useEffect(() => {
    if (tenantId) {
      loadData();
    }
  }, [tenantId]);

  const loadData = async () => {
    if (!tenantId) return;

    try {
      setLoading(true);
      const [rolesData, permissionsData] = await Promise.all([
        roleApi.getByTenant(tenantId),
        permissionApi.getByTenant(tenantId)
      ]);
      setRoles(rolesData);
      setPermissions(permissionsData);
      setError(null);
    } catch (err) {
      setError('Failed to load data');
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!tenantId) return;

    if (formData.permission_uids.length === 0) {
      setError('Role must have at least one permission');
      return;
    }

    try {
      await roleApi.create(tenantId, {
        name: formData.name,
        permission_uids: formData.permission_uids
      });
      setShowCreateForm(false);
      setFormData({ name: '', permission_uids: [] });
      loadData();
    } catch (err) {
      setError('Failed to create role');
      console.error(err);
    }
  };

  const handleUpdate = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!tenantId || !editingRole) return;

    if (formData.permission_uids.length === 0) {
      setError('Role must have at least one permission');
      return;
    }

    try {
      await roleApi.update(tenantId, editingRole.uid, {
        name: formData.name || undefined,
        permission_uids: formData.permission_uids
      });
      setEditingRole(null);
      setFormData({ name: '', permission_uids: [] });
      loadData();
    } catch (err) {
      setError('Failed to update role');
      console.error(err);
    }
  };

  const handleDelete = async (uid: string) => {
    if (!tenantId) return;
    if (!window.confirm('Are you sure you want to delete this role?')) return;

    try {
      await roleApi.delete(tenantId, uid);
      loadData();
    } catch (err) {
      setError('Failed to delete role');
      console.error(err);
    }
  };

  const startEdit = async (role: Role) => {
    setEditingRole(role);
    const rolePermissions = await roleApi.getPermissions(tenantId, role.uid);
    setFormData({
      name: role.name,
      permission_uids: rolePermissions.map(p => p.uid)
    });
    setShowCreateForm(true);
  };

  const handlePermissionToggle = (permissionUid: string) => {
    setFormData(prev => ({
      ...prev,
      permission_uids: prev.permission_uids.includes(permissionUid)
        ? prev.permission_uids.filter(uid => uid !== permissionUid)
        : [...prev.permission_uids, permissionUid]
    }));
  };

  if (loading) return <div className="loading">Loading...</div>;

  if (!selectedTenant) {
    return <div className="error">No tenant selected</div>;
  }

  return (
    <div className="role-list">
      <div className="role-header">
        <h2>Roles for {selectedTenant.name}</h2>
        <button 
          onClick={() => setShowCreateForm(!showCreateForm)}
          className="button button-primary"
        >
          {showCreateForm ? 'Cancel' : 'Create Role'}
        </button>
      </div>

      {error && <div className="error">{error}</div>}

      {(showCreateForm || editingRole) && (
        <div className="role-form">
          <h3>{editingRole ? 'Edit Role' : 'Create New Role'}</h3>
          <form onSubmit={editingRole ? handleUpdate : handleCreate}>
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
              <label>Permissions (select at least one):</label>
              <div className="permissions-selector">
                {permissions.map(permission => (
                  <label key={permission.uid} className="permission-checkbox">
                    <input
                      type="checkbox"
                      checked={formData.permission_uids.includes(permission.uid)}
                      onChange={() => handlePermissionToggle(permission.uid)}
                    />
                    <span className="permission-info">
                      <strong>{permission.name}</strong>
                      <span className="permission-path">{permission.path}</span>
                    </span>
                  </label>
                ))}
              </div>
              <div className="permissions-count">
                Selected: {formData.permission_uids.length} permissions
              </div>
            </div>
            <div className="form-actions">
              <button type="submit" className="button button-primary">
                {editingRole ? 'Update' : 'Create'}
              </button>
              <button 
                type="button" 
                onClick={() => {
                  setShowCreateForm(false);
                  setEditingRole(null);
                  setFormData({ name: '', permission_uids: [] });
                }}
                className="button"
              >
                Cancel
              </button>
            </div>
          </form>
        </div>
      )}

      <div className="roles-grid">
        {roles.map((role) => (
          <div key={role.uid} className="role-card">
            <h3>{role.name}</h3>
            <p className="role-meta">Created: {new Date(role.created_at).toLocaleDateString()}</p>
            <div className="role-actions">
              <button onClick={() => startEdit(role)} className="button button-primary">
                Edit
              </button>
              <button 
                onClick={() => handleDelete(role.uid)} 
                className="button button-danger"
              >
                Delete
              </button>
            </div>
          </div>
        ))}
      </div>

      {roles.length === 0 && (
        <p className="empty-state">No roles found. Create one to get started.</p>
      )}
    </div>
  );
};

export default RoleList;
