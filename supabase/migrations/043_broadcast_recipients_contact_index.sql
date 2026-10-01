-- Migration 043: Index broadcast_recipients by contact_id and broadcasts by template_name
-- Accelerates looking up a contact's last campaign and template-level audience de-duplication

CREATE INDEX IF NOT EXISTS idx_broadcast_recipients_contact_created
  ON broadcast_recipients (contact_id, created_at DESC);

CREATE INDEX IF NOT EXISTS idx_broadcasts_account_template
  ON broadcasts (account_id, template_name);
