import React, { useEffect, useState } from 'react';
import { Link, useLocation } from 'react-router-dom';
import { tenantApi } from '../../services/api';
import { Tenant } from '../../types';
import './Breadcrumb.css';

interface BreadcrumbItem {
  label: string;
  path: string;
  // Tenant-name middle crumbs are not directly clickable — no useful
  // "tenant landing" exists anymore (tenant switching lives in the
  // sidebar dropdown).
  clickable: boolean;
}

const labelForSegment = (segment: string): string | null => {
  switch (segment) {
    case 'subjects': return 'Subjects';
    case 'me': return 'My Access';
    case 'policies': return 'Policies';
    case 'permissions': return 'Permissions';
    case 'roles': return 'Roles';
    case 'resource-groups': return 'Resource Groups';
    case 'resources': return 'Resources';
    case 'grants': return 'Grants';
    case 'grant-requests': return 'Grant Requests';
    case 'resource-admin': return 'Resource Admin';
    case 'audit-log': return 'Audit Log';
    case 'test': return 'Policy Test';
    case 'tenants': return null; // never appears as a crumb on its own
    case 'callback': return null;
    default: return segment;
  }
};

const Breadcrumb: React.FC = () => {
  const location = useLocation();
  const [tenants, setTenants] = useState<Tenant[]>([]);

  useEffect(() => {
    tenantApi.getAll().then(setTenants).catch((err) => {
      console.error('Failed to load tenants for breadcrumb:', err);
    });
  }, []);

  const generateBreadcrumbs = (): BreadcrumbItem[] => {
    const segments = location.pathname.split('/').filter((x) => x);
    const crumbs: BreadcrumbItem[] = [];
    let currentPath = '';

    segments.forEach((segment) => {
      currentPath += `/${segment}`;
      if (segment === 'tenants') return; // skip the literal route prefix

      // Tenant id → tenant name (non-clickable label)
      if (/^[0-9a-f-]{36}$/i.test(segment)) {
        const tenant = tenants.find((t) => t.id === segment);
        crumbs.push({
          label: tenant ? tenant.name : segment,
          path: currentPath,
          clickable: false,
        });
        return;
      }

      const label = labelForSegment(segment);
      if (label === null) return;
      crumbs.push({ label, path: currentPath, clickable: true });
    });

    return crumbs;
  };

  const breadcrumbs = generateBreadcrumbs();

  // Single-crumb breadcrumbs are noise — the page's own H2 covers it.
  // Empty breadcrumbs (root path) likewise.
  if (breadcrumbs.length < 2) {
    return null;
  }

  return (
    <nav className="breadcrumb">
      {breadcrumbs.map((breadcrumb, index) => {
        const isLast = index === breadcrumbs.length - 1;
        const showAsLink = breadcrumb.clickable && !isLast;
        return (
          <React.Fragment key={breadcrumb.path}>
            {showAsLink ? (
              <Link to={breadcrumb.path} className="breadcrumb-item">
                {breadcrumb.label}
              </Link>
            ) : (
              <span
                className={`breadcrumb-item ${isLast ? 'breadcrumb-active' : ''}`}
              >
                {breadcrumb.label}
              </span>
            )}
            {!isLast && <span className="breadcrumb-separator">/</span>}
          </React.Fragment>
        );
      })}
    </nav>
  );
};

export default Breadcrumb;
