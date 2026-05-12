import React from 'react';
import { useTenant } from '../../context/TenantContext';
import { useSubject } from '../../context/SubjectContext';
import './Me.css';

const Me: React.FC = () => {
  const { selectedTenant } = useTenant();
  const { selectedSubject } = useSubject();

  return (
    <div className="me">
      <h2>Current Context</h2>

      <div className="context-card">
        <h3>Acting As Subject</h3>
        {selectedSubject ? (
          <div className="context-info">
            <p><strong>Username:</strong> {selectedSubject.username}</p>
            <p><strong>Name:</strong> {selectedSubject.name}</p>
            <p><strong>Email:</strong> {selectedSubject.email}</p>
            <p><strong>UID:</strong> {selectedSubject.uid}</p>
          </div>
        ) : (
          <p className="no-context">No subject selected</p>
        )}
      </div>

      <div className="context-card">
        <h3>Selected Tenant</h3>
        {selectedTenant ? (
          <div className="context-info">
            <p><strong>Name:</strong> {selectedTenant.name}</p>
            <p><strong>Schema:</strong> {selectedTenant.schema_name}</p>
            <p><strong>ID:</strong> {selectedTenant.id}</p>
          </div>
        ) : (
          <p className="no-context">No tenant selected</p>
        )}
      </div>
    </div>
  );
};

export default Me;
