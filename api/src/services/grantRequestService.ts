import { query, getClient } from '../config/database';
import { GrantRequest, CreateGrantRequestRequest, UpdateGrantRequestRequest } from '../types';
import { createGrant as createGrantService } from './grantService';

export const createGrantRequest = async (tenantId: string, request: CreateGrantRequestRequest): Promise<GrantRequest> => {
  const client = await getClient();
  try {
    const result = await client.query(
      `INSERT INTO grant_requests (subject_uid, tenant_id, path, role_uid, status)
       VALUES ($1, $2, $3, $4, 'pending')
       RETURNING *`,
      [request.subject_uid, tenantId, request.path, request.role_uid]
    );
    return result.rows[0];
  } finally {
    client.release();
  }
};

export const getGrantRequestsBySubject = async (tenantId: string, subjectUid: string): Promise<GrantRequest[]> => {
  const result = await query(
    `SELECT * FROM grant_requests 
     WHERE tenant_id = $1 AND subject_uid = $2 
     ORDER BY created_at DESC`,
    [tenantId, subjectUid]
  );
  return result.rows;
};

export const getGrantRequestsByTenant = async (tenantId: string): Promise<GrantRequest[]> => {
  const result = await query(
    `SELECT * FROM grant_requests 
     WHERE tenant_id = $1 
     ORDER BY created_at DESC`,
    [tenantId]
  );
  return result.rows;
};

export const getPendingGrantRequestsByTenant = async (tenantId: string): Promise<GrantRequest[]> => {
  const result = await query(
    `SELECT * FROM grant_requests 
     WHERE tenant_id = $1 AND status = 'pending' 
     ORDER BY created_at DESC`,
    [tenantId]
  );
  return result.rows;
};

export const approveGrantRequest = async (tenantId: string, requestUid: string): Promise<GrantRequest> => {
  const client = await getClient();
  try {
    await client.query('BEGIN');

    // Get the grant request
    const requestResult = await client.query(
      'SELECT * FROM grant_requests WHERE uid = $1 AND tenant_id = $2',
      [requestUid, tenantId]
    );

    if (requestResult.rows.length === 0) {
      throw new Error('Grant request not found');
    }

    const request = requestResult.rows[0];

    if (request.status !== 'pending') {
      throw new Error('Grant request is not pending');
    }

    // Create the actual grant
    await createGrantService(tenantId, {
      subject_uid: request.subject_uid,
      path: request.path,
      role_uid: request.role_uid,
    });

    // Update the request status to approved
    const updateResult = await client.query(
      `UPDATE grant_requests 
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

export const rejectGrantRequest = async (tenantId: string, requestUid: string): Promise<GrantRequest> => {
  const result = await query(
    `UPDATE grant_requests 
     SET status = 'rejected', updated_at = CURRENT_TIMESTAMP 
     WHERE uid = $1 AND tenant_id = $2 
     RETURNING *`,
    [requestUid, tenantId]
  );

  if (result.rows.length === 0) {
    throw new Error('Grant request not found');
  }

  return result.rows[0];
};

export const deleteGrantRequest = async (tenantId: string, requestUid: string): Promise<void> => {
  const result = await query(
    'DELETE FROM grant_requests WHERE uid = $1 AND tenant_id = $2',
    [requestUid, tenantId]
  );

  if (result.rowCount === 0) {
    throw new Error('Grant request not found');
  }
};
