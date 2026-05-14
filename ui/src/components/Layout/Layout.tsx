import React, { useState, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useSubject } from '../../context/SubjectContext';
import { useTenant } from '../../context/TenantContext';
import { useAuth } from '../../context/AuthContext';
import { subjectApi } from '../../services/api';
import { Subject } from '../../types';
import Sidebar from '../Sidebar/Sidebar';
import TenantPicker from '../Sidebar/TenantPicker';
import bouncerLogo from '../../assets/bouncer.png';
import './Layout.css';

const Layout: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const navigate = useNavigate();
  const { selectedSubject } = useSubject();
  const { selectedTenant } = useTenant();
  const { mode, ready, login, logout } = useAuth();
  const [subjects, setSubjects] = useState<Subject[]>([]);
  const [isLoadingSubjects, setIsLoadingSubjects] = useState(false);
  const [isDropdownOpen, setIsDropdownOpen] = useState(false);

  useEffect(() => {
    if (mode === 'mock') {
      loadSubjects();
    }
  }, [mode]);

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

  const handleMockLogin = async (subject: Subject) => {
    await login(subject);
    navigate('/me');
    setIsDropdownOpen(false);
  };

  const handleOidcLogin = async () => {
    await login();
  };

  const handleLogout = async () => {
    await logout();
  };

  // Sidebar exists only when there's something for it to host: a
  // logged-in subject AND a selected tenant. In any other state the
  // sidebar would be empty wallpaper.
  const showSidebar = !!selectedSubject && !!selectedTenant;

  return (
    <div className="layout">
      {showSidebar && <Sidebar />}
      <div className={`main-content ${showSidebar ? 'with-sidebar' : ''}`}>
        <header className="top-bar">
          <div className="top-bar-left">
            <Link to="/" className="top-bar-logo">
              <img src={bouncerLogo} alt="Bouncer" className="top-bar-logo-img" />
            </Link>
            {selectedSubject && <TenantPicker />}
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
            ) : !ready ? (
              <span className="subject-indicator">Loading…</span>
            ) : mode === 'oidc' ? (
              <button className="dropdown-button" onClick={handleOidcLogin}>
                Login with SSO
              </button>
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
                          onClick={() => handleMockLogin(subject)}
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
