-- Migration: Add grant_requests table to existing tenant schemas
-- Description: Add grant_requests table and trigger to all existing tenant schemas

-- Function to add grant_requests table to a schema
CREATE OR REPLACE FUNCTION add_grant_requests_to_schema(schema_name TEXT)
RETURNS VOID AS $$
BEGIN
    EXECUTE format('
        CREATE TABLE IF NOT EXISTS %I.grant_requests (
            uid UUID PRIMARY KEY DEFAULT gen_random_uuid(),
            subject_uid UUID NOT NULL,
            path VARCHAR(255) NOT NULL,
            role_uid UUID NOT NULL,
            status VARCHAR(20) NOT NULL DEFAULT ''pending'' CHECK (status IN (''pending'', ''approved'', ''rejected'')),
            created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
            updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
            CONSTRAINT fk_%I_grant_requests_subject FOREIGN KEY (subject_uid) REFERENCES common.subjects(uid) ON DELETE CASCADE,
            CONSTRAINT fk_%I_grant_requests_role FOREIGN KEY (role_uid) REFERENCES %I.roles(uid) ON DELETE CASCADE
        )
    ', schema_name, schema_name, schema_name, schema_name);

    EXECUTE format('CREATE INDEX IF NOT EXISTS idx_%I_grant_requests_subject ON %I.grant_requests(subject_uid)', schema_name, schema_name);
    EXECUTE format('CREATE INDEX IF NOT EXISTS idx_%I_grant_requests_status ON %I.grant_requests(status)', schema_name, schema_name);
    EXECUTE format('CREATE INDEX IF NOT EXISTS idx_%I_grant_requests_subject_status ON %I.grant_requests(subject_uid, status)', schema_name, schema_name);

    -- Create trigger for updated_at
    EXECUTE format('
        CREATE TRIGGER trigger_update_%I_grant_requests_updated_at
        BEFORE UPDATE ON %I.grant_requests
        FOR EACH ROW
        EXECUTE FUNCTION update_tenant_template_grant_requests_updated_at()
    ', schema_name, schema_name);
END;
$$ LANGUAGE plpgsql;

-- Add grant_requests to all tenant schemas
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
        PERFORM add_grant_requests_to_schema(schema_record.schema_name);
    END LOOP;
END $$;
