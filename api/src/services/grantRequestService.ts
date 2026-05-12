import { query, getClient } from '../config/database';
import { GrantRequest, CreateGrantRequestRequest, UpdateGrantRequestRequest } from '../types';
import { getSubjectByUid } from './subjectService';
import { getRoleByUid } from './roleService';
import { getTenantBySchemaName } from './tenantService';
import { getGrantsBySubject } from './grantService';

// Validate schema name to prevent SQL injection
const validateSchemaName = (schemaName: string): void => {
  // Schema names should match the pattern: tenant_<name>
  // Only allow alphanumeric characters and underscores
  if (!/^[a-zA-Z0-9_]+$/.test(schemaName)) {
    throw new Error('Invalid schema name');
  }
};

// Check if a subject has admin permission on a specific path
const hasAdminPermissionOnPath = async (schemaName: string, subjectUid: string, path: string): Promise<boolean> => {
  const tenant = await getTenantBySchemaName(schemaName);
  if (!tenant) {
    throw new Error('Invalid tenant schema');
  }

  // Get all grants for the subject
  const grants = await getGrantsBySubject(tenant.id, subjectUid);

  // For each grant, check if the grant path matches or is a parent of the requested path
  for (const grant of grants) {
    // Check if the grant path matches or is a parent of the requested path
    if (path.startsWith(grant.path) || grant.path.startsWith(path)) {
      // Get the role
      const role = await getRoleByUid(tenant.id, grant.role_uid);
      if (!role) {
        continue;
      }

      // Get permissions for the role
      const permissionsResult = await query(
        `SELECT p.* FROM ${schemaName}.role_permissions rp
         JOIN ${schemaName}.permissions p ON rp.permission_uid = p.uid
         WHERE rp.role_uid = $1`,
        [role.uid]
      );

      // Check if the role has admin permission (regardless of permission path)
      const hasAdminPermission = permissionsResult.rows.some(
        (permission: any) => permission.name.toLowerCase() === 'admin'
      );

      if (hasAdminPermission) {
        return true;
      }
    }
  }

  return false;
};

export const createGrantRequest = async (schemaName: string, request: CreateGrantRequestRequest): Promise<GrantRequest> => {
  validateSchemaName(schemaName);

  // Verify that the schema belongs to a valid tenant
  const tenant = await getTenantBySchemaName(schemaName);
  if (!tenant) {
    throw new Error('Invalid tenant schema');
  }

  const client = await getClient();
  try {
    const result = await client.query(
      `INSERT INTO ${schemaName}.grant_requests (subject_uid, path, role_uid, status)
       VALUES ($1, $2, $3, 'pending')
       RETURNING *`,
      [request.subject_uid, request.path, request.role_uid]
    );
    return result.rows[0];
  } finally {
    client.release();
  }
};

export const getGrantRequestsBySubject = async (schemaName: string, subjectUid: string): Promise<GrantRequest[]> => {
  validateSchemaName(schemaName);

  // Verify that the schema belongs to a valid tenant
  const tenant = await getTenantBySchemaName(schemaName);
  if (!tenant) {
    throw new Error('Invalid tenant schema');
  }

  const result = await query(
    `SELECT * FROM ${schemaName}.grant_requests
     WHERE subject_uid = $1
     ORDER BY created_at DESC`,
    [subjectUid]
  );
  return result.rows;
};

export const getGrantRequestsByTenant = async (schemaName: string): Promise<GrantRequest[]> => {
  validateSchemaName(schemaName);

  // Verify that the schema belongs to a valid tenant
  const tenant = await getTenantBySchemaName(schemaName);
  if (!tenant) {
    throw new Error('Invalid tenant schema');
  }

  const result = await query(
    `SELECT * FROM ${schemaName}.grant_requests
     ORDER BY created_at DESC`,
    []
  );
  return result.rows;
};

export const getPendingGrantRequestsByTenant = async (schemaName: string): Promise<GrantRequest[]> => {
  validateSchemaName(schemaName);

  // Verify that the schema belongs to a valid tenant
  const tenant = await getTenantBySchemaName(schemaName);
  if (!tenant) {
    throw new Error('Invalid tenant schema');
  }

  const result = await query(
    `SELECT * FROM ${schemaName}.grant_requests
     WHERE status = 'pending'
     ORDER BY created_at DESC`,
    []
  );
  return result.rows;
};

export const approveGrantRequest = async (schemaName: string, requestUid: string, approverUid: string): Promise<GrantRequest> => {
  validateSchemaName(schemaName);

  // Verify that the schema belongs to a valid tenant
  const tenant = await getTenantBySchemaName(schemaName);
  if (!tenant) {
    throw new Error('Invalid tenant schema');
  }

  const client = await getClient();
  try {
    await client.query('BEGIN');

    // Get the grant request
    const requestResult = await client.query(
      `SELECT * FROM ${schemaName}.grant_requests WHERE uid = $1`,
      [requestUid]
    );

    if (requestResult.rows.length === 0) {
      throw new Error('Grant request not found');
    }

    const request = requestResult.rows[0];

    if (request.status !== 'pending') {
      throw new Error('Grant request is not pending');
    }

    // Check if the approver has admin permission on the requested path
    const hasAdminPermission = await hasAdminPermissionOnPath(schemaName, approverUid, request.path);
    if (!hasAdminPermission) {
      throw new Error('Approver does not have admin permission on the requested path');
    }

    // Validate that subject exists
    const subject = await getSubjectByUid(request.subject_uid);
    if (!subject) {
      throw new Error('Subject not found');
    }

    // Validate that role exists in the tenant
    const role = await getRoleByUid(tenant.id, request.role_uid);
    if (!role) {
      throw new Error('Role not found');
    }

    // Check for duplicate grant
    const existing = await client.query(
      `SELECT * FROM ${schemaName}.grants WHERE subject_uid = $1 AND path = $2 AND role_uid = $3`,
      [request.subject_uid, request.path, request.role_uid]
    );

    if (existing.rows.length > 0) {
      throw new Error('Grant already exists for this subject, path, and role combination');
    }

    // Create the actual grant
    await client.query(
      `INSERT INTO ${schemaName}.grants (subject_uid, path, role_uid)
       VALUES ($1, $2, $3)`,
      [request.subject_uid, request.path, request.role_uid]
    );

    // Update the request status to approved
    const updateResult = await client.query(
      `UPDATE ${schemaName}.grant_requests
       SET status = 'approved', updated_at = CURRENT_TIMESTAMP
       WHERE uid = $1
       RETURNING *`,
      [requestUid]
    );

    await client.query('COMMIT');
    return updateResult.rows[0];
  } catch (error) {
    await client.query('ROLLBACK');
    throw error;
  } finally {
    client.release();
  }
};

export const rejectGrantRequest = async (schemaName: string, requestUid: string, approverUid: string): Promise<GrantRequest> => {
  validateSchemaName(schemaName);

  // Verify that the schema belongs to a valid tenant
  const tenant = await getTenantBySchemaName(schemaName);
  if (!tenant) {
    throw new Error('Invalid tenant schema');
  }

  // Get the grant request to check the path
  const requestResult = await query(
    `SELECT * FROM ${schemaName}.grant_requests WHERE uid = $1`,
    [requestUid]
  );

  if (requestResult.rows.length === 0) {
    throw new Error('Grant request not found');
  }

  const request = requestResult.rows[0];

  // Check if the approver has admin permission on the requested path
  const hasAdminPermission = await hasAdminPermissionOnPath(schemaName, approverUid, request.path);
  if (!hasAdminPermission) {
    throw new Error('Approver does not have admin permission on the requested path');
  }

  const result = await query(
    `UPDATE ${schemaName}.grant_requests
     SET status = 'rejected', updated_at = CURRENT_TIMESTAMP
     WHERE uid = $1
     RETURNING *`,
    [requestUid]
  );

  if (result.rows.length === 0) {
    throw new Error('Grant request not found');
  }

  return result.rows[0];
};

export const deleteGrantRequest = async (schemaName: string, requestUid: string): Promise<void> => {
  validateSchemaName(schemaName);

  // Verify that the schema belongs to a valid tenant
  const tenant = await getTenantBySchemaName(schemaName);
  if (!tenant) {
    throw new Error('Invalid tenant schema');
  }

  const result = await query(
    `DELETE FROM ${schemaName}.grant_requests WHERE uid = $1`,
    [requestUid]
  );

  if (result.rowCount === 0) {
    throw new Error('Grant request not found');
  }
};
