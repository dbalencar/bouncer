import { Router, Request, Response } from 'express';
import {
  getRolesByTenant,
  getRoleByUid,
  createRole,
  updateRole,
  deleteRole,
  getRolePermissions
} from '../services/roleService';
import { CreateRoleRequest } from '../types';

const router = Router();

// GET /tenants/:tenantId/roles - Get all roles for a tenant
router.get('/tenants/:tenantId/roles', async (req: Request, res: Response) => {
  try {
    const roles = await getRolesByTenant(req.params.tenantId);
    res.json(roles);
  } catch (error) {
    console.error('Error getting roles:', error);
    res.status(500).json({ error: 'Failed to get roles' });
  }
});

// GET /tenants/:tenantId/roles/:uid - Get specific role
router.get('/tenants/:tenantId/roles/:uid', async (req: Request, res: Response) => {
  try {
    const role = await getRoleByUid(req.params.tenantId, req.params.uid);
    if (!role) {
      return res.status(404).json({ error: 'Role not found' });
    }
    res.json(role);
  } catch (error) {
    console.error('Error getting role:', error);
    res.status(500).json({ error: 'Failed to get role' });
  }
});

// GET /tenants/:tenantId/roles/:uid/permissions - Get permissions for a role
router.get('/tenants/:tenantId/roles/:uid/permissions', async (req: Request, res: Response) => {
  try {
    const permissions = await getRolePermissions(req.params.tenantId, req.params.uid);
    res.json(permissions);
  } catch (error) {
    console.error('Error getting role permissions:', error);
    res.status(500).json({ error: 'Failed to get role permissions' });
  }
});

// POST /tenants/:tenantId/roles - Create new role
router.post('/tenants/:tenantId/roles', async (req: Request, res: Response) => {
  try {
    const request: CreateRoleRequest = req.body;
    if (!request.name) {
      return res.status(400).json({ error: 'Role name is required' });
    }

    const role = await createRole(req.params.tenantId, request);
    res.status(201).json(role);
  } catch (error) {
    console.error('Error creating role:', error);
    res.status(500).json({ error: 'Failed to create role', message: (error as Error).message });
  }
});

// PUT /tenants/:tenantId/roles/:uid - Update role
router.put('/tenants/:tenantId/roles/:uid', async (req: Request, res: Response) => {
  try {
    const request: Partial<CreateRoleRequest> = req.body;
    const role = await updateRole(req.params.tenantId, req.params.uid, request);
    res.json(role);
  } catch (error) {
    console.error('Error updating role:', error);
    res.status(500).json({ error: 'Failed to update role', message: (error as Error).message });
  }
});

// DELETE /tenants/:tenantId/roles/:uid - Delete role
router.delete('/tenants/:tenantId/roles/:uid', async (req: Request, res: Response) => {
  try {
    await deleteRole(req.params.tenantId, req.params.uid);
    res.status(204).send();
  } catch (error) {
    console.error('Error deleting role:', error);
    res.status(500).json({ error: 'Failed to delete role' });
  }
});

export default router;
