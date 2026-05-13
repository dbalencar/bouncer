import { Request, Response, NextFunction } from 'express';
import { createAuditLog, resolveTenantSchema } from '../services/auditLogService';

interface AuditPattern {
  regex: RegExp;
  methods: string[];
  entityType: string;
  // Action override (e.g. "approve_grant_request" for approve endpoint)
  actionOverride?: string;
}

// Each pattern captures: [tenant param, entity id (optional)]
const PATTERNS: AuditPattern[] = [
  // Policies
  { regex: /^\/tenants\/([^/]+)\/policies\/?$/, methods: ['POST'], entityType: 'policy' },
  { regex: /^\/tenants\/([^/]+)\/policies\/([^/]+)\/?$/, methods: ['PUT', 'DELETE'], entityType: 'policy' },

  // Permissions
  { regex: /^\/tenants\/([^/]+)\/permissions\/?$/, methods: ['POST'], entityType: 'permission' },
  { regex: /^\/tenants\/([^/]+)\/permissions\/([^/]+)\/?$/, methods: ['PUT', 'DELETE'], entityType: 'permission' },

  // Roles
  { regex: /^\/tenants\/([^/]+)\/roles\/?$/, methods: ['POST'], entityType: 'role' },
  { regex: /^\/tenants\/([^/]+)\/roles\/([^/]+)\/?$/, methods: ['PUT', 'DELETE'], entityType: 'role' },

  // Resource groups
  { regex: /^\/tenants\/([^/]+)\/resource-groups\/?$/, methods: ['POST'], entityType: 'resource_group' },
  { regex: /^\/tenants\/([^/]+)\/resource-groups\/([^/]+)\/?$/, methods: ['PUT', 'DELETE'], entityType: 'resource_group' },

  // Resources
  { regex: /^\/tenants\/([^/]+)\/resources\/?$/, methods: ['POST'], entityType: 'resource' },
  { regex: /^\/tenants\/([^/]+)\/resources\/([^/]+)\/?$/, methods: ['PUT', 'DELETE'], entityType: 'resource' },

  // Grants
  { regex: /^\/tenants\/([^/]+)\/grants\/?$/, methods: ['POST'], entityType: 'grant' },
  { regex: /^\/tenants\/([^/]+)\/grants\/([^/]+)\/?$/, methods: ['PUT', 'DELETE'], entityType: 'grant' },

  // Grant requests
  { regex: /^\/tenants\/([^/]+)\/grant-requests\/?$/, methods: ['POST'], entityType: 'grant_request' },
  { regex: /^\/tenants\/([^/]+)\/grant-requests\/([^/]+)\/approve\/?$/, methods: ['PUT'], entityType: 'grant_request', actionOverride: 'approve' },
  { regex: /^\/tenants\/([^/]+)\/grant-requests\/([^/]+)\/reject\/?$/, methods: ['PUT'], entityType: 'grant_request', actionOverride: 'reject' },
  { regex: /^\/tenants\/([^/]+)\/grant-requests\/([^/]+)\/?$/, methods: ['DELETE'], entityType: 'grant_request' },
];

const methodToAction = (method: string): string => {
  switch (method) {
    case 'POST': return 'create';
    case 'PUT':
    case 'PATCH': return 'update';
    case 'DELETE': return 'delete';
    default: return method.toLowerCase();
  }
};

const matchPattern = (method: string, path: string): { pattern: AuditPattern; match: RegExpMatchArray } | null => {
  for (const pattern of PATTERNS) {
    if (!pattern.methods.includes(method)) continue;
    const match = path.match(pattern.regex);
    if (match) return { pattern, match };
  }
  return null;
};

const extractEntityIdFromBody = (body: any): string | null => {
  if (!body || typeof body !== 'object') return null;
  if (typeof body.uid === 'string') return body.uid;
  if (typeof body.id === 'string') return body.id;
  return null;
};

export const auditLogger = (req: Request, res: Response, next: NextFunction): void => {
  const method = req.method.toUpperCase();
  if (!['POST', 'PUT', 'PATCH', 'DELETE'].includes(method)) {
    return next();
  }

  const matched = matchPattern(method, req.path);
  if (!matched) {
    return next();
  }

  // Prefer the actor resolved by authMiddleware (handles both mock and
  // oidc modes). Fall back to body fields for the legacy approval flow
  // where the approver UID is in the request body, not derivable from
  // the actor (e.g. a tenant admin approving on someone else's behalf
  // — out of scope today, but keeps audit attribution accurate).
  const actorUid = (req.actor?.subject_uid || req.body?.actor_uid || req.body?.approver_uid || null) as string | null;
  const tenantParam = matched.match[1];
  const pathEntityId = matched.match[2] || null;

  // Capture the original body sent via res.json (used to extract the created
  // entity id for POST responses)
  let responseBody: any = null;
  const origJson = res.json.bind(res);
  res.json = (body: any) => {
    responseBody = body;
    return origJson(body);
  };

  res.on('finish', async () => {
    if (res.statusCode < 200 || res.statusCode >= 300) return;
    try {
      const schemaName = await resolveTenantSchema(tenantParam);
      if (!schemaName) return;

      const entityId = pathEntityId || extractEntityIdFromBody(responseBody);
      const action = matched.pattern.actionOverride || methodToAction(method);

      await createAuditLog(schemaName, {
        actor_uid: actorUid,
        action,
        entity_type: matched.pattern.entityType,
        entity_id: entityId,
        details: {
          method,
          path: req.originalUrl,
          status: res.statusCode,
        },
      });
    } catch (err) {
      console.error('Audit log write failed:', err);
    }
  });

  next();
};
