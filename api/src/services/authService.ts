import { JWTPayload } from 'jose';
import { Subject } from '../types';
import {
  getSubjectByOidcSub,
  getSubjectByUsername,
  setSubjectOidcSub,
  createSubjectWithOidc,
} from './subjectService';

interface OidcClaims extends JWTPayload {
  sub?: string;
  preferred_username?: string;
  email?: string;
  name?: string;
  given_name?: string;
  family_name?: string;
}

const buildDisplayName = (claims: OidcClaims): string => {
  if (claims.name && claims.name.trim()) return claims.name.trim();
  const parts = [claims.given_name, claims.family_name].filter(Boolean);
  if (parts.length > 0) return parts.join(' ');
  return claims.preferred_username || claims.sub || 'Unknown';
};

// Resolve a local Subject row for a verified set of OIDC claims, or
// JIT-create one. Lookup order:
//   1. By oidc_sub (the stable IdP user id, fast path after first login).
//   2. By preferred_username — bind oidc_sub onto the matching row so
//      future logins hit the fast path.
//   3. JIT-create using preferred_username / email / sub.
export const resolveOrCreateSubjectFromClaims = async (
  claims: OidcClaims
): Promise<Subject> => {
  if (!claims.sub) {
    throw new Error('OIDC token is missing the `sub` claim');
  }
  if (!claims.preferred_username && !claims.email) {
    throw new Error('OIDC token is missing both `preferred_username` and `email`');
  }

  const existingBySub = await getSubjectByOidcSub(claims.sub);
  if (existingBySub) return existingBySub;

  const username = claims.preferred_username || claims.email!;
  const existingByUsername = await getSubjectByUsername(username);
  if (existingByUsername) {
    if (!existingByUsername.oidc_sub) {
      return await setSubjectOidcSub(existingByUsername.uid, claims.sub);
    }
    // username matches but a different oidc_sub is already bound — treat
    // as a JIT collision and create a new row with a suffixed username.
  }

  const baseUsername = username;
  let safeUsername = baseUsername;
  let attempt = 1;
  // Make username unique for JIT inserts. Rare edge case.
  while (await getSubjectByUsername(safeUsername)) {
    attempt += 1;
    safeUsername = `${baseUsername}_${attempt}`;
  }

  return await createSubjectWithOidc(
    safeUsername,
    buildDisplayName(claims),
    claims.email || `${safeUsername}@unknown.local`,
    claims.sub
  );
};
