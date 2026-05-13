-- Migration: Add per-tenant audit_logs table
-- Description: Add audit_logs table to tenant_template and all existing tenant schemas

-- Add audit_logs to tenant_template (template for newly created tenants)
CREATE TABLE IF NOT EXISTS tenant_template.audit_logs (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    actor_uid UUID,
    action VARCHAR(50) NOT NULL,
    entity_type VARCHAR(100) NOT NULL,
    entity_id VARCHAR(255),
    details JSONB,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_tenant_template_audit_logs_actor ON tenant_template.audit_logs(actor_uid);
CREATE INDEX IF NOT EXISTS idx_tenant_template_audit_logs_entity ON tenant_template.audit_logs(entity_type, entity_id);
CREATE INDEX IF NOT EXISTS idx_tenant_template_audit_logs_created ON tenant_template.audit_logs(created_at DESC);

-- Function to add audit_logs table to an existing tenant schema
CREATE OR REPLACE FUNCTION add_audit_logs_to_schema(schema_name TEXT)
RETURNS VOID AS $$
BEGIN
    EXECUTE format('
        CREATE TABLE IF NOT EXISTS %I.audit_logs (
            id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
            actor_uid UUID,
            action VARCHAR(50) NOT NULL,
            entity_type VARCHAR(100) NOT NULL,
            entity_id VARCHAR(255),
            details JSONB,
            created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
        )
    ', schema_name);

    EXECUTE format('CREATE INDEX IF NOT EXISTS idx_%I_audit_logs_actor ON %I.audit_logs(actor_uid)', schema_name, schema_name);
    EXECUTE format('CREATE INDEX IF NOT EXISTS idx_%I_audit_logs_entity ON %I.audit_logs(entity_type, entity_id)', schema_name, schema_name);
    EXECUTE format('CREATE INDEX IF NOT EXISTS idx_%I_audit_logs_created ON %I.audit_logs(created_at DESC)', schema_name, schema_name);
END;
$$ LANGUAGE plpgsql;

-- Add audit_logs to all existing tenant schemas
DO $$
DECLARE
    schema_record RECORD;
BEGIN
    FOR schema_record IN
        SELECT schema_name
        FROM information_schema.schemata
        WHERE schema_name LIKE 'tenant_%'
        AND schema_name != 'tenant_template'
    LOOP
        PERFORM add_audit_logs_to_schema(schema_record.schema_name);
    END LOOP;
END $$;
