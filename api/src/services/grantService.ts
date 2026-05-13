import { query } from '../config/database';
import { Grant, CreateGrantRequest, UpdateGrantRequest } from '../types';
import { getTenantById } from './tenantService';
import { getSubjectByUid } from './subjectService';
import { getRoleByUid, getRolePermissions } from './roleService';

export const getGrantsByTenant = async (tenantId: string): Promise<Grant[]> => {
  const tenant = await getTenantById(tenantId);
  if (!tenant) {
    throw new Error('Tenant not found');
  }

  const result = await query(
    `SELECT * FROM ${tenant.schema_name}.grants ORDER BY created_at DESC`
  );

  return result.rows;
};

export const getGrantByUid = async (tenantId: string, uid: string): Promise<Grant | null> => {
  const tenant = await getTenantById(tenantId);
  if (!tenant) {
    throw new Error('Tenant not found');
  }

  const result = await query(
    `SELECT * FROM ${tenant.schema_name}.grants WHERE uid = $1`,
    [uid]
  );

  return result.rows[0] || null;
};

export const getGrantsBySubject = async (tenantId: string, subjectUid: string): Promise<Grant[]> => {
  const tenant = await getTenantById(tenantId);
  if (!tenant) {
    throw new Error('Tenant not found');
  }

  const result = await query(
    `SELECT * FROM ${tenant.schema_name}.grants WHERE subject_uid = $1 ORDER BY created_at DESC`,
    [subjectUid]
  );

  return result.rows;
};

export const getGrantsByRole = async (tenantId: string, roleUid: string): Promise<Grant[]> => {
  const tenant = await getTenantById(tenantId);
  if (!tenant) {
    throw new Error('Tenant not found');
  }

  const result = await query(
    `SELECT * FROM ${tenant.schema_name}.grants WHERE role_uid = $1 ORDER BY created_at DESC`,
    [roleUid]
  );

  return result.rows;
};

export const createGrant = async (tenantId: string, request: CreateGrantRequest): Promise<Grant> => {
  const tenant = await getTenantById(tenantId);
  if (!tenant) {
    throw new Error('Tenant not found');
  }

  // Validate that subject exists
  const subject = await getSubjectByUid(request.subject_uid);
  if (!subject) {
    throw new Error('Subject not found');
  }

  // Validate that role exists in the tenant
  const role = await getRoleByUid(tenantId, request.role_uid);
  if (!role) {
    throw new Error('Role not found');
  }

  // Check for duplicate grant
  const existing = await query(
    `SELECT * FROM ${tenant.schema_name}.grants WHERE subject_uid = $1 AND path = $2 AND role_uid = $3`,
    [request.subject_uid, request.path, request.role_uid]
  );

  if (existing.rows.length > 0) {
    throw new Error('Grant already exists for this subject, path, and role combination');
  }

  const result = await query(
    `INSERT INTO ${tenant.schema_name}.grants (subject_uid, path, role_uid)
     VALUES ($1, $2, $3) RETURNING *`,
    [request.subject_uid, request.path, request.role_uid]
  );

  return result.rows[0];
};

export const updateGrant = async (tenantId: string, uid: string, request: UpdateGrantRequest): Promise<Grant> => {
  const tenant = await getTenantById(tenantId);
  if (!tenant) {
    throw new Error('Tenant not found');
  }

  // Get current grant
  const currentGrant = await query(
    `SELECT * FROM ${tenant.schema_name}.grants WHERE uid = $1`,
    [uid]
  );

  if (currentGrant.rows.length === 0) {
    throw new Error('Grant not found');
  }

  const current = currentGrant.rows[0];

  // Validate subject if changing
  if (request.subject_uid !== undefined && request.subject_uid !== current.subject_uid) {
    const subject = await getSubjectByUid(request.subject_uid);
    if (!subject) {
      throw new Error('Subject not found');
    }
  }

  // Validate role if changing
  if (request.role_uid !== undefined && request.role_uid !== current.role_uid) {
    const role = await getRoleByUid(tenantId, request.role_uid);
    if (!role) {
      throw new Error('Role not found');
    }
  }

  // Build the updates array
  const updates: string[] = [];
  const values: any[] = [];
  let paramCount = 1;

  if (request.subject_uid !== undefined) {
    updates.push(`subject_uid = $${paramCount++}`);
    values.push(request.subject_uid);
  }

  if (request.path !== undefined) {
    updates.push(`path = $${paramCount++}`);
    values.push(request.path);
  }

  if (request.role_uid !== undefined) {
    updates.push(`role_uid = $${paramCount++}`);
    values.push(request.role_uid);
  }

  if (updates.length === 0) {
    return current;
  }

  updates.push(`updated_at = CURRENT_TIMESTAMP`);
  values.push(uid);

  // Check for duplicate if subject, path, or role is changing
  const newSubjectUid = request.subject_uid !== undefined ? request.subject_uid : current.subject_uid;
  const newPath = request.path !== undefined ? request.path : current.path;
  const newRoleUid = request.role_uid !== undefined ? request.role_uid : current.role_uid;

  if (request.subject_uid !== undefined || request.path !== undefined || request.role_uid !== undefined) {
    const existing = await query(
      `SELECT * FROM ${tenant.schema_name}.grants WHERE subject_uid = $1 AND path = $2 AND role_uid = $3 AND uid != $4`,
      [newSubjectUid, newPath, newRoleUid, uid]
    );

    if (existing.rows.length > 0) {
      throw new Error('Grant already exists for this subject, path, and role combination');
    }
  }

  const result = await query(
    `UPDATE ${tenant.schema_name}.grants SET ${updates.join(', ')} WHERE uid = $${paramCount} RETURNING *`,
    values
  );

  return result.rows[0];
};

export const deleteGrant = async (tenantId: string, uid: string): Promise<void> => {
  const tenant = await getTenantById(tenantId);
  if (!tenant) {
    throw new Error('Tenant not found');
  }

  await query(
    `DELETE FROM ${tenant.schema_name}.grants WHERE uid = $1`,
    [uid]
  );
};

// Returns the deduplicated list of paths on which the subject has a role
// containing a permission named "admin" (case-insensitive). This is the
// path-admin counterpart to grantRequestService.hasAdminPermissionOnPath:
// the same admin-detection rule, but listed up-front so the UI can show
// the path-admin scope to the subject without checking path-by-path.
export const getAdminPathsForSubject = async (
  tenantId: string,
  subjectUid: string
): Promise<string[]> => {
  const grants = await getGrantsBySubject(tenantId, subjectUid);

  const adminPaths = new Set<string>();
  for (const grant of grants) {
    const permissions = await getRolePermissions(tenantId, grant.role_uid);
    const hasAdmin = permissions.some(
      (p) => p.name.toLowerCase() === 'admin'
    );
    if (hasAdmin) {
      adminPaths.add(grant.path);
    }
  }

  return Array.from(adminPaths).sort();
};

// True iff the actor has admin permission on the given path. Mirrors
// grantRequestService.hasAdminPermissionOnPath's bidirectional prefix
// match: a grant on a parent of the path counts, and a grant on a child
// also counts (the latter would be unusual but matches the existing rule).
export const subjectHasAdminOnPath = async (
  tenantId: string,
  subjectUid: string,
  path: string
): Promise<boolean> => {
  const grants = await getGrantsBySubject(tenantId, subjectUid);
  for (const grant of grants) {
    if (!(path.startsWith(grant.path) || grant.path.startsWith(path))) {
      continue;
    }
    const permissions = await getRolePermissions(tenantId, grant.role_uid);
    if (permissions.some((p) => p.name.toLowerCase() === 'admin')) {
      return true;
    }
  }
  return false;
};
