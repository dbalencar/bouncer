-- This file defines the template structure for tenant schemas
-- When creating a new tenant, this structure should be copied to the new schema

-- Create a template schema to copy from
CREATE SCHEMA IF NOT EXISTS tenant_template;

-- Create policies table in tenant template
CREATE TABLE tenant_template.policies (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name VARCHAR(255) NOT NULL,
    description TEXT,
    rego_policy TEXT NOT NULL,
    is_active BOOLEAN DEFAULT true,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- Create index on policy name
CREATE INDEX idx_tenant_template_policies_name ON tenant_template.policies(name);

-- Create resources table in tenant template
CREATE TABLE tenant_template.resources (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    resource_type VARCHAR(255) NOT NULL,
    resource_id VARCHAR(255) NOT NULL,
    attributes JSONB,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    UNIQUE(resource_type, resource_id)
);

-- Create index on resource_type and resource_id
CREATE INDEX idx_tenant_template_resources_type_id ON tenant_template.resources(resource_type, resource_id);

-- Create policy_evaluations log table (optional, for audit)
CREATE TABLE tenant_template.policy_evaluations (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    subject_uid UUID NOT NULL,
    resource_type VARCHAR(255) NOT NULL,
    resource_id VARCHAR(255) NOT NULL,
    action VARCHAR(255) NOT NULL,
    decision BOOLEAN NOT NULL,
    context JSONB,
    evaluated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- Create index on subject_uid for audit queries
CREATE INDEX idx_tenant_template_evaluations_subject ON tenant_template.policy_evaluations(subject_uid);
CREATE INDEX idx_tenant_template_evaluations_decision ON tenant_template.policy_evaluations(decision);
