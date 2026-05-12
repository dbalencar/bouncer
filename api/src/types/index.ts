export interface Subject {
  uid: string;
  username: string;
  name: string;
  email: string;
  created_at: Date;
  updated_at: Date;
}

export interface Tenant {
  id: string;
  name: string;
  schema_name: string;
  admin_uid: string | null;
  created_at: Date;
  updated_at: Date;
}

export interface Policy {
  id: string;
  name: string;
  description?: string;
  rego_policy: string;
  is_active: boolean;
  created_at: Date;
  updated_at: Date;
}

export interface ResourceGroup {
  uid: string;
  id: string;
  name: string;
  label: string;
  parent_uid: string | null;
  path: string;
  created_at: Date;
  updated_at: Date;
}

export interface Resource {
  uid: string;
  id: string;
  name: string;
  group_uid: string | null;
  path: string;
  created_at: Date;
  updated_at: Date;
}

export interface Permission {
  uid: string;
  name: string;
  parent_uid: string | null;
  path: string;
  created_at: Date;
  updated_at: Date;
}

export interface Role {
  uid: string;
  name: string;
  created_at: Date;
  updated_at: Date;
}

export interface RolePermission {
  role_uid: string;
  permission_uid: string;
  created_at: Date;
}

export interface Grant {
  uid: string;
  subject_uid: string;
  path: string;
  role_uid: string;
  created_at: Date;
  updated_at: Date;
}

export type GrantRequestStatus = 'pending' | 'approved' | 'rejected';

export interface GrantRequest {
  uid: string;
  subject_uid: string;
  tenant_id: string;
  path: string;
  role_uid: string;
  status: GrantRequestStatus;
  created_at: Date;
  updated_at: Date;
}

export interface PolicyEvaluationRequest {
  subjectUid: string;
  resourceType: string;
  resourceId: string;
  action: string;
  context?: Record<string, any>;
}

export interface PolicyEvaluationResponse {
  allowed: boolean;
  decision: string;
  explanation?: string;
}

export interface CreateTenantRequest {
  name: string;
  admin_uid: string;
}

export interface CreatePolicyRequest {
  name: string;
  description?: string;
  rego_policy: string;
  is_active?: boolean;
}

export interface CreateResourceGroupRequest {
  id: string;
  name: string;
  label: string;
  parent_uid?: string;
}

export interface UpdateResourceGroupRequest {
  id?: string;
  name?: string;
  label?: string;
  parent_uid?: string;
}

export interface CreateResourceRequest {
  id: string;
  name: string;
  group_uid?: string;
}

export interface UpdateResourceRequest {
  id?: string;
  name?: string;
  group_uid?: string;
}

export interface CreatePermissionRequest {
  name: string;
  parent_uid: string | null;
}

export interface CreateRoleRequest {
  name: string;
  permission_uids?: string[];
}

export interface CreateGrantRequest {
  subject_uid: string;
  path: string;
  role_uid: string;
}

export interface UpdateGrantRequest {
  subject_uid?: string;
  path?: string;
  role_uid?: string;
}

export interface CreateGrantRequestRequest {
  subject_uid: string;
  path: string;
  role_uid: string;
}

export interface UpdateGrantRequestRequest {
  status?: GrantRequestStatus;
}
