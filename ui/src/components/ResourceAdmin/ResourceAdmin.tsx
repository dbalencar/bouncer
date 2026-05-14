import React, { useEffect, useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useTenant } from '../../context/TenantContext';
import { useSubject } from '../../context/SubjectContext';
import {
  grantApi,
  roleApi,
  resourceApi as resourceServiceApi,
  resourceGroupApi,
  subjectApi,
} from '../../services/api';
import { Grant, Resource, ResourceGroup, Role, Subject } from '../../types';
import './ResourceAdmin.css';

// Mirrors grantService.subjectHasAdminOnPath: bidirectional prefix.
const isUnderAdminPath = (grantPath: string, adminPath: string): boolean =>
  grantPath.startsWith(adminPath) || adminPath.startsWith(grantPath);

const ResourceAdmin: React.FC = () => {
  const navigate = useNavigate();
  const { selectedTenant } = useTenant();
  const { selectedSubject } = useSubject();

  const [adminPaths, setAdminPaths] = useState<string[]>([]);
  const [allTenantGrants, setAllTenantGrants] = useState<Grant[]>([]);
  const [subjects, setSubjects] = useState<Subject[]>([]);
  const [roles, setRoles] = useState<Role[]>([]);
  const [resources, setResources] = useState<Resource[]>([]);
  const [resourceGroups, setResourceGroups] = useState<ResourceGroup[]>([]);
  const [editingGrant, setEditingGrant] = useState<Grant | null>(null);
  const [editingRoleUid, setEditingRoleUid] = useState<string>('');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const isTenantAdmin =
    !!selectedTenant && !!selectedSubject &&
    selectedTenant.admin_uid === selectedSubject.uid;

  const loadAll = async () => {
    if (!selectedTenant || !selectedSubject) return;
    try {
      setLoading(true);
      const [pathsRes, grantsAll, subjectsRes, rolesRes, resRes, groupRes] =
        await Promise.all([
          grantApi.getAdminPaths(selectedTenant.id, selectedSubject.uid),
          grantApi.getByTenant(selectedTenant.id),
          subjectApi.getAll(),
          roleApi.getByTenant(selectedTenant.id),
          resourceServiceApi.getByTenant(selectedTenant.id),
          resourceGroupApi.getByTenant(selectedTenant.id),
        ]);
      setAdminPaths(pathsRes);
      setAllTenantGrants(grantsAll);
      setSubjects(subjectsRes);
      setRoles(rolesRes);
      setResources(resRes);
      setResourceGroups(groupRes);
      setError(null);
    } catch (err) {
      console.error('Failed to load Resource Admin:', err);
      setError('Failed to load. Try again.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (!selectedSubject || !selectedTenant) return;
    // Tenant admins have a richer Grants page; bounce them there.
    if (isTenantAdmin) {
      navigate(`/tenants/${selectedTenant.id}/grants`, { replace: true });
      return;
    }
    loadAll();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selectedSubject?.uid, selectedTenant?.id, isTenantAdmin]);

  // Subjects without any admin paths shouldn't have a route here.
  // Defensive redirect for direct-URL visits.
  useEffect(() => {
    if (!loading && !error && !isTenantAdmin && adminPaths.length === 0 && selectedTenant && selectedSubject) {
      navigate('/me', { replace: true });
    }
  }, [loading, error, isTenantAdmin, adminPaths.length, selectedTenant, selectedSubject, navigate]);

  const getPathLabel = (path: string): { label: string; kind: 'group' | 'resource' | 'custom' } => {
    const group = resourceGroups.find((g) => g.path === path);
    if (group) return { label: group.name, kind: 'group' };
    const resource = resources.find((r) => r.path === path);
    if (resource) return { label: resource.name, kind: 'resource' };
    return { label: path, kind: 'custom' };
  };

  const grantsByAdminPath = useMemo(() => {
    const map = new Map<string, Grant[]>();
    for (const adminPath of adminPaths) {
      map.set(
        adminPath,
        allTenantGrants.filter((g) => isUnderAdminPath(g.path, adminPath))
      );
    }
    return map;
  }, [adminPaths, allTenantGrants]);

  const handleStartEdit = (grant: Grant) => {
    setEditingGrant(grant);
    setEditingRoleUid(grant.role_uid);
  };

  const handleCancelEdit = () => {
    setEditingGrant(null);
    setEditingRoleUid('');
  };

  const handleSaveEdit = async () => {
    if (!editingGrant || !selectedTenant) return;
    if (!editingRoleUid || editingRoleUid === editingGrant.role_uid) {
      handleCancelEdit();
      return;
    }
    try {
      await grantApi.update(selectedTenant.id, editingGrant.uid, {
        role_uid: editingRoleUid,
      });
      await loadAll();
      handleCancelEdit();
    } catch (err: any) {
      setError(err.response?.data?.error || 'Failed to update grant');
    }
  };

  const handleDelete = async (grant: Grant) => {
    if (!selectedTenant || !selectedSubject) return;
    const ownAdminGrant =
      grant.subject_uid === selectedSubject.uid &&
      adminPaths.includes(grant.path);
    const confirmMsg = ownAdminGrant
      ? 'Deleting this grant will revoke your own admin access on this path. Continue?'
      : 'Are you sure you want to delete this grant?';
    if (!window.confirm(confirmMsg)) return;
    try {
      await grantApi.delete(selectedTenant.id, grant.uid);
      await loadAll();
    } catch (err: any) {
      setError(err.response?.data?.error || 'Failed to delete grant');
    }
  };

  if (!selectedSubject) {
    return (
      <div className="resource-admin">
        <h2>Resource Admin</h2>
        <p className="no-context">No subject selected. Please log in.</p>
      </div>
    );
  }

  if (!selectedTenant) {
    return (
      <div className="resource-admin">
        <h2>Resource Admin</h2>
        <p className="no-context">
          Pick a tenant from the sidebar dropdown to manage admin paths.
        </p>
      </div>
    );
  }

  if (isTenantAdmin) return null;

  if (loading) {
    return (
      <div className="resource-admin">
        <h2>Resource Admin</h2>
        <p className="loading">Loading…</p>
      </div>
    );
  }

  if (adminPaths.length === 0) {
    // Effect above redirects to /me; this is the in-between render.
    return null;
  }

  return (
    <div className="resource-admin">
      <h2>Resource Admin in {selectedTenant.name}</h2>
      <p className="resource-admin-hint">
        You have the <code>admin</code> permission on the paths below. Manage
        grants others hold on these resources and groups.
      </p>

      {error && <div className="error">{error}</div>}

      {adminPaths.map((adminPath) => {
        const pathLabel = getPathLabel(adminPath);
        const pathGrants = grantsByAdminPath.get(adminPath) || [];
        return (
          <div key={adminPath} className="admin-path-section">
            <div className="admin-path-header">
              <h3>
                <span className="admin-path">{adminPath}</span>{' '}
                <span className={`path-badge ${pathLabel.kind}`}>{pathLabel.kind}</span>
              </h3>
              <p className="admin-path-meta">{pathLabel.label}</p>
            </div>

            {pathGrants.length === 0 ? (
              <p className="empty-state">No grants on this path yet.</p>
            ) : (
              <div className="grants-grid">
                {pathGrants.map((grant) => {
                  const subj = subjects.find((s) => s.uid === grant.subject_uid);
                  const isEditing = editingGrant?.uid === grant.uid;
                  return (
                    <div key={grant.uid} className="grant-card">
                      <h4>{subj ? subj.username : 'unknown subject'}</h4>
                      <div className="grant-meta">
                        {subj && <div>Email: {subj.email}</div>}
                        <div>Path: {grant.path}</div>
                        <div>
                          Role:{' '}
                          {isEditing ? (
                            <select
                              className="input role-select"
                              value={editingRoleUid}
                              onChange={(e) => setEditingRoleUid(e.target.value)}
                            >
                              {roles.map((r) => (
                                <option key={r.uid} value={r.uid}>
                                  {r.name}
                                </option>
                              ))}
                            </select>
                          ) : (
                            roles.find((r) => r.uid === grant.role_uid)?.name ||
                            grant.role_uid
                          )}
                        </div>
                      </div>
                      <div className="grant-actions">
                        {isEditing ? (
                          <>
                            <button
                              className="button button-primary"
                              onClick={handleSaveEdit}
                            >
                              Save
                            </button>
                            <button className="button" onClick={handleCancelEdit}>
                              Cancel
                            </button>
                          </>
                        ) : (
                          <>
                            <button
                              className="button button-primary"
                              onClick={() => handleStartEdit(grant)}
                            >
                              Edit
                            </button>
                            <button
                              className="button button-danger"
                              onClick={() => handleDelete(grant)}
                            >
                              Delete
                            </button>
                          </>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        );
      })}
    </div>
  );
};

export default ResourceAdmin;
