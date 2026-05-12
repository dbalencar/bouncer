import React, { useState, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useTenant } from '../../context/TenantContext';
import { useSubject } from '../../context/SubjectContext';
import { subjectApi } from '../../services/api';
import { Subject } from '../../types';
import './Layout.css';

const Layout: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const navigate = useNavigate();
  const { selectedTenant, clearTenant } = useTenant();
  const { selectedSubject, setSubject, clearSubject } = useSubject();
  const [subjects, setSubjects] = useState<Subject[]>([]);
  const [isLoadingSubjects, setIsLoadingSubjects] = useState(false);
  const [isDropdownOpen, setIsDropdownOpen] = useState(false);

  useEffect(() => {
    loadSubjects();
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
          <div className="header-right" style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
            {selectedSubject ? (
              <>
                <span className="subject-indicator">{selectedSubject.username}</span>
                <button
                  onClick={handleLogout}
                  className="logout-button"
                  style={{ padding: '0.5rem 1rem', backgroundColor: '#dc3545', color: 'white', border: 'none', borderRadius: '4px', cursor: 'pointer' }}
                >
                  Logout
                </button>
              </>
            ) : (
              <>
                <button
                  className="dropdown-button"
                  onClick={() => setIsDropdownOpen(!isDropdownOpen)}
                  style={{ display: 'inline-block', padding: '0.5rem 1rem', backgroundColor: '#007bff', color: 'white', border: 'none', borderRadius: '4px', cursor: 'pointer' }}
                >
                  Login
                </button>
                {isDropdownOpen && (
                  <div className="dropdown-menu" style={{ position: 'absolute', top: '100%', right: 0, backgroundColor: '#2a2a2a', border: '1px solid #444', borderRadius: '4px', minWidth: '150px', zIndex: 1000, marginTop: '0.5rem' }}>
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
                          style={{ display: 'block', width: '100%', padding: '0.5rem 1rem', background: 'none', border: 'none', color: '#fff', textAlign: 'left', cursor: 'pointer' }}
                        >
                          {subject.username}
                        </button>
                      ))
                    )}
                  </div>
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
