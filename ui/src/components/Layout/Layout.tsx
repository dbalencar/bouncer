import React, { useState, useEffect } from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import { useTenant } from '../../context/TenantContext';
import { useSubject } from '../../context/SubjectContext';
import { tenantApi } from '../../services/api';
import { Tenant } from '../../types';
import './Layout.css';

const Layout: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const location = useLocation();
  const navigate = useNavigate();
  const { selectedTenant, clearTenant } = useTenant();
  const { selectedSubject, clearSubject } = useSubject();
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

  const handleClear = () => {
    clearTenant();
    clearSubject();
    navigate('/');
  };

  const isSubjectAdmin = selectedSubject
    ? tenants.some(t => t.admin_uid === selectedSubject.uid)
    : false;

  return (
    <div className="layout">
      <header className="header">
        <div className="header-content">
          <h1 className="logo">
            <Link to="/">Bouncer</Link>
          </h1>
          {selectedSubject && (
            <nav className="nav">
              {selectedTenant ? (
                <>
                  {isSubjectAdmin ? (
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
                    </>
                  ) : (
                    <>
                      <Link to="/me" className={location.pathname === '/me' ? 'active' : ''}>
                        Me
                      </Link>
                      <Link to="/access" className={location.pathname === '/access' ? 'active' : ''}>
                        Access
                      </Link>
                      {location.pathname !== '/access' && (
                        <>
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
                        </>
                      )}
                    </>
                  )}
                  <span className="tenant-indicator">
                    {selectedTenant.name}
                  </span>
                </>
              ) : (
                <>
                  {isSubjectAdmin ? (
                    <Link to="/admin" className={location.pathname === '/admin' ? 'active' : ''}>
                      Admin
                    </Link>
                  ) : (
                    <Link to="/me" className={location.pathname === '/me' ? 'active' : ''}>
                      Me
                    </Link>
                  )}
                </>
              )}
              <span className="subject-indicator">
                {selectedSubject.username}
              </span>
              <button onClick={handleClear} className="clear-selection">
                Clear
              </button>
            </nav>
          )}
        </div>
      </header>
      <main className="main">
        {children}
      </main>
    </div>
  );
};

export default Layout;
