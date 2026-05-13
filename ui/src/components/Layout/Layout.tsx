import React from 'react';
import { useLocation } from 'react-router-dom';
import { tenantApi } from '../../services/api';
import { Tenant } from '../../types';
import Breadcrumb from '../Breadcrumb/Breadcrumb';
import Sidebar from '../Sidebar/Sidebar';
import './Layout.css';

const Layout: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const location = useLocation();
  const [tenants, setTenants] = React.useState<Tenant[]>([]);

  React.useEffect(() => {
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

  const getPageTitle = () => {
    const path = location.pathname;
    if (path === '/') return 'Home';
    if (path === '/me') return 'Me';
    if (path === '/requests') return 'Requests';
    if (path === '/admin') return 'Admin';
    if (path === '/tenants') return 'Tenants';
    if (path === '/subjects') return 'Subjects';
    if (path.startsWith('/tenants/')) {
      const parts = path.split('/');
      if (parts.length >= 3) {
        const tenantId = parts[2];
        const tenant = tenants.find(t => t.id === tenantId);
        if (parts[3] === 'policies') return `${tenant?.name || 'Tenant'} - Policies`;
        if (parts[3] === 'permissions') return `${tenant?.name || 'Tenant'} - Permissions`;
        if (parts[3] === 'roles') return `${tenant?.name || 'Tenant'} - Roles`;
        if (parts[3] === 'resource-groups') return `${tenant?.name || 'Tenant'} - Resource Groups`;
        if (parts[3] === 'resources') return `${tenant?.name || 'Tenant'} - Resources`;
        if (parts[3] === 'grants') return `${tenant?.name || 'Tenant'} - Grants`;
        if (parts[3] === 'test') return `${tenant?.name || 'Tenant'} - Test Policy`;
      }
    }
    return 'Bouncer';
  };

  return (
    <div className="layout">
      <Sidebar />
      <div className="main-content">
        <header className="top-bar">
          <div className="top-bar-left">
            <h1 className="page-title">{getPageTitle()}</h1>
          </div>
        </header>
        <main className="main">
          <Breadcrumb />
          {children}
        </main>
      </div>
    </div>
  );
};

export default Layout;
