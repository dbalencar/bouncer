import { Router, Request, Response } from 'express';
import {
  getResourcesByTenant,
  getResourceByUid,
  createResource,
  updateResource,
  deleteResource
} from '../services/resourceService';
import { CreateResourceRequest, UpdateResourceRequest } from '../types';

const router = Router();

// GET /tenants/:tenantId/resources - Get all resources for a tenant
router.get('/tenants/:tenantId/resources', async (req: Request, res: Response) => {
  try {
    const resources = await getResourcesByTenant(req.params.tenantId);
    res.json(resources);
  } catch (error) {
    console.error('Error getting resources:', error);
    res.status(500).json({ error: 'Failed to get resources' });
  }
});

// GET /tenants/:tenantId/resources/:uid - Get specific resource
router.get('/tenants/:tenantId/resources/:uid', async (req: Request, res: Response) => {
  try {
    const resource = await getResourceByUid(req.params.tenantId, req.params.uid);
    if (!resource) {
      return res.status(404).json({ error: 'Resource not found' });
    }
    res.json(resource);
  } catch (error) {
    console.error('Error getting resource:', error);
    res.status(500).json({ error: 'Failed to get resource' });
  }
});

// POST /tenants/:tenantId/resources - Create new resource
router.post('/tenants/:tenantId/resources', async (req: Request, res: Response) => {
  try {
    const request: CreateResourceRequest = req.body;
    if (!request.id || !request.name) {
      return res.status(400).json({ error: 'id and name are required' });
    }

    const resource = await createResource(req.params.tenantId, request);
    res.status(201).json(resource);
  } catch (error) {
    console.error('Error creating resource:', error);
    res.status(500).json({ error: 'Failed to create resource', message: (error as Error).message });
  }
});

// PUT /tenants/:tenantId/resources/:uid - Update resource
router.put('/tenants/:tenantId/resources/:uid', async (req: Request, res: Response) => {
  try {
    const request: UpdateResourceRequest = req.body;
    const resource = await updateResource(req.params.tenantId, req.params.uid, request);
    res.json(resource);
  } catch (error) {
    console.error('Error updating resource:', error);
    res.status(500).json({ error: 'Failed to update resource', message: (error as Error).message });
  }
});

// DELETE /tenants/:tenantId/resources/:uid - Delete resource
router.delete('/tenants/:tenantId/resources/:uid', async (req: Request, res: Response) => {
  try {
    await deleteResource(req.params.tenantId, req.params.uid);
    res.status(204).send();
  } catch (error) {
    console.error('Error deleting resource:', error);
    res.status(500).json({ error: 'Failed to delete resource' });
  }
});

export default router;
