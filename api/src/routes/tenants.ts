import { Router, Request, Response } from 'express';
import {
  createTenant,
  getAllTenants,
  getTenantById,
  deleteTenant
} from '../services/tenantService';
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

// POST /tenants - Create new tenant
router.post('/', async (req: Request, res: Response) => {
  try {
    const request: CreateTenantRequest = req.body;
    if (!request.name) {
      return res.status(400).json({ error: 'Tenant name is required' });
    }

    const tenant = await createTenant(request);
    res.status(201).json(tenant);
  } catch (error) {
    console.error('Error creating tenant:', error);
    res.status(500).json({ error: 'Failed to create tenant' });
  }
});

// DELETE /tenants/:id - Delete tenant
router.delete('/:id', async (req: Request, res: Response) => {
  try {
    await deleteTenant(req.params.id);
    res.status(204).send();
  } catch (error) {
    console.error('Error deleting tenant:', error);
    res.status(500).json({ error: 'Failed to delete tenant' });
  }
});

export default router;
