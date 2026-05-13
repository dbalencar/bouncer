import React, { useEffect, useState } from 'react';
import { Link, useLocation } from 'react-router-dom';
import { tenantApi } from '../../services/api';
import { Tenant } from '../../types';
import { useSubject } from '../../context/SubjectContext';
import './Breadcrumb.css';

interface BreadcrumbItem {
  label: string;
  path: string;
}

const Breadcrumb: React.FC = () => {
  const location = useLocation();
  const { selectedSubject } = useSubject();
  const [tenants, setTenants] = useState<Tenant[]>([]);

  useEffect(() => {
    loadTenants();
  }, []);

  const loadTenants = async () => {
    try {
      const data = await tenantApi.getAll();
      setTenants(data);
    } catch (err) {
      console.error('Failed to load tenants:', err);
    }
  };

  const isTenantAdmin = !!selectedSubject &&
    tenants.some(t => t.admin_uid === selectedSubject.uid);

  const generateBreadcrumbs = (): BreadcrumbItem[] => {
    const pathnames = location.pathname.split('/').filter((x) => x);

    // Home/Tenants path depends on authentication state and role
    let homePath = '/';
    let homeLabel = 'Home';
    if (selectedSubject) {
      homePath = isTenantAdmin ? '/admin' : '/me';
      homeLabel = 'Tenants';
    }

    const breadcrumbs: BreadcrumbItem[] = [
      { label: homeLabel, path: homePath }
    ];

    let currentPath = '';

    pathnames.forEach((segment, index) => {
      currentPath += `/${segment}`;

      // Skip the 'tenants' segment
      if (segment === 'tenants') {
        return;
      }

      // Generate label based on the segment
      let label = segment;

      // Handle special cases
      if (segment === 'subjects') {
        label = 'Subjects';
      } else if (segment === 'me') {
        label = 'Me';
      } else if (segment === 'admin') {
        label = 'Admin';
      } else if (segment === 'requests') {
        label = 'Requests';
      } else if (segment === 'policies') {
        label = 'Policies';
      } else if (segment === 'permissions') {
        label = 'Permissions';
      } else if (segment === 'roles') {
        label = 'Roles';
      } else if (segment === 'resource-groups') {
        label = 'Resource Groups';
      } else if (segment === 'resources') {
        label = 'Resources';
      } else if (segment === 'grants') {
        label = 'Grants';
      } else if (segment === 'test') {
        label = 'Policy Test';
      } else if (segment.match(/^[0-9a-f-]{36}$/i)) {
        // This is a tenant ID - look up the tenant name
        const tenant = tenants.find(t => t.id === segment);
        label = tenant ? tenant.name : segment;
      }

      breadcrumbs.push({ label, path: currentPath });
    });

    return breadcrumbs;
  };

  const breadcrumbs = generateBreadcrumbs();

  return (
    <nav className="breadcrumb">
      {breadcrumbs.map((breadcrumb, index) => {
        const isLast = index === breadcrumbs.length - 1;
        
        return (
          <React.Fragment key={breadcrumb.path}>
            {isLast ? (
              <span className="breadcrumb-item breadcrumb-active">
                {breadcrumb.label}
              </span>
            ) : (
              <Link to={breadcrumb.path} className="breadcrumb-item">
                {breadcrumb.label}
              </Link>
            )}
            {!isLast && <span className="breadcrumb-separator">/</span>}
          </React.Fragment>
        );
      })}
    </nav>
  );
};

export default Breadcrumb;
