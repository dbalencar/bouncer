import { Router, Request, Response } from 'express';
import {
  createPolicy,
  getPoliciesByTenant,
  getPolicyById,
  updatePolicy,
  deletePolicy
} from '../services/policyService';
import { CreatePolicyRequest } from '../types';

const router = Router();

// GET /tenants/:tenantId/policies - Get all policies for a tenant
router.get('/tenants/:tenantId/policies', async (req: Request, res: Response) => {
  try {
    const policies = await getPoliciesByTenant(req.params.tenantId);
    res.json(policies);
  } catch (error) {
    console.error('Error getting policies:', error);
    res.status(500).json({ error: 'Failed to get policies' });
  }
});

// GET /tenants/:tenantId/policies/:id - Get specific policy
router.get('/tenants/:tenantId/policies/:id', async (req: Request, res: Response) => {
  try {
    const policy = await getPolicyById(req.params.tenantId, req.params.id);
    if (!policy) {
      return res.status(404).json({ error: 'Policy not found' });
    }
    res.json(policy);
  } catch (error) {
    console.error('Error getting policy:', error);
    res.status(500).json({ error: 'Failed to get policy' });
  }
});

// POST /tenants/:tenantId/policies - Create new policy
router.post('/tenants/:tenantId/policies', async (req: Request, res: Response) => {
  try {
    const request: CreatePolicyRequest = req.body;
    if (!request.name || !request.rego_policy) {
      return res.status(400).json({ error: 'Policy name and rego_policy are required' });
    }

    const policy = await createPolicy(req.params.tenantId, request);
    res.status(201).json(policy);
  } catch (error) {
    console.error('Error creating policy:', error);
    res.status(500).json({ error: 'Failed to create policy' });
  }
});

// PUT /tenants/:tenantId/policies/:id - Update policy
router.put('/tenants/:tenantId/policies/:id', async (req: Request, res: Response) => {
  try {
    const request: Partial<CreatePolicyRequest> = req.body;
    const policy = await updatePolicy(req.params.tenantId, req.params.id, request);
    res.json(policy);
  } catch (error) {
    console.error('Error updating policy:', error);
    res.status(500).json({ error: 'Failed to update policy' });
  }
});

// DELETE /tenants/:tenantId/policies/:id - Delete policy
router.delete('/tenants/:tenantId/policies/:id', async (req: Request, res: Response) => {
  try {
    await deletePolicy(req.params.tenantId, req.params.id);
    res.status(204).send();
  } catch (error) {
    console.error('Error deleting policy:', error);
    res.status(500).json({ error: 'Failed to delete policy' });
  }
});

export default router;
