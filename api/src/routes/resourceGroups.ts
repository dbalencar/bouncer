import { Router, Request, Response } from 'express';
import {
  getResourceGroupsByTenant,
  getResourceGroupByUid,
  createResourceGroup,
  updateResourceGroup,
  deleteResourceGroup,
  getResourcesByGroup
} from '../services/resourceGroupService';
import { CreateResourceGroupRequest, UpdateResourceGroupRequest } from '../types';

const router = Router();

// GET /tenants/:tenantId/resource-groups - Get all resource groups for a tenant
router.get('/tenants/:tenantId/resource-groups', async (req: Request, res: Response) => {
  try {
    const groups = await getResourceGroupsByTenant(req.params.tenantId);
    res.json(groups);
  } catch (error) {
    console.error('Error getting resource groups:', error);
    res.status(500).json({ error: 'Failed to get resource groups' });
  }
});

// GET /tenants/:tenantId/resource-groups/:uid - Get specific resource group
router.get('/tenants/:tenantId/resource-groups/:uid', async (req: Request, res: Response) => {
  try {
    const group = await getResourceGroupByUid(req.params.tenantId, req.params.uid);
    if (!group) {
      return res.status(404).json({ error: 'Resource group not found' });
    }
    res.json(group);
  } catch (error) {
    console.error('Error getting resource group:', error);
    res.status(500).json({ error: 'Failed to get resource group' });
  }
});

// GET /tenants/:tenantId/resource-groups/:uid/resources - Get resources in a group
router.get('/tenants/:tenantId/resource-groups/:uid/resources', async (req: Request, res: Response) => {
  try {
    const resources = await getResourcesByGroup(req.params.tenantId, req.params.uid);
    res.json(resources);
  } catch (error) {
    console.error('Error getting resources in group:', error);
    res.status(500).json({ error: 'Failed to get resources in group' });
  }
});

// POST /tenants/:tenantId/resource-groups - Create new resource group
router.post('/tenants/:tenantId/resource-groups', async (req: Request, res: Response) => {
  try {
    const request: CreateResourceGroupRequest = req.body;
    if (!request.id || !request.name || !request.label) {
      return res.status(400).json({ error: 'id, name, and label are required' });
    }

    const group = await createResourceGroup(req.params.tenantId, request);
    res.status(201).json(group);
  } catch (error) {
    console.error('Error creating resource group:', error);
    res.status(500).json({ error: 'Failed to create resource group', message: (error as Error).message });
  }
});

// PUT /tenants/:tenantId/resource-groups/:uid - Update resource group
router.put('/tenants/:tenantId/resource-groups/:uid', async (req: Request, res: Response) => {
  try {
    const request: UpdateResourceGroupRequest = req.body;
    const group = await updateResourceGroup(req.params.tenantId, req.params.uid, request);
    res.json(group);
  } catch (error) {
    console.error('Error updating resource group:', error);
    res.status(500).json({ error: 'Failed to update resource group', message: (error as Error).message });
  }
});

// DELETE /tenants/:tenantId/resource-groups/:uid - Delete resource group
router.delete('/tenants/:tenantId/resource-groups/:uid', async (req: Request, res: Response) => {
  try {
    await deleteResourceGroup(req.params.tenantId, req.params.uid);
    res.status(204).send();
  } catch (error) {
    console.error('Error deleting resource group:', error);
    res.status(500).json({ error: 'Failed to delete resource group', message: (error as Error).message });
  }
});

export default router;
