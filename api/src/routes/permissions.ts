import { Router, Request, Response } from 'express';
import {
  getPermissionsByTenant,
  getPermissionByUid,
  createPermission,
  updatePermission,
  deletePermission
} from '../services/permissionService';
import { CreatePermissionRequest } from '../types';

const router = Router();

// GET /tenants/:tenantId/permissions - Get all permissions for a tenant
router.get('/tenants/:tenantId/permissions', async (req: Request, res: Response) => {
  try {
    const permissions = await getPermissionsByTenant(req.params.tenantId);
    res.json(permissions);
  } catch (error) {
    console.error('Error getting permissions:', error);
    res.status(500).json({ error: 'Failed to get permissions' });
  }
});

// GET /tenants/:tenantId/permissions/:uid - Get specific permission
router.get('/tenants/:tenantId/permissions/:uid', async (req: Request, res: Response) => {
  try {
    const permission = await getPermissionByUid(req.params.tenantId, req.params.uid);
    if (!permission) {
      return res.status(404).json({ error: 'Permission not found' });
    }
    res.json(permission);
  } catch (error) {
    console.error('Error getting permission:', error);
    res.status(500).json({ error: 'Failed to get permission' });
  }
});

// POST /tenants/:tenantId/permissions - Create new permission
router.post('/tenants/:tenantId/permissions', async (req: Request, res: Response) => {
  try {
    const request: CreatePermissionRequest = req.body;
    if (!request.name) {
      return res.status(400).json({ error: 'Permission name is required' });
    }

    const permission = await createPermission(req.params.tenantId, request);
    res.status(201).json(permission);
  } catch (error) {
    console.error('Error creating permission:', error);
    res.status(500).json({ error: 'Failed to create permission', message: (error as Error).message });
  }
});

// PUT /tenants/:tenantId/permissions/:uid - Update permission
router.put('/tenants/:tenantId/permissions/:uid', async (req: Request, res: Response) => {
  try {
    const request: Partial<CreatePermissionRequest> = req.body;
    const permission = await updatePermission(req.params.tenantId, req.params.uid, request);
    res.json(permission);
  } catch (error) {
    console.error('Error updating permission:', error);
    res.status(500).json({ error: 'Failed to update permission', message: (error as Error).message });
  }
});

// DELETE /tenants/:tenantId/permissions/:uid - Delete permission
router.delete('/tenants/:tenantId/permissions/:uid', async (req: Request, res: Response) => {
  try {
    await deletePermission(req.params.tenantId, req.params.uid);
    res.status(204).send();
  } catch (error) {
    console.error('Error deleting permission:', error);
    res.status(500).json({ error: 'Failed to delete permission', message: (error as Error).message });
  }
});

export default router;
