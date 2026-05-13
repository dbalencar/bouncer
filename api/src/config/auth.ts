import { createRemoteJWKSet, jwtVerify, JWTPayload } from 'jose';

export type AuthMode = 'mock' | 'oidc';

export interface AuthConfig {
  mode: AuthMode;
  issuer?: string;
  audience?: string;
}

export const getAuthConfig = (): AuthConfig => {
  const mode = (process.env.AUTH_MODE || 'mock').toLowerCase();
  if (mode !== 'mock' && mode !== 'oidc') {
    throw new Error(`Invalid AUTH_MODE "${process.env.AUTH_MODE}". Use "mock" or "oidc".`);
  }
  return {
    mode: mode as AuthMode,
    issuer: process.env.OIDC_ISSUER,
    audience: process.env.OIDC_AUDIENCE,
  };
};

// Fail fast at boot if OIDC mode is selected without the required vars.
// Without this, every request that tries to verify a token throws and
// the API spams logs with the same stack trace — calling this once at
// startup surfaces the misconfiguration immediately.
export const assertAuthConfigValid = (config: AuthConfig): void => {
  if (config.mode === 'oidc' && !config.issuer) {
    throw new Error(
      'AUTH_MODE=oidc requires OIDC_ISSUER to be set ' +
        '(see api/.env.example). For Keycloak in docker-compose use ' +
        'OIDC_ISSUER=http://localhost:8080/realms/bouncer.'
    );
  }
};

let jwksCache: ReturnType<typeof createRemoteJWKSet> | null = null;
let cachedIssuer: string | null = null;

const getJwks = (issuer: string): ReturnType<typeof createRemoteJWKSet> => {
  if (jwksCache && cachedIssuer === issuer) return jwksCache;
  jwksCache = createRemoteJWKSet(
    new URL(`${issuer.replace(/\/$/, '')}/protocol/openid-connect/certs`)
  );
  cachedIssuer = issuer;
  return jwksCache;
};

export const verifyAccessToken = async (token: string): Promise<JWTPayload> => {
  const config = getAuthConfig();
  if (config.mode !== 'oidc') {
    throw new Error('verifyAccessToken called outside OIDC mode');
  }
  if (!config.issuer) {
    throw new Error('OIDC_ISSUER is not configured');
  }

  const jwks = getJwks(config.issuer);
  const { payload } = await jwtVerify(token, jwks, {
    issuer: config.issuer,
    audience: config.audience,
  });
  return payload;
};
