import { apiClient } from './client';

interface LoginApiUser {
  id: string;
  email: string;
  organizationId?: string;
  organization_id?: string;
  role: string;
}

interface LoginApiPayload {
  token: string;
  user: LoginApiUser;
}

interface LoginApiEnvelope {
  data?: LoginApiPayload;
}

export interface LoginResponse {
  token: string;
  user: { id: string; email: string; organizationId: string; role: string };
}

function unwrapLoginPayload(payload: LoginApiPayload | LoginApiEnvelope): LoginApiPayload {
  if ('token' in payload && 'user' in payload) {
    return payload;
  }

  if ('data' in payload && payload.data) {
    return payload.data;
  }

  throw new Error('Invalid login response from server');
}

export function normalizeLoginResponse(payload: LoginApiPayload | LoginApiEnvelope): LoginResponse {
  const data = unwrapLoginPayload(payload);
  const organizationId = data.user.organizationId ?? data.user.organization_id;

  if (!data.token || !data.user?.id || !data.user.email || !organizationId || !data.user.role) {
    throw new Error('Invalid login response from server');
  }

  return {
    token: data.token,
    user: {
      id: data.user.id,
      email: data.user.email,
      organizationId,
      role: data.user.role,
    },
  };
}

export async function login(email: string, password: string): Promise<LoginResponse> {
  const res = await apiClient.post<LoginApiEnvelope | LoginApiPayload>('/api/v1/auth/login', { email, password });
  return normalizeLoginResponse(res.data);
}
