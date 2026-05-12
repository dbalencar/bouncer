import { query, getClient } from '../config/database';
import { Tenant, CreateTenantRequest } from '../types';

export const createTenant = async (request: CreateTenantRequest): Promise<Tenant> => {
  const client = await getClient();
  try {
    await client.query('BEGIN');

    // Generate a safe schema name from the tenant name
    const schemaName = `tenant_${request.name.toLowerCase().replace(/[^a-z0-9]/g, '_')}`;

    // Insert tenant record
    const insertResult = await client.query(
      'INSERT INTO tenants (name, schema_name) VALUES ($1, $2) RETURNING *',
      [request.name, schemaName]
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
        CREATE TABLE ${schemaName}.${table.table_name} AS 
        SELECT * FROM tenant_template.${table.table_name} 
        WITH NO DATA
      `);

      // Copy indexes
      const indexes = await client.query(`
        SELECT indexname, indexdef 
        FROM pg_indexes 
        WHERE schemaname = 'tenant_template' 
        AND tablename = $1
      `, [table.table_name]);

      for (const index of indexes.rows) {
        const newIndexDef = index.indexdef
          .replace(/tenant_template\./g, `${schemaName}.`)
          .replace(/INDEX\s+\w+\s+/i, `INDEX ${index.indexname}_copy `);
        
        try {
          await client.query(newIndexDef);
        } catch (error) {
          console.warn(`Failed to create index ${index.indexname}:`, error);
        }
      }
    }

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
