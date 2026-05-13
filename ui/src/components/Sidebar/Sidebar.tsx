import React, { useEffect, useState } from 'react';
import { Link, useLocation } from 'react-router-dom';
import { useTenant } from '../../context/TenantContext';
import { useSubject } from '../../context/SubjectContext';
import { tenantApi } from '../../services/api';
import { Tenant } from '../../types';
import './Sidebar.css';

interface NavItem {
  label: string;
  path: string;
}

interface NavSection {
  title?: string;
  items: NavItem[];
}

const Sidebar: React.FC = () => {
  const location = useLocation();
  const { selectedTenant } = useTenant();
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

  const getNavSections = (): NavSection[] => {
    const sections: NavSection[] = [];

    // Logged out: just Home
    if (!selectedSubject) {
      sections.push({ items: [{ label: 'Home', path: '/' }] });
      return sections;
    }

    // Common items for any logged-in subject
    const generalItems: NavItem[] = [
      { label: 'Home', path: '/' },
      { label: 'Me', path: '/me' },
      { label: 'Requests', path: '/requests' },
    ];

    // Admins also see the Admin dashboard
    if (isTenantAdmin) {
      generalItems.push({ label: 'Admin', path: '/admin' });
    }

    sections.push({ items: generalItems });

    // Tenant-scoped admin menu when admin has selected a tenant to manage
    if (isTenantAdmin && selectedTenant) {
      sections.push({
        title: selectedTenant.name,
        items: [
          { label: 'Policies', path: `/tenants/${selectedTenant.id}/policies` },
          { label: 'Permissions', path: `/tenants/${selectedTenant.id}/permissions` },
          { label: 'Roles', path: `/tenants/${selectedTenant.id}/roles` },
          { label: 'Resource Groups', path: `/tenants/${selectedTenant.id}/resource-groups` },
          { label: 'Resources', path: `/tenants/${selectedTenant.id}/resources` },
          { label: 'Grants', path: `/tenants/${selectedTenant.id}/grants` },
          { label: 'Policy Test', path: `/tenants/${selectedTenant.id}/test` },
        ],
      });
    }

    return sections;
  };

  const sections = getNavSections();

  return (
    <div className="sidebar">
      <div className="sidebar-header">
        <Link to="/" className="sidebar-logo">
          Bouncer
        </Link>
      </div>

      <nav className="sidebar-nav">
        {sections.map((section, idx) => (
          <div key={idx} className="sidebar-section">
            {section.title && (
              <div className="sidebar-section-title">{section.title}</div>
            )}
            {section.items.map((item) => (
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
          </div>
        ))}
      </nav>
    </div>
  );
};

export default Sidebar;
