-- Remove duplicate player registrations with 'captured' payment status
-- Keeps the most recent record based on created_at

DELETE FROM player_registrations
WHERE id IN (
  SELECT id
  FROM (
    SELECT id,
           ROW_NUMBER() OVER (PARTITION BY email, phone ORDER BY created_at DESC) as r_num
    FROM player_registrations
    WHERE payment_status = 'captured'
  ) t
  WHERE t.r_num > 1
);
