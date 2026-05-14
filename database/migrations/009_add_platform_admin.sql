-- Migration: Add is_platform_admin flag to common.subjects
-- Description: Encodes the platform-admin role from the subject
-- taxonomy. A platform-admin can create and delete tenants and sees
-- every tenant in the sidebar dropdown. The seeded `admin` user is
-- flagged so the default demo experience works out of the box.

ALTER TABLE common.subjects
    ADD COLUMN IF NOT EXISTS is_platform_admin BOOLEAN NOT NULL DEFAULT FALSE;

UPDATE common.subjects
   SET is_platform_admin = TRUE
 WHERE username = 'admin';
