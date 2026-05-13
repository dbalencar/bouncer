import { Router, Request, Response } from 'express';
import { getSubjectByUid } from '../services/subjectService';
import { getAuthConfig } from '../config/auth';

const router = Router();

// GET /auth/me - resolved local Subject for the calling actor
// In OIDC mode this is set by the auth middleware after token
// verification (and after JIT-creating the row if needed). In mock mode
// it reflects the X-Actor-Uid header.
router.get('/me', async (req: Request, res: Response) => {
  if (!req.actor) {
    res.status(401).json({ error: 'No actor on request' });
    return;
  }
  const subject = await getSubjectByUid(req.actor.subject_uid);
  if (!subject) {
    // Should be unreachable: middleware just resolved this Subject.
    res.status(404).json({ error: 'Subject not found' });
    return;
  }
  res.json(subject);
});

// GET /auth/config - public, advertises the current auth mode so the
// UI can branch without needing its own env var (also reduces
// build-vs-runtime drift). No secrets here.
router.get('/config', async (_req: Request, res: Response) => {
  const config = getAuthConfig();
  res.json({
    mode: config.mode,
    issuer: config.mode === 'oidc' ? config.issuer : undefined,
  });
});

export default router;
