import React from 'react';
import { Link, useLocation } from 'react-router-dom';
import { useTenant } from '../../context/TenantContext';
import './Layout.css';

const Layout: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const location = useLocation();
  const { selectedTenant, clearTenant } = useTenant();

  return (
    <div className="layout">
      <header className="header">
        <div className="header-content">
          <h1 className="logo">
            <Link to="/">Bouncer</Link>
          </h1>
          <nav className="nav">
            <Link to="/tenants" className={location.pathname === '/tenants' ? 'active' : ''}>
              Tenants
            </Link>
            <Link to="/subjects" className={location.pathname === '/subjects' ? 'active' : ''}>
              Subjects
            </Link>
            {selectedTenant && (
              <>
                <Link 
                  to={`/tenants/${selectedTenant.id}/policies`} 
                  className={location.pathname.includes('/policies') ? 'active' : ''}
                >
                  Policies
                </Link>
                <Link
                  to={`/tenants/${selectedTenant.id}/permissions`}
                  className={location.pathname.includes('/permissions') ? 'active' : ''}
                >
                  Permissions
                </Link>
                <Link
                  to={`/tenants/${selectedTenant.id}/roles`}
                  className={location.pathname.includes('/roles') ? 'active' : ''}
                >
                  Roles
                </Link>
                <Link
                  to={`/tenants/${selectedTenant.id}/resource-groups`}
                  className={location.pathname.includes('/resource-groups') ? 'active' : ''}
                >
                  Resource Groups
                </Link>
                <Link
                  to={`/tenants/${selectedTenant.id}/resources`}
                  className={location.pathname.includes('/resources') ? 'active' : ''}
                >
                  Resources
                </Link>
                <Link
                  to={`/tenants/${selectedTenant.id}/grants`}
                  className={location.pathname.includes('/grants') ? 'active' : ''}
                >
                  Grants
                </Link>
                <Link
                  to={`/tenants/${selectedTenant.id}/test`}
                  className={location.pathname.includes('/test') ? 'active' : ''}
                >
                  Test Policy
                </Link>
                <span className="tenant-indicator">
                  {selectedTenant.name}
                </span>
                <button onClick={clearTenant} className="clear-tenant">
                  Clear Tenant
                </button>
              </>
            )}
          </nav>
        </div>
      </header>
      <main className="main">
        {children}
      </main>
    </div>
  );
};

export default Layout;
