import React, { useState, useEffect } from 'react';
import { useParams } from 'react-router-dom';
import { permissionApi } from '../../services/api';
import { useTenant } from '../../context/TenantContext';
import { Permission } from '../../types';
import './PermissionList.css';

const PermissionList: React.FC = () => {
  const { tenantId } = useParams<{ tenantId: string }>();
  const { selectedTenant } = useTenant();
  const [permissions, setPermissions] = useState<Permission[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [showCreateForm, setShowCreateForm] = useState(false);
  const [editingPermission, setEditingPermission] = useState<Permission | null>(null);
  const [formData, setFormData] = useState({
    name: '',
    parent_uid: '' as string | null
  });

  useEffect(() => {
    if (tenantId) {
      loadPermissions();
    }
  }, [tenantId]);

  const loadPermissions = async () => {
    if (!tenantId) return;

    try {
      setLoading(true);
      const data = await permissionApi.getByTenant(tenantId);
      setPermissions(data);
      setError(null);
    } catch (err) {
      setError('Failed to load permissions');
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!tenantId) return;

    if (!formData.parent_uid) {
      setError('Parent permission is required');
      return;
    }

    try {
      await permissionApi.create(tenantId, {
        name: formData.name,
        parent_uid: formData.parent_uid
      });
      setShowCreateForm(false);
      setFormData({ name: '', parent_uid: '' });
      loadPermissions();
    } catch (err) {
      setError('Failed to create permission');
      console.error(err);
    }
  };

  const handleUpdate = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!tenantId || !editingPermission) return;

    try {
      await permissionApi.update(tenantId, editingPermission.uid, {
        name: formData.name || undefined,
        parent_uid: formData.parent_uid || undefined
      });
      setEditingPermission(null);
      setFormData({ name: '', parent_uid: '' });
      loadPermissions();
    } catch (err) {
      setError('Failed to update permission');
      console.error(err);
    }
  };

  const handleDelete = async (uid: string) => {
    if (!tenantId) return;
    if (!window.confirm('Are you sure you want to delete this permission?')) return;

    try {
      await permissionApi.delete(tenantId, uid);
      loadPermissions();
    } catch (err) {
      setError('Failed to delete permission');
      console.error(err);
    }
  };

  const startEdit = (permission: Permission) => {
    setEditingPermission(permission);
    setFormData({
      name: permission.name,
      parent_uid: permission.parent_uid
    });
  };

  const buildPermissionTree = (perms: Permission[]): any[] => {
    const map = new Map<string, any>();
    perms.forEach(p => map.set(p.uid, { ...p, children: [] as any[] }));

    const roots: any[] = [];
    perms.forEach(p => {
      const node = map.get(p.uid)!;
      if (p.parent_uid && map.has(p.parent_uid)) {
        (map.get(p.parent_uid)! as any).children.push(node);
      } else {
        roots.push(node);
      }
    });

    return roots;
  };

  const renderPermissionNode = (permission: any, depth = 0) => {
    const hasChildren = permission.children && permission.children.length > 0;
    const isRoot = permission.parent_uid === null;

    return (
      <div key={permission.uid} className="permission-node" style={{ marginLeft: `${depth * 20}px` }}>
        <div className="permission-item">
          <div className="permission-info">
            <span className="permission-name">{permission.name}</span>
            <span className="permission-path">{permission.path}</span>
            {isRoot && <span className="badge base">Root</span>}
          </div>
          {!isRoot && (
            <div className="permission-actions">
              <button onClick={() => startEdit(permission)} className="button button-primary">
                Edit
              </button>
              <button 
                onClick={() => handleDelete(permission.uid)} 
                className="button button-danger"
                disabled={hasChildren}
              >
                Delete
              </button>
            </div>
          )}
        </div>
        {hasChildren && permission.children.map((child: any) => renderPermissionNode(child, depth + 1))}
      </div>
    );
  };

  if (loading) return <div className="loading">Loading...</div>;

  if (!selectedTenant) {
    return <div className="error">No tenant selected</div>;
  }

  const tree = buildPermissionTree(permissions);

  return (
    <div className="permission-list">
      <div className="permission-header">
        <h2>Permissions for {selectedTenant.name}</h2>
        <button 
          onClick={() => setShowCreateForm(!showCreateForm)}
          className="button button-primary"
        >
          {showCreateForm ? 'Cancel' : 'Create Permission'}
        </button>
      </div>

      {error && <div className="error">{error}</div>}

      {(showCreateForm || editingPermission) && (
        <div className="permission-form">
          <h3>{editingPermission ? 'Edit Permission' : 'Create New Permission'}</h3>
          <form onSubmit={editingPermission ? handleUpdate : handleCreate}>
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
              <label>Parent Permission:</label>
              <select
                value={formData.parent_uid || ''}
                onChange={(e) => setFormData({ ...formData, parent_uid: e.target.value || null })}
                className="input"
                required
              >
                <option value="" disabled>Select a parent permission</option>
                {permissions
                  .filter(p => !editingPermission || p.uid !== editingPermission.uid)
                  .map(p => (
                    <option key={p.uid} value={p.uid}>
                      {p.name} ({p.path})
                    </option>
                  ))}
              </select>
            </div>
            <div className="form-actions">
              <button type="submit" className="button button-primary">
                {editingPermission ? 'Update' : 'Create'}
              </button>
              <button 
                type="button" 
                onClick={() => {
                  setShowCreateForm(false);
                  setEditingPermission(null);
                  setFormData({ name: '', parent_uid: '' });
                }}
                className="button"
              >
                Cancel
              </button>
            </div>
          </form>
        </div>
      )}

      <div className="permission-tree">
        {tree.length === 0 ? (
          <p className="empty-state">No permissions found. Base permissions should be seeded automatically.</p>
        ) : (
          tree.map(permission => renderPermissionNode(permission))
        )}
      </div>
    </div>
  );
};

export default PermissionList;
