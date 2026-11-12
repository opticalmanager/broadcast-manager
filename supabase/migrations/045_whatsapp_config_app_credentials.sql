-- Migration 045: Add Meta App ID and encrypted Meta App Secret to whatsapp_config
-- Stores Meta App ID and AES-256-GCM encrypted Meta App Secret per account.

ALTER TABLE whatsapp_config
  ADD COLUMN IF NOT EXISTS app_id TEXT,
  ADD COLUMN IF NOT EXISTS app_secret TEXT;

-- Index for looking up config by app_id
CREATE INDEX IF NOT EXISTS idx_whatsapp_config_app_id
  ON whatsapp_config (app_id);

COMMENT ON COLUMN whatsapp_config.app_id IS
  'Meta App ID (Meta for Developers → App Settings → Basic). Required for media-header template resumable uploads and WABA webhook pairing check.';

COMMENT ON COLUMN whatsapp_config.app_secret IS
  'Encrypted Meta App Secret (AES-256-GCM using ENCRYPTION_KEY). Used to verify x-hub-signature-256 on inbound webhook POSTs.';

-- Backfill Precision Optics account credentials from previous environment configuration
-- Account ID: a79a3d48-a0a4-4b33-9a57-a105a8feb326
-- Meta App ID: 4160791244052881
-- Encrypted app_secret using ENCRYPTION_KEY (AES-256-GCM: iv:ciphertext:authTag)
UPDATE whatsapp_config
SET
  app_id = COALESCE(app_id, '4160791244052881'),
  app_secret = COALESCE(app_secret, '256da746f01b84d1bdeaca23:b39a7c2aa8bc503a590ec892590bfb666957f355628ccdb9a56eeb8c974c8aa5:65b1dabd2470618413bf6f877525110a')
WHERE account_id = 'a79a3d48-a0a4-4b33-9a57-a105a8feb326'
  AND (app_id IS NULL OR app_secret IS NULL);
