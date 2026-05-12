-- Migration: Add grant_requests table
-- Description: Create table for tracking grant approval requests

-- Create grant_requests table
CREATE TABLE IF NOT EXISTS grant_requests (
    uid UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    subject_uid UUID NOT NULL,
    tenant_id VARCHAR(255) NOT NULL,
    path VARCHAR(255) NOT NULL,
    role_uid UUID NOT NULL,
    status VARCHAR(20) NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'approved', 'rejected')),
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (subject_uid) REFERENCES subjects(uid) ON DELETE CASCADE
);

-- Create indexes for common queries
CREATE INDEX IF NOT EXISTS idx_grant_requests_subject_uid ON grant_requests(subject_uid);
CREATE INDEX IF NOT EXISTS idx_grant_requests_tenant_id ON grant_requests(tenant_id);
CREATE INDEX IF NOT EXISTS idx_grant_requests_status ON grant_requests(status);
CREATE INDEX IF NOT EXISTS idx_grant_requests_subject_status ON grant_requests(subject_uid, status);

-- Create trigger to update updated_at timestamp
CREATE OR REPLACE FUNCTION update_grant_requests_updated_at()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = CURRENT_TIMESTAMP;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_update_grant_requests_updated_at
    BEFORE UPDATE ON grant_requests
    FOR EACH ROW
    EXECUTE FUNCTION update_grant_requests_updated_at();
