import { query, getClient } from '../config/database';
import { Tenant, CreateTenantRequest } from '../types';
import { getSubjectByUid } from './subjectService';

// Tenants the subject can switch to in the sidebar dropdown.
// platform-admins see everything; everyone else sees tenants they
// admin or have at least one grant in.
export const getAccessibleTenants = async (
  subjectUid: string,
  isPlatformAdmin: boolean
): Promise<Tenant[]> => {
  if (isPlatformAdmin) {
    const all = await query('SELECT * FROM tenants ORDER BY name');
    return all.rows;
  }

  const all = await query('SELECT * FROM tenants ORDER BY name');
  const accessible: Tenant[] = [];
  for (const tenant of all.rows) {
    if (tenant.admin_uid === subjectUid) {
      accessible.push(tenant);
      continue;
    }
    if (!/^[a-zA-Z0-9_]+$/.test(tenant.schema_name)) continue;
    const grants = await query(
      `SELECT 1 FROM ${tenant.schema_name}.grants WHERE subject_uid = $1 LIMIT 1`,
      [subjectUid]
    );
    if (grants.rows.length > 0) accessible.push(tenant);
  }
  return accessible;
};

// Throws a 403-typed error if the actor isn't a platform-admin. Used
// by tenant create/delete routes.
export const requirePlatformAdmin = async (actorUid: string | undefined): Promise<void> => {
  if (!actorUid) {
    const err: any = new Error('Authentication required');
    err.status = 401;
    throw err;
  }
  const subject = await getSubjectByUid(actorUid);
  if (!subject || !subject.is_platform_admin) {
    const err: any = new Error('Platform-admin privilege required');
    err.status = 403;
    throw err;
  }
};

export const createTenant = async (request: CreateTenantRequest): Promise<Tenant> => {
  const client = await getClient();
  try {
    await client.query('BEGIN');

    // Validate that admin subject exists
    const adminSubject = await getSubjectByUid(request.admin_uid);
    if (!adminSubject) {
      throw new Error('Admin subject not found');
    }

    // Generate a safe schema name from the tenant name
    const schemaName = `tenant_${request.name.toLowerCase().replace(/[^a-z0-9]/g, '_')}`;

    // Insert tenant record with admin_uid
    const insertResult = await client.query(
      'INSERT INTO tenants (name, schema_name, admin_uid) VALUES ($1, $2, $3) RETURNING *',
      [request.name, schemaName, request.admin_uid]
    );

    // Create the new schema based on the template
    await client.query(`CREATE SCHEMA IF NOT EXISTS ${schemaName}`);

    // Copy tables from tenant_template to the new schema
    const tables = await client.query(`
      SELECT table_name 
      FROM information_schema.tables 
      WHERE table_schema = 'tenant_template'
      AND table_type = 'BASE TABLE'
    `);

    for (const table of tables.rows) {
      await client.query(`
        CREATE TABLE ${schemaName}.${table.table_name} (LIKE tenant_template.${table.table_name} INCLUDING DEFAULTS INCLUDING CONSTRAINTS INCLUDING INDEXES)
      `);
    }

    // Seed base permissions (read and admin)
    const permissionsResult = await client.query(`
      INSERT INTO ${schemaName}.permissions (name, parent_uid, path) VALUES 
      ('read', NULL, '/read'),
      ('admin', NULL, '/admin')
      RETURNING *
    `);

    // Get the admin permission UID
    const adminPermission = permissionsResult.rows.find(p => p.name === 'admin');

    // Create a base role for the admin
    const roleResult = await client.query(
      `INSERT INTO ${schemaName}.roles (name) VALUES ($1) RETURNING *`,
      ['Tenant Admin']
    );

    const adminRole = roleResult.rows[0];

    // Assign admin permission to the admin role
    await client.query(
      `INSERT INTO ${schemaName}.role_permissions (role_uid, permission_uid) VALUES ($1, $2)`,
      [adminRole.uid, adminPermission.uid]
    );

    // Create a grant for the tenant admin subject with the admin role on all paths
    await client.query(
      `INSERT INTO ${schemaName}.grants (subject_uid, path, role_uid) VALUES ($1, $2, $3)`,
      [request.admin_uid, '/*', adminRole.uid]
    );

    // Create the grant_requests trigger for the new schema
    await client.query(`
      CREATE TRIGGER trigger_update_${schemaName}_grant_requests_updated_at
      BEFORE UPDATE ON ${schemaName}.grant_requests
      FOR EACH ROW
      EXECUTE FUNCTION update_tenant_template_grant_requests_updated_at()
    `);

    await client.query('COMMIT');
    return insertResult.rows[0];
  } catch (error) {
    await client.query('ROLLBACK');
    console.error('Error creating tenant:', error);
    throw error;
  } finally {
    client.release();
  }
};

export const getAllTenants = async (): Promise<Tenant[]> => {
  const result = await query('SELECT * FROM tenants ORDER BY created_at DESC');
  return result.rows;
};

export const getTenantById = async (id: string): Promise<Tenant | null> => {
  const result = await query('SELECT * FROM tenants WHERE id = $1', [id]);
  return result.rows[0] || null;
};

export const getTenantByName = async (name: string): Promise<Tenant | null> => {
  const result = await query('SELECT * FROM tenants WHERE name = $1', [name]);
  return result.rows[0] || null;
};

export const getTenantBySchemaName = async (schemaName: string): Promise<Tenant | null> => {
  const result = await query('SELECT * FROM tenants WHERE schema_name = $1', [schemaName]);
  return result.rows[0] || null;
};

export const deleteTenant = async (id: string): Promise<void> => {
  const client = await getClient();
  try {
    await client.query('BEGIN');

    // Get tenant info
    const tenant = await client.query('SELECT * FROM tenants WHERE id = $1', [id]);
    if (tenant.rows.length === 0) {
      throw new Error('Tenant not found');
    }

    const schemaName = tenant.rows[0].schema_name;

    // Drop the schema
    await client.query(`DROP SCHEMA IF EXISTS ${schemaName} CASCADE`);

    // Delete tenant record
    await client.query('DELETE FROM tenants WHERE id = $1', [id]);

    await client.query('COMMIT');
  } catch (error) {
    await client.query('ROLLBACK');
    console.error('Error deleting tenant:', error);
    throw error;
  } finally {
    client.release();
  }
};
