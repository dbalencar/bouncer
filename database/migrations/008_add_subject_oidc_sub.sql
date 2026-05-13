-- Migration: Add oidc_sub column to common.subjects
-- Description: Stable mapping between an IdP user (`sub` claim) and a
-- local Subject row. Nullable so mock mode and pre-existing rows are
-- unaffected; uniquely indexed when set so the same IdP user never
-- maps to two local rows.

ALTER TABLE common.subjects
    ADD COLUMN IF NOT EXISTS oidc_sub VARCHAR(255);

CREATE UNIQUE INDEX IF NOT EXISTS idx_subjects_oidc_sub
    ON common.subjects(oidc_sub)
    WHERE oidc_sub IS NOT NULL;
