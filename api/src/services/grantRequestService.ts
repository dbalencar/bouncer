import { query, getClient } from '../config/database';
import { GrantRequest, CreateGrantRequestRequest, UpdateGrantRequestRequest } from '../types';
import { getSubjectByUid } from './subjectService';
import { getRoleByUid } from './roleService';
import { getTenantBySchemaName } from './tenantService';

// Validate schema name to prevent SQL injection
const validateSchemaName = (schemaName: string): void => {
  // Schema names should match the pattern: tenant_<name>
  // Only allow alphanumeric characters and underscores
  if (!/^[a-zA-Z0-9_]+$/.test(schemaName)) {
    throw new Error('Invalid schema name');
  }
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

export const approveGrantRequest = async (schemaName: string, requestUid: string): Promise<GrantRequest> => {
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

export const rejectGrantRequest = async (schemaName: string, requestUid: string): Promise<GrantRequest> => {
  validateSchemaName(schemaName);

  // Verify that the schema belongs to a valid tenant
  const tenant = await getTenantBySchemaName(schemaName);
  if (!tenant) {
    throw new Error('Invalid tenant schema');
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
