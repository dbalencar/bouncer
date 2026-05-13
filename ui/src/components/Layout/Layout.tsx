import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useTenant } from '../../context/TenantContext';
import { useSubject } from '../../context/SubjectContext';
import { subjectApi, tenantApi } from '../../services/api';
import { Subject, Tenant } from '../../types';
import Breadcrumb from '../Breadcrumb/Breadcrumb';
import Sidebar from '../Sidebar/Sidebar';
import './Layout.css';

const Layout: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const navigate = useNavigate();
  const { clearTenant } = useTenant();
  const { selectedSubject, setSubject, clearSubject } = useSubject();
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
    setSubject(subject);
    // Check if subject is a tenant admin
    const isAdmin = tenants.some(t => t.admin_uid === subject.uid);
    navigate(isAdmin ? '/admin' : '/me');
    setIsDropdownOpen(false);
  };

  const handleLogout = () => {
    clearSubject();
    clearTenant();
    navigate('/');
  };

  return (
    <div className="layout">
      <Sidebar />
      <div className="main-content">
        <header className="top-bar">
          <div className="top-bar-left">
            <Breadcrumb />
          </div>
          <div className="top-bar-right">
            {selectedSubject ? (
              <>
                <span className="subject-indicator">{selectedSubject.name}</span>
                <button
                  onClick={handleLogout}
                  className="logout-button"
                >
                  Logout
                </button>
              </>
            ) : (
              <div style={{ position: 'relative' }}>
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
          </div>
        </header>
        <main className="main">
          {children}
        </main>
      </div>
    </div>
  );
};

export default Layout;
