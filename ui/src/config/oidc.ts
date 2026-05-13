import { UserManager, WebStorageStateStore } from 'oidc-client-ts';
import type { AuthMode } from '../types';

// Build-time mode hint. The runtime source of truth is the API's
// /auth/config endpoint (resolved in AuthContext at app start). This
// constant exists for cases where we need a synchronous default before
// the runtime config arrives (e.g. the initial Login button render).
export const buildModeHint: AuthMode =
  (import.meta.env.VITE_AUTH_MODE as AuthMode) || 'mock';

const issuer =
  (import.meta.env.VITE_OIDC_ISSUER as string) ||
  'http://localhost:8080/realms/bouncer';
const clientId =
  (import.meta.env.VITE_OIDC_CLIENT_ID as string) || 'bouncer-ui';

let userManagerSingleton: UserManager | null = null;

export const getUserManager = (issuerOverride?: string): UserManager => {
  if (userManagerSingleton) return userManagerSingleton;
  userManagerSingleton = new UserManager({
    authority: issuerOverride || issuer,
    client_id: clientId,
    redirect_uri: `${window.location.origin}/callback`,
    post_logout_redirect_uri: `${window.location.origin}/`,
    response_type: 'code',
    scope: 'openid profile email',
    automaticSilentRenew: true,
    userStore: new WebStorageStateStore({ store: window.localStorage }),
  });
  return userManagerSingleton;
};
