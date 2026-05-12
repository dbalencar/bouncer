import React, { useState, useEffect } from 'react';
import { useParams } from 'react-router-dom';
import { useTenant } from '../../context/TenantContext';
import { resourceGroupApi } from '../../services/api';
import { ResourceGroup } from '../../types';
import './ResourceGroupList.css';

interface ResourceGroupFormData {
  id: string;
  name: string;
  label: string;
  parent_uid: string | null;
}

const ResourceGroupList: React.FC = () => {
  const { tenantId } = useParams<{ tenantId: string }>();
  const { selectedTenant } = useTenant();
  const [resourceGroups, setResourceGroups] = useState<ResourceGroup[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [showForm, setShowForm] = useState(false);
  const [editingGroup, setEditingGroup] = useState<ResourceGroup | null>(null);
  const [formData, setFormData] = useState<ResourceGroupFormData>({
    id: '',
    name: '',
    label: '',
    parent_uid: null,
  });
  const [expandedGroups, setExpandedGroups] = useState<Set<string>>(new Set());

  useEffect(() => {
    if (selectedTenant) {
      loadResourceGroups();
    }
  }, [selectedTenant]);

  const loadResourceGroups = async () => {
    if (!selectedTenant) return;
    try {
      setLoading(true);
      const data = await resourceGroupApi.getByTenant(selectedTenant.id);
      setResourceGroups(data);
      setError(null);
    } catch (err) {
      setError('Failed to load resource groups');
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedTenant) return;

    try {
      if (editingGroup) {
        await resourceGroupApi.update(selectedTenant.id, editingGroup.uid, formData);
      } else {
        await resourceGroupApi.create(selectedTenant.id, formData);
      }
      await loadResourceGroups();
      resetForm();
    } catch (err: any) {
      setError(err.response?.data?.message || 'Failed to save resource group');
    }
  };

  const handleEdit = (group: ResourceGroup) => {
    setEditingGroup(group);
    setFormData({
      id: group.id,
      name: group.name,
      label: group.label,
      parent_uid: group.parent_uid,
    });
    setShowForm(true);
  };

  const handleDelete = async (uid: string) => {
    if (!selectedTenant) return;
    if (!window.confirm('Are you sure you want to delete this resource group?')) return;

    try {
      await resourceGroupApi.delete(selectedTenant.id, uid);
      await loadResourceGroups();
    } catch (err: any) {
      setError(err.response?.data?.message || 'Failed to delete resource group');
    }
  };

  const resetForm = () => {
    setFormData({ id: '', name: '', label: '', parent_uid: null });
    setEditingGroup(null);
    setShowForm(false);
    setError(null);
  };

  const toggleExpand = (uid: string) => {
    const newExpanded = new Set(expandedGroups);
    if (newExpanded.has(uid)) {
      newExpanded.delete(uid);
    } else {
      newExpanded.add(uid);
    }
    setExpandedGroups(newExpanded);
  };

  // Build tree structure from flat list
  const buildTree = (groups: ResourceGroup[], parentUid: string | null = null): ResourceGroup[] => {
    return groups
      .filter(group => group.parent_uid === parentUid)
      .map(group => ({
        ...group,
        children: buildTree(groups, group.uid),
      }));
  };

  // Render tree node
  const renderTreeNode = (group: ResourceGroup & { children?: any[] }, depth: number = 0) => {
    const isExpanded = expandedGroups.has(group.uid);
    const hasChildren = group.children && group.children.length > 0;

    return (
      <div key={group.uid} className="tree-node" style={{ paddingLeft: `${depth * 20}px` }}>
        <div className="tree-node-content">
          {hasChildren && (
            <button
              className="expand-button"
              onClick={() => toggleExpand(group.uid)}
            >
              {isExpanded ? '▼' : '▶'}
            </button>
          )}
          <div className="tree-node-info">
            <strong>{group.label}</strong>
            <span className="tree-node-id">({group.id})</span>
            <span className="tree-node-path">{group.path}</span>
          </div>
          <div className="tree-node-actions">
            <button className="button button-primary" onClick={() => handleEdit(group)}>
              Edit
            </button>
            <button className="button button-danger" onClick={() => handleDelete(group.uid)}>
              Delete
            </button>
          </div>
        </div>
        {isExpanded && hasChildren && (
          <div className="tree-children">
            {group.children.map((child: ResourceGroup) => renderTreeNode(child, depth + 1))}
          </div>
        )}
      </div>
    );
  };

  if (!selectedTenant) {
    return <div className="resource-group-list">Please select a tenant first</div>;
  }

  if (loading) {
    return <div className="resource-group-list loading">Loading resource groups...</div>;
  }

  const treeData = buildTree(resourceGroups);

  return (
    <div className="resource-group-list">
      <h2>Resource Groups</h2>

      {error && <div className="error">{error}</div>}

      {!showForm && (
        <div className="resource-group-header">
          <button className="button button-primary" onClick={() => setShowForm(true)}>
            Add Resource Group
          </button>
        </div>
      )}

      {showForm && (
        <div className="resource-group-form">
          <h3>{editingGroup ? 'Edit Resource Group' : 'Add New Resource Group'}</h3>
          <form onSubmit={handleSubmit}>
            <div className="form-group">
              <label>ID:</label>
              <input
                type="text"
                className="input"
                value={formData.id}
                onChange={(e) => setFormData({ ...formData, id: e.target.value })}
                required
                disabled={!!editingGroup}
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
              <label>Label:</label>
              <input
                type="text"
                className="input"
                value={formData.label}
                onChange={(e) => setFormData({ ...formData, label: e.target.value })}
                required
              />
            </div>
            <div className="form-group">
              <label>Parent Group:</label>
              <select
                className="input"
                value={formData.parent_uid || ''}
                onChange={(e) => setFormData({ ...formData, parent_uid: e.target.value || null })}
              >
                <option value="">Root (no parent)</option>
                {resourceGroups
                  .filter(g => g.uid !== editingGroup?.uid)
                  .map(group => (
                    <option key={group.uid} value={group.uid}>
                      {group.label} ({group.path})
                    </option>
                  ))}
              </select>
            </div>
            <div className="form-actions">
              <button type="submit" className="button button-primary">
                {editingGroup ? 'Update' : 'Create'}
              </button>
              <button type="button" className="button" onClick={resetForm}>
                Cancel
              </button>
            </div>
          </form>
        </div>
      )}

      <div className="resource-group-tree">
        {treeData.length === 0 ? (
          <div className="empty-state">No resource groups found</div>
        ) : (
          treeData.map(group => renderTreeNode(group))
        )}
      </div>
    </div>
  );
};

export default ResourceGroupList;
