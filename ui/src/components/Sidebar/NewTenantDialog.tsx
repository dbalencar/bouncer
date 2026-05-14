import React, { useEffect, useRef, useState } from 'react';
import { subjectApi, tenantApi } from '../../services/api';
import { Subject, Tenant } from '../../types';
import './NewTenantDialog.css';

interface NewTenantDialogProps {
  onCreated: (tenant: Tenant) => void;
  onClose: () => void;
}

const NewTenantDialog: React.FC<NewTenantDialogProps> = ({ onCreated, onClose }) => {
  const [name, setName] = useState('');
  const [subjects, setSubjects] = useState<Subject[]>([]);
  const [adminUid, setAdminUid] = useState('');
  const [subjectSearch, setSubjectSearch] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const subjectRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    subjectApi.getAll().then(setSubjects).catch((err) => {
      console.error('Failed to load subjects:', err);
    });
  }, []);

  useEffect(() => {
    const onClickOutside = (e: MouseEvent) => {
      if (subjectRef.current && !subjectRef.current.contains(e.target as Node)) {
        setSubjectSearch('');
      }
    };
    document.addEventListener('mousedown', onClickOutside);
    return () => document.removeEventListener('mousedown', onClickOutside);
  }, []);

  const selectedSubjectDisplay = adminUid
    ? subjects.find((s) => s.uid === adminUid)
      ? `${subjects.find((s) => s.uid === adminUid)!.username} (${
          subjects.find((s) => s.uid === adminUid)!.email
        })`
      : ''
    : '';

  const matches = subjects.filter((s) => {
    const q = subjectSearch.toLowerCase();
    return (
      s.username.toLowerCase().includes(q) ||
      s.name.toLowerCase().includes(q) ||
      s.email.toLowerCase().includes(q)
    );
  });

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    if (!name.trim()) {
      setError('Tenant name is required');
      return;
    }
    if (!adminUid) {
      setError('Tenant admin is required');
      return;
    }
    try {
      setSubmitting(true);
      const tenant = await tenantApi.create(name.trim(), adminUid);
      onCreated(tenant);
    } catch (err: any) {
      setError(err.response?.data?.error || err.response?.data?.message || 'Failed to create tenant');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="new-tenant-overlay" onClick={onClose}>
      <div className="new-tenant-dialog" onClick={(e) => e.stopPropagation()}>
        <div className="new-tenant-header">
          <h3>New Tenant</h3>
          <button className="new-tenant-close" onClick={onClose} aria-label="Close">
            ×
          </button>
        </div>

        <form onSubmit={handleSubmit} className="new-tenant-body">
          {error && <div className="error">{error}</div>}

          <div className="form-group">
            <label>Name</label>
            <input
              type="text"
              className="input"
              value={name}
              onChange={(e) => setName(e.target.value)}
              autoFocus
              required
            />
          </div>

          <div className="form-group">
            <label>Tenant Admin</label>
            <div className="new-tenant-subject" ref={subjectRef}>
              <input
                type="text"
                className="input"
                value={subjectSearch || selectedSubjectDisplay}
                onChange={(e) => {
                  setSubjectSearch(e.target.value);
                  setAdminUid('');
                }}
                placeholder="Search by username, name, or email…"
                required
              />
              {subjectSearch && (
                <div className="new-tenant-subject-dropdown">
                  {matches.slice(0, 10).map((s) => (
                    <div
                      key={s.uid}
                      className="new-tenant-subject-item"
                      onClick={() => {
                        setAdminUid(s.uid);
                        setSubjectSearch('');
                      }}
                    >
                      <span className="new-tenant-subject-username">{s.username}</span>
                      <span className="new-tenant-subject-details">
                        {s.name} • {s.email}
                      </span>
                    </div>
                  ))}
                  {matches.length === 0 && (
                    <div className="new-tenant-subject-item no-results">No matches.</div>
                  )}
                </div>
              )}
            </div>
          </div>

          <div className="new-tenant-actions">
            <button type="button" className="button" onClick={onClose} disabled={submitting}>
              Cancel
            </button>
            <button type="submit" className="button button-primary" disabled={submitting}>
              {submitting ? 'Creating…' : 'Create'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default NewTenantDialog;
