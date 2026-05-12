-- Add admin_uid field to tenants table
ALTER TABLE tenants ADD COLUMN admin_uid UUID REFERENCES common.subjects(uid) ON DELETE SET NULL;

-- Create index on admin_uid for faster lookups
CREATE INDEX idx_tenants_admin_uid ON tenants(admin_uid);
