import React, { useEffect, useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useTenant } from '../../context/TenantContext';
import { useSubject } from '../../context/SubjectContext';
import {
  grantApi,
  roleApi,
  subjectApi,
  tenantApi,
  resourceApi as resourceServiceApi,
  resourceGroupApi,
} from '../../services/api';
import { Grant, Role, Subject, Resource, ResourceGroup } from '../../types';
import './AccessManager.css';

const isUnderAdminPath = (grantPath: string, adminPath: string): boolean => {
  // Mirrors grantService.subjectHasAdminOnPath: bidirectional prefix.
  return grantPath.startsWith(adminPath) || adminPath.startsWith(grantPath);
};

const AccessManager: React.FC = () => {
  const navigate = useNavigate();
  const { selectedTenant } = useTenant();
  const { selectedSubject } = useSubject();

  const [adminPaths, setAdminPaths] = useState<string[]>([]);
  const [grants, setGrants] = useState<Grant[]>([]);
  const [subjects, setSubjects] = useState<Subject[]>([]);
  const [roles, setRoles] = useState<Role[]>([]);
  const [resources, setResources] = useState<Resource[]>([]);
  const [resourceGroups, setResourceGroups] = useState<ResourceGroup[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [editingGrant, setEditingGrant] = useState<Grant | null>(null);
  const [editingRoleUid, setEditingRoleUid] = useState<string>('');
  const [isTenantAdmin, setIsTenantAdmin] = useState(false);

  useEffect(() => {
    let cancelled = false;
    const checkAdminThenLoad = async () => {
      if (!selectedTenant || !selectedSubject) return;
      try {
        const tenants = await tenantApi.getAll();
        const tenantAdmin = tenants.some(
          (t) => t.id === selectedTenant.id && t.admin_uid === selectedSubject.uid
        );
        if (cancelled) return;
        if (tenantAdmin) {
          setIsTenantAdmin(true);
          navigate('/admin');
          return;
        }
        await loadAll();
      } catch (err) {
        if (!cancelled) {
          setError('Failed to load tenant info');
          console.error(err);
        }
      }
    };
    checkAdminThenLoad();
    return () => {
      cancelled = true;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selectedTenant?.id, selectedSubject?.uid]);

  const loadAll = async () => {
    if (!selectedTenant || !selectedSubject) return;
    try {
      setLoading(true);
      const [pathsRes, grantsRes, subjectsRes, rolesRes, resRes, groupRes] =
        await Promise.all([
          grantApi.getAdminPaths(selectedTenant.id, selectedSubject.uid),
          grantApi.getByTenant(selectedTenant.id),
          subjectApi.getAll(),
          roleApi.getByTenant(selectedTenant.id),
          resourceServiceApi.getByTenant(selectedTenant.id),
          resourceGroupApi.getByTenant(selectedTenant.id),
        ]);
      setAdminPaths(pathsRes);
      setGrants(grantsRes);
      setSubjects(subjectsRes);
      setRoles(rolesRes);
      setResources(resRes);
      setResourceGroups(groupRes);
      setError(null);
    } catch (err) {
      setError('Failed to load access data');
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const grantsByAdminPath = useMemo(() => {
    const map = new Map<string, Grant[]>();
    for (const adminPath of adminPaths) {
      const matches = grants.filter((g) => isUnderAdminPath(g.path, adminPath));
      map.set(adminPath, matches);
    }
    return map;
  }, [adminPaths, grants]);

  const getSubject = (uid: string) => subjects.find((s) => s.uid === uid);
  const getRoleName = (uid: string) => roles.find((r) => r.uid === uid)?.name || uid;
  const getPathLabel = (path: string): { label: string; kind: 'group' | 'resource' | 'custom' } => {
    const group = resourceGroups.find((g) => g.path === path);
    if (group) return { label: group.name, kind: 'group' };
    const resource = resources.find((r) => r.path === path);
    if (resource) return { label: resource.name, kind: 'resource' };
    return { label: path, kind: 'custom' };
  };

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
      <div className="access-manager">
        <h2>Access</h2>
        <p className="no-context">No subject selected. Please select a subject to act as.</p>
      </div>
    );
  }

  if (!selectedTenant) {
    return (
      <div className="access-manager">
        <h2>Access</h2>
        <p className="no-context">No tenant selected. Please select a tenant from the Me page.</p>
        <button onClick={() => navigate('/me')} className="button button-primary">
          Go to Me
        </button>
      </div>
    );
  }

  if (isTenantAdmin) return null;

  if (loading) {
    return (
      <div className="access-manager">
        <h2>Access</h2>
        <p className="loading">Loading…</p>
      </div>
    );
  }

  return (
    <div className="access-manager">
      <h2>Access</h2>
      <p className="subtitle">
        Manage existing grants on paths where you have the <code>admin</code> permission.
      </p>

      {error && <div className="error">{error}</div>}

      {adminPaths.length === 0 ? (
        <div className="context-card">
          <p className="no-context">
            You have no admin paths in <strong>{selectedTenant.name}</strong>. Ask a
            tenant admin to grant you a role containing the <code>admin</code> permission
            on a group or resource.
          </p>
        </div>
      ) : (
        adminPaths.map((adminPath) => {
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
                    const subj = getSubject(grant.subject_uid);
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
                              getRoleName(grant.role_uid)
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
        })
      )}
    </div>
  );
};

export default AccessManager;
