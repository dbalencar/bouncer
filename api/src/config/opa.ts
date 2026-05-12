// Simplified policy evaluation for demo
// In production, this would use OPA WASM with compiled Rego policies

let policies: string[] = [];

export const initializeOpa = async (): Promise<void> => {
  try {
    console.log('OPA mock initialized successfully');
  } catch (error) {
    console.error('Failed to initialize OPA:', error);
    throw error;
  }
};

export const setPolicies = (policyStrings: string[]): void => {
  policies = policyStrings;
};

export const evaluatePolicy = async (input: any): Promise<any> => {
  try {
    // Simple mock evaluation logic
    // In production, this would use actual OPA evaluation
    
    const { subject, resource, action, context } = input;
    
    // Default deny
    let allow = false;
    let explanation = 'Default deny';

    // Admin always allowed
    if (subject.username === 'admin') {
      allow = true;
      explanation = 'Admin has full access';
    }
    // Read actions allowed for everyone
    else if (action === 'read') {
      allow = true;
      explanation = 'Read action allowed for all subjects';
    }
    // Owner can write to documents
    else if (subject.username === 'owner' && action === 'write' && resource.type === 'document') {
      allow = true;
      explanation = 'Owner can write to documents';
    }

    return {
      allow,
      explanation
    };
  } catch (error) {
    console.error('Policy evaluation error:', error);
    throw error;
  }
};
