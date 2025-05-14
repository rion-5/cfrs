
UPDATE reading_seats
SET end_time = CURRENT_TIMESTAMP, updated_at = CURRENT_TIMESTAMP
WHERE end_time IS NULL
  AND start_time <= CURRENT_TIMESTAMP - INTERVAL '20 minutes';
