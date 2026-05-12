import { query } from '../config/database';
import { Permission, CreatePermissionRequest } from '../types';
import { getTenantById } from './tenantService';

export const getPermissionsByTenant = async (tenantId: string): Promise<Permission[]> => {
  const tenant = await getTenantById(tenantId);
  if (!tenant) {
    throw new Error('Tenant not found');
  }

  const result = await query(
    `SELECT * FROM ${tenant.schema_name}.permissions ORDER BY path`
  );
  
  return result.rows;
};

export const getPermissionByUid = async (tenantId: string, uid: string): Promise<Permission | null> => {
  const tenant = await getTenantById(tenantId);
  if (!tenant) {
    throw new Error('Tenant not found');
  }

  const result = await query(
    `SELECT * FROM ${tenant.schema_name}.permissions WHERE uid = $1`,
    [uid]
  );
  
  return result.rows[0] || null;
};

export const createPermission = async (tenantId: string, request: CreatePermissionRequest): Promise<Permission> => {
  const tenant = await getTenantById(tenantId);
  if (!tenant) {
    throw new Error('Tenant not found');
  }

  // Validate that parent exists if specified
  if (request.parent_uid) {
    const parent = await query(
      `SELECT * FROM ${tenant.schema_name}.permissions WHERE uid = $1`,
      [request.parent_uid]
    );
    
    if (parent.rows.length === 0) {
      throw new Error('Parent permission not found');
    }
  }

  // Build the path based on parent
  let path = `/${request.name.toLowerCase()}`;
  if (request.parent_uid) {
    const parent = await query(
      `SELECT path FROM ${tenant.schema_name}.permissions WHERE uid = $1`,
      [request.parent_uid]
    );
    if (parent.rows.length > 0) {
      path = `${parent.rows[0].path}/${request.name.toLowerCase()}`;
    }
  }

  const result = await query(
    `INSERT INTO ${tenant.schema_name}.permissions (name, parent_uid, path) 
     VALUES ($1, $2, $3) RETURNING *`,
    [request.name, request.parent_uid, path]
  );
  
  return result.rows[0];
};

export const updatePermission = async (tenantId: string, uid: string, request: Partial<CreatePermissionRequest>): Promise<Permission> => {
  const tenant = await getTenantById(tenantId);
  if (!tenant) {
    throw new Error('Tenant not found');
  }

  // Validate that parent exists if specified
  if (request.parent_uid !== undefined) {
    const parent = await query(
      `SELECT * FROM ${tenant.schema_name}.permissions WHERE uid = $1`,
      [request.parent_uid]
    );
    
    if (parent.rows.length === 0) {
      throw new Error('Parent permission not found');
    }
  }

  // Build the updates array
  const updates: string[] = [];
  const values: any[] = [];
  let paramCount = 1;

  if (request.name !== undefined) {
    updates.push(`name = $${paramCount++}`);
    values.push(request.name);
  }
  
  if (request.parent_uid !== undefined) {
    updates.push(`parent_uid = $${paramCount++}`);
    values.push(request.parent_uid);
  }

  // Recalculate path if name or parent changed
  if (request.name !== undefined || request.parent_uid !== undefined) {
    let newPath = `/${request.name || ''}`;
    if (request.parent_uid) {
      const parent = await query(
        `SELECT path FROM ${tenant.schema_name}.permissions WHERE uid = $1`,
        [request.parent_uid]
      );
      if (parent.rows.length > 0) {
        newPath = `${parent.rows[0].path}/${request.name || ''}`;
      }
    } else if (request.name) {
      newPath = `/${request.name.toLowerCase()}`;
    }
    updates.push(`path = $${paramCount++}`);
    values.push(newPath);
  }

  updates.push(`updated_at = CURRENT_TIMESTAMP`);
  values.push(uid);

  const result = await query(
    `UPDATE ${tenant.schema_name}.permissions SET ${updates.join(', ')} WHERE uid = $${paramCount} RETURNING *`,
    values
  );
  
  return result.rows[0];
};

export const deletePermission = async (tenantId: string, uid: string): Promise<void> => {
  const tenant = await getTenantById(tenantId);
  if (!tenant) {
    throw new Error('Tenant not found');
  }

  // Check if permission has children
  const children = await query(
    `SELECT COUNT(*) as count FROM ${tenant.schema_name}.permissions WHERE parent_uid = $1`,
    [uid]
  );

  if (parseInt(children.rows[0].count) > 0) {
    throw new Error('Cannot delete permission with child permissions. Delete children first.');
  }

  // Check if it's a base permission (read or admin)
  const permission = await query(
    `SELECT * FROM ${tenant.schema_name}.permissions WHERE uid = $1`,
    [uid]
  );

  if (permission.rows.length > 0) {
    const perm = permission.rows[0];
    if (perm.name === 'read' || perm.name === 'admin') {
      throw new Error('Cannot delete base permissions (read, admin)');
    }
  }

  await query(
    `DELETE FROM ${tenant.schema_name}.permissions WHERE uid = $1`,
    [uid]
  );
};
