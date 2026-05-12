import React, { useState, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useTenant } from '../../context/TenantContext';
import { useSubject } from '../../context/SubjectContext';
import { subjectApi } from '../../services/api';
import { Subject } from '../../types';
import { config } from '../../config';
import './Layout.css';

const Layout: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const navigate = useNavigate();
  const { selectedTenant, clearTenant } = useTenant();
  const { selectedSubject, setSubject, clearSubject } = useSubject();
  const [subjects, setSubjects] = useState<Subject[]>([]);
  const [isDropdownOpen, setIsDropdownOpen] = useState(false);

  useEffect(() => {
    if (config.demoMode) {
      loadSubjects();
    }
  }, []);

  const loadSubjects = async () => {
    try {
      const data = await subjectApi.getAll();
      setSubjects(data);
    } catch (err) {
      console.error('Failed to load subjects:', err);
    }
  };

  const handleLogin = (subject: Subject) => {
    setSubject(subject);
    navigate('/me');
    setIsDropdownOpen(false);
  };

  const handleLogout = () => {
    clearSubject();
    clearTenant();
    navigate('/');
  };

  return (
    <div className="layout">
      <header className="header">
        <div className="header-content">
          <h1 className="logo">
            <Link to="/">Bouncer</Link>
          </h1>
          <div className="header-right">
            {selectedSubject ? (
              <>
                <div className="subject-indicator">
                  {selectedSubject.username}
                </div>
                <button onClick={handleLogout} className="logout-button">
                  Logout
                </button>
              </>
            ) : (
              <>
                {config.demoMode ? (
                  <div className="subject-dropdown">
                    <button
                      className="dropdown-button"
                      onClick={() => setIsDropdownOpen(!isDropdownOpen)}
                    >
                      Login
                    </button>
                    {isDropdownOpen && (
                      <div className="dropdown-menu">
                        {subjects.map((subject) => (
                          <button
                            key={subject.uid}
                            className="dropdown-item"
                            onClick={() => handleLogin(subject)}
                          >
                            {subject.username}
                          </button>
                        ))}
                      </div>
                    )}
                  </div>
                ) : (
                  <button className="login-button">
                    Login
                  </button>
                )}
              </>
            )}
          </div>
        </div>
      </header>
      <main className="main">
        {children}
      </main>
    </div>
  );
};

export default Layout;
