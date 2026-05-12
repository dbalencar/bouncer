import { query, getClient } from '../config/database';
import { Role, CreateRoleRequest, Permission } from '../types';
import { getTenantById } from './tenantService';
import { getPermissionsByTenant } from './permissionService';

export const getRolesByTenant = async (tenantId: string): Promise<Role[]> => {
  const tenant = await getTenantById(tenantId);
  if (!tenant) {
    throw new Error('Tenant not found');
  }

  const result = await query(
    `SELECT * FROM ${tenant.schema_name}.roles ORDER BY created_at DESC`
  );
  
  return result.rows;
};

export const getRoleByUid = async (tenantId: string, uid: string): Promise<Role | null> => {
  const tenant = await getTenantById(tenantId);
  if (!tenant) {
    throw new Error('Tenant not found');
  }

  const result = await query(
    `SELECT * FROM ${tenant.schema_name}.roles WHERE uid = $1`,
    [uid]
  );
  
  return result.rows[0] || null;
};

export const createRole = async (tenantId: string, request: CreateRoleRequest): Promise<Role> => {
  const tenant = await getTenantById(tenantId);
  if (!tenant) {
    throw new Error('Tenant not found');
  }

  // Validate that role has at least one permission
  if (!request.permission_uids || request.permission_uids.length === 0) {
    throw new Error('Role must have at least one permission');
  }

  // Validate that all permissions exist
  const permissions = await getPermissionsByTenant(tenantId);
  const permissionUids = new Set(permissions.map(p => p.uid));
  
  for (const permissionUid of request.permission_uids) {
    if (!permissionUids.has(permissionUid)) {
      throw new Error('Permission not found');
    }
  }

  const client = await getClient();
  try {
    await client.query('BEGIN');

    // Create the role
    const roleResult = await client.query(
      `INSERT INTO ${tenant.schema_name}.roles (name) VALUES ($1) RETURNING *`,
      [request.name]
    );

    const role = roleResult.rows[0];

    // Assign permissions to the role
    for (const permissionUid of request.permission_uids) {
      await client.query(
        `INSERT INTO ${tenant.schema_name}.role_permissions (role_uid, permission_uid) VALUES ($1, $2)`,
        [role.uid, permissionUid]
      );
    }

    await client.query('COMMIT');
    return role;
  } catch (error) {
    await client.query('ROLLBACK');
    console.error('Error creating role:', error);
    throw error;
  } finally {
    client.release();
  }
};

export const updateRole = async (tenantId: string, uid: string, request: Partial<CreateRoleRequest>): Promise<Role> => {
  const tenant = await getTenantById(tenantId);
  if (!tenant) {
    throw new Error('Tenant not found');
  }

  const client = await getClient();
  try {
    await client.query('BEGIN');

    // Update role name if provided
    if (request.name !== undefined) {
      await client.query(
        `UPDATE ${tenant.schema_name}.roles SET name = $1, updated_at = CURRENT_TIMESTAMP WHERE uid = $2`,
        [request.name, uid]
      );
    }

    // Update permissions if provided
    if (request.permission_uids !== undefined) {
      // Validate that role has at least one permission
      if (request.permission_uids.length === 0) {
        throw new Error('Role must have at least one permission');
      }

      // Validate that all permissions exist
      const permissions = await getPermissionsByTenant(tenantId);
      const permissionUids = new Set(permissions.map(p => p.uid));
      
      for (const permissionUid of request.permission_uids) {
        if (!permissionUids.has(permissionUid)) {
          throw new Error('Permission not found');
        }
      }

      // Delete existing role_permissions
      await client.query(
        `DELETE FROM ${tenant.schema_name}.role_permissions WHERE role_uid = $1`,
        [uid]
      );

      // Add new role_permissions
      for (const permissionUid of request.permission_uids) {
        await client.query(
          `INSERT INTO ${tenant.schema_name}.role_permissions (role_uid, permission_uid) VALUES ($1, $2)`,
          [uid, permissionUid]
        );
      }
    }

    await client.query('COMMIT');

    // Return updated role
    const result = await query(
      `SELECT * FROM ${tenant.schema_name}.roles WHERE uid = $1`,
      [uid]
    );
    
    return result.rows[0];
  } catch (error) {
    await client.query('ROLLBACK');
    console.error('Error updating role:', error);
    throw error;
  } finally {
    client.release();
  }
};

export const deleteRole = async (tenantId: string, uid: string): Promise<void> => {
  const tenant = await getTenantById(tenantId);
  if (!tenant) {
    throw new Error('Tenant not found');
  }

  await query(
    `DELETE FROM ${tenant.schema_name}.roles WHERE uid = $1`,
    [uid]
  );
};

export const getRolePermissions = async (tenantId: string, roleUid: string): Promise<Permission[]> => {
  const tenant = await getTenantById(tenantId);
  if (!tenant) {
    throw new Error('Tenant not found');
  }

  const result = await query(
    `SELECT p.* FROM ${tenant.schema_name}.permissions p
     INNER JOIN ${tenant.schema_name}.role_permissions rp ON p.uid = rp.permission_uid
     WHERE rp.role_uid = $1
     ORDER BY p.path`,
    [roleUid]
  );
  
  return result.rows;
};
