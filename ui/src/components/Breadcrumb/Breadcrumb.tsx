import React from 'react';
import { Link, useLocation } from 'react-router-dom';
import './Breadcrumb.css';

interface BreadcrumbItem {
  label: string;
  path: string;
}

const Breadcrumb: React.FC = () => {
  const location = useLocation();

  const generateBreadcrumbs = (): BreadcrumbItem[] => {
    const pathnames = location.pathname.split('/').filter((x) => x);

    const breadcrumbs: BreadcrumbItem[] = [
      { label: 'Home', path: '/' }
    ];

    let currentPath = '';

    pathnames.forEach((segment, index) => {
      currentPath += `/${segment}`;
      
      // Generate label based on the segment
      let label = segment;
      
      // Handle special cases
      if (segment === 'tenants') {
        label = 'Tenants';
      } else if (segment === 'subjects') {
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
        label = 'Test Policy';
      } else if (index === 1 && segment.match(/^[0-9a-f-]{36}$/i)) {
        // This is a tenant ID
        label = 'Tenant';
      } else if (index === 2 && segment === 'policies') {
        // This is the policies page for a specific tenant
        label = 'Policies';
      } else if (index === 2 && segment === 'permissions') {
        label = 'Permissions';
      } else if (index === 2 && segment === 'roles') {
        label = 'Roles';
      } else if (index === 2 && segment === 'resource-groups') {
        label = 'Resource Groups';
      } else if (index === 2 && segment === 'resources') {
        label = 'Resources';
      } else if (index === 2 && segment === 'grants') {
        label = 'Grants';
      } else if (index === 2 && segment === 'test') {
        label = 'Test Policy';
      }

      breadcrumbs.push({ label, path: currentPath });
    });

    return breadcrumbs;
  };

  const breadcrumbs = generateBreadcrumbs();

  if (breadcrumbs.length === 1) {
    return null; // Don't show breadcrumbs if we're on the home page
  }

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
