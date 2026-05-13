import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { getUserManager } from '../../config/oidc';
import { authMeApi, tenantApi } from '../../services/api';
import { useSubject } from '../../context/SubjectContext';
import './AuthCallback.css';

const AuthCallback: React.FC = () => {
  const navigate = useNavigate();
  const { setSubject } = useSubject();
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    const finishLogin = async () => {
      try {
        const userManager = getUserManager();
        await userManager.signinRedirectCallback();
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
