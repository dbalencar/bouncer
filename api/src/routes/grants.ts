import { Router, Request, Response } from 'express';
import {
  getGrantsByTenant,
  getGrantByUid,
  getGrantsBySubject,
  getGrantsByRole,
  createGrant,
  updateGrant,
  deleteGrant,
  getAdminPathsForSubject,
  subjectHasAdminOnPath,
} from '../services/grantService';
import { getTenantById } from '../services/tenantService';
import { CreateGrantRequest, UpdateGrantRequest } from '../types';

const router = Router();

// Authorize an actor for a grant mutation on a given path. Tenant admins
// pass through; other actors must have an "admin" role-permission on a
// path that overlaps (bidirectional prefix). The actor comes from
// authMiddleware: in oidc mode it's derived from the verified Bearer
// token; in mock mode it's the X-Actor-Uid header. When no actor is
// present (mock mode without the header), allow — matches the app's
// mocked-auth posture, audit log stays the source of truth.
const ensureActorCanMutateGrantPath = async (
  req: Request,
  tenantId: string,
  path: string
): Promise<{ ok: true } | { ok: false; status: number; error: string }> => {
  const actorUid = req.actor?.subject_uid;
  if (!actorUid) return { ok: true };

  const tenant = await getTenantById(tenantId);
  if (!tenant) {
    return { ok: false, status: 404, error: 'Tenant not found' };
  }
  if (tenant.admin_uid === actorUid) return { ok: true };

  const allowed = await subjectHasAdminOnPath(tenantId, actorUid, path);
  if (!allowed) {
    return {
      ok: false,
      status: 403,
      error: 'Actor does not have admin permission on this path',
    };
  }
  return { ok: true };
};

// GET /tenants/:tenantId/admin-paths - List paths on which a subject has
// the "admin" role-permission. Used by the /access UI to show the subject
// which groups/resources they can manage grants for.
router.get('/tenants/:tenantId/admin-paths', async (req: Request, res: Response) => {
  try {
    const subjectUid = req.query.subject_uid ? String(req.query.subject_uid) : '';
    if (!subjectUid) {
      return res.status(400).json({ error: 'subject_uid is required' });
    }
    const paths = await getAdminPathsForSubject(req.params.tenantId, subjectUid);
    res.json({ paths });
  } catch (error) {
    console.error('Error getting admin paths:', error);
    res.status(500).json({ error: 'Failed to get admin paths', message: (error as Error).message });
  }
});

// GET /tenants/:tenantId/grants - Get all grants for a tenant
router.get('/tenants/:tenantId/grants', async (req: Request, res: Response) => {
  try {
    const grants = await getGrantsByTenant(req.params.tenantId);
    res.json(grants);
  } catch (error) {
    console.error('Error getting grants:', error);
    res.status(500).json({ error: 'Failed to get grants' });
  }
});

// GET /tenants/:tenantId/grants/:uid - Get specific grant
router.get('/tenants/:tenantId/grants/:uid', async (req: Request, res: Response) => {
  try {
    const grant = await getGrantByUid(req.params.tenantId, req.params.uid);
    if (!grant) {
      return res.status(404).json({ error: 'Grant not found' });
    }
    res.json(grant);
  } catch (error) {
    console.error('Error getting grant:', error);
    res.status(500).json({ error: 'Failed to get grant' });
  }
});

// GET /tenants/:tenantId/grants/subject/:subjectUid - Get grants for a subject
router.get('/tenants/:tenantId/grants/subject/:subjectUid', async (req: Request, res: Response) => {
  try {
    const grants = await getGrantsBySubject(req.params.tenantId, req.params.subjectUid);
    res.json(grants);
  } catch (error) {
    console.error('Error getting grants for subject:', error);
    res.status(500).json({ error: 'Failed to get grants for subject' });
  }
});

// GET /tenants/:tenantId/grants/role/:roleUid - Get grants for a role
router.get('/tenants/:tenantId/grants/role/:roleUid', async (req: Request, res: Response) => {
  try {
    const grants = await getGrantsByRole(req.params.tenantId, req.params.roleUid);
    res.json(grants);
  } catch (error) {
    console.error('Error getting grants for role:', error);
    res.status(500).json({ error: 'Failed to get grants for role' });
  }
});

// POST /tenants/:tenantId/grants - Create new grant
router.post('/tenants/:tenantId/grants', async (req: Request, res: Response) => {
  try {
    const request: CreateGrantRequest = req.body;
    if (!request.subject_uid || !request.path || !request.role_uid) {
      return res.status(400).json({ error: 'subject_uid, path, and role_uid are required' });
    }

    const auth = await ensureActorCanMutateGrantPath(req, req.params.tenantId, request.path);
    if (!auth.ok) return res.status(auth.status).json({ error: auth.error });

    const grant = await createGrant(req.params.tenantId, request);
    res.status(201).json(grant);
  } catch (error) {
    console.error('Error creating grant:', error);
    res.status(500).json({ error: 'Failed to create grant', message: (error as Error).message });
  }
});

// PUT /tenants/:tenantId/grants/:uid - Update grant
router.put('/tenants/:tenantId/grants/:uid', async (req: Request, res: Response) => {
  try {
    const request: UpdateGrantRequest = req.body;

    const current = await getGrantByUid(req.params.tenantId, req.params.uid);
    if (!current) {
      return res.status(404).json({ error: 'Grant not found' });
    }

    // Require admin on the old path (the actor must be able to touch this
    // grant today) and on the new path (so they can't move a grant to a
    // path outside their scope).
    const oldAuth = await ensureActorCanMutateGrantPath(req, req.params.tenantId, current.path);
    if (!oldAuth.ok) return res.status(oldAuth.status).json({ error: oldAuth.error });

    if (request.path && request.path !== current.path) {
      const newAuth = await ensureActorCanMutateGrantPath(req, req.params.tenantId, request.path);
      if (!newAuth.ok) return res.status(newAuth.status).json({ error: newAuth.error });
    }

    const grant = await updateGrant(req.params.tenantId, req.params.uid, request);
    res.json(grant);
  } catch (error) {
    console.error('Error updating grant:', error);
    res.status(500).json({ error: 'Failed to update grant', message: (error as Error).message });
  }
});

// DELETE /tenants/:tenantId/grants/:uid - Delete grant
router.delete('/tenants/:tenantId/grants/:uid', async (req: Request, res: Response) => {
  try {
    const current = await getGrantByUid(req.params.tenantId, req.params.uid);
    if (!current) {
      return res.status(404).json({ error: 'Grant not found' });
    }

    const auth = await ensureActorCanMutateGrantPath(req, req.params.tenantId, current.path);
    if (!auth.ok) return res.status(auth.status).json({ error: auth.error });

    await deleteGrant(req.params.tenantId, req.params.uid);
    res.status(204).send();
  } catch (error) {
    console.error('Error deleting grant:', error);
    res.status(500).json({ error: 'Failed to delete grant' });
  }
});

export default router;
