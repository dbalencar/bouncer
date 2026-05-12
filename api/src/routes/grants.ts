import { Router, Request, Response } from 'express';
import {
  getGrantsByTenant,
  getGrantByUid,
  getGrantsBySubject,
  getGrantsByRole,
  createGrant,
  updateGrant,
  deleteGrant
} from '../services/grantService';
import { CreateGrantRequest, UpdateGrantRequest } from '../types';

const router = Router();

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
    await deleteGrant(req.params.tenantId, req.params.uid);
    res.status(204).send();
  } catch (error) {
    console.error('Error deleting grant:', error);
    res.status(500).json({ error: 'Failed to delete grant' });
  }
});

export default router;
