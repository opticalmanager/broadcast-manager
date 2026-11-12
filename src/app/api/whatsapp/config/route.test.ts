import { beforeEach, describe, expect, it, vi } from 'vitest';
import { encrypt } from '@/lib/whatsapp/encryption';

const mocks = vi.hoisted(() => ({
  invalidateCache: vi.fn(),
  verifyPhoneNumber: vi.fn(),
  getSubscribedApps: vi.fn(),
  subscribeWabaToApp: vi.fn(),
  listWabaPhoneNumbers: vi.fn(),
  registerPhoneNumber: vi.fn(),
}));

vi.mock('@/lib/whatsapp/webhook-signature', () => ({
  invalidateWebhookAppSecretsCache: mocks.invalidateCache,
}));

vi.mock('@/lib/whatsapp/meta-api', () => ({
  verifyPhoneNumber: mocks.verifyPhoneNumber,
  getSubscribedApps: mocks.getSubscribedApps,
  subscribeWabaToApp: mocks.subscribeWabaToApp,
  listWabaPhoneNumbers: mocks.listWabaPhoneNumbers,
  registerPhoneNumber: mocks.registerPhoneNumber,
}));

// Mock Supabase clients
let mockConfigRow: Record<string, unknown> | null = null;
let savedRow: Record<string, unknown> | null = null;

const mockSupabase = {
  auth: {
    getUser: vi.fn(async () => ({
      data: { user: { id: 'user-1' } },
      error: null,
    })),
  },
  from: (table: string) => {
    if (table === 'profiles') {
      return {
        select: () => ({
          eq: () => ({
            maybeSingle: async () => ({
              data: { account_id: 'acc-1' },
              error: null,
            }),
          }),
        }),
      };
    }
    if (table === 'whatsapp_config') {
      return {
        select: () => ({
          eq: () => ({
            maybeSingle: async () => ({
              data: mockConfigRow,
              error: null,
            }),
          }),
        }),
        update: (data: Record<string, unknown>) => ({
          eq: async () => {
            savedRow = { ...mockConfigRow, ...data };
            return { error: null };
          },
        }),
        insert: async (data: Record<string, unknown>) => {
          savedRow = data;
          return { error: null };
        },
        delete: () => ({
          eq: async () => {
            savedRow = null;
            mockConfigRow = null;
            return { error: null };
          },
        }),
      };
    }
    return {
      select: () => ({
        eq: () => ({
          maybeSingle: async () => ({ data: null, error: null }),
        }),
      }),
    };
  },
};

vi.mock('@/lib/supabase/server', () => ({
  createClient: vi.fn(async () => mockSupabase),
}));

vi.mock('@supabase/supabase-js', () => ({
  createClient: vi.fn(() => ({
    from: () => ({
      select: () => ({
        eq: () => ({
          neq: () => ({
            maybeSingle: async () => ({ data: null, error: null }),
          }),
        }),
      }),
    }),
  })),
}));

import { DELETE, GET, POST } from './route';

describe('/api/whatsapp/config', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockConfigRow = null;
    savedRow = null;
    mocks.verifyPhoneNumber.mockResolvedValue({
      verified_name: 'Test Business',
      display_phone_number: '+1234567890',
      quality_rating: 'GREEN',
    });
    mocks.getSubscribedApps.mockResolvedValue([
      { whatsapp_business_api_data: { id: '4160791244052881', name: 'My Meta App' } },
    ]);
    mocks.listWabaPhoneNumbers.mockResolvedValue([
      { id: '123456', display_phone_number: '+1234567890' },
    ]);
    mocks.subscribeWabaToApp.mockResolvedValue(undefined);
    mocks.registerPhoneNumber.mockResolvedValue({ success: true, alreadyRegistered: true });
  });

  describe('GET', () => {
    it('returns connected: false when no configuration exists', async () => {
      mockConfigRow = null;
      const res = await GET();
      const body = await res.json();
      expect(res.status).toBe(200);
      expect(body.connected).toBe(false);
      expect(body.reason).toBe('no_config');
    });

    it('returns app_id and has_app_secret without exposing plaintext secret', async () => {
      mockConfigRow = {
        id: 'cfg-1',
        account_id: 'acc-1',
        phone_number_id: '123456',
        waba_id: '789012',
        access_token: encrypt('access-token-123'),
        verify_token: encrypt('verify-token-123'),
        app_id: '4160791244052881',
        app_secret: encrypt('meta-app-secret-123'),
        registered_at: '2026-01-01T00:00:00Z',
      };

      const res = await GET();
      const body = await res.json();
      expect(res.status).toBe(200);
      expect(body.connected).toBe(true);
      expect(body.app_id).toBe('4160791244052881');
      expect(body.has_app_secret).toBe(true);
      expect(body.app_secret).toBeUndefined(); // Never returned
      expect(body.waba_subscription.subscribed).toBe(true);
      expect(body.waba_subscription.app_id_match).toBe(true);
    });
  });

  describe('POST', () => {
    it('rejects non-numeric app_id with 400', async () => {
      const req = new Request('http://localhost/api/whatsapp/config', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          phone_number_id: '123456',
          access_token: 'new-token',
          app_id: 'invalid-non-numeric-app-id',
        }),
      });

      const res = await POST(req);
      const body = await res.json();
      expect(res.status).toBe(400);
      expect(body.field).toBe('app_id');
      expect(body.error).toMatch(/Meta App ID must contain only digits/);
    });

    it('saves app_id and encrypts app_secret on creation', async () => {
      mockConfigRow = null;

      const req = new Request('http://localhost/api/whatsapp/config', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          phone_number_id: '123456',
          waba_id: '789012',
          access_token: 'valid-meta-token',
          verify_token: 'custom-verify-token',
          app_id: '4160791244052881',
          app_secret: '99e8799c1c4c44fdbc7e08a96a44bfa5',
        }),
      });

      const res = await POST(req);
      const body = await res.json();
      expect(res.status).toBe(200);
      expect(body.success).toBe(true);
      expect(body.app_id).toBe('4160791244052881');
      expect(body.has_app_secret).toBe(true);

      expect(savedRow).toBeDefined();
      expect(savedRow?.app_id).toBe('4160791244052881');
      expect(typeof savedRow?.app_secret).toBe('string');
      expect(savedRow?.app_secret).not.toBe('99e8799c1c4c44fdbc7e08a96a44bfa5'); // Must be encrypted

      // Verifies cache invalidation was triggered
      expect(mocks.invalidateCache).toHaveBeenCalled();
    });

    it('allows partial update preserving existing access_token and app_secret', async () => {
      const existingEncryptedSecret = encrypt('existing-secret');
      const existingEncryptedToken = encrypt('existing-token');

      mockConfigRow = {
        id: 'cfg-1',
        account_id: 'acc-1',
        phone_number_id: '123456',
        waba_id: '789012',
        access_token: existingEncryptedToken,
        verify_token: encrypt('verify-token'),
        app_id: '1111111111',
        app_secret: existingEncryptedSecret,
        registered_at: '2026-01-01T00:00:00Z',
      };

      // Update only app_id without resupplying access_token or app_secret
      const req = new Request('http://localhost/api/whatsapp/config', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          phone_number_id: '123456',
          waba_id: '789012',
          app_id: '2222222222',
        }),
      });

      const res = await POST(req);
      const body = await res.json();
      expect(res.status).toBe(200);
      expect(body.success).toBe(true);
      expect(body.app_id).toBe('2222222222');
      expect(body.has_app_secret).toBe(true);

      expect(savedRow?.app_id).toBe('2222222222');
      expect(savedRow?.app_secret).toBe(existingEncryptedSecret);
      expect(savedRow?.access_token).toBe(existingEncryptedToken);
      expect(mocks.invalidateCache).toHaveBeenCalled();
    });

    it('trims whitespace on numeric IDs without throwing validation errors', async () => {
      mockConfigRow = null;

      const req = new Request('http://localhost/api/whatsapp/config', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          phone_number_id: '  123456  ',
          waba_id: '  789012  ',
          access_token: 'valid-meta-token',
          app_id: '  4160791244052881  ',
        }),
      });

      const res = await POST(req);
      const body = await res.json();
      expect(res.status).toBe(200);
      expect(body.success).toBe(true);
      expect(savedRow?.phone_number_id).toBe('123456');
      expect(savedRow?.waba_id).toBe('789012');
      expect(savedRow?.app_id).toBe('4160791244052881');
    });

    it('allows explicitly clearing app_secret when passed null', async () => {
      mockConfigRow = {
        id: 'cfg-1',
        account_id: 'acc-1',
        phone_number_id: '123456',
        waba_id: '789012',
        access_token: encrypt('valid-meta-token'),
        app_secret: encrypt('old-secret'),
        registered_at: '2026-01-01T00:00:00Z',
      };

      const req = new Request('http://localhost/api/whatsapp/config', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          phone_number_id: '123456',
          waba_id: '789012',
          app_secret: null,
        }),
      });

      const res = await POST(req);
      const body = await res.json();
      expect(res.status).toBe(200);
      expect(body.success).toBe(true);
      expect(body.has_app_secret).toBe(false);
      expect(savedRow?.app_secret).toBeNull();
    });
  });

  describe('DELETE', () => {
    it('deletes config and invalidates webhook app secrets cache', async () => {
      mockConfigRow = {
        id: 'cfg-1',
        account_id: 'acc-1',
      };

      const res = await DELETE();
      const body = await res.json();
      expect(res.status).toBe(200);
      expect(body.success).toBe(true);
      expect(mocks.invalidateCache).toHaveBeenCalled();
    });
  });
});
