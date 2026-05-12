import React, { useState, useEffect } from 'react';
import { useParams } from 'react-router-dom';
import { evaluationApi, subjectApi, tenantApi } from '../../services/api';
import { useTenant } from '../../context/TenantContext';
import { useSubject } from '../../context/SubjectContext';
import { Subject, PolicyEvaluationRequest, PolicyEvaluationResponse, Tenant } from '../../types';
import './PolicyTest.css';

const PolicyTest: React.FC = () => {
  const { tenantId } = useParams<{ tenantId: string }>();
  const { selectedTenant } = useTenant();
  const { selectedSubject } = useSubject();
  const [subjects, setSubjects] = useState<Subject[]>([]);
  const [tenants, setTenants] = useState<Tenant[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [result, setResult] = useState<PolicyEvaluationResponse | null>(null);
  const [formData, setFormData] = useState<PolicyEvaluationRequest>({
    subjectUid: '',
    resourceType: '',
    resourceId: '',
    action: '',
    context: {}
  });

  useEffect(() => {
    loadTenants();
    loadSubjects();
  }, []);

  useEffect(() => {
    // Pre-select the current subject if not an admin
    if (selectedSubject && !isSubjectAdmin) {
      setFormData(prev => ({ ...prev, subjectUid: selectedSubject.uid }));
    }
  }, [selectedSubject, isSubjectAdmin]);

  const loadTenants = async () => {
    try {
      const data = await tenantApi.getAll();
      setTenants(data);
    } catch (err) {
      console.error('Failed to load tenants:', err);
    }
  };

  const isSubjectAdmin = selectedSubject
    ? tenants.some(t => t.admin_uid === selectedSubject.uid)
    : false;

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

  const handleEvaluate = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!tenantId) return;

    try {
      setLoading(true);
      const response = await evaluationApi.evaluate(tenantId, formData);
      setResult(response);
      setError(null);
    } catch (err) {
      setError('Failed to evaluate policy');
      console.error(err);
      setResult(null);
    } finally {
      setLoading(false);
    }
  };

  if (!selectedTenant) {
    return <div className="error">No tenant selected</div>;
  }

  return (
    <div className="policy-test">
      <h2>Policy Test for {selectedTenant.name}</h2>
      
      {error && <div className="error">{error}</div>}

      <form onSubmit={handleEvaluate} className="test-form">
        <div className="form-group">
          <label>Subject:</label>
          {isSubjectAdmin ? (
            <select
              value={formData.subjectUid}
              onChange={(e) => setFormData({ ...formData, subjectUid: e.target.value })}
              className="input"
              required
            >
              <option value="">Select a subject</option>
              {subjects.map((subject) => (
                <option key={subject.uid} value={subject.uid}>
                  {subject.username} ({subject.name})
                </option>
              ))}
            </select>
          ) : (
            <input
              type="text"
              value={selectedSubject ? `${selectedSubject.username} (${selectedSubject.name})` : ''}
              className="input"
              disabled
              readOnly
            />
          )}
        </div>

        <div className="form-row">
          <div className="form-group">
            <label>Resource Type:</label>
            <input
              type="text"
              value={formData.resourceType}
              onChange={(e) => setFormData({ ...formData, resourceType: e.target.value })}
              className="input"
              placeholder="e.g., document, api_endpoint"
              required
            />
          </div>
          <div className="form-group">
            <label>Resource ID:</label>
            <input
              type="text"
              value={formData.resourceId}
              onChange={(e) => setFormData({ ...formData, resourceId: e.target.value })}
              className="input"
              placeholder="e.g., doc_123, /api/users"
              required
            />
          </div>
        </div>

        <div className="form-group">
          <label>Action:</label>
          <input
            type="text"
            value={formData.action}
            onChange={(e) => setFormData({ ...formData, action: e.target.value })}
            className="input"
            placeholder="e.g., read, write, delete"
            required
          />
        </div>

        <div className="form-group">
          <label>Context (JSON):</label>
          <textarea
            value={JSON.stringify(formData.context || {}, null, 2)}
            onChange={(e) => {
              try {
                const context = JSON.parse(e.target.value);
                setFormData({ ...formData, context });
              } catch {
                // Invalid JSON, ignore
              }
            }}
            className="textarea"
            rows={6}
            placeholder='{"key": "value"}'
          />
        </div>

        <button type="submit" className="button button-primary" disabled={loading}>
          {loading ? 'Evaluating...' : 'Evaluate Policy'}
        </button>
      </form>

      {result && (
        <div className={`result ${result.allowed ? 'allowed' : 'denied'}`}>
          <h3>Result: {result.decision.toUpperCase()}</h3>
          {result.explanation && (
            <div className="explanation">
              <h4>Explanation:</h4>
              <p>{result.explanation}</p>
            </div>
          )}
        </div>
      )}
    </div>
  );
};

export default PolicyTest;
