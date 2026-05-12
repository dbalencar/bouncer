import React, { useState, useEffect, useRef } from 'react';
import { grantRequestApi, roleApi, resourceGroupApi, resourceApi as resourceServiceApi } from '../../services/api';
import { Role, ResourceGroup, Resource } from '../../types';
import './GrantRequestForm.css';

interface GrantRequestFormProps {
  schemaName: string;
  subjectUid: string;
  onRequestCreated?: () => void;
}

interface PathOption {
  path: string;
  type: 'group' | 'resource';
  displayName: string;
  id: string;
  name: string;
  label?: string;
}

const GrantRequestForm: React.FC<GrantRequestFormProps> = ({ schemaName, subjectUid, onRequestCreated }) => {
  const [roles, setRoles] = useState<Role[]>([]);
  const [resourceGroups, setResourceGroups] = useState<ResourceGroup[]>([]);
  const [resources, setResources] = useState<Resource[]>([]);
  const [pathOptions, setPathOptions] = useState<PathOption[]>([]);
  const [pathSearchTerm, setPathSearchTerm] = useState('');
  const [selectedRoleUid, setSelectedRoleUid] = useState('');
  const [selectedPath, setSelectedPath] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const pathSelectorRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    loadRoles();
    loadResourceGroups();
    loadResources();
  }, [schemaName]);

  useEffect(() => {
    // Build path options from groups and resources
    const options: PathOption[] = [];

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

    resources.forEach(resource => {
      options.push({
        path: resource.path,
        type: 'resource',
        displayName: resource.path,
        id: resource.id,
        name: resource.name,
      });
    });

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

  const loadRoles = async () => {
    try {
      const data = await roleApi.getByTenant(schemaName);
      setRoles(data);
    } catch (err) {
      console.error('Failed to load roles:', err);
    }
  };

  const loadResourceGroups = async () => {
    try {
      const data = await resourceGroupApi.getByTenant(schemaName);
      setResourceGroups(data);
    } catch (err) {
      console.error('Failed to load resource groups:', err);
    }
  };

  const loadResources = async () => {
    try {
      const data = await resourceServiceApi.getByTenant(schemaName);
      setResources(data);
    } catch (err) {
      console.error('Failed to load resources:', err);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedPath || !selectedRoleUid) {
      setError('Path and role are required');
      return;
    }

    try {
      setLoading(true);
      await grantRequestApi.create(schemaName, {
        subject_uid: subjectUid,
        path: selectedPath,
        role_uid: selectedRoleUid,
      });
      setSelectedPath('');
      setPathSearchTerm('');
      setSelectedRoleUid('');
      setError(null);
      if (onRequestCreated) onRequestCreated();
    } catch (err: any) {
      setError(err.response?.data?.message || 'Failed to create grant request');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="grant-request-form">
      <h3>Request New Grant</h3>
      {error && <div className="error">{error}</div>}

      <form onSubmit={handleSubmit}>
        <div className="form-group">
          <label>Path:</label>
          <div className="path-selector" ref={pathSelectorRef}>
            <input
              type="text"
              className="input"
              value={pathSearchTerm || selectedPath}
              onChange={(e) => {
                setPathSearchTerm(e.target.value);
                setSelectedPath('');
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
                        setSelectedPath(option.path);
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
            value={selectedRoleUid}
            onChange={(e) => setSelectedRoleUid(e.target.value)}
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

        <button type="submit" className="button button-primary" disabled={loading}>
          {loading ? 'Submitting...' : 'Submit Request'}
        </button>
      </form>
    </div>
  );
};

export default GrantRequestForm;
