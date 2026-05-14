import React, { useEffect, useState } from 'react';
import { useTenant } from '../../context/TenantContext';
import { useSubject } from '../../context/SubjectContext';
import {
  grantApi,
  roleApi,
  resourceGroupApi,
  resourceApi as resourceServiceApi,
} from '../../services/api';
import { Grant, Role, ResourceGroup, Resource } from '../../types';
import './Me.css';

const Me: React.FC = () => {
  const { selectedTenant } = useTenant();
  const { selectedSubject } = useSubject();
  const [grants, setGrants] = useState<Grant[]>([]);
  const [roles, setRoles] = useState<Role[]>([]);
  const [resources, setResources] = useState<Resource[]>([]);
  const [resourceGroups, setResourceGroups] = useState<ResourceGroup[]>([]);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (!selectedSubject || !selectedTenant) {
      setGrants([]);
      setRoles([]);
      setResources([]);
      setResourceGroups([]);
      return;
    }
    let cancelled = false;
    const load = async () => {
      try {
        setLoading(true);
        const [grantsRes, rolesRes, resourcesRes, groupsRes] = await Promise.all([
          grantApi.getBySubject(selectedTenant.id, selectedSubject.uid),
          roleApi.getByTenant(selectedTenant.id),
          resourceServiceApi.getByTenant(selectedTenant.id),
          resourceGroupApi.getByTenant(selectedTenant.id),
        ]);
        if (cancelled) return;
        setGrants(grantsRes);
        setRoles(rolesRes);
        setResources(resourcesRes);
        setResourceGroups(groupsRes);
      } catch (err) {
        console.error('Failed to load my access:', err);
      } finally {
        if (!cancelled) setLoading(false);
      }
    };
    load();
    return () => {
      cancelled = true;
    };
  }, [selectedSubject?.uid, selectedTenant?.id]);

  const handleRevokeGrant = async (grantUid: string) => {
    if (!selectedTenant) return;
    if (!window.confirm('Are you sure you want to revoke this grant?')) return;
    try {
      await grantApi.delete(selectedTenant.id, grantUid);
      setGrants((g) => g.filter((x) => x.uid !== grantUid));
    } catch (err) {
      console.error('Failed to revoke grant:', err);
      alert('Failed to revoke grant. Please try again.');
    }
  };

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

      {loading ? (
        <p className="loading">Loading…</p>
      ) : grants.length === 0 ? (
        <div className="context-card">
          <p className="no-access-text">
            You have no grants in this tenant. Use the <strong>Requests</strong> page
            to ask for access.
          </p>
        </div>
      ) : (
        <div className="context-card">
          <h3>Grants ({grants.length})</h3>
          <div className="grants-list">
            {grants.map((grant) => {
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
                    onClick={() => handleRevokeGrant(grant.uid)}
                    className="button button-danger button-small"
                  >
                    Revoke
                  </button>
                </div>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
};

export default Me;
