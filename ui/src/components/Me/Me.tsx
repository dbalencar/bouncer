import React, { useEffect, useMemo, useState } from 'react';
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
import GrantRequestList from '../GrantRequestList/GrantRequestList';
import GrantRequestForm from '../GrantRequestForm/GrantRequestForm';
import './Me.css';

// Mirrors grantService.subjectHasAdminOnPath: bidirectional prefix.
const isUnderAdminPath = (grantPath: string, adminPath: string): boolean =>
  grantPath.startsWith(adminPath) || adminPath.startsWith(grantPath);

const Me: React.FC = () => {
  const { selectedTenant } = useTenant();
  const { selectedSubject } = useSubject();

  // My grants in this tenant
  const [myGrants, setMyGrants] = useState<Grant[]>([]);

  // Lookup tables for labelling grants and admin-path rows
  const [roles, setRoles] = useState<Role[]>([]);
  const [resources, setResources] = useState<Resource[]>([]);
  const [resourceGroups, setResourceGroups] = useState<ResourceGroup[]>([]);

  // Paths-you-administer section
  const [adminPaths, setAdminPaths] = useState<string[]>([]);
  const [allTenantGrants, setAllTenantGrants] = useState<Grant[]>([]);
  const [subjects, setSubjects] = useState<Subject[]>([]);
  const [editingGrant, setEditingGrant] = useState<Grant | null>(null);
  const [editingRoleUid, setEditingRoleUid] = useState<string>('');

  // Requests section state
  const [showRequestForm, setShowRequestForm] = useState(false);
  const [requestListKey, setRequestListKey] = useState(0);

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const isTenantAdmin =
    !!selectedTenant && !!selectedSubject &&
    selectedTenant.admin_uid === selectedSubject.uid;

  const loadAll = async () => {
    if (!selectedTenant || !selectedSubject) return;
    try {
      setLoading(true);
      const [grantsMine, rolesRes, resRes, groupRes, pathsRes, grantsAll, subjectsRes] =
        await Promise.all([
          grantApi.getBySubject(selectedTenant.id, selectedSubject.uid),
          roleApi.getByTenant(selectedTenant.id),
          resourceServiceApi.getByTenant(selectedTenant.id),
          resourceGroupApi.getByTenant(selectedTenant.id),
          grantApi.getAdminPaths(selectedTenant.id, selectedSubject.uid),
          // Only fetch the full tenant grant list when we'll actually
          // need it. Cheap to defer this if the user has no admin
          // paths — but the helper endpoints don't expose "is there
          // any admin path?" cheaply, so pay the cost up front.
          grantApi.getByTenant(selectedTenant.id),
          subjectApi.getAll(),
        ]);
      setMyGrants(grantsMine);
      setRoles(rolesRes);
      setResources(resRes);
      setResourceGroups(groupRes);
      setAdminPaths(pathsRes);
      setAllTenantGrants(grantsAll);
      setSubjects(subjectsRes);
      setError(null);
    } catch (err) {
      console.error('Failed to load My Access:', err);
      setError('Failed to load. Try again.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (!selectedSubject || !selectedTenant) {
      setMyGrants([]);
      setRoles([]);
      setResources([]);
      setResourceGroups([]);
      setAdminPaths([]);
      setAllTenantGrants([]);
      setSubjects([]);
      return;
    }
    loadAll();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selectedSubject?.uid, selectedTenant?.id]);

  // ── helpers ───────────────────────────────────────────────────
  const grantDetails = (grant: Grant) => {
    const role = roles.find((r) => r.uid === grant.role_uid);
    const resource = resources.find((r) => r.path === grant.path);
    const group = resourceGroups.find((rg) => rg.path === grant.path);
    let label = grant.path;
    let kind: 'resource' | 'group' | undefined;
    if (resource) {
      label = resource.name;
      kind = 'resource';
    } else if (group) {
      label = group.name;
      kind = 'group';
    }
    return { roleName: role?.name || grant.role_uid, label, kind };
  };

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

  // ── handlers ──────────────────────────────────────────────────
  const handleRevokeMyGrant = async (grantUid: string) => {
    if (!selectedTenant) return;
    if (!window.confirm('Are you sure you want to revoke this grant?')) return;
    try {
      await grantApi.delete(selectedTenant.id, grantUid);
      await loadAll();
    } catch (err) {
      console.error('Failed to revoke grant:', err);
      setError('Failed to revoke grant.');
    }
  };

  const handleRequestCreated = () => {
    setRequestListKey((n) => n + 1);
    setShowRequestForm(false);
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

  const handleDeleteAdminPathGrant = async (grant: Grant) => {
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

  // ── render ────────────────────────────────────────────────────
  if (!selectedSubject) {
    return (
      <div className="me">
        <h2>My Access</h2>
        <p className="no-context">No subject selected. Please log in.</p>
      </div>
    );
  }

  if (!selectedTenant) {
    return (
      <div className="me">
        <h2>My Access</h2>
        <p className="no-context">
          Pick a tenant from the sidebar dropdown to see your access.
        </p>
      </div>
    );
  }

  return (
    <div className="me">
      <h2>My Access in {selectedTenant.name}</h2>

      {error && <div className="error">{error}</div>}
      {loading && <p className="loading">Loading…</p>}

      {/* Section 1: Grants ─────────────────────────────────────── */}
      <section className="me-section">
        <h3 className="me-section-title">Grants</h3>
        {myGrants.length === 0 ? (
          <p className="no-access-text">
            You have no grants in this tenant. Use the Requests section below to
            ask for access.
          </p>
        ) : (
          <div className="grants-list">
            {myGrants.map((grant) => {
              const d = grantDetails(grant);
              return (
                <div key={grant.uid} className="grant-item">
                  <div className="grant-info">
                    <span className="grant-resource">{d.label}</span>
                    {d.kind && (
                      <span className={`resource-type-badge ${d.kind}`}>{d.kind}</span>
                    )}
                    <span className="grant-role">{d.roleName}</span>
                  </div>
                  <button
                    onClick={() => handleRevokeMyGrant(grant.uid)}
                    className="button button-danger button-small"
                  >
                    Revoke
                  </button>
                </div>
              );
            })}
          </div>
        )}
      </section>

      {/* Section 2: Requests ───────────────────────────────────── */}
      <section className="me-section">
        <h3 className="me-section-title">Requests</h3>

        <GrantRequestList
          key={requestListKey}
          schemaName={selectedTenant.schema_name}
          tenantId={selectedTenant.id}
          subjectUid={selectedSubject.uid}
          onRequestCreated={() => setRequestListKey((n) => n + 1)}
        />

        {showRequestForm ? (
          <div className="me-request-form">
            <div className="me-request-form-header">
              <h4>Request new grant</h4>
              <button className="button" onClick={() => setShowRequestForm(false)}>
                Cancel
              </button>
            </div>
            <GrantRequestForm
              tenantId={selectedTenant.id}
              schemaName={selectedTenant.schema_name}
              subjectUid={selectedSubject.uid}
              onRequestCreated={handleRequestCreated}
            />
          </div>
        ) : (
          <button
            className="button button-primary"
            onClick={() => setShowRequestForm(true)}
          >
            Request new grant
          </button>
        )}
      </section>

      {/* Section 3: Paths you administer (conditional) ─────────── */}
      {!isTenantAdmin && adminPaths.length > 0 && (
        <section className="me-section">
          <h3 className="me-section-title">Paths you administer</h3>
          <p className="me-section-hint">
            You have the <code>admin</code> permission on these paths. You can
            view, change roles on, or revoke grants under each.
          </p>

          {adminPaths.map((adminPath) => {
            const pathLabel = getPathLabel(adminPath);
            const pathGrants = grantsByAdminPath.get(adminPath) || [];
            return (
              <div key={adminPath} className="admin-path-section">
                <div className="admin-path-header">
                  <h4>
                    <span className="admin-path">{adminPath}</span>{' '}
                    <span className={`path-badge ${pathLabel.kind}`}>{pathLabel.kind}</span>
                  </h4>
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
                          <h5>{subj ? subj.username : 'unknown subject'}</h5>
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
                                  onClick={() => handleDeleteAdminPathGrant(grant)}
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
        </section>
      )}
    </div>
  );
};

export default Me;
