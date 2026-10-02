-- Migration 044: Broadcast paused support and KPI separation

-- 1. Update broadcasts status check constraint
DO $$
BEGIN
  ALTER TABLE broadcasts DROP CONSTRAINT IF EXISTS broadcasts_status_check;
  ALTER TABLE broadcasts ADD CONSTRAINT broadcasts_status_check
    CHECK (status IN ('draft', 'scheduled', 'sending', 'sent', 'failed', 'paused'));
EXCEPTION
  WHEN undefined_object THEN NULL;
END $$;

-- 2. Update broadcast_recipients status check constraint
DO $$
BEGIN
  ALTER TABLE broadcast_recipients DROP CONSTRAINT IF EXISTS broadcast_recipients_status_check;
  ALTER TABLE broadcast_recipients ADD CONSTRAINT broadcast_recipients_status_check
    CHECK (status IN ('pending', 'sent', 'delivered', 'read', 'replied', 'failed', 'paused'));
EXCEPTION
  WHEN undefined_object THEN NULL;
END $$;

-- 3. Add paused_count column to broadcasts if not exists
ALTER TABLE broadcasts ADD COLUMN IF NOT EXISTS paused_count INTEGER DEFAULT 0;

-- 4. Update incremental trigger column helper
CREATE OR REPLACE FUNCTION public._bcast_cols_for_status(s TEXT)
RETURNS TEXT[] AS $$
BEGIN
  -- 'pending' contributes to nothing.
  IF s = 'pending'   THEN RETURN ARRAY[]::TEXT[]; END IF;
  IF s = 'sent'      THEN RETURN ARRAY['sent_count']; END IF;
  IF s = 'delivered' THEN RETURN ARRAY['sent_count','delivered_count']; END IF;
  IF s = 'read'      THEN RETURN ARRAY['sent_count','delivered_count','read_count']; END IF;
  IF s = 'replied'   THEN RETURN ARRAY['sent_count','delivered_count','read_count','replied_count']; END IF;
  IF s = 'failed'    THEN RETURN ARRAY['failed_count']; END IF;
  IF s = 'paused'    THEN RETURN ARRAY['paused_count']; END IF;
  RETURN ARRAY[]::TEXT[];
END;
$$ LANGUAGE plpgsql IMMUTABLE;

-- 5. Update safety net recompute function
CREATE OR REPLACE FUNCTION public.recompute_broadcast_counts(bid UUID)
RETURNS VOID AS $$
BEGIN
  UPDATE broadcasts b SET
    sent_count      = agg.sent_count,
    delivered_count = agg.delivered_count,
    read_count      = agg.read_count,
    replied_count   = agg.replied_count,
    failed_count    = agg.failed_count,
    paused_count    = agg.paused_count,
    updated_at      = NOW()
  FROM (
    SELECT
      COUNT(*) FILTER (WHERE status IN ('sent','delivered','read','replied')) AS sent_count,
      COUNT(*) FILTER (WHERE status IN ('delivered','read','replied'))        AS delivered_count,
      COUNT(*) FILTER (WHERE status IN ('read','replied'))                    AS read_count,
      COUNT(*) FILTER (WHERE status = 'replied')                              AS replied_count,
      COUNT(*) FILTER (WHERE status = 'failed')                               AS failed_count,
      COUNT(*) FILTER (WHERE status = 'paused')                               AS paused_count
    FROM broadcast_recipients
    WHERE broadcast_id = bid
  ) agg
  WHERE b.id = bid;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

-- 6. Migrate any historical failed recipients whose failure was due to paused
UPDATE broadcast_recipients
SET status = 'paused'
WHERE status = 'failed'
  AND (error_message ILIKE '%pause%' OR error_message LIKE '%132015%');

-- 7. For any broadcast in 'paused' status, mark remaining 'pending' recipients as 'paused'
UPDATE broadcast_recipients r
SET status = 'paused', error_message = COALESCE(r.error_message, 'Campaign paused')
FROM broadcasts b
WHERE r.broadcast_id = b.id
  AND b.status = 'paused'
  AND r.status = 'pending';

-- 8. Backfill paused_count and recompute counts across all broadcasts
UPDATE broadcasts b
SET paused_count = COALESCE(agg.cnt, 0)
FROM (
  SELECT broadcast_id, COUNT(*) AS cnt
  FROM broadcast_recipients
  WHERE status = 'paused'
  GROUP BY broadcast_id
) agg
WHERE b.id = agg.broadcast_id;

