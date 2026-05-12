export interface Subject {
  uid: string;
  username: string;
  name: string;
  email: string;
  created_at: string;
  updated_at: string;
}

export interface Tenant {
  id: string;
  name: string;
  schema_name: string;
  created_at: string;
  updated_at: string;
}

export interface Policy {
  id: string;
  name: string;
  description?: string;
  rego_policy: string;
  is_active: boolean;
  created_at: string;
  updated_at: string;
}

export interface Resource {
  id: string;
  resource_type: string;
  resource_id: string;
  attributes: Record<string, any>;
  created_at: string;
  updated_at: string;
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
