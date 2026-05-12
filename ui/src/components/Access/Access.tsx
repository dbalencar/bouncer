import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useTenant } from '../../context/TenantContext';
import { useSubject } from '../../context/SubjectContext';
import { grantRequestApi } from '../../services/api';
import GrantRequestList from '../GrantRequestList/GrantRequestList';
import GrantRequestForm from '../GrantRequestForm/GrantRequestForm';
import './Access.css';

const Access: React.FC = () => {
  const [showRequestForm, setShowRequestForm] = useState(false);
  const [grantRequestListKey, setGrantRequestListKey] = useState(0);
  const { selectedTenant, setTenant } = useTenant();
  const { selectedSubject } = useSubject();
  const navigate = useNavigate();

  const handleRequestCreated = () => {
    // Force GrantRequestList to remount and reload
    setGrantRequestListKey(prev => prev + 1);
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
          key={grantRequestListKey}
          schemaName={selectedTenant.schema_name}
          tenantId={selectedTenant.id}
          subjectUid={selectedSubject.uid}
          onRequestCreated={handleRequestCreated}
        />
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
              tenantId={selectedTenant.id}
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
