import React, { useEffect, useState } from 'react';
import { Link, useLocation } from 'react-router-dom';
import { useTenant } from '../../context/TenantContext';
import { useSubject } from '../../context/SubjectContext';
import { grantApi } from '../../services/api';
import bouncerLogo from '../../assets/bouncer.png';
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
  const [hasAdminPaths, setHasAdminPaths] = useState(false);

  // Tenant-admin against the *currently selected* tenant.
  const isTenantAdmin = !!selectedSubject && !!selectedTenant &&
    selectedTenant.admin_uid === selectedSubject.uid;

  // Fetch the subject's admin paths on this tenant to know whether to
  // surface the "Resource Admin" entry. Tenant-admins don't need it
  // (they have richer affordances on the Grants page).
  useEffect(() => {
    if (!selectedSubject || !selectedTenant || isTenantAdmin) {
      setHasAdminPaths(false);
      return;
    }
    let cancelled = false;
    grantApi
      .getAdminPaths(selectedTenant.id, selectedSubject.uid)
      .then((paths) => {
        if (!cancelled) setHasAdminPaths(paths.length > 0);
      })
      .catch((err) => {
        console.error('Failed to fetch admin paths for sidebar:', err);
        if (!cancelled) setHasAdminPaths(false);
      });
    return () => {
      cancelled = true;
    };
  }, [selectedSubject?.uid, selectedTenant?.id, isTenantAdmin]);

  const getNavSections = (): NavSection[] => {
    const sections: NavSection[] = [];

    // Logged out: the page IS the home page and the Bouncer logo at
    // the top of the sidebar already links there — no nav items.
    if (!selectedSubject) {
      return sections;
    }

    if (selectedTenant) {
      const tenantItems: NavItem[] = isTenantAdmin
        ? [
            { label: 'Permissions', path: `/tenants/${selectedTenant.id}/permissions` },
            { label: 'Roles', path: `/tenants/${selectedTenant.id}/roles` },
            { label: 'Resource Groups', path: `/tenants/${selectedTenant.id}/resource-groups` },
            { label: 'Resources', path: `/tenants/${selectedTenant.id}/resources` },
            { label: 'Grants', path: `/tenants/${selectedTenant.id}/grants` },
            { label: 'Grant Requests', path: `/tenants/${selectedTenant.id}/grant-requests` },
            { label: 'Policies', path: `/tenants/${selectedTenant.id}/policies` },
            { label: 'Policy Test', path: `/tenants/${selectedTenant.id}/test` },
            { label: 'Audit Log', path: `/tenants/${selectedTenant.id}/audit-log` },
          ]
        : [
            { label: 'My Access', path: '/me' },
            ...(hasAdminPaths
              ? [{ label: 'Resource Admin', path: `/tenants/${selectedTenant.id}/resource-admin` }]
              : []),
          ];

      sections.push({
        title: selectedTenant.name,
        items: tenantItems,
      });
    }

    return sections;
  };

  const sections = getNavSections();

  const logoPath = selectedSubject ? '/me' : '/';

  return (
    <div className="sidebar">
      <div className="sidebar-header">
        <Link to={logoPath} className="sidebar-logo">
          <img src={bouncerLogo} alt="Bouncer" className="sidebar-logo-img" />
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
