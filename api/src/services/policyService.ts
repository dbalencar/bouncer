import { query } from '../config/database';
import { Policy, CreatePolicyRequest } from '../types';
import { getTenantById } from './tenantService';

export const createPolicy = async (tenantId: string, request: CreatePolicyRequest): Promise<Policy> => {
  const tenant = await getTenantById(tenantId);
  if (!tenant) {
    throw new Error('Tenant not found');
  }

  const result = await query(
    `INSERT INTO ${tenant.schema_name}.policies (name, description, rego_policy, is_active) 
     VALUES ($1, $2, $3, $4) RETURNING *`,
    [request.name, request.description, request.rego_policy, request.is_active ?? true]
  );
  
  return result.rows[0];
};

export const getPoliciesByTenant = async (tenantId: string): Promise<Policy[]> => {
  const tenant = await getTenantById(tenantId);
  if (!tenant) {
    throw new Error('Tenant not found');
  }

  const result = await query(
    `SELECT * FROM ${tenant.schema_name}.policies ORDER BY created_at DESC`
  );
  
  return result.rows;
};

export const getPolicyById = async (tenantId: string, policyId: string): Promise<Policy | null> => {
  const tenant = await getTenantById(tenantId);
  if (!tenant) {
    throw new Error('Tenant not found');
  }

  const result = await query(
    `SELECT * FROM ${tenant.schema_name}.policies WHERE id = $1`,
    [policyId]
  );
  
  return result.rows[0] || null;
};

export const updatePolicy = async (tenantId: string, policyId: string, request: Partial<CreatePolicyRequest>): Promise<Policy> => {
  const tenant = await getTenantById(tenantId);
  if (!tenant) {
    throw new Error('Tenant not found');
  }

  const updates: string[] = [];
  const values: any[] = [];
  let paramCount = 1;

  if (request.name !== undefined) {
    updates.push(`name = $${paramCount++}`);
    values.push(request.name);
  }
  if (request.description !== undefined) {
    updates.push(`description = $${paramCount++}`);
    values.push(request.description);
  }
  if (request.rego_policy !== undefined) {
    updates.push(`rego_policy = $${paramCount++}`);
    values.push(request.rego_policy);
  }
  if (request.is_active !== undefined) {
    updates.push(`is_active = $${paramCount++}`);
    values.push(request.is_active);
  }

  updates.push(`updated_at = CURRENT_TIMESTAMP`);
  values.push(policyId);

  const result = await query(
    `UPDATE ${tenant.schema_name}.policies SET ${updates.join(', ')} WHERE id = $${paramCount} RETURNING *`,
    values
  );
  
  return result.rows[0];
};

export const deletePolicy = async (tenantId: string, policyId: string): Promise<void> => {
  const tenant = await getTenantById(tenantId);
  if (!tenant) {
    throw new Error('Tenant not found');
  }

  await query(
    `DELETE FROM ${tenant.schema_name}.policies WHERE id = $1`,
    [policyId]
  );
};
