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

-- Create permissions table in tenant template
CREATE TABLE tenant_template.permissions (
    uid UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name VARCHAR(255) NOT NULL,
    parent_uid UUID REFERENCES tenant_template.permissions(uid) ON DELETE CASCADE,
    path VARCHAR(255) NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    UNIQUE(name)
);

-- Create index on permission name and parent
CREATE INDEX idx_tenant_template_permissions_name ON tenant_template.permissions(name);
CREATE INDEX idx_tenant_template_permissions_parent ON tenant_template.permissions(parent_uid);
CREATE INDEX idx_tenant_template_permissions_path ON tenant_template.permissions(path);

-- Create roles table in tenant template
CREATE TABLE tenant_template.roles (
    uid UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name VARCHAR(255) NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    UNIQUE(name)
);

-- Create index on role name
CREATE INDEX idx_tenant_template_roles_name ON tenant_template.roles(name);

-- Create role_permissions junction table (many-to-many)
CREATE TABLE tenant_template.role_permissions (
    role_uid UUID NOT NULL,
    permission_uid UUID NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    PRIMARY KEY (role_uid, permission_uid),
    CONSTRAINT fk_role_permissions_role FOREIGN KEY (role_uid) REFERENCES tenant_template.roles(uid) ON DELETE CASCADE,
    CONSTRAINT fk_role_permissions_permission FOREIGN KEY (permission_uid) REFERENCES tenant_template.permissions(uid) ON DELETE CASCADE
);

-- Create index for role_permissions queries
CREATE INDEX idx_tenant_template_role_permissions_role ON tenant_template.role_permissions(role_uid);
CREATE INDEX idx_tenant_template_role_permissions_permission ON tenant_template.role_permissions(permission_uid);

-- Create resource_groups table in tenant template (hierarchical)
CREATE TABLE tenant_template.resource_groups (
    uid UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    id VARCHAR(255) NOT NULL,
    name VARCHAR(255) NOT NULL,
    label VARCHAR(255) NOT NULL,
    parent_uid UUID REFERENCES tenant_template.resource_groups(uid) ON DELETE CASCADE,
    path VARCHAR(255) NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    UNIQUE(id)
);

-- Create index on resource_group id, parent, and path
CREATE INDEX idx_tenant_template_resource_groups_id ON tenant_template.resource_groups(id);
CREATE INDEX idx_tenant_template_resource_groups_parent ON tenant_template.resource_groups(parent_uid);
CREATE INDEX idx_tenant_template_resource_groups_path ON tenant_template.resource_groups(path);

-- Create resources table in tenant template (with optional group assignment)
CREATE TABLE tenant_template.resources (
    uid UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    id VARCHAR(255) NOT NULL,
    name VARCHAR(255) NOT NULL,
    group_uid UUID REFERENCES tenant_template.resource_groups(uid) ON DELETE SET NULL,
    path VARCHAR(255) NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    UNIQUE(id)
);

-- Create index on resource id, group, and path
CREATE INDEX idx_tenant_template_resources_id ON tenant_template.resources(id);
CREATE INDEX idx_tenant_template_resources_group ON tenant_template.resources(group_uid);
CREATE INDEX idx_tenant_template_resources_path ON tenant_template.resources(path);

-- Create grants table in tenant template
CREATE TABLE tenant_template.grants (
    uid UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    subject_uid UUID NOT NULL,
    path VARCHAR(255) NOT NULL,
    role_uid UUID NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT fk_grants_subject FOREIGN KEY (subject_uid) REFERENCES common.subjects(uid) ON DELETE CASCADE,
    CONSTRAINT fk_grants_role FOREIGN KEY (role_uid) REFERENCES tenant_template.roles(uid) ON DELETE CASCADE,
    UNIQUE(subject_uid, path, role_uid)
);

-- Create index on grant subject, role, and path for efficient queries
CREATE INDEX idx_tenant_template_grants_subject ON tenant_template.grants(subject_uid);
CREATE INDEX idx_tenant_template_grants_role ON tenant_template.grants(role_uid);
CREATE INDEX idx_tenant_template_grants_path ON tenant_template.grants(path);

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
