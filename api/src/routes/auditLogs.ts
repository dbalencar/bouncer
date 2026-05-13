import { Router, Request, Response } from 'express';
import { getAuditLogs } from '../services/auditLogService';
import { AuditLogQueryOptions } from '../types';

const router = Router();

// GET /tenants/:tenantId/audit-logs - List audit logs for a tenant
router.get('/tenants/:tenantId/audit-logs', async (req: Request, res: Response) => {
  try {
    const limit = req.query.limit ? parseInt(String(req.query.limit), 10) : undefined;
    const offset = req.query.offset ? parseInt(String(req.query.offset), 10) : undefined;

    const options: AuditLogQueryOptions = {
      limit: Number.isFinite(limit) ? limit : undefined,
      offset: Number.isFinite(offset) ? offset : undefined,
      actor_uid: req.query.actor_uid ? String(req.query.actor_uid) : undefined,
      entity_type: req.query.entity_type ? String(req.query.entity_type) : undefined,
      action: req.query.action ? String(req.query.action) : undefined,
    };

    const result = await getAuditLogs(req.params.tenantId, options);
    res.json(result);
  } catch (error) {
    console.error('Error getting audit logs:', error);
    res.status(500).json({ error: 'Failed to get audit logs', message: (error as Error).message });
  }
});

export default router;
