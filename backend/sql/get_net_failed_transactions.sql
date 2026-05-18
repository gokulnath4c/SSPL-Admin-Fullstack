-- RPC to fetch "Net Failed" transactions:
-- Transactions with status 'failed' where the user (matched by 10-digit phone)
-- has NO other transaction with status 'captured'.

CREATE OR REPLACE FUNCTION get_net_failed_transactions(
  p_limit INT DEFAULT 50,
  p_offset INT DEFAULT 0,
  p_search TEXT DEFAULT NULL
)
RETURNS TABLE (
  id BIGINT,
  payment_id TEXT,
  order_id TEXT,
  amount NUMERIC,
  status TEXT,
  email TEXT,
  contact TEXT,
  method TEXT,
  created_at TIMESTAMPTZ,
  total_count BIGINT
) AS $$
BEGIN
  RETURN QUERY
  WITH failed_candidates AS (
    -- All failed transactions
    SELECT *, 
           substring(regexp_replace(contact, '\D', '', 'g') from '\d{10}$') as normalized_contact
    FROM razorpay_ledger
    WHERE status = 'failed'
  ),
  captured_contacts AS (
    -- Unique normalized contacts that have succeeded
    SELECT DISTINCT substring(regexp_replace(contact, '\D', '', 'g') from '\d{10}$') as normalized_captured
    FROM razorpay_ledger
    WHERE status = 'captured'
  ),
  net_failed AS (
    -- Failed candidates that are NOT in captured_contacts
    SELECT fc.*
    FROM failed_candidates fc
    LEFT JOIN captured_contacts cc ON fc.normalized_contact = cc.normalized_captured
    WHERE cc.normalized_captured IS NULL
    AND (p_search IS NULL OR fc.email ILIKE '%' || p_search || '%' OR fc.payment_id ILIKE '%' || p_search || '%')
  ),
  counted AS (
    SELECT *, count(*) OVER() as full_count FROM net_failed
  )
  SELECT 
    c.id, c.payment_id, c.order_id, c.amount, c.status, 
    c.email, c.contact, c.method, c.created_at, c.full_count
  FROM counted c
  ORDER BY c.created_at DESC
  LIMIT p_limit OFFSET p_offset;
END;
$$ LANGUAGE plpgsql;
