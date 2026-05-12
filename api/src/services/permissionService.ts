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

  // Require parent for new permissions (can't create root permissions)
  if (!request.parent_uid) {
    throw new Error('Parent permission is required. New permissions must have a parent.');
  }

  // Validate that parent exists
  const parent = await query(
    `SELECT * FROM ${tenant.schema_name}.permissions WHERE uid = $1`,
    [request.parent_uid]
  );
  
  if (parent.rows.length === 0) {
    throw new Error('Parent permission not found');
  }

  // Build the path based on parent
  const path = `${parent.rows[0].path}/${request.name.toLowerCase()}`;

  const result = await query(
    `INSERT INTO ${tenant.schema_name}.permissions (name, parent_uid, path) 
     VALUES ($1, $2, $3) RETURNING *`,
    [request.name, request.parent_uid, path]
  );
  
  return result.rows[0];
};

// Helper function to get all descendants of a permission recursively
const getDescendants = async (schemaName: string, parentUid: string): Promise<Permission[]> => {
  const descendants: Permission[] = [];
  
  const getChildren = async (currentParentUid: string): Promise<void> => {
    const children = await query(
      `SELECT * FROM ${schemaName}.permissions WHERE parent_uid = $1`,
      [currentParentUid]
    );
    
    for (const child of children.rows) {
      descendants.push(child);
      await getChildren(child.uid);
    }
  };
  
  await getChildren(parentUid);
  return descendants;
};

export const updatePermission = async (tenantId: string, uid: string, request: Partial<CreatePermissionRequest>): Promise<Permission> => {
  const tenant = await getTenantById(tenantId);
  if (!tenant) {
    throw new Error('Tenant not found');
  }

  // Get current permission to track path changes
  const currentPerm = await query(
    `SELECT * FROM ${tenant.schema_name}.permissions WHERE uid = $1`,
    [uid]
  );

  if (currentPerm.rows.length === 0) {
    throw new Error('Permission not found');
  }

  const currentPermission = currentPerm.rows[0];
  const oldPath = currentPermission.path;

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
  let newPath: string | null = null;
  if (request.name !== undefined || request.parent_uid !== undefined) {
    const name = request.name || currentPermission.name;
    const parentUid = request.parent_uid !== undefined ? request.parent_uid : currentPermission.parent_uid;
    
    if (parentUid) {
      const parent = await query(
        `SELECT path FROM ${tenant.schema_name}.permissions WHERE uid = $1`,
        [parentUid]
      );
      if (parent.rows.length > 0) {
        newPath = `${parent.rows[0].path}/${name.toLowerCase()}`;
      }
    } else {
      // This shouldn't happen due to validation, but handle it
      newPath = `/${name.toLowerCase()}`;
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
  
  // If path changed, update all descendants
  if (newPath && newPath !== oldPath) {
    const descendants = await getDescendants(tenant.schema_name, uid);
    
    for (const descendant of descendants) {
      // Replace the old path prefix with the new path prefix
      const descendantOldPath = descendant.path;
      const descendantNewPath = descendantOldPath.replace(oldPath, newPath);
      
      await query(
        `UPDATE ${tenant.schema_name}.permissions SET path = $1, updated_at = CURRENT_TIMESTAMP WHERE uid = $2`,
        [descendantNewPath, descendant.uid]
      );
    }
  }
  
  return result.rows[0];
};

export const deletePermission = async (tenantId: string, uid: string): Promise<void> => {
  const tenant = await getTenantById(tenantId);
  if (!tenant) {
    throw new Error('Tenant not found');
  }

  // Get the permission to check its parent_uid
  const permission = await query(
    `SELECT * FROM ${tenant.schema_name}.permissions WHERE uid = $1`,
    [uid]
  );

  if (permission.rows.length === 0) {
    throw new Error('Permission not found');
  }

  const perm = permission.rows[0];

  // Check if permission has null parent (root permission) - can't delete these
  if (perm.parent_uid === null) {
    throw new Error('Cannot delete root permissions (permissions with null parent)');
  }

  // Check if permission has children
  const children = await query(
    `SELECT COUNT(*) as count FROM ${tenant.schema_name}.permissions WHERE parent_uid = $1`,
    [uid]
  );

  if (parseInt(children.rows[0].count) > 0) {
    throw new Error('Cannot delete permission with child permissions. Delete children first.');
  }

  await query(
    `DELETE FROM ${tenant.schema_name}.permissions WHERE uid = $1`,
    [uid]
  );
};
