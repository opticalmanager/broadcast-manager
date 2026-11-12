import crypto from "node:crypto";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { encrypt } from "./encryption";

let mockDbRows: Array<{ account_id: string; app_id?: string | null; app_secret?: string | null }> = [];
let queryCount = 0;

vi.mock("@supabase/supabase-js", () => ({
  createClient: () => ({
    from: (table: string) => {
      if (table === "whatsapp_config") {
        return {
          select: () => {
            queryCount++;
            return Promise.resolve({
              data: mockDbRows,
              error: null,
            });
          },
        };
      }
      return { select: () => Promise.resolve({ data: [], error: null }) };
    },
  }),
}));

import {
  getActiveWebhookSecrets,
  invalidateWebhookAppSecretsCache,
  parseAppSecrets,
  reloadWebhookSecrets,
  signatureMatches,
  verifyMetaWebhookSignature,
  verifySignatureWithSecrets,
} from "./webhook-signature";

const SECRET = "test-secret-alpha-99";
const SECOND_SECRET = "test-secret-beta-88";
const THIRD_SECRET = "test-secret-gamma-77";

function signedHeader(body: string, secret: string = SECRET): string {
  const hex = crypto.createHmac("sha256", secret).update(body).digest("hex");
  return `sha256=${hex}`;
}

describe("webhook signature verification", () => {
  beforeEach(() => {
    vi.stubEnv("NEXT_PUBLIC_SUPABASE_URL", "https://example.supabase.co");
    vi.stubEnv("SUPABASE_SERVICE_ROLE_KEY", "mock-service-role-key");
    invalidateWebhookAppSecretsCache();
    mockDbRows = [];
    queryCount = 0;
  });

  afterEach(() => {
    vi.unstubAllEnvs();
    invalidateWebhookAppSecretsCache();
  });

  describe("direct candidate secrets verification", () => {
    it("accepts a request signed with the correct candidate secret", async () => {
      const body = JSON.stringify({ object: "whatsapp_business_account" });
      const header = signedHeader(body, SECRET);
      const ok = await verifyMetaWebhookSignature(body, header, [SECRET]);
      expect(ok).toBe(true);
    });

    it("rejects a signature computed with a different secret", async () => {
      const body = "{}";
      const header = signedHeader(body, "wrong-secret");
      const ok = await verifyMetaWebhookSignature(body, header, [SECRET]);
      expect(ok).toBe(false);
    });

    it("rejects when the body has been tampered with after signing", async () => {
      const original = '{"entry":[]}';
      const header = signedHeader(original, SECRET);
      const tampered = '{"entry":[{"id":"injected"}]}';
      const ok = await verifyMetaWebhookSignature(tampered, header, [SECRET]);
      expect(ok).toBe(false);
    });

    it("rejects a missing or null signature header", async () => {
      const ok = await verifyMetaWebhookSignature("anything", null, [SECRET]);
      expect(ok).toBe(false);
    });

    it("rejects a header without the sha256= prefix", async () => {
      const body = "{}";
      const hex = crypto.createHmac("sha256", SECRET).update(body).digest("hex");
      expect(await verifyMetaWebhookSignature(body, hex, [SECRET])).toBe(false);
      expect(await verifyMetaWebhookSignature(body, `sha512=${hex}`, [SECRET])).toBe(false);
    });

    it("rejects a header of the wrong length without throwing", async () => {
      expect(await verifyMetaWebhookSignature("{}", "sha256=tooshort", [SECRET])).toBe(false);
    });

    it("rejects when candidateSecrets is an empty array", async () => {
      const body = "{}";
      const header = signedHeader(body, SECRET);
      expect(await verifyMetaWebhookSignature(body, header, [])).toBe(false);
    });

    it("accepts a request signed by any candidate secret in multi-secret environments", async () => {
      const body = '{"entry":[{"id":"account-2"}]}';
      const secrets = [SECRET, SECOND_SECRET, THIRD_SECRET];

      expect(await verifyMetaWebhookSignature(body, signedHeader(body, SECRET), secrets)).toBe(true);
      expect(await verifyMetaWebhookSignature(body, signedHeader(body, SECOND_SECRET), secrets)).toBe(true);
      expect(await verifyMetaWebhookSignature(body, signedHeader(body, THIRD_SECRET), secrets)).toBe(true);
    });

    it("rejects a signature from an unlisted secret when multiple secrets are provided", async () => {
      const body = "{}";
      const secrets = [SECRET, SECOND_SECRET];
      expect(await verifyMetaWebhookSignature(body, signedHeader(body, "unlisted-secret"), secrets)).toBe(false);
    });
  });

  describe("database-driven verification (whatsapp_config)", () => {
    it("fails closed when no secrets are configured in database", async () => {
      mockDbRows = [];
      const body = '{"entry":[]}';
      const header = signedHeader(body, SECRET);

      const ok = await verifyMetaWebhookSignature(body, header);
      expect(ok).toBe(false);
      // Ensures no duplicate queries within a single request
      expect(queryCount).toBe(1);

      // Subsequent call within cooldown does not hit DB again
      const ok2 = await verifyMetaWebhookSignature(body, header);
      expect(ok2).toBe(false);
      expect(queryCount).toBe(1);
    });

    it("loads encrypted secrets from whatsapp_config and verifies inbound webhooks", async () => {
      mockDbRows = [
        {
          account_id: "acc-1",
          app_id: "1111111111",
          app_secret: encrypt(SECRET),
        },
        {
          account_id: "acc-2",
          app_id: "2222222222",
          app_secret: encrypt(SECOND_SECRET),
        },
      ];

      const body1 = '{"account":"1"}';
      const body2 = '{"account":"2"}';

      expect(await verifyMetaWebhookSignature(body1, signedHeader(body1, SECRET))).toBe(true);
      expect(await verifyMetaWebhookSignature(body2, signedHeader(body2, SECOND_SECRET))).toBe(true);
      expect(await verifyMetaWebhookSignature(body1, signedHeader(body1, "rogue-secret"))).toBe(false);
    });

    it("caches active secrets in memory to prevent repeated DB hits", async () => {
      mockDbRows = [
        {
          account_id: "acc-1",
          app_secret: encrypt(SECRET),
        },
      ];

      const body = '{"ping":"pong"}';
      const header = signedHeader(body, SECRET);

      const firstResult = await verifyMetaWebhookSignature(body, header);
      expect(firstResult).toBe(true);
      expect(queryCount).toBe(1);

      // Second call should hit in-memory cache without incrementing queryCount
      const secondResult = await verifyMetaWebhookSignature(body, header);
      expect(secondResult).toBe(true);
      expect(queryCount).toBe(1);

      const active = await getActiveWebhookSecrets();
      expect(active).toEqual([SECRET]);
      expect(queryCount).toBe(1);
    });

    it("invalidates cache when invalidateWebhookAppSecretsCache is called", async () => {
      mockDbRows = [
        {
          account_id: "acc-1",
          app_secret: encrypt(SECRET),
        },
      ];

      const body = '{"ping":"pong"}';
      const header = signedHeader(body, SECRET);

      expect(await verifyMetaWebhookSignature(body, header)).toBe(true);
      expect(queryCount).toBe(1);

      invalidateWebhookAppSecretsCache();

      // Next call reloads from DB
      expect(await verifyMetaWebhookSignature(body, header)).toBe(true);
      expect(queryCount).toBe(2);
    });

    it("ignores corrupted ciphertext rows without throwing and processes valid ones", async () => {
      mockDbRows = [
        {
          account_id: "acc-corrupt",
          app_secret: "not-a-valid-gcm-ciphertext",
        },
        {
          account_id: "acc-valid",
          app_secret: encrypt(SECRET),
        },
      ];

      const secrets = await reloadWebhookSecrets();
      expect(secrets).toEqual([SECRET]);

      const body = '{"valid":true}';
      expect(await verifyMetaWebhookSignature(body, signedHeader(body, SECRET))).toBe(true);
    });
  });

  describe("signatureMatches helper", () => {
    it("returns true for matching HMAC hex", () => {
      const body = "test body";
      const header = signedHeader(body, SECRET);
      expect(signatureMatches(body, header, SECRET)).toBe(true);
    });

    it("returns false for non-matching secret", () => {
      const body = "test body";
      const header = signedHeader(body, SECRET);
      expect(signatureMatches(body, header, "different")).toBe(false);
    });

    it("returns false for empty secret", () => {
      const body = "test body";
      const header = signedHeader(body, SECRET);
      expect(signatureMatches(body, header, "")).toBe(false);
    });

    it("returns false without throwing when lengths differ", () => {
      expect(signatureMatches("body", "sha256=123", SECRET)).toBe(false);
    });
  });

  describe("verifySignatureWithSecrets helper", () => {
    it("returns true if any secret matches", () => {
      const body = "test";
      const header = signedHeader(body, SECOND_SECRET);
      expect(verifySignatureWithSecrets(body, header, [SECRET, SECOND_SECRET])).toBe(true);
    });

    it("returns false if no secret matches", () => {
      const body = "test";
      const header = signedHeader(body, "other");
      expect(verifySignatureWithSecrets(body, header, [SECRET, SECOND_SECRET])).toBe(false);
    });

    it("returns false on null header or empty array", () => {
      expect(verifySignatureWithSecrets("test", null, [SECRET])).toBe(false);
      expect(verifySignatureWithSecrets("test", signedHeader("test", SECRET), [])).toBe(false);
    });
  });

  describe("parseAppSecrets utility", () => {
    it("splits on commas, trims, and drops empties", () => {
      expect(parseAppSecrets(" a , b,,c ,")).toEqual(["a", "b", "c"]);
    });

    it("returns a single secret unchanged", () => {
      expect(parseAppSecrets("only-one")).toEqual(["only-one"]);
    });

    it("returns nothing for unset, empty, or comma-only values", () => {
      expect(parseAppSecrets(undefined)).toEqual([]);
      expect(parseAppSecrets("")).toEqual([]);
      expect(parseAppSecrets(" , ,")).toEqual([]);
    });
  });
});
