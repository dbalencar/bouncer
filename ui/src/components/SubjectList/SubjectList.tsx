import React, { useState, useEffect } from 'react';
import { subjectApi } from '../../services/api';
import { Subject } from '../../types';
import './SubjectList.css';

const SubjectList: React.FC = () => {
  const [subjects, setSubjects] = useState<Subject[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    loadSubjects();
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
