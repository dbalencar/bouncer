import React, { useState, useEffect } from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import { useTenant } from '../../context/TenantContext';
import { useSubject } from '../../context/SubjectContext';
import { subjectApi, tenantApi } from '../../services/api';
import { Subject, Tenant } from '../../types';
import './Sidebar.css';

interface NavItem {
  label: string;
  path: string;
}

const Sidebar: React.FC = () => {
  const location = useLocation();
  const navigate = useNavigate();
  const { selectedTenant } = useTenant();
  const { selectedSubject } = useSubject();
  const [subjects, setSubjects] = useState<Subject[]>([]);
  const [tenants, setTenants] = useState<Tenant[]>([]);
  const [isLoadingSubjects, setIsLoadingSubjects] = useState(false);
  const [isDropdownOpen, setIsDropdownOpen] = useState(false);

  useEffect(() => {
    loadSubjects();
    loadTenants();
  }, []);

  const loadSubjects = async () => {
    setIsLoadingSubjects(true);
    try {
      const data = await subjectApi.getAll();
      setSubjects(data);
    } catch (err) {
      console.error('Failed to load subjects:', err);
    } finally {
      setIsLoadingSubjects(false);
    }
  };

  const loadTenants = async () => {
    try {
      const data = await tenantApi.getAll();
      setTenants(data);
    } catch (err) {
      console.error('Failed to load tenants:', err);
    }
  };

  const handleLogin = (subject: Subject) => {
    // Check if subject is a tenant admin
    const isAdmin = tenants.some(t => t.admin_uid === subject.uid);
    navigate(isAdmin ? '/admin' : '/me');
    setIsDropdownOpen(false);
  };

  const handleLogout = () => {
    // Clear contexts
    navigate('/');
    // The contexts will be cleared by their providers
    window.location.reload();
  };

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
        {selectedSubject && (
          <div className="sidebar-user">
            <span className="sidebar-username">{selectedSubject.name}</span>
            <button
              onClick={handleLogout}
              className="sidebar-logout"
            >
              Logout
            </button>
          </div>
        )}
      </div>
      
      {!selectedSubject && (
        <div className="sidebar-login">
          <button
            className="dropdown-button"
            onClick={() => setIsDropdownOpen(!isDropdownOpen)}
          >
            Login
          </button>
          {isDropdownOpen && (
            <div className="dropdown-menu">
              {isLoadingSubjects ? (
                <div className="dropdown-item">Loading...</div>
              ) : subjects.length === 0 ? (
                <div className="dropdown-item">No subjects available</div>
              ) : (
                subjects.map((subject) => (
                  <button
                    key={subject.uid}
                    className="dropdown-item"
                    onClick={() => handleLogin(subject)}
                  >
                    {subject.name}
                  </button>
                ))
              )}
            </div>
          )}
        </div>
      )}
      
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
