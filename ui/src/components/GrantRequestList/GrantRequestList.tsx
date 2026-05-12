import React, { useState, useEffect } from 'react';
import { grantRequestApi } from '../../services/api';
import { GrantRequest } from '../../types';
import './GrantRequestList.css';

interface GrantRequestListProps {
  schemaName: string;
  subjectUid: string;
  onRequestDelete?: () => void;
}

const GrantRequestList: React.FC<GrantRequestListProps> = ({ schemaName, subjectUid, onRequestDelete }) => {
  const [requests, setRequests] = useState<GrantRequest[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    loadRequests();
  }, [schemaName, subjectUid]);

  const loadRequests = async () => {
    try {
      setLoading(true);
      const data = await grantRequestApi.getBySubject(schemaName, subjectUid);
      setRequests(data);
      setError(null);
    } catch (err) {
      setError('Failed to load grant requests');
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const handleDelete = async (uid: string) => {
    if (!window.confirm('Are you sure you want to delete this grant request?')) return;

    try {
      await grantRequestApi.delete(schemaName, uid);
      loadRequests();
      if (onRequestDelete) onRequestDelete();
    } catch (err) {
      setError('Failed to delete grant request');
      console.error(err);
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'pending':
        return '#ffc107';
      case 'approved':
        return '#28a745';
      case 'rejected':
        return '#dc3545';
      default:
        return '#6c757d';
    }
  };

  if (loading) return <div className="loading">Loading...</div>;

  return (
    <div className="grant-request-list">
      <h3>Grant Requests</h3>
      {error && <div className="error">{error}</div>}

      {requests.length === 0 ? (
        <p className="no-requests">No grant requests found.</p>
      ) : (
        <div className="request-grid">
          {requests.map((request) => (
            <div key={request.uid} className="request-card">
              <div className="request-header">
                <span className="request-path">{request.path}</span>
                <span 
                  className="request-status" 
                  style={{ backgroundColor: getStatusColor(request.status) }}
                >
                  {request.status}
                </span>
              </div>
              <div className="request-details">
                <p><strong>Role UID:</strong> {request.role_uid}</p>
                <p><strong>Created:</strong> {new Date(request.created_at).toLocaleString()}</p>
                {request.status !== 'pending' && (
                  <p><strong>Updated:</strong> {new Date(request.updated_at).toLocaleString()}</p>
                )}
              </div>
              {request.status === 'pending' && (
                <button
                  onClick={() => handleDelete(request.uid)}
                  className="button button-danger"
                >
                  Delete Request
                </button>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
};

export default GrantRequestList;
