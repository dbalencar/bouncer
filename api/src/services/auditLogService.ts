import { query } from '../config/database';
import { AuditLog, CreateAuditLogInput, AuditLogQueryOptions } from '../types';
import { getTenantById, getTenantBySchemaName } from './tenantService';

const SCHEMA_NAME_PATTERN = /^[a-zA-Z0-9_]+$/;
const UUID_PATTERN = /^[0-9a-fA-F]{8}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{12}$/;

// Resolve a tenant from either an id (UUID) or a schema_name. Routes are
// inconsistent: most pass tenant id, grant-requests passes schema_name.
export const resolveTenantSchema = async (tenantIdOrSchema: string): Promise<string | null> => {
  if (UUID_PATTERN.test(tenantIdOrSchema)) {
    const tenant = await getTenantById(tenantIdOrSchema);
    if (tenant) return tenant.schema_name;
  }
  if (SCHEMA_NAME_PATTERN.test(tenantIdOrSchema)) {
    const tenant = await getTenantBySchemaName(tenantIdOrSchema);
    if (tenant) return tenant.schema_name;
  }
  return null;
};

export const createAuditLog = async (
  schemaName: string,
  input: CreateAuditLogInput
): Promise<AuditLog | null> => {
  if (!SCHEMA_NAME_PATTERN.test(schemaName)) {
    throw new Error('Invalid schema name');
  }

  const result = await query(
    `INSERT INTO ${schemaName}.audit_logs (actor_uid, action, entity_type, entity_id, details)
     VALUES ($1, $2, $3, $4, $5) RETURNING *`,
    [
      input.actor_uid || null,
      input.action,
      input.entity_type,
      input.entity_id || null,
      input.details ? JSON.stringify(input.details) : null,
    ]
  );

  return result.rows[0] || null;
};

export const getAuditLogs = async (
  tenantId: string,
  options: AuditLogQueryOptions = {}
): Promise<{ items: AuditLog[]; total: number }> => {
  const tenant = await getTenantById(tenantId);
  if (!tenant) {
    throw new Error('Tenant not found');
  }

  const limit = Math.min(Math.max(options.limit ?? 50, 1), 500);
  const offset = Math.max(options.offset ?? 0, 0);

  const conditions: string[] = [];
  const values: any[] = [];
  let paramCount = 1;

  if (options.actor_uid) {
    conditions.push(`actor_uid = $${paramCount++}`);
    values.push(options.actor_uid);
  }
  if (options.entity_type) {
    conditions.push(`entity_type = $${paramCount++}`);
    values.push(options.entity_type);
  }
  if (options.action) {
    conditions.push(`action = $${paramCount++}`);
    values.push(options.action);
  }

  const where = conditions.length > 0 ? `WHERE ${conditions.join(' AND ')}` : '';

  const countResult = await query(
    `SELECT COUNT(*)::int AS total FROM ${tenant.schema_name}.audit_logs ${where}`,
    values
  );
  const total = countResult.rows[0]?.total ?? 0;

  values.push(limit);
  values.push(offset);

  const itemsResult = await query(
    `SELECT * FROM ${tenant.schema_name}.audit_logs ${where}
     ORDER BY created_at DESC
     LIMIT $${paramCount++} OFFSET $${paramCount++}`,
    values
  );

  return { items: itemsResult.rows, total };
};
