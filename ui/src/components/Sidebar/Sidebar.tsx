import React, { useEffect, useState } from 'react';
import { Link, useLocation } from 'react-router-dom';
import { useTenant } from '../../context/TenantContext';
import { useSubject } from '../../context/SubjectContext';
import { tenantApi } from '../../services/api';
import { Tenant } from '../../types';
import bouncerLogo from '../../assets/bouncer.png';
import TenantPicker from './TenantPicker';
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
    if (!selectedSubject) {
      setTenants([]);
      return;
    }
    tenantApi.getAll().then(setTenants).catch((err) => {
      console.error('Failed to load tenants:', err);
    });
  }, [selectedSubject?.uid]);

  // Tenant-admin against the *currently selected* tenant (not "any
  // tenant"). The previous global check leaked admin menus into
  // tenants the subject merely had a grant on.
  const isTenantAdmin = !!selectedSubject && !!selectedTenant &&
    selectedTenant.admin_uid === selectedSubject.uid;

  const getNavSections = (): NavSection[] => {
    const sections: NavSection[] = [];

    // Logged out: just Home
    if (!selectedSubject) {
      sections.push({ items: [{ label: 'Home', path: '/' }] });
      return sections;
    }

    // Tenant-scoped menu when a tenant is selected via the picker
    if (selectedTenant) {
      const tenantItems: NavItem[] = [];

      if (isTenantAdmin) {
        tenantItems.push(
          { label: 'Permissions', path: `/tenants/${selectedTenant.id}/permissions` },
          { label: 'Roles', path: `/tenants/${selectedTenant.id}/roles` },
          { label: 'Resource Groups', path: `/tenants/${selectedTenant.id}/resource-groups` },
          { label: 'Resources', path: `/tenants/${selectedTenant.id}/resources` },
          { label: 'Grants', path: `/tenants/${selectedTenant.id}/grants` },
          { label: 'Grant Requests', path: `/tenants/${selectedTenant.id}/grant-requests` },
          { label: 'Policies', path: `/tenants/${selectedTenant.id}/policies` },
          { label: 'Policy Test', path: `/tenants/${selectedTenant.id}/test` },
          { label: 'Audit Log', path: `/tenants/${selectedTenant.id}/audit-log` }
        );
      } else {
        tenantItems.push(
          { label: 'Requests', path: '/requests' },
          { label: 'Access', path: '/access' }
        );
      }

      sections.push({
        title: selectedTenant.name,
        items: tenantItems,
      });
    }

    // Personal nav lives at the bottom; available to every logged-in
    // subject regardless of tenant selection.
    sections.push({
      title: 'You',
      items: [
        { label: 'My Access', path: '/me' },
        ...(selectedSubject.is_platform_admin || tenants.some((t) => t.admin_uid === selectedSubject.uid)
          ? [{ label: 'Admin Dashboard', path: '/admin' }]
          : []),
      ],
    });

    return sections;
  };

  const sections = getNavSections();

  // Determine home/tenants path for the logo link
  const logoPath = !selectedSubject ? '/' : (isTenantAdmin ? '/admin' : '/me');

  return (
    <div className="sidebar">
      <div className="sidebar-header">
        <Link to={logoPath} className="sidebar-logo">
          <img src={bouncerLogo} alt="Bouncer" className="sidebar-logo-img" />
        </Link>
      </div>

      {selectedSubject && <TenantPicker />}

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
