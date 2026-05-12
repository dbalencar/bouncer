import React, { useState, useEffect } from 'react';
import { useParams } from 'react-router-dom';
import { useTenant } from '../../context/TenantContext';
import { resourceApi, resourceGroupApi } from '../../services/api';
import { Resource, ResourceGroup } from '../../types';
import './ResourceList.css';

interface ResourceFormData {
  id: string;
  name: string;
  group_uid: string | null;
}

const ResourceList: React.FC = () => {
  const { tenantId } = useParams<{ tenantId: string }>();
  const { selectedTenant } = useTenant();
  const [resources, setResources] = useState<Resource[]>([]);
  const [resourceGroups, setResourceGroups] = useState<ResourceGroup[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [showForm, setShowForm] = useState(false);
  const [editingResource, setEditingResource] = useState<Resource | null>(null);
  const [formData, setFormData] = useState<ResourceFormData>({
    id: '',
    name: '',
    group_uid: null,
  });

  useEffect(() => {
    if (selectedTenant) {
      loadResources();
      loadResourceGroups();
    }
  }, [selectedTenant]);

  const loadResources = async () => {
    if (!selectedTenant) return;
    try {
      setLoading(true);
      const data = await resourceApi.getByTenant(selectedTenant.id);
      setResources(data);
      setError(null);
    } catch (err) {
      setError('Failed to load resources');
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const loadResourceGroups = async () => {
    if (!selectedTenant) return;
    try {
      const data = await resourceGroupApi.getByTenant(selectedTenant.id);
      setResourceGroups(data);
    } catch (err) {
      console.error('Failed to load resource groups:', err);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedTenant) return;

    try {
      if (editingResource) {
        await resourceApi.update(selectedTenant.id, editingResource.uid, formData);
      } else {
        await resourceApi.create(selectedTenant.id, formData);
      }
      await loadResources();
      resetForm();
    } catch (err: any) {
      setError(err.response?.data?.message || 'Failed to save resource');
    }
  };

  const handleEdit = (resource: Resource) => {
    setEditingResource(resource);
    setFormData({
      id: resource.id,
      name: resource.name,
      group_uid: resource.group_uid,
    });
    setShowForm(true);
  };

  const handleDelete = async (uid: string) => {
    if (!selectedTenant) return;
    if (!window.confirm('Are you sure you want to delete this resource?')) return;

    try {
      await resourceApi.delete(selectedTenant.id, uid);
      await loadResources();
    } catch (err) {
      setError('Failed to delete resource');
    }
  };

  const resetForm = () => {
    setFormData({ id: '', name: '', group_uid: null });
    setEditingResource(null);
    setShowForm(false);
    setError(null);
  };

  const getGroupName = (groupUid: string | null) => {
    if (!groupUid) return 'Ungrouped';
    const group = resourceGroups.find(g => g.uid === groupUid);
    return group ? group.name : 'Unknown';
  };

  if (!selectedTenant) {
    return <div className="resource-list">Please select a tenant first</div>;
  }

  if (loading) {
    return <div className="resource-list loading">Loading resources...</div>;
  }

  return (
    <div className="resource-list">
      <h2>Resources</h2>

      {error && <div className="error">{error}</div>}

      {!showForm && (
        <div className="resource-header">
          <button className="button button-primary" onClick={() => setShowForm(true)}>
            Add Resource
          </button>
        </div>
      )}

      {showForm && (
        <div className="resource-form">
          <h3>{editingResource ? 'Edit Resource' : 'Add New Resource'}</h3>
          <form onSubmit={handleSubmit}>
            <div className="form-group">
              <label>ID:</label>
              <input
                type="text"
                className="input"
                value={formData.id}
                onChange={(e) => setFormData({ ...formData, id: e.target.value })}
                required
                disabled={!!editingResource}
              />
            </div>
            <div className="form-group">
              <label>Name:</label>
              <input
                type="text"
                className="input"
                value={formData.name}
                onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                required
              />
            </div>
            <div className="form-group">
              <label>Group:</label>
              <select
                className="input"
                value={formData.group_uid || ''}
                onChange={(e) => setFormData({ ...formData, group_uid: e.target.value || null })}
              >
                <option value="">Ungrouped</option>
                {resourceGroups.map(group => (
                  <option key={group.uid} value={group.uid}>
                    {group.label} ({group.path})
                  </option>
                ))}
              </select>
            </div>
            <div className="form-actions">
              <button type="submit" className="button button-primary">
                {editingResource ? 'Update' : 'Create'}
              </button>
              <button type="button" className="button" onClick={resetForm}>
                Cancel
              </button>
            </div>
          </form>
        </div>
      )}

      <div className="resources-grid">
        {resources.length === 0 ? (
          <div className="empty-state">No resources found</div>
        ) : (
          resources.map(resource => (
            <div key={resource.uid} className="resource-card">
              <h3>{resource.name}</h3>
              <div className="resource-meta">
                <div>ID: {resource.id}</div>
                <div>Path: {resource.path}</div>
                <div>Group: {getGroupName(resource.group_uid)}</div>
              </div>
              <div className="resource-actions">
                <button className="button button-primary" onClick={() => handleEdit(resource)}>
                  Edit
                </button>
                <button className="button button-danger" onClick={() => handleDelete(resource.uid)}>
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

export default ResourceList;
