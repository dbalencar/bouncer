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
