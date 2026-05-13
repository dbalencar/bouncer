import React, { useState, useEffect } from 'react';
import { useParams } from 'react-router-dom';
import { useTenant } from '../../context/TenantContext';
import { auditLogApi, subjectApi } from '../../services/api';
import { AuditLog, Subject } from '../../types';
import './AuditLogList.css';

const PAGE_SIZE = 50;

const ENTITY_TYPES = ['policy', 'permission', 'role', 'resource_group', 'resource', 'grant', 'grant_request'];
const ACTIONS = ['create', 'update', 'delete', 'approve', 'reject'];

const AuditLogList: React.FC = () => {
  const { tenantId } = useParams<{ tenantId: string }>();
  const { selectedTenant } = useTenant();
  const [items, setItems] = useState<AuditLog[]>([]);
  const [total, setTotal] = useState(0);
  const [offset, setOffset] = useState(0);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [subjects, setSubjects] = useState<Subject[]>([]);
  const [filterActor, setFilterActor] = useState('');
  const [filterEntityType, setFilterEntityType] = useState('');
  const [filterAction, setFilterAction] = useState('');

  useEffect(() => {
    loadSubjects();
  }, []);

  useEffect(() => {
    if (tenantId) {
      loadAuditLogs();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [tenantId, offset, filterActor, filterEntityType, filterAction]);

  const loadSubjects = async () => {
    try {
      const data = await subjectApi.getAll();
      setSubjects(data);
    } catch (err) {
      console.error('Failed to load subjects:', err);
    }
  };

  const loadAuditLogs = async () => {
    if (!tenantId) return;
    try {
      setLoading(true);
      const result = await auditLogApi.getByTenant(tenantId, {
        limit: PAGE_SIZE,
        offset,
        actor_uid: filterActor || undefined,
        entity_type: filterEntityType || undefined,
        action: filterAction || undefined,
      });
      setItems(result.items);
      setTotal(result.total);
      setError(null);
    } catch (err) {
      setError('Failed to load audit logs');
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const getActorLabel = (actorUid: string | null): string => {
    if (!actorUid) return 'system';
    const subject = subjects.find((s) => s.uid === actorUid);
    return subject ? subject.username : actorUid;
  };

  const formatTimestamp = (ts: string): string => {
    const date = new Date(ts);
    return date.toLocaleString();
  };

  const resetFilters = () => {
    setFilterActor('');
    setFilterEntityType('');
    setFilterAction('');
    setOffset(0);
  };

  const handleFilterChange = (setter: (value: string) => void) => (
    e: React.ChangeEvent<HTMLSelectElement>
  ) => {
    setter(e.target.value);
    setOffset(0);
  };

  if (!selectedTenant) {
    return <div className="audit-log-list">Please select a tenant first</div>;
  }

  const pageNumber = Math.floor(offset / PAGE_SIZE) + 1;
  const totalPages = Math.max(1, Math.ceil(total / PAGE_SIZE));

  return (
    <div className="audit-log-list">
      <div className="audit-log-header">
        <h2>Audit Log for {selectedTenant.name}</h2>
      </div>

      {error && <div className="error">{error}</div>}

      <div className="audit-log-filters">
        <div className="filter-group">
          <label>Actor:</label>
          <select className="input" value={filterActor} onChange={handleFilterChange(setFilterActor)}>
            <option value="">All</option>
            {subjects.map((s) => (
              <option key={s.uid} value={s.uid}>
                {s.username}
              </option>
            ))}
          </select>
        </div>
        <div className="filter-group">
          <label>Entity:</label>
          <select className="input" value={filterEntityType} onChange={handleFilterChange(setFilterEntityType)}>
            <option value="">All</option>
            {ENTITY_TYPES.map((t) => (
              <option key={t} value={t}>
                {t}
              </option>
            ))}
          </select>
        </div>
        <div className="filter-group">
          <label>Action:</label>
          <select className="input" value={filterAction} onChange={handleFilterChange(setFilterAction)}>
            <option value="">All</option>
            {ACTIONS.map((a) => (
              <option key={a} value={a}>
                {a}
              </option>
            ))}
          </select>
        </div>
        {(filterActor || filterEntityType || filterAction) && (
          <button className="button" onClick={resetFilters}>
            Clear
          </button>
        )}
      </div>

      {loading ? (
        <div className="loading">Loading audit logs...</div>
      ) : items.length === 0 ? (
        <div className="empty-state">No audit log entries found</div>
      ) : (
        <table className="audit-log-table">
          <thead>
            <tr>
              <th>When</th>
              <th>Actor</th>
              <th>Action</th>
              <th>Entity</th>
              <th>Entity ID</th>
              <th>Details</th>
            </tr>
          </thead>
          <tbody>
            {items.map((entry) => (
              <tr key={entry.id}>
                <td className="audit-cell-time">{formatTimestamp(entry.created_at)}</td>
                <td>{getActorLabel(entry.actor_uid)}</td>
                <td>
                  <span className={`action-badge action-${entry.action}`}>{entry.action}</span>
                </td>
                <td>{entry.entity_type}</td>
                <td className="audit-cell-mono">{entry.entity_id || '—'}</td>
                <td className="audit-cell-details">
                  {entry.details ? (
                    <code>{`${entry.details.method || ''} ${entry.details.path || ''}`.trim()}</code>
                  ) : (
                    '—'
                  )}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      )}

      <div className="audit-log-pagination">
        <button
          className="button"
          disabled={offset === 0}
          onClick={() => setOffset(Math.max(0, offset - PAGE_SIZE))}
        >
          Previous
        </button>
        <span className="pagination-info">
          Page {pageNumber} of {totalPages} ({total} total)
        </span>
        <button
          className="button"
          disabled={offset + PAGE_SIZE >= total}
          onClick={() => setOffset(offset + PAGE_SIZE)}
        >
          Next
        </button>
      </div>
    </div>
  );
};

export default AuditLogList;
