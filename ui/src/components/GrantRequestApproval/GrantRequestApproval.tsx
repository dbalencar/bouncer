import React, { useState, useEffect } from 'react';
import { grantRequestApi } from '../../services/api';
import { useSubject } from '../../context/SubjectContext';
import { GrantRequest } from '../../types';
import './GrantRequestApproval.css';

interface GrantRequestApprovalProps {
  tenantId: string;
  schemaName: string;
}

const GrantRequestApproval: React.FC<GrantRequestApprovalProps> = ({ tenantId, schemaName }) => {
  const { selectedSubject } = useSubject();
  const [requests, setRequests] = useState<GrantRequest[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (selectedSubject) {
      loadRequests();
    }
  }, [schemaName, selectedSubject]);

  const loadRequests = async () => {
    try {
      setLoading(true);
      const data = await grantRequestApi.getByTenant(schemaName, 'pending');
      setRequests(data);
      setError(null);
    } catch (err) {
      setError('Failed to load grant requests');
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const handleApprove = async (uid: string) => {
    if (!selectedSubject) return;

    try {
      await grantRequestApi.approve(schemaName, uid, selectedSubject.uid);
      loadRequests();
    } catch (err: any) {
      setError(err.response?.data?.message || 'Failed to approve grant request');
    }
  };

  const handleReject = async (uid: string) => {
    if (!selectedSubject) return;

    try {
      await grantRequestApi.reject(schemaName, uid, selectedSubject.uid);
      loadRequests();
    } catch (err: any) {
      setError(err.response?.data?.message || 'Failed to reject grant request');
    }
  };

  const getStatusClass = (status: string) => {
    switch (status) {
      case 'pending':
        return 'badge badge-warning';
      case 'approved':
        return 'badge badge-success';
      case 'rejected':
        return 'badge badge-danger';
      default:
        return 'badge badge-neutral';
    }
  };

  if (!selectedSubject) {
    return <div className="grant-request-approval">Please log in to view grant requests.</div>;
  }

  if (loading) return <div className="loading">Loading...</div>;

  return (
    <div className="grant-request-approval">
      <h3>Pending Grant Requests</h3>
      {error && <div className="error">{error}</div>}

      {requests.length === 0 ? (
        <p className="no-requests">No pending grant requests found.</p>
      ) : (
        <div className="request-grid">
          {requests.map((request) => (
            <div key={request.uid} className="request-card">
              <div className="request-header">
                <span className="request-path">{request.path}</span>
                <span className={getStatusClass(request.status)}>
                  {request.status}
                </span>
              </div>
              <div className="request-details">
                <p><strong>Subject UID:</strong> {request.subject_uid}</p>
                <p><strong>Role UID:</strong> {request.role_uid}</p>
                <p><strong>Created:</strong> {new Date(request.created_at).toLocaleString()}</p>
              </div>
              <div className="request-actions">
                <button
                  onClick={() => handleApprove(request.uid)}
                  className="button button-success"
                >
                  Approve
                </button>
                <button
                  onClick={() => handleReject(request.uid)}
                  className="button button-danger"
                >
                  Reject
                </button>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};

export default GrantRequestApproval;
