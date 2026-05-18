DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1
        FROM information_schema.columns
        WHERE table_name = 'chat_logs'
        AND column_name = 'mobile_number'
    ) THEN
        ALTER TABLE chat_logs ADD COLUMN mobile_number TEXT;
    END IF;
END $$;
