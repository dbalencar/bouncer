import { Router, Request, Response } from 'express';
import {
  createGrantRequest,
  getGrantRequestsBySubject,
  getGrantRequestsByTenant,
  getPendingGrantRequestsByTenant,
  approveGrantRequest,
  rejectGrantRequest,
  deleteGrantRequest
} from '../services/grantRequestService';
import { CreateGrantRequestRequest } from '../types';

const router = Router();

// POST /tenants/:tenantId/grant-requests - Create grant request
router.post('/tenants/:tenantId/grant-requests', async (req: Request, res: Response) => {
  try {
    const request: CreateGrantRequestRequest = req.body;
    if (!request.subject_uid || !request.path || !request.role_uid) {
      return res.status(400).json({ error: 'subject_uid, path, and role_uid are required' });
    }

    const grantRequest = await createGrantRequest(req.params.tenantId, request);
    res.status(201).json(grantRequest);
  } catch (error) {
    console.error('Error creating grant request:', error);
    res.status(500).json({ error: 'Failed to create grant request', message: (error as Error).message });
  }
});

// GET /tenants/:tenantId/grant-requests/subject/:subjectUid - Get subject's grant requests
router.get('/tenants/:tenantId/grant-requests/subject/:subjectUid', async (req: Request, res: Response) => {
  try {
    const requests = await getGrantRequestsBySubject(req.params.tenantId, req.params.subjectUid);
    res.json(requests);
  } catch (error) {
    console.error('Error getting grant requests for subject:', error);
    res.status(500).json({ error: 'Failed to get grant requests for subject' });
  }
});

// GET /tenants/:tenantId/grant-requests - Get all tenant grant requests
router.get('/tenants/:tenantId/grant-requests', async (req: Request, res: Response) => {
  try {
    const status = req.query.status as string;
    let requests;
    
    if (status === 'pending') {
      requests = await getPendingGrantRequestsByTenant(req.params.tenantId);
    } else {
      requests = await getGrantRequestsByTenant(req.params.tenantId);
    }
    
    res.json(requests);
  } catch (error) {
    console.error('Error getting grant requests:', error);
    res.status(500).json({ error: 'Failed to get grant requests' });
  }
});

// PUT /tenants/:tenantId/grant-requests/:uid/approve - Approve grant request
router.put('/tenants/:tenantId/grant-requests/:uid/approve', async (req: Request, res: Response) => {
  try {
    const grantRequest = await approveGrantRequest(req.params.tenantId, req.params.uid);
    res.json(grantRequest);
  } catch (error) {
    console.error('Error approving grant request:', error);
    res.status(500).json({ error: 'Failed to approve grant request', message: (error as Error).message });
  }
});

// PUT /tenants/:tenantId/grant-requests/:uid/reject - Reject grant request
router.put('/tenants/:tenantId/grant-requests/:uid/reject', async (req: Request, res: Response) => {
  try {
    const grantRequest = await rejectGrantRequest(req.params.tenantId, req.params.uid);
    res.json(grantRequest);
  } catch (error) {
    console.error('Error rejecting grant request:', error);
    res.status(500).json({ error: 'Failed to reject grant request', message: (error as Error).message });
  }
});

// DELETE /tenants/:tenantId/grant-requests/:uid - Delete grant request
router.delete('/tenants/:tenantId/grant-requests/:uid', async (req: Request, res: Response) => {
  try {
    await deleteGrantRequest(req.params.tenantId, req.params.uid);
    res.status(204).send();
  } catch (error) {
    console.error('Error deleting grant request:', error);
    res.status(500).json({ error: 'Failed to delete grant request', message: (error as Error).message });
  }
});

export default router;
