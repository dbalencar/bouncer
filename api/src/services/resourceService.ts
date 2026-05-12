import { query } from '../config/database';
import { Resource, CreateResourceRequest, UpdateResourceRequest } from '../types';
import { getTenantById } from './tenantService';

export const getResourcesByTenant = async (tenantId: string): Promise<Resource[]> => {
  const tenant = await getTenantById(tenantId);
  if (!tenant) {
    throw new Error('Tenant not found');
  }

  const result = await query(
    `SELECT * FROM ${tenant.schema_name}.resources ORDER BY path`
  );

  return result.rows;
};

export const getResourceByUid = async (tenantId: string, uid: string): Promise<Resource | null> => {
  const tenant = await getTenantById(tenantId);
  if (!tenant) {
    throw new Error('Tenant not found');
  }

  const result = await query(
    `SELECT * FROM ${tenant.schema_name}.resources WHERE uid = $1`,
    [uid]
  );

  return result.rows[0] || null;
};

export const getResourcesByGroup = async (tenantId: string, groupUid: string): Promise<Resource[]> => {
  const tenant = await getTenantById(tenantId);
  if (!tenant) {
    throw new Error('Tenant not found');
  }

  const result = await query(
    `SELECT * FROM ${tenant.schema_name}.resources WHERE group_uid = $1 ORDER BY path`,
    [groupUid]
  );

  return result.rows;
};

export const createResource = async (tenantId: string, request: CreateResourceRequest): Promise<Resource> => {
  const tenant = await getTenantById(tenantId);
  if (!tenant) {
    throw new Error('Tenant not found');
  }

  // Validate that id is unique
  const existing = await query(
    `SELECT * FROM ${tenant.schema_name}.resources WHERE id = $1`,
    [request.id]
  );

  if (existing.rows.length > 0) {
    throw new Error('Resource with this id already exists');
  }

  // Validate that group exists if specified
  let groupPath = '';
  if (request.group_uid) {
    const group = await query(
      `SELECT * FROM ${tenant.schema_name}.resource_groups WHERE uid = $1`,
      [request.group_uid]
    );

    if (group.rows.length === 0) {
      throw new Error('Resource group not found');
    }

    groupPath = group.rows[0].path;
  }

  // Build the path based on group
  const path = groupPath ? `${groupPath}/${request.id.toLowerCase()}` : `/${request.id.toLowerCase()}`;

  const result = await query(
    `INSERT INTO ${tenant.schema_name}.resources (id, name, group_uid, path)
     VALUES ($1, $2, $3, $4) RETURNING *`,
    [request.id, request.name, request.group_uid || null, path]
  );

  return result.rows[0];
};

export const updateResource = async (tenantId: string, uid: string, request: UpdateResourceRequest): Promise<Resource> => {
  const tenant = await getTenantById(tenantId);
  if (!tenant) {
    throw new Error('Tenant not found');
  }

  // Get current resource to track path changes
  const currentRes = await query(
    `SELECT * FROM ${tenant.schema_name}.resources WHERE uid = $1`,
    [uid]
  );

  if (currentRes.rows.length === 0) {
    throw new Error('Resource not found');
  }

  const currentResource = currentRes.rows[0];
  const oldPath = currentResource.path;

  // Validate that group exists if specified
  if (request.group_uid !== undefined && request.group_uid !== null) {
    const group = await query(
      `SELECT * FROM ${tenant.schema_name}.resource_groups WHERE uid = $1`,
      [request.group_uid]
    );

    if (group.rows.length === 0) {
      throw new Error('Resource group not found');
    }
  }

  // Validate that id is unique if changing
  if (request.id !== undefined && request.id !== currentResource.id) {
    const existing = await query(
      `SELECT * FROM ${tenant.schema_name}.resources WHERE id = $1`,
      [request.id]
    );

    if (existing.rows.length > 0) {
      throw new Error('Resource with this id already exists');
    }
  }

  // Build the updates array
  const updates: string[] = [];
  const values: any[] = [];
  let paramCount = 1;

  if (request.id !== undefined) {
    updates.push(`id = $${paramCount++}`);
    values.push(request.id);
  }

  if (request.name !== undefined) {
    updates.push(`name = $${paramCount++}`);
    values.push(request.name);
  }

  if (request.group_uid !== undefined) {
    updates.push(`group_uid = $${paramCount++}`);
    values.push(request.group_uid);
  }

  // Recalculate path if id or group changed
  let newPath: string | null = null;
  if (request.id !== undefined || request.group_uid !== undefined) {
    const id = request.id || currentResource.id;
    const groupUid = request.group_uid !== undefined ? request.group_uid : currentResource.group_uid;

    if (groupUid) {
      const group = await query(
        `SELECT path FROM ${tenant.schema_name}.resource_groups WHERE uid = $1`,
        [groupUid]
      );
      if (group.rows.length > 0) {
        newPath = `${group.rows[0].path}/${id.toLowerCase()}`;
      }
    } else {
      newPath = `/${id.toLowerCase()}`;
    }

    updates.push(`path = $${paramCount++}`);
    values.push(newPath);
  }

  updates.push(`updated_at = CURRENT_TIMESTAMP`);
  values.push(uid);

  const result = await query(
    `UPDATE ${tenant.schema_name}.resources SET ${updates.join(', ')} WHERE uid = $${paramCount} RETURNING *`,
    values
  );

  return result.rows[0];
};

export const deleteResource = async (tenantId: string, uid: string): Promise<void> => {
  const tenant = await getTenantById(tenantId);
  if (!tenant) {
    throw new Error('Tenant not found');
  }

  await query(
    `DELETE FROM ${tenant.schema_name}.resources WHERE uid = $1`,
    [uid]
  );
};
