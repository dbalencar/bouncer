import React, { useState, useEffect, useRef } from 'react';
import { useParams } from 'react-router-dom';
import { useTenant } from '../../context/TenantContext';
import { grantApi, subjectApi, roleApi, resourceGroupApi, resourceApi as resourceServiceApi } from '../../services/api';
import { Grant, Subject, Role, ResourceGroup, Resource } from '../../types';
import './GrantList.css';

interface GrantFormData {
  subject_uid: string;
  path: string;
  role_uid: string;
}

interface PathOption {
  path: string;
  type: 'group' | 'resource';
  displayName: string;
  id: string;
  name: string;
  label?: string;
}

const GrantList: React.FC = () => {
  const { tenantId } = useParams<{ tenantId: string }>();
  const { selectedTenant } = useTenant();
  const [grants, setGrants] = useState<Grant[]>([]);
  const [subjects, setSubjects] = useState<Subject[]>([]);
  const [roles, setRoles] = useState<Role[]>([]);
  const [resourceGroups, setResourceGroups] = useState<ResourceGroup[]>([]);
  const [resources, setResources] = useState<Resource[]>([]);
  const [pathOptions, setPathOptions] = useState<PathOption[]>([]);
  const [pathSearchTerm, setPathSearchTerm] = useState('');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [showForm, setShowForm] = useState(false);
  const [editingGrant, setEditingGrant] = useState<Grant | null>(null);
  const [formData, setFormData] = useState<GrantFormData>({
    subject_uid: '',
    path: '',
    role_uid: '',
  });
  const pathSelectorRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (selectedTenant) {
      loadGrants();
      loadSubjects();
      loadRoles();
      loadResourceGroups();
      loadResources();
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

  const loadResourceGroups = async () => {
    if (!selectedTenant) return;
    try {
      const data = await resourceGroupApi.getByTenant(selectedTenant.id);
      setResourceGroups(data);
    } catch (err) {
      console.error('Failed to load resource groups:', err);
    }
  };

  const loadResources = async () => {
    if (!selectedTenant) return;
    try {
      const data = await resourceServiceApi.getByTenant(selectedTenant.id);
      setResources(data);
    } catch (err) {
      console.error('Failed to load resources:', err);
    }
  };

  useEffect(() => {
    // Build path options from groups and resources
    const options: PathOption[] = [];

    // Add group paths with all fields
    resourceGroups.forEach(group => {
      options.push({
        path: group.path,
        type: 'group',
        displayName: group.path,
        id: group.id,
        name: group.name,
        label: group.label,
      });
    });

    // Add resource paths with all fields
    resources.forEach(resource => {
      options.push({
        path: resource.path,
        type: 'resource',
        displayName: resource.path,
        id: resource.id,
        name: resource.name,
      });
    });

    // Sort by path ascending
    options.sort((a, b) => a.path.localeCompare(b.path));

    setPathOptions(options);
  }, [resourceGroups, resources]);

  useEffect(() => {
    // Close dropdown when clicking outside
    const handleClickOutside = (event: MouseEvent) => {
      if (pathSelectorRef.current && !pathSelectorRef.current.contains(event.target as Node)) {
        setPathSearchTerm('');
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, []);

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
    setPathSearchTerm('');
    setEditingGrant(null);
    setShowForm(false);
    setError(null);
  };

  const getPathType = (path: string): 'group' | 'resource' | 'custom' => {
    const option = pathOptions.find(opt => opt.path === path);
    return option ? option.type : 'custom';
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
              <div className="path-selector" ref={pathSelectorRef}>
                <input
                  type="text"
                  className="input"
                  value={formData.path}
                  onChange={(e) => {
                    setFormData({ ...formData, path: e.target.value });
                    setPathSearchTerm(e.target.value);
                  }}
                  placeholder="Search by ID, name, label, or path..."
                  required
                />
                {pathSearchTerm && (
                  <div className="path-dropdown">
                    {pathOptions
                      .filter(option => {
                        const searchTerm = pathSearchTerm.toLowerCase();
                        return (
                          option.path.toLowerCase().includes(searchTerm) ||
                          option.id.toLowerCase().includes(searchTerm) ||
                          option.name.toLowerCase().includes(searchTerm) ||
                          (option.label && option.label.toLowerCase().includes(searchTerm))
                        );
                      })
                      .slice(0, 10)
                      .map(option => (
                        <div
                          key={option.path}
                          className={`path-dropdown-item ${option.type}`}
                          onClick={() => {
                            setFormData({ ...formData, path: option.path });
                            setPathSearchTerm('');
                          }}
                        >
                          <div className="path-dropdown-info">
                            <span className="path-dropdown-path">{option.path}</span>
                            <span className="path-dropdown-details">
                              {option.id} • {option.name}
                              {option.label && ` • ${option.label}`}
                            </span>
                          </div>
                          <span className={`path-badge ${option.type}`}>
                            {option.type}
                          </span>
                        </div>
                      ))}
                    {pathOptions.filter(option => {
                      const searchTerm = pathSearchTerm.toLowerCase();
                      return (
                        option.path.toLowerCase().includes(searchTerm) ||
                        option.id.toLowerCase().includes(searchTerm) ||
                        option.name.toLowerCase().includes(searchTerm) ||
                        (option.label && option.label.toLowerCase().includes(searchTerm))
                      );
                    }).length === 0 && (
                      <div className="path-dropdown-item no-results">
                        No matches found
                      </div>
                    )}
                  </div>
                )}
              </div>
              <small className="form-hint">Search across all fields (ID, name, label, path) or type custom path with wildcards (e.g., /servers/*)</small>
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
          grants.map(grant => {
            const pathType = getPathType(grant.path);
            return (
              <div key={grant.uid} className="grant-card">
                <h3>{getSubjectName(grant.subject_uid)}</h3>
                <div className="grant-meta">
                  <div>Email: {getSubjectEmail(grant.subject_uid)}</div>
                  <div className="grant-path-row">
                    <span>Path: {grant.path}</span>
                    <span className={`path-badge ${pathType}`}>
                      {pathType}
                    </span>
                  </div>
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
            );
          })
        )}
      </div>
    </div>
  );
};

export default GrantList;
