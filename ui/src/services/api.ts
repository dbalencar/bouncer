import axios from 'axios';
import { Subject, Tenant, Policy, PolicyEvaluationRequest, PolicyEvaluationResponse } from '../types';

const API_BASE_URL = '/api';

const api = axios.create({
  baseURL: API_BASE_URL,
  headers: {
    'Content-Type': 'application/json',
  },
});

export const tenantApi = {
  getAll: async (): Promise<Tenant[]> => {
    const response = await api.get('/tenants');
    return response.data;
  },
  
  getById: async (id: string): Promise<Tenant> => {
    const response = await api.get(`/tenants/${id}`);
    return response.data;
  },
  
  create: async (name: string): Promise<Tenant> => {
    const response = await api.post('/tenants', { name });
    return response.data;
  },
  
  delete: async (id: string): Promise<void> => {
    await api.delete(`/tenants/${id}`);
  },
};

export const subjectApi = {
  getAll: async (): Promise<Subject[]> => {
    const response = await api.get('/subjects');
    return response.data;
  },
  
  getByUid: async (uid: string): Promise<Subject> => {
    const response = await api.get(`/subjects/${uid}`);
    return response.data;
  },
  
  getByUsername: async (username: string): Promise<Subject> => {
    const response = await api.get(`/subjects/username/${username}`);
    return response.data;
  },
};

export const policyApi = {
  getByTenant: async (tenantId: string): Promise<Policy[]> => {
    const response = await api.get(`/tenants/${tenantId}/policies`);
    return response.data;
  },
  
  getById: async (tenantId: string, policyId: string): Promise<Policy> => {
    const response = await api.get(`/tenants/${tenantId}/policies/${policyId}`);
    return response.data;
  },
  
  create: async (tenantId: string, policy: Omit<Policy, 'id' | 'created_at' | 'updated_at'>): Promise<Policy> => {
    const response = await api.post(`/tenants/${tenantId}/policies`, policy);
    return response.data;
  },
  
  update: async (tenantId: string, policyId: string, policy: Partial<Policy>): Promise<Policy> => {
    const response = await api.put(`/tenants/${tenantId}/policies/${policyId}`, policy);
    return response.data;
  },
  
  delete: async (tenantId: string, policyId: string): Promise<void> => {
    await api.delete(`/tenants/${tenantId}/policies/${policyId}`);
  },
};

export const evaluationApi = {
  evaluate: async (tenantId: string, request: PolicyEvaluationRequest): Promise<PolicyEvaluationResponse> => {
    const response = await api.post(`/tenants/${tenantId}/evaluate`, request);
    return response.data;
  },
};

export default api;
