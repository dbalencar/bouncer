import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { getUserManager } from '../../config/oidc';
import {
  authMeApi,
  tenantApi,
  setApiAuthMode,
  setApiAccessTokenProvider,
} from '../../services/api';
import { useSubject } from '../../context/SubjectContext';
import './AuthCallback.css';

// React.StrictMode (main.tsx) double-invokes effects in dev. Without a
// module-level guard both mounts call signinRedirectCallback() with the
// same auth code — Keycloak consumes the first and rejects the second
// with "code not valid". Cache the in-flight exchange so both effects
// share one result.
let callbackPromise: ReturnType<typeof exchangeCode> | null = null;

const exchangeCode = async () => {
  const userManager = getUserManager();
  await userManager.signinRedirectCallback();
  // Wire the axios interceptor here, immediately after the token is in
  // storage. AuthProvider also configures this, but child effects fire
  // before parent effects on mount — without this defensive wiring the
  // /auth/me call below races AuthProvider and goes out without a
  // Bearer, surfacing as a spurious 401 / "Login failed" toast even
  // though the session does eventually establish via AuthProvider's
  // restore path.
  setApiAuthMode('oidc');
  setApiAccessTokenProvider(async () => {
    const u = await userManager.getUser();
    return u?.access_token ?? null;
  });
};

const runCallbackOnce = (): Promise<void> => {
  if (!callbackPromise) {
    callbackPromise = exchangeCode();
  }
  return callbackPromise;
};

const AuthCallback: React.FC = () => {
  const navigate = useNavigate();
  const { setSubject } = useSubject();
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    const finishLogin = async () => {
      try {
        await runCallbackOnce();
        // Bearer is now available via the configured access token
        // provider; fetch our resolved local Subject.
        const me = await authMeApi.get();
        if (cancelled) return;
        setSubject(me);
        // Same landing logic as Layout.handleLogin uses today.
        const tenants = await tenantApi.getAll();
        const isAdmin = tenants.some((t) => t.admin_uid === me.uid);
        navigate(isAdmin ? '/admin' : '/me', { replace: true });
      } catch (err: any) {
        if (cancelled) return;
        console.error('OIDC callback failed:', err);
        setError(err?.message || 'Login failed');
      }
    };
    finishLogin();
    return () => {
      cancelled = true;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return (
    <div className="auth-callback">
      {error ? (
        <>
          <h2>Login failed</h2>
          <p className="error">{error}</p>
          <button className="button button-primary" onClick={() => navigate('/')}>
            Back to home
          </button>
        </>
      ) : (
        <p>Completing sign-in&hellip;</p>
      )}
    </div>
  );
};

export default AuthCallback;
