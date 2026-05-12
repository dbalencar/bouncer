import { query } from '../config/database';
import { evaluatePolicy } from '../config/opa';
import { PolicyEvaluationRequest, PolicyEvaluationResponse } from '../types';
import { getTenantById } from './tenantService';
import { getSubjectByUid } from './subjectService';

export const evaluatePolicyRequest = async (
  tenantId: string,
  request: PolicyEvaluationRequest
): Promise<PolicyEvaluationResponse> => {
  try {
    // Get tenant info
    const tenant = await getTenantById(tenantId);
    if (!tenant) {
      throw new Error('Tenant not found');
    }

    // Get subject info
    const subject = await getSubjectByUid(request.subjectUid);
    if (!subject) {
      throw new Error('Subject not found');
    }

    // Get all active policies for the tenant
    const policiesResult = await query(
      `SELECT rego_policy FROM ${tenant.schema_name}.policies WHERE is_active = true`
    );

    // Combine all policies into a single Rego policy
    const combinedPolicy = policiesResult.rows
      .map((row: any) => row.rego_policy)
      .join('\n\n');

    // Create OPA input
    const opaInput = {
      subject: {
        uid: subject.uid,
        username: subject.username,
        name: subject.name,
        email: subject.email
      },
      resource: {
        type: request.resourceType,
        id: request.resourceId
      },
      action: request.action,
      context: request.context || {}
    };

    // Evaluate policy
    // For now, we'll use a simple evaluation since OPA WASM compilation is complex
    // In production, you would compile the combined policy to WASM and evaluate it
    const result = await evaluatePolicy(opaInput);

    // Log the evaluation
    await query(
      `INSERT INTO ${tenant.schema_name}.policy_evaluations 
       (subject_uid, resource_type, resource_id, action, decision, context) 
       VALUES ($1, $2, $3, $4, $5, $6)`,
      [
        request.subjectUid,
        request.resourceType,
        request.resourceId,
        request.action,
        result.allow || false,
        JSON.stringify(request.context || {})
      ]
    );

    return {
      allowed: result.allow || false,
      decision: result.allow ? 'allow' : 'deny',
      explanation: result.explanation
    };
  } catch (error) {
    console.error('Error evaluating policy:', error);
    throw error;
  }
};
