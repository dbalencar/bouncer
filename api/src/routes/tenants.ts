import { Router, Request, Response } from 'express';
import {
  createTenant,
  getAllTenants,
  getTenantById,
  deleteTenant,
  getAccessibleTenants,
  requirePlatformAdmin,
} from '../services/tenantService';
import { getSubjectByUid } from '../services/subjectService';
import { CreateTenantRequest } from '../types';

const router = Router();

// GET /tenants - Get all tenants
router.get('/', async (req: Request, res: Response) => {
  try {
    const tenants = await getAllTenants();
    res.json(tenants);
  } catch (error) {
    console.error('Error getting tenants:', error);
    res.status(500).json({ error: 'Failed to get tenants' });
  }
});

// GET /tenants/accessible?subject_uid=<uid>
// Tenants the subject can switch to in the sidebar dropdown.
router.get('/accessible', async (req: Request, res: Response) => {
  try {
    const subjectUid = req.query.subject_uid ? String(req.query.subject_uid) : '';
    if (!subjectUid) {
      return res.status(400).json({ error: 'subject_uid is required' });
    }
    const subject = await getSubjectByUid(subjectUid);
    if (!subject) {
      return res.status(404).json({ error: 'Subject not found' });
    }
    const tenants = await getAccessibleTenants(subjectUid, subject.is_platform_admin);
    res.json(tenants);
  } catch (error) {
    console.error('Error getting accessible tenants:', error);
    res.status(500).json({ error: 'Failed to get accessible tenants' });
  }
});

// GET /tenants/:id - Get tenant by ID
router.get('/:id', async (req: Request, res: Response) => {
  try {
    const tenant = await getTenantById(req.params.id);
    if (!tenant) {
      return res.status(404).json({ error: 'Tenant not found' });
    }
    res.json(tenant);
  } catch (error) {
    console.error('Error getting tenant:', error);
    res.status(500).json({ error: 'Failed to get tenant' });
  }
});

// POST /tenants - Create new tenant. Requires platform-admin actor.
router.post('/', async (req: Request, res: Response) => {
  try {
    const request: CreateTenantRequest = req.body;
    if (!request.name) {
      return res.status(400).json({ error: 'Tenant name is required' });
    }
    if (!request.admin_uid) {
      return res.status(400).json({ error: 'Admin subject is required' });
    }

    try {
      await requirePlatformAdmin(req.actor?.subject_uid);
    } catch (err: any) {
      return res.status(err.status || 403).json({ error: err.message });
    }

    const tenant = await createTenant(request);
    res.status(201).json(tenant);
  } catch (error) {
    console.error('Error creating tenant:', error);
    res.status(500).json({ error: 'Failed to create tenant', message: (error as Error).message });
  }
});

// DELETE /tenants/:id - Delete tenant. Requires platform-admin actor.
router.delete('/:id', async (req: Request, res: Response) => {
  try {
    try {
      await requirePlatformAdmin(req.actor?.subject_uid);
    } catch (err: any) {
      return res.status(err.status || 403).json({ error: err.message });
    }
    await deleteTenant(req.params.id);
    res.status(204).send();
  } catch (error) {
    console.error('Error deleting tenant:', error);
    res.status(500).json({ error: 'Failed to delete tenant' });
  }
});

export default router;
