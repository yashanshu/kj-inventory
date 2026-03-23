import { describe, expect, it } from 'vitest';
import { normalizeLoginResponse } from '../../src/api/auth';

describe('normalizeLoginResponse', () => {
  it('unwraps the backend data envelope and maps organizationId', () => {
    const result = normalizeLoginResponse({
      data: {
        token: 'jwt-token',
        user: {
          id: 'user-1',
          email: 'admin@restaurant.local',
          organizationId: 'org-1',
          role: 'ADMIN',
        },
      },
    });

    expect(result).toEqual({
      token: 'jwt-token',
      user: {
        id: 'user-1',
        email: 'admin@restaurant.local',
        organizationId: 'org-1',
        role: 'ADMIN',
      },
    });
  });

  it('accepts the legacy organization_id field', () => {
    const result = normalizeLoginResponse({
      token: 'jwt-token',
      user: {
        id: 'user-1',
        email: 'admin@restaurant.local',
        organization_id: 'org-legacy',
        role: 'ADMIN',
      },
    });

    expect(result.user.organizationId).toBe('org-legacy');
  });
});
