import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useTenant } from '../../context/TenantContext';
import { useSubject } from '../../context/SubjectContext';
import { grantApi, grantRequestApi } from '../../services/api';
import { Grant, GrantRequest } from '../../types';
import GrantRequestList from '../GrantRequestList/GrantRequestList';
import GrantRequestForm from '../GrantRequestForm/GrantRequestForm';
import './Access.css';

const Access: React.FC = () => {
  const [currentTenantGrants, setCurrentTenantGrants] = useState<Grant[]>([]);
  const [showRequestForm, setShowRequestForm] = useState(false);
  const [loading, setLoading] = useState(true);
  const { selectedTenant, setTenant } = useTenant();
  const { selectedSubject } = useSubject();
  const navigate = useNavigate();

  useEffect(() => {
    if (selectedTenant && selectedSubject) {
      loadCurrentTenantGrants();
    }
  }, [selectedTenant, selectedSubject]);

  const loadCurrentTenantGrants = async () => {
    if (!selectedTenant || !selectedSubject) {
      setCurrentTenantGrants([]);
      return;
    }

    try {
      const grants = await grantApi.getBySubject(selectedTenant.id, selectedSubject.uid);
      setCurrentTenantGrants(grants);
    } catch (err) {
      console.error('Failed to load current tenant grants:', err);
    } finally {
      setLoading(false);
    }
  };

  const handleRemoveGrant = async (grantUid: string) => {
    if (!selectedTenant) return;
    if (!window.confirm('Are you sure you want to remove this grant?')) return;

    try {
      await grantApi.delete(selectedTenant.id, grantUid);
      loadCurrentTenantGrants();
    } catch (err) {
      console.error('Failed to remove grant:', err);
    }
  };

  const handleRequestCreated = () => {
    if (selectedSubject && selectedTenant) {
      loadCurrentTenantGrants();
    }
  };

  if (!selectedSubject) {
    return (
      <div className="access">
        <h2>Access Request</h2>
        <p className="no-context">No subject selected. Please select a subject to act as.</p>
      </div>
    );
  }

  if (!selectedTenant) {
    return (
      <div className="access">
        <h2>Access Request</h2>
        <p className="no-context">No tenant selected. Please select a tenant from the Me page.</p>
        <button onClick={() => navigate('/me')} className="button button-primary">
          Go to Me
        </button>
      </div>
    );
  }

  if (loading) {
    return <div className="loading">Loading...</div>;
  }

  return (
    <div className="access">
      <h2>Access Request</h2>

      <div className="context-card">
        <h3>Current Context</h3>
        <div className="context-info">
          <p><strong>Subject:</strong> {selectedSubject.username} ({selectedSubject.name})</p>
          <p><strong>Tenant:</strong> {selectedTenant.name}</p>
        </div>
      </div>

      <div className="context-card">
        <GrantRequestList
          schemaName={selectedTenant.schema_name}
          subjectUid={selectedSubject.uid}
          onRequestCreated={handleRequestCreated}
        />
      </div>

      <div className="context-card">
        <h3>Current Grants</h3>
        {currentTenantGrants.length === 0 ? (
          <p className="no-context">You have no grants in this tenant.</p>
        ) : (
          <div className="grant-grid">
            {currentTenantGrants.map((grant) => (
              <div key={grant.uid} className="grant-card">
                <p><strong>Path:</strong> {grant.path}</p>
                <p><strong>Role UID:</strong> {grant.role_uid}</p>
                <button
                  onClick={() => handleRemoveGrant(grant.uid)}
                  className="button button-danger"
                >
                  Remove Grant
                </button>
              </div>
            ))}
          </div>
        )}
      </div>

      <div className="context-card">
        {showRequestForm ? (
          <>
            <div className="form-header">
              <h3>Request New Grant</h3>
              <button
                onClick={() => setShowRequestForm(false)}
                className="button"
              >
                Cancel
              </button>
            </div>
            <GrantRequestForm
              schemaName={selectedTenant.schema_name}
              subjectUid={selectedSubject.uid}
              onRequestCreated={() => {
                handleRequestCreated();
                setShowRequestForm(false);
              }}
            />
          </>
        ) : (
          <button
            onClick={() => setShowRequestForm(true)}
            className="button button-primary"
          >
            Request New Grant
          </button>
        )}
      </div>
    </div>
  );
};

export default Access;
