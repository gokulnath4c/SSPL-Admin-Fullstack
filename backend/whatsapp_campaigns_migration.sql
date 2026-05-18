-- 1. Create whatsapp_campaigns table
CREATE TABLE IF NOT EXISTS whatsapp_campaigns (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name VARCHAR(255) NOT NULL,
    message_template TEXT NOT NULL,
    use_buttons BOOLEAN DEFAULT FALSE,
    buttons_config JSONB DEFAULT '{}'::jsonb,
    status VARCHAR(50) DEFAULT 'DRAFT', -- DRAFT, READY, IN_PROGRESS, COMPLETED
    completed_at TIMESTAMP WITH TIME ZONE,
    meta_data JSONB DEFAULT '{}'::jsonb,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT now()
 );

-- 2. Create whatsapp_campaign_recipients table
CREATE TABLE IF NOT EXISTS whatsapp_campaign_recipients (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    campaign_id UUID REFERENCES whatsapp_campaigns(id) ON DELETE CASCADE,
    name VARCHAR(255),
    mobile VARCHAR(20) NOT NULL,
    status VARCHAR(50) DEFAULT 'PENDING', -- PENDING, SENT, FAILED
    error_message TEXT,
    sent_at TIMESTAMP WITH TIME ZONE,
    metadata JSONB DEFAULT '{}'::jsonb
);

-- 3. Add indexes for faster fetching in the desktop tool
CREATE INDEX IF NOT EXISTS idx_whatsapp_campaign_status ON whatsapp_campaigns(status);
CREATE INDEX IF NOT EXISTS idx_whatsapp_recipients_campaign_id ON whatsapp_campaign_recipients(campaign_id);
CREATE INDEX IF NOT EXISTS idx_whatsapp_recipients_status ON whatsapp_campaign_recipients(status);

-- 4. Enable RLS (Assuming admin access is required)
ALTER TABLE whatsapp_campaigns ENABLE ROW LEVEL SECURITY;
ALTER TABLE whatsapp_campaign_recipients ENABLE ROW LEVEL SECURITY;

-- Note: RLS policies should be configured based on your Auth provider roles.
-- For now, we assume service_role or authenticated admin access.

-- 5. Helper function for trial status fetching (Optional but useful for selection)
CREATE OR REPLACE FUNCTION get_trial_candidates_by_level(level_num INT, result_status TEXT DEFAULT 'SELECTED')
RETURNS TABLE (name VARCHAR, mobile VARCHAR) AS $$
BEGIN
    RETURN QUERY
    SELECT tc.name, tc.mobile
    FROM trial_candidates tc
    JOIN trial_progress tp ON tc.id = tp.candidate_id
    WHERE (
        (level_num = 1 AND tp.l1_result::text = result_status) OR
        (level_num = 2 AND tp.l2_result::text = result_status) OR
        (level_num = 3 AND tp.l3_result::text = result_status)
    );
END;
$$ LANGUAGE plpgsql;
