import React, { useEffect, useMemo, useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useTenant } from '../../context/TenantContext';
import { useSubject } from '../../context/SubjectContext';
import { tenantApi } from '../../services/api';
import { Tenant } from '../../types';
import NewTenantDialog from './NewTenantDialog';
import './TenantPicker.css';

const TenantPicker: React.FC = () => {
  const { selectedTenant, setTenant, clearTenant } = useTenant();
  const { selectedSubject } = useSubject();
  const navigate = useNavigate();
  const [tenants, setTenants] = useState<Tenant[]>([]);
  const [loading, setLoading] = useState(false);
  const [open, setOpen] = useState(false);
  const [search, setSearch] = useState('');
  const [showNewDialog, setShowNewDialog] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);

  const loadTenants = async () => {
    if (!selectedSubject) {
      setTenants([]);
      return;
    }
    try {
      setLoading(true);
      const data = await tenantApi.getAccessible(selectedSubject.uid);
      setTenants(data);
    } catch (err) {
      console.error('Failed to load accessible tenants:', err);
      setTenants([]);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadTenants();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selectedSubject?.uid]);

  useEffect(() => {
    if (!open) return;
    const onClickOutside = (e: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setOpen(false);
        setSearch('');
      }
    };
    document.addEventListener('mousedown', onClickOutside);
    return () => document.removeEventListener('mousedown', onClickOutside);
  }, [open]);

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    if (!q) return tenants;
    return tenants.filter((t) => t.name.toLowerCase().includes(q));
  }, [tenants, search]);

  const handleSelect = (tenant: Tenant) => {
    setTenant(tenant);
    setOpen(false);
    setSearch('');
  };

  const handleClear = () => {
    clearTenant();
    setOpen(false);
    setSearch('');
  };

  const handleTenantCreated = (tenant: Tenant) => {
    setShowNewDialog(false);
    setTenant(tenant);
    loadTenants();
    // Land on a sensible tenant page once a new tenant exists.
    navigate(`/tenants/${tenant.id}/grants`);
  };

  if (!selectedSubject) return null;

  const isPlatformAdmin = !!selectedSubject.is_platform_admin;

  return (
    <div className="tenant-picker" ref={containerRef}>
      <div className="tenant-picker-row">
        <button
          type="button"
          className={`tenant-picker-trigger ${open ? 'open' : ''}`}
          onClick={() => setOpen((v) => !v)}
          title={selectedTenant ? selectedTenant.name : 'Pick a tenant'}
        >
          <span className="tenant-picker-label">Tenant</span>
          <span className="tenant-picker-value">
            {selectedTenant ? selectedTenant.name : 'Pick one…'}
          </span>
          <span className="tenant-picker-chevron" aria-hidden>▾</span>
        </button>
        {isPlatformAdmin && (
          <button
            type="button"
            className="tenant-picker-new"
            onClick={() => setShowNewDialog(true)}
            title="New tenant"
          >
            +
          </button>
        )}
      </div>

      {open && (
        <div className="tenant-picker-dropdown">
          <input
            type="text"
            className="tenant-picker-search"
            placeholder="Search tenants…"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            autoFocus
          />
          {loading ? (
            <div className="tenant-picker-empty">Loading…</div>
          ) : filtered.length === 0 ? (
            <div className="tenant-picker-empty">
              {tenants.length === 0
                ? 'No accessible tenants.'
                : 'No matches.'}
            </div>
          ) : (
            <ul className="tenant-picker-list">
              {filtered.map((tenant) => (
                <li key={tenant.id}>
                  <button
                    type="button"
                    className={`tenant-picker-item ${
                      selectedTenant?.id === tenant.id ? 'selected' : ''
                    }`}
                    onClick={() => handleSelect(tenant)}
                  >
                    <span className="tenant-picker-item-name">{tenant.name}</span>
                    {selectedTenant?.id === tenant.id && (
                      <span className="tenant-picker-item-check">✓</span>
                    )}
                  </button>
                </li>
              ))}
            </ul>
          )}
          {selectedTenant && (
            <button
              type="button"
              className="tenant-picker-clear"
              onClick={handleClear}
            >
              Clear selection
            </button>
          )}
        </div>
      )}

      {showNewDialog && (
        <NewTenantDialog
          onCreated={handleTenantCreated}
          onClose={() => setShowNewDialog(false)}
        />
      )}
    </div>
  );
};

export default TenantPicker;
