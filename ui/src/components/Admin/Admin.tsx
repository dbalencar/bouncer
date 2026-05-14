import React, { useState, useEffect } from 'react';
import { useSubject } from '../../context/SubjectContext';
import { tenantApi } from '../../services/api';
import { Tenant } from '../../types';
import './Admin.css';

const Admin: React.FC = () => {
  const [adminTenants, setAdminTenants] = useState<Tenant[]>([]);
  const [loading, setLoading] = useState(true);
  const { selectedSubject } = useSubject();

  useEffect(() => {
    if (!selectedSubject) {
      setAdminTenants([]);
      setLoading(false);
      return;
    }
    let cancelled = false;
    const load = async () => {
      try {
        setLoading(true);
        const allTenants = await tenantApi.getAll();
        if (cancelled) return;
        setAdminTenants(allTenants.filter((t) => t.admin_uid === selectedSubject.uid));
      } catch (err) {
        console.error('Failed to load admin tenants:', err);
      } finally {
        if (!cancelled) setLoading(false);
      }
    };
    load();
    return () => {
      cancelled = true;
    };
  }, [selectedSubject?.uid]);

  if (!selectedSubject) {
    return (
      <div className="admin">
        <h2>Admin Dashboard</h2>
        <p className="no-context">No subject selected. Please log in.</p>
      </div>
    );
  }

  if (loading) {
    return <div className="loading">Loading…</div>;
  }

  return (
    <div className="admin">
      <h2>Admin Dashboard</h2>

      {selectedSubject.is_platform_admin && (
        <div className="context-card">
          <h3>Platform admin</h3>
          <p>
            You can create new tenants from the <strong>+</strong> button next to
            the tenant picker in the sidebar.
          </p>
        </div>
      )}

      <div className="context-card">
        <h3>Tenants you administer</h3>
        {adminTenants.length === 0 ? (
          <p className="no-tenants">
            You are not the admin of any tenant. Switch tenants from the
            sidebar dropdown to see what you have access to.
          </p>
        ) : (
          <>
            <p className="admin-hint">
              Pick one from the sidebar dropdown to manage it.
            </p>
            <ul className="admin-tenant-names">
              {adminTenants.map((t) => (
                <li key={t.id}>
                  <span className="admin-tenant-name">{t.name}</span>
                  <span className="admin-tenant-schema">{t.schema_name}</span>
                </li>
              ))}
            </ul>
          </>
        )}
      </div>
    </div>
  );
};

export default Admin;
