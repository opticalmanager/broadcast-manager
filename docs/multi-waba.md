# Several WhatsApp Business Accounts on one wacrm deployment

wacrm fully supports multi-tenant and multi-WABA setups where accounts have numbers
belonging to different WhatsApp Business Accounts (WABAs) and different Meta Apps.
Both Meta App ID and Meta App Secret are configured per account in Settings → WhatsApp Connection
and stored encrypted (AES-256-GCM) in `whatsapp_config`. No user secrets are stored in `.env`.

## What is per account and what is per deployment

| Value | Lives in | Scope |
| --- | --- | --- |
| Phone Number ID, WABA ID, access token, verify token, two-step PIN | `whatsapp_config` (one row per wacrm account, token encrypted) | per account |
| Meta App ID (`app_id`) | `whatsapp_config` (per account) | per account |
| Meta App Secret (`app_secret`) | `whatsapp_config` (AES-256-GCM encrypted per account) | per account |
| Webhook callback URL | your Meta App → WhatsApp → Configuration | per Meta App |

Meta signs every webhook delivery with the secret of the App the WABA
is subscribed to. wacrm checks that signature against the active encrypted app secrets
stored across accounts in `whatsapp_config`, with high-performance in-memory caching and constant-time comparison,
then routes the payload to the account whose row holds the `phone_number_id` in the delivery.

## Setup A — many accounts, one Meta App, many WABAs

This is the normal case for an agency or a company with several
brands under one Meta Developer App.

1. Create one Meta App and add the WhatsApp product. Under
   **WhatsApp → Configuration** set the callback URL to
   `https://<your host>/api/whatsapp/webhook` and subscribe to the
   `messages` field.
2. For each WABA, make sure the Business portfolio that owns it has
   access to the app (Business Settings → Accounts → WhatsApp accounts →
   Assigned assets, or add the WABA through the app's WhatsApp product).
3. Each wacrm account opens Settings → WhatsApp Connection and enters:
   - Phone Number ID
   - WhatsApp Business Account ID (WABA ID)
   - Meta App ID & Meta App Secret (Basic App Settings)
   - System User permanent access token
   - Verify token (auto-generated or customized)
   - Two-step PIN (for production numbers)

On save, wacrm verifies the number with the token, registers it
(`POST /{phone_number_id}/register`, PIN required) and subscribes the
WABA to the app (`POST /{waba_id}/subscribed_apps`).

## Setup B — WABAs under different Meta Apps (Fully Supported)

When accounts belong to completely separate clients with their own Meta Apps:

1. In **every** Meta App, set the same callback URL:
   `https://<your host>/api/whatsapp/webhook`
   and subscribe to the `messages` field. Use the verify token configured in that account's settings.
2. In each wacrm account's Settings → WhatsApp Connection, enter that account's specific
   Meta App ID and Meta App Secret.
3. Webhook signature verification automatically checks against each configured app secret in `whatsapp_config`.
   Because each account holds its own `app_id` and `app_secret`, media template resumable uploads
   and webhook deliveries route cleanly to their respective apps without cross-tenant interference.

## Checking a multi-WABA deployment

* Settings → WhatsApp connection → **Verify with Meta** runs, per
  account, the per-check diagnostic (`phone_metadata_ok`,
  `waba_subscribed_to_app`, `locally_marked_registered`).
* A webhook delivery rejected with 401 indicates that no account in `whatsapp_config` has
  an app secret that matches the delivery's signature. Ensure the Meta App Secret in Settings
  matches the Meta App whose WABA is sending webhooks.
