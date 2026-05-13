import { Request, Response, NextFunction } from 'express';
import { getAuthConfig, verifyAccessToken } from '../config/auth';
import { resolveOrCreateSubjectFromClaims } from '../services/authService';
import { getSubjectByUid } from '../services/subjectService';

export interface Actor {
  subject_uid: string;
  username: string;
}

declare global {
  namespace Express {
    interface Request {
      actor?: Actor;
    }
  }
}

// Public allowlist: requests to these paths skip auth entirely.
// Matches by prefix so `/openapi.yaml`, `/openapi.json`, and the
// Swagger UI assets at `/docs` all pass through. Health check too.
const PUBLIC_PATH_PREFIXES = ['/health', '/openapi.yaml', '/openapi.json', '/docs', '/auth/config'];

const isPublic = (path: string): boolean =>
  PUBLIC_PATH_PREFIXES.some((p) => path === p || path.startsWith(`${p}/`) || path.startsWith(`${p}?`));

export const authMiddleware = async (
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> => {
  if (isPublic(req.path)) return next();

  const config = getAuthConfig();

  if (config.mode === 'mock') {
    // Today's behavior: trust X-Actor-Uid, attach the resolved Subject.
    const actorUid = req.header('x-actor-uid');
    if (actorUid) {
      const subject = await getSubjectByUid(actorUid);
      if (subject) {
        req.actor = { subject_uid: subject.uid, username: subject.username };
      }
    }
    return next();
  }

  // OIDC mode: a valid Bearer is required on every non-public route.
  const header = req.header('authorization') || '';
  const match = header.match(/^Bearer (.+)$/i);
  if (!match) {
    res.status(401).json({ error: 'Missing Bearer token' });
    return;
  }

  try {
    const claims = await verifyAccessToken(match[1]);
    const subject = await resolveOrCreateSubjectFromClaims(claims);
    req.actor = { subject_uid: subject.uid, username: subject.username };
    next();
  } catch (err) {
    console.error('Token verification failed:', err);
    res.status(401).json({ error: 'Invalid or expired token' });
  }
};
