import { Router, Request, Response } from 'express';
import { evaluatePolicyRequest } from '../services/opaService';
import { PolicyEvaluationRequest } from '../types';

const router = Router();

// POST /tenants/:tenantId/evaluate - Evaluate policy
router.post('/tenants/:tenantId/evaluate', async (req: Request, res: Response) => {
  try {
    const request: PolicyEvaluationRequest = req.body;
    
    if (!request.subjectUid || !request.resourceType || !request.resourceId || !request.action) {
      return res.status(400).json({ 
        error: 'subjectUid, resourceType, resourceId, and action are required' 
      });
    }

    const result = await evaluatePolicyRequest(req.params.tenantId, request);
    res.json(result);
  } catch (error) {
    console.error('Error evaluating policy:', error);
    res.status(500).json({ error: 'Failed to evaluate policy' });
  }
});

export default router;
