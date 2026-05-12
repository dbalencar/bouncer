import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { subjectApi, tenantApi } from '../../services/api';
import { useSubject } from '../../context/SubjectContext';
import { Subject, Tenant } from '../../types';
import './SubjectList.css';

const SubjectList: React.FC = () => {
  const [subjects, setSubjects] = useState<Subject[]>([]);
  const [tenants, setTenants] = useState<Tenant[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const { setSubject } = useSubject();
  const navigate = useNavigate();

  useEffect(() => {
    loadSubjects();
    loadTenants();
  }, []);

  const loadSubjects = async () => {
    try {
      setLoading(true);
      const data = await subjectApi.getAll();
      setSubjects(data);
      setError(null);
    } catch (err) {
      setError('Failed to load subjects');
      console.error(err);
    } finally {
      setLoading(false);
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

  const handleActAs = (subject: Subject) => {
    setSubject(subject);
    // Wait for tenants to load before checking admin status
    // If tenants aren't loaded yet, default to /me
    if (tenants.length > 0) {
      const isAdmin = tenants.some(t => t.admin_uid === subject.uid);
      navigate(isAdmin ? '/admin' : '/me');
    } else {
      // Load tenants first, then navigate
      loadTenants().then(() => {
        const isAdmin = tenants.some(t => t.admin_uid === subject.uid);
        navigate(isAdmin ? '/admin' : '/me');
      });
    }
  };

  if (loading) return <div className="loading">Loading...</div>;

  return (
    <div className="subject-list">
      <h2>Subjects</h2>
      
      {error && <div className="error">{error}</div>}

      <div className="subject-grid">
        {subjects.map((subject) => (
          <div key={subject.uid} className="subject-card">
            <h3>{subject.username}</h3>
            <p><strong>Name:</strong> {subject.name}</p>
            <p><strong>Email:</strong> {subject.email}</p>
            <p><strong>UID:</strong> {subject.uid}</p>
            <p className="subject-meta">
              Created: {new Date(subject.created_at).toLocaleDateString()}
            </p>
            <button
              onClick={() => handleActAs(subject)}
              className="button button-primary"
            >
              Act As
            </button>
          </div>
        ))}
      </div>

      {subjects.length === 0 && (
        <p className="empty-state">No subjects found.</p>
      )}
    </div>
  );
};

export default SubjectList;
