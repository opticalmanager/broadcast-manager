import crypto from 'node:crypto'
import { createClient as createAdminClient } from '@supabase/supabase-js'
import { decrypt } from '@/lib/whatsapp/encryption'

/**
 * Verify the HMAC-SHA256 signature Meta attaches to webhook POSTs.
 *
 * Meta signs the raw request body with your App Secret and sends the
 * result in the `x-hub-signature-256: sha256=<hex>` header. Without
 * verification, anyone who knows our webhook URL can POST fabricated
 * status updates and drift broadcast counts arbitrarily.
 *
 * Reference:
 *   https://developers.facebook.com/docs/graph-api/webhooks/getting-started#verify-payloads
 *
 * Contract:
 *   All Meta App secrets are stored encrypted in the database per-account
 *   in `whatsapp_config` (AES-256-GCM with ENCRYPTION_KEY).
 *   DO NOT rely on `.env` credentials as fallbacks.
 *   If no secret is configured in the database, we fail closed —
 *   every request is rejected until an admin configures the secret in Settings.
 *
 *   Active secrets across accounts are cached in-memory with a TTL and
 *   protected by a cache-miss reload guard so newly configured or rotated
 *   apps take effect quickly without DB stampedes.
 */

interface CachedSecrets {
  secrets: string[]
  cachedAt: number
}

let cachedSecrets: CachedSecrets | null = null
const CACHE_TTL_MS = 5 * 60 * 1000 // 5 minutes cache TTL
let lastReloadAttemptAt = 0
const RELOAD_COOLDOWN_MS = 5000 // Minimum 5s between reloads on cache miss

/**
 * Clear in-memory cached secrets. Called immediately when an admin saves or resets
 * WhatsApp credentials in Settings.
 */
export function invalidateWebhookAppSecretsCache(): void {
  cachedSecrets = null
  lastReloadAttemptAt = 0
}

// Lazy admin client for reading active app secrets from whatsapp_config
// eslint-disable-next-line @typescript-eslint/no-explicit-any
let _adminClient: any = null
function getSupabaseAdmin() {
  if (!_adminClient) {
    const url = process.env.NEXT_PUBLIC_SUPABASE_URL
    const key = process.env.SUPABASE_SERVICE_ROLE_KEY
    if (!url || !key) {
      return null
    }
    _adminClient = createAdminClient(url, key)
  }
  return _adminClient
}

/**
 * Reloads all active encrypted app secrets from whatsapp_config and decrypts them.
 */
export async function reloadWebhookSecrets(): Promise<string[]> {
  try {
    lastReloadAttemptAt = Date.now()
    const client = getSupabaseAdmin()
    if (!client) {
      return cachedSecrets?.secrets ?? []
    }

    const { data, error } = await client
      .from('whatsapp_config')
      .select('*')

    if (error) {
      console.error('[webhook-signature] Failed to load whatsapp_config:', error.message)
      return cachedSecrets?.secrets ?? []
    }

    const decryptedList: string[] = []
    for (const row of data || []) {
      if (!row || typeof row.app_secret !== 'string' || !row.app_secret.trim()) continue
      try {
        const decrypted = decrypt(row.app_secret)
        if (decrypted && decrypted.trim().length > 0) {
          decryptedList.push(decrypted.trim())
        }
      } catch (err) {
        console.error('[webhook-signature] Failed to decrypt app_secret for account:', row.account_id, err)
      }
    }

    const unique = Array.from(new Set(decryptedList))
    cachedSecrets = {
      secrets: unique,
      cachedAt: Date.now(),
    }
    return unique
  } catch (err) {
    console.error('[webhook-signature] Unexpected error reloading webhook secrets:', err)
    return cachedSecrets?.secrets ?? []
  }
}

/**
 * Returns active candidate secrets, using the in-memory cache if fresh.
 */
export async function getActiveWebhookSecrets(): Promise<string[]> {
  const now = Date.now()
  if (cachedSecrets && now - cachedSecrets.cachedAt < CACHE_TTL_MS) {
    return cachedSecrets.secrets
  }
  return reloadWebhookSecrets()
}

/**
 * Split a comma-separated string of secrets: trims whitespace, drops empties.
 * Kept for tests and backwards compatibility.
 */
export function parseAppSecrets(raw: string | undefined): string[] {
  if (!raw) return []
  return raw
    .split(',')
    .map((s) => s.trim())
    .filter((s) => s.length > 0)
}

/**
 * Constant-time comparison between signature header and HMAC(rawBody, secret).
 */
export function signatureMatches(
  rawBody: string,
  signatureHeader: string,
  secret: string,
): boolean {
  if (!secret) return false
  const expected =
    'sha256=' +
    crypto.createHmac('sha256', secret).update(rawBody).digest('hex')

  const a = Buffer.from(signatureHeader)
  const b = Buffer.from(expected)
  // Bail if lengths differ — timingSafeEqual throws otherwise.
  if (a.length !== b.length) return false
  return crypto.timingSafeEqual(a, b)
}

/**
 * Verifies a signature against an explicit list of candidate secrets in constant time.
 */
export function verifySignatureWithSecrets(
  rawBody: string,
  signatureHeader: string | null,
  secrets: readonly string[],
): boolean {
  if (!signatureHeader || !signatureHeader.startsWith('sha256=')) return false
  if (!secrets || secrets.length === 0) return false

  let ok = false
  for (const secret of secrets) {
    if (signatureMatches(rawBody, signatureHeader, secret)) {
      ok = true
    }
  }
  return ok
}

/**
 * Main webhook entrypoint. Verifies incoming webhook HMAC against active secrets in whatsapp_config.
 * Supports optional candidateSecrets parameter for unit tests or explicit overrides.
 */
export async function verifyMetaWebhookSignature(
  rawBody: string,
  signatureHeader: string | null,
  candidateSecrets?: readonly string[],
): Promise<boolean> {
  if (!signatureHeader || !signatureHeader.startsWith('sha256=')) return false

  if (candidateSecrets !== undefined) {
    if (candidateSecrets.length === 0) return false
    return verifySignatureWithSecrets(rawBody, signatureHeader, candidateSecrets)
  }

  // Database-driven verification
  let secrets = await getActiveWebhookSecrets()
  if (secrets.length === 0 && Date.now() - lastReloadAttemptAt > RELOAD_COOLDOWN_MS) {
    secrets = await reloadWebhookSecrets()
  }

  if (secrets.length === 0) {
    console.error(
      '[webhook] No Meta App Secret found in database — rejecting request. ' +
        'Configure your Meta App Secret in Settings → WhatsApp Connection to enable signature verification.',
    )
    return false
  }

  if (verifySignatureWithSecrets(rawBody, signatureHeader, secrets)) {
    return true
  }

  // Cache-miss reload guard: if candidate did not match cached secrets, reload from DB if cooldown passed
  const now = Date.now()
  if (now - lastReloadAttemptAt > RELOAD_COOLDOWN_MS) {
    const reloaded = await reloadWebhookSecrets()
    if (verifySignatureWithSecrets(rawBody, signatureHeader, reloaded)) {
      return true
    }
  }

  return false
}
