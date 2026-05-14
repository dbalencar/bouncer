import React, { useEffect, useState } from 'react';
import { useTenant } from '../../context/TenantContext';
import { useSubject } from '../../context/SubjectContext';
import {
  grantApi,
  roleApi,
  resourceApi as resourceServiceApi,
  resourceGroupApi,
} from '../../services/api';
import { Grant, Resource, ResourceGroup, Role } from '../../types';
import GrantRequestList from '../GrantRequestList/GrantRequestList';
import GrantRequestForm from '../GrantRequestForm/GrantRequestForm';
import './Me.css';

const Me: React.FC = () => {
  const { selectedTenant } = useTenant();
  const { selectedSubject } = useSubject();

  const [myGrants, setMyGrants] = useState<Grant[]>([]);
  const [roles, setRoles] = useState<Role[]>([]);
  const [resources, setResources] = useState<Resource[]>([]);
  const [resourceGroups, setResourceGroups] = useState<ResourceGroup[]>([]);

  const [showRequestForm, setShowRequestForm] = useState(false);
  const [requestListKey, setRequestListKey] = useState(0);

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const loadAll = async () => {
    if (!selectedTenant || !selectedSubject) return;
    try {
      setLoading(true);
      const [grantsMine, rolesRes, resRes, groupRes] = await Promise.all([
        grantApi.getBySubject(selectedTenant.id, selectedSubject.uid),
        roleApi.getByTenant(selectedTenant.id),
        resourceServiceApi.getByTenant(selectedTenant.id),
        resourceGroupApi.getByTenant(selectedTenant.id),
      ]);
      setMyGrants(grantsMine);
      setRoles(rolesRes);
      setResources(resRes);
      setResourceGroups(groupRes);
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
      return;
    }
    loadAll();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selectedSubject?.uid, selectedTenant?.id]);

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

      {/* Section 1: Grants */}
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

      {/* Section 2: Requests */}
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
    </div>
  );
};

export default Me;
