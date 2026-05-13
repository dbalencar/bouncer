import React from 'react';
import { Link, useLocation } from 'react-router-dom';
import { useTenant } from '../../context/TenantContext';
import './Sidebar.css';

interface NavItem {
  label: string;
  path: string;
}

const Sidebar: React.FC = () => {
  const location = useLocation();
  const { selectedTenant } = useTenant();

  const getNavItems = (): NavItem[] => {
    // Admin page specific navigation - show all management links
    if (location.pathname === '/admin') {
      return [
        { label: 'Tenants', path: '/tenants' },
        { label: 'Permissions', path: '/subjects' },
        { label: 'Roles', path: '/tenants' },
        { label: 'Resource Groups', path: '/tenants' },
        { label: 'Resources', path: '/tenants' },
        { label: 'Policies', path: '/tenants' },
        { label: 'Policy Test', path: '/tenants' },
      ];
    }

    // General navigation
    const navItems: NavItem[] = [
      { label: 'Home', path: '/' },
      { label: 'Me', path: '/me' },
      { label: 'Requests', path: '/requests' },
      { label: 'Admin', path: '/admin' },
    ];

    // Add tenant-specific navigation if a tenant is selected
    if (selectedTenant) {
      navItems.push(
        { label: 'Policies', path: `/tenants/${selectedTenant.id}/policies` },
        { label: 'Permissions', path: `/tenants/${selectedTenant.id}/permissions` },
        { label: 'Roles', path: `/tenants/${selectedTenant.id}/roles` },
        { label: 'Resource Groups', path: `/tenants/${selectedTenant.id}/resource-groups` },
        { label: 'Resources', path: `/tenants/${selectedTenant.id}/resources` },
        { label: 'Grants', path: `/tenants/${selectedTenant.id}/grants` },
        { label: 'Test Policy', path: `/tenants/${selectedTenant.id}/test` },
      );
    }

    return navItems;
  };

  const navItems = getNavItems();

  return (
    <div className="sidebar">
      <div className="sidebar-header">
        <Link to="/" className="sidebar-logo">
          Bouncer
        </Link>
      </div>
      
      <nav className="sidebar-nav">
        {navItems.map((item) => (
          <Link
            key={item.path}
            to={item.path}
            className={`sidebar-nav-item ${
              location.pathname === item.path ? 'active' : ''
            }`}
          >
            {item.label}
          </Link>
        ))}
      </nav>
    </div>
  );
};

export default Sidebar;
