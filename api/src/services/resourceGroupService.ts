import { query, getClient } from '../config/database';
import { ResourceGroup, CreateResourceGroupRequest, UpdateResourceGroupRequest } from '../types';
import { getTenantById } from './tenantService';

export const getResourceGroupsByTenant = async (tenantId: string): Promise<ResourceGroup[]> => {
  const tenant = await getTenantById(tenantId);
  if (!tenant) {
    throw new Error('Tenant not found');
  }

  const result = await query(
    `SELECT * FROM ${tenant.schema_name}.resource_groups ORDER BY path`
  );

  return result.rows;
};

export const getResourceGroupByUid = async (tenantId: string, uid: string): Promise<ResourceGroup | null> => {
  const tenant = await getTenantById(tenantId);
  if (!tenant) {
    throw new Error('Tenant not found');
  }

  const result = await query(
    `SELECT * FROM ${tenant.schema_name}.resource_groups WHERE uid = $1`,
    [uid]
  );

  return result.rows[0] || null;
};

export const createResourceGroup = async (tenantId: string, request: CreateResourceGroupRequest): Promise<ResourceGroup> => {
  const tenant = await getTenantById(tenantId);
  if (!tenant) {
    throw new Error('Tenant not found');
  }

  // Validate that id is unique
  const existing = await query(
    `SELECT * FROM ${tenant.schema_name}.resource_groups WHERE id = $1`,
    [request.id]
  );

  if (existing.rows.length > 0) {
    throw new Error('Resource group with this id already exists');
  }

  // Build the path based on parent
  let path: string;
  if (request.parent_uid) {
    const parent = await query(
      `SELECT * FROM ${tenant.schema_name}.resource_groups WHERE uid = $1`,
      [request.parent_uid]
    );

    if (parent.rows.length === 0) {
      throw new Error('Parent resource group not found');
    }

    path = `${parent.rows[0].path}/${request.id.toLowerCase()}`;
  } else {
    path = `/${request.id.toLowerCase()}`;
  }

  const result = await query(
    `INSERT INTO ${tenant.schema_name}.resource_groups (id, name, label, parent_uid, path)
     VALUES ($1, $2, $3, $4, $5) RETURNING *`,
    [request.id, request.name, request.label, request.parent_uid || null, path]
  );

  return result.rows[0];
};

// Helper function to get all descendants of a resource group recursively
const getDescendants = async (schemaName: string, parentUid: string): Promise<ResourceGroup[]> => {
  const descendants: ResourceGroup[] = [];

  const getChildren = async (currentParentUid: string): Promise<void> => {
    const children = await query(
      `SELECT * FROM ${schemaName}.resource_groups WHERE parent_uid = $1`,
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

export const updateResourceGroup = async (tenantId: string, uid: string, request: UpdateResourceGroupRequest): Promise<ResourceGroup> => {
  const tenant = await getTenantById(tenantId);
  if (!tenant) {
    throw new Error('Tenant not found');
  }

  // Get current resource group to track path changes
  const currentGroup = await query(
    `SELECT * FROM ${tenant.schema_name}.resource_groups WHERE uid = $1`,
    [uid]
  );

  if (currentGroup.rows.length === 0) {
    throw new Error('Resource group not found');
  }

  const currentResourceGroup = currentGroup.rows[0];
  const oldPath = currentResourceGroup.path;

  // Validate that parent exists if specified
  if (request.parent_uid !== undefined && request.parent_uid !== null) {
    const parent = await query(
      `SELECT * FROM ${tenant.schema_name}.resource_groups WHERE uid = $1`,
      [request.parent_uid]
    );

    if (parent.rows.length === 0) {
      throw new Error('Parent resource group not found');
    }

    // Prevent circular reference
    if (request.parent_uid === uid) {
      throw new Error('Resource group cannot be its own parent');
    }
  }

  // Validate that id is unique if changing
  if (request.id !== undefined && request.id !== currentResourceGroup.id) {
    const existing = await query(
      `SELECT * FROM ${tenant.schema_name}.resource_groups WHERE id = $1`,
      [request.id]
    );

    if (existing.rows.length > 0) {
      throw new Error('Resource group with this id already exists');
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

  if (request.label !== undefined) {
    updates.push(`label = $${paramCount++}`);
    values.push(request.label);
  }

  if (request.parent_uid !== undefined) {
    updates.push(`parent_uid = $${paramCount++}`);
    values.push(request.parent_uid);
  }

  // Recalculate path if id or parent changed
  let newPath: string | null = null;
  if (request.id !== undefined || request.parent_uid !== undefined) {
    const id = request.id || currentResourceGroup.id;
    const parentUid = request.parent_uid !== undefined ? request.parent_uid : currentResourceGroup.parent_uid;

    if (parentUid) {
      const parent = await query(
        `SELECT path FROM ${tenant.schema_name}.resource_groups WHERE uid = $1`,
        [parentUid]
      );
      if (parent.rows.length > 0) {
        newPath = `${parent.rows[0].path}/${id.toLowerCase()}`;
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
    `UPDATE ${tenant.schema_name}.resource_groups SET ${updates.join(', ')} WHERE uid = $${paramCount} RETURNING *`,
    values
  );

  // If path changed, update all descendants and their resources
  if (newPath && newPath !== oldPath) {
    const descendants = await getDescendants(tenant.schema_name, uid);

    for (const descendant of descendants) {
      // Replace the old path prefix with the new path prefix
      const descendantOldPath = descendant.path;
      const descendantNewPath = descendantOldPath.replace(oldPath, newPath);

      await query(
        `UPDATE ${tenant.schema_name}.resource_groups SET path = $1, updated_at = CURRENT_TIMESTAMP WHERE uid = $2`,
        [descendantNewPath, descendant.uid]
      );

      // Update all resources in this descendant group
      await query(
        `UPDATE ${tenant.schema_name}.resources SET path = $1, updated_at = CURRENT_TIMESTAMP WHERE group_uid = $2`,
        [descendantNewPath, descendant.uid]
      );
    }

    // Update resources in the updated group itself
    await query(
      `UPDATE ${tenant.schema_name}.resources SET path = $1, updated_at = CURRENT_TIMESTAMP WHERE group_uid = $2`,
      [newPath, uid]
    );
  }

  return result.rows[0];
};

export const deleteResourceGroup = async (tenantId: string, uid: string): Promise<void> => {
  const tenant = await getTenantById(tenantId);
  if (!tenant) {
    throw new Error('Tenant not found');
  }

  // Get the resource group to check for children and resources
  const resourceGroup = await query(
    `SELECT * FROM ${tenant.schema_name}.resource_groups WHERE uid = $1`,
    [uid]
  );

  if (resourceGroup.rows.length === 0) {
    throw new Error('Resource group not found');
  }

  // Check if resource group has children
  const children = await query(
    `SELECT COUNT(*) as count FROM ${tenant.schema_name}.resource_groups WHERE parent_uid = $1`,
    [uid]
  );

  if (parseInt(children.rows[0].count) > 0) {
    throw new Error('Cannot delete resource group with child groups. Move children first.');
  }

  // Check if resource group has resources
  const resources = await query(
    `SELECT COUNT(*) as count FROM ${tenant.schema_name}.resources WHERE group_uid = $1`,
    [uid]
  );

  if (parseInt(resources.rows[0].count) > 0) {
    throw new Error('Cannot delete resource group with resources. Move resources first.');
  }

  await query(
    `DELETE FROM ${tenant.schema_name}.resource_groups WHERE uid = $1`,
    [uid]
  );
};
