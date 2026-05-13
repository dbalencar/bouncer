import React, { createContext, useContext, useEffect, useState, ReactNode } from 'react';
import { useNavigate } from 'react-router-dom';
import { AuthMode, AuthRuntimeConfig, Subject } from '../types';
import { buildModeHint, getUserManager } from '../config/oidc';
import { setApiActor, setApiAccessTokenProvider, setApiAuthMode, authConfigApi, authMeApi } from '../services/api';
import { useSubject } from './SubjectContext';
import { useTenant } from './TenantContext';

interface AuthContextValue {
  mode: AuthMode | null;
  ready: boolean;
  login: (mockSubject?: Subject) => Promise<void>;
  logout: () => Promise<void>;
}

const AuthContext = createContext<AuthContextValue | undefined>(undefined);

export const AuthProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
  const [config, setConfig] = useState<AuthRuntimeConfig | null>(null);
  const [ready, setReady] = useState(false);
  const { setSubject, clearSubject } = useSubject();
  const { clearTenant } = useTenant();
  const navigate = useNavigate();

  useEffect(() => {
    // Fetch the auth mode from the API. Falls back to the build-time
    // hint so the UI still renders (with a degraded login) if the API
    // is unreachable.
    let cancelled = false;
    const init = async () => {
      try {
        const cfg = await authConfigApi.get();
        if (cancelled) return;
        setConfig(cfg);
        setApiAuthMode(cfg.mode);
        if (cfg.mode === 'oidc') {
          const userManager = getUserManager(cfg.issuer);
          setApiAccessTokenProvider(async () => {
            const u = await userManager.getUser();
            return u?.access_token ?? null;
          });
          // If we already have a stored user, restore the local Subject.
          const u = await userManager.getUser();
          if (u && !u.expired) {
            try {
              const me = await authMeApi.get();
              setSubject(me);
            } catch (err) {
              // Token in store but server rejected it: clear it.
              await userManager.removeUser();
            }
          }
        }
      } catch (err) {
        console.error('Failed to fetch /auth/config; defaulting to', buildModeHint, err);
        setConfig({ mode: buildModeHint });
        setApiAuthMode(buildModeHint);
      } finally {
        if (!cancelled) setReady(true);
      }
    };
    init();
    return () => {
      cancelled = true;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const login = async (mockSubject?: Subject) => {
    if (!config) return;
    if (config.mode === 'mock') {
      if (!mockSubject) {
        throw new Error('Mock login requires a subject');
      }
      setSubject(mockSubject);
      return;
    }
    const userManager = getUserManager(config.issuer);
    await userManager.signinRedirect();
  };

  const logout = async () => {
    if (!config) return;
    if (config.mode === 'mock') {
      clearSubject();
      clearTenant();
      navigate('/');
      return;
    }
    const userManager = getUserManager(config.issuer);
    clearSubject();
    clearTenant();
    setApiActor(null);
    try {
      await userManager.signoutRedirect();
    } catch (err) {
      console.error('OIDC signoutRedirect failed; clearing local state', err);
      await userManager.removeUser();
      navigate('/');
    }
  };

  return (
    <AuthContext.Provider value={{ mode: config?.mode ?? null, ready, login, logout }}>
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth must be used within an AuthProvider');
  return ctx;
};
