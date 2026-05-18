-- ==============================================================================
-- SSPL REPORTS FUNCTIONS (UNIFIED TRIALS & REGISTRATIONS)
-- ==============================================================================

-- 1. Total Registration (Captured & Failed)
DROP FUNCTION IF EXISTS get_total_registration_report();
CREATE OR REPLACE FUNCTION get_total_registration_report()
RETURNS TABLE (
    id UUID,
    full_name TEXT,
    phone TEXT,
    email TEXT,
    state TEXT,
    city TEXT,
    player_position TEXT,
    payment_status TEXT,
    amount DECIMAL,
    created_at TIMESTAMPTZ
)
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
    RETURN QUERY
    SELECT 
        pr.id,
        pr.full_name,
        pr.phone,
        pr.email,
        pr.state,
        pr.city,
        pr.position as player_position,
        pr.payment_status,
        pr.payment_amount,
        pr.created_at
    FROM player_registrations pr
    ORDER BY pr.created_at DESC;
END;
$$;

-- 2. Net Failed for call to register
DROP FUNCTION IF EXISTS get_net_failed_registrations();
CREATE OR REPLACE FUNCTION get_net_failed_registrations()
RETURNS TABLE (
    id UUID,
    full_name TEXT,
    phone TEXT,
    email TEXT,
    state TEXT,
    city TEXT,
    payment_status TEXT,
    created_at TIMESTAMPTZ
)
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
    RETURN QUERY
    SELECT 
        pr.id,
        pr.full_name,
        pr.phone,
        pr.email,
        pr.state,
        pr.city,
        pr.payment_status,
        pr.created_at
    FROM player_registrations pr
    WHERE pr.payment_status NOT IN ('captured', 'completed', 'paid', 'success')
    ORDER BY pr.created_at DESC;
END;
$$;

-- 3. Captured details for Finance
DROP FUNCTION IF EXISTS get_finance_captured_details();
CREATE OR REPLACE FUNCTION get_finance_captured_details()
RETURNS TABLE (
    payment_id TEXT,
    order_id TEXT,
    amount DECIMAL,
    status TEXT,
    email TEXT,
    contact TEXT,
    created_at TIMESTAMPTZ,
    fee DECIMAL,
    tax DECIMAL
)
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
    RETURN QUERY
    SELECT 
        rl.payment_id,
        rl.order_id,
        rl.amount,
        rl.status,
        rl.email,
        rl.contact,
        rl.created_at,
        rl.fee,
        rl.tax
    FROM razorpay_ledger rl
    WHERE rl.status IN ('captured', 'authorized', 'completed')
    ORDER BY rl.created_at DESC;
END;
$$;

-- 4. Trials - Call for Trials (Level 1,2 & 3)
DROP FUNCTION IF EXISTS get_call_for_trials_report(target_level INT);
CREATE OR REPLACE FUNCTION get_call_for_trials_report(target_level INT)
RETURNS TABLE (
    candidate_id UUID,
    name TEXT,
    mobile TEXT,
    email TEXT,
    state TEXT,
    proficiency TEXT,
    current_level INT,
    l1_called BOOLEAN,
    l2_called BOOLEAN,
    l3_called BOOLEAN,
    payment_status TEXT
)
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
    RETURN QUERY
    SELECT DISTINCT ON (tv.candidate_id)
        tv.candidate_id,
        tv.name::TEXT,
        tv.mobile::TEXT,
        COALESCE(NULLIF(TRIM(tv.email), ''), pr.email)::TEXT as email,
        tv.state::TEXT,
        tv.proficiency::TEXT,
        tv.current_level,
        tv.l1_called,
        tv.l2_called,
        tv.l3_called,
        tv.payment_status::TEXT
    FROM trial_view tv
    LEFT JOIN player_registrations pr 
        ON RIGHT(TRIM(COALESCE(tv.mobile, '')), 10) = RIGHT(TRIM(COALESCE(pr.phone, '')), 10)
        AND LENGTH(TRIM(COALESCE(tv.mobile, ''))) >= 10
        AND LENGTH(TRIM(COALESCE(pr.phone, ''))) >= 10
    WHERE 
        (target_level = 1 AND tv.current_level >= 1) OR
        (target_level = 2 AND tv.current_level >= 2) OR
        (target_level = 3 AND tv.current_level >= 3)
    ORDER BY tv.candidate_id, pr.email NULLS LAST;
END;
$$;

-- 5. Trials - Selection sheet (Absentees, level 1,2 and 3)
DROP FUNCTION IF EXISTS get_trial_selection_sheet(target_level INT);
CREATE OR REPLACE FUNCTION get_trial_selection_sheet(target_level INT)
RETURNS TABLE (
    candidate_id UUID,
    name TEXT,
    mobile TEXT,
    email TEXT,
    state TEXT,
    proficiency TEXT,
    attendance TEXT,
    result TEXT,
    final_status TEXT
)
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
    RETURN QUERY
    SELECT DISTINCT ON (tv.candidate_id)
        tv.candidate_id,
        tv.name::TEXT,
        tv.mobile::TEXT,
        COALESCE(NULLIF(TRIM(tv.email), ''), pr.email)::TEXT as email,
        tv.state::TEXT,
        tv.proficiency::TEXT,
        CASE 
            WHEN target_level = 1 THEN tv.l1_attendance::TEXT
            WHEN target_level = 2 THEN tv.l2_attendance::TEXT
            WHEN target_level = 3 THEN tv.l3_attendance::TEXT
        END as attendance,
        CASE 
            WHEN target_level = 1 THEN tv.l1_result::TEXT
            WHEN target_level = 2 THEN tv.l2_result::TEXT
            WHEN target_level = 3 THEN tv.l3_result::TEXT
        END as result,
        tv.final_status::TEXT
    FROM trial_view tv
    LEFT JOIN player_registrations pr 
        ON RIGHT(TRIM(COALESCE(tv.mobile, '')), 10) = RIGHT(TRIM(COALESCE(pr.phone, '')), 10)
        AND LENGTH(TRIM(COALESCE(tv.mobile, ''))) >= 10
        AND LENGTH(TRIM(COALESCE(pr.phone, ''))) >= 10
    WHERE 
        (target_level = 1 AND (tv.l1_attendance = 'ABSENT' OR tv.l1_result != 'PENDING')) OR
        (target_level = 2 AND (tv.l2_attendance = 'ABSENT' OR tv.l2_result != 'PENDING')) OR
        (target_level = 3 AND (tv.l3_attendance = 'ABSENT' OR tv.l3_result != 'PENDING'))
    ORDER BY tv.candidate_id, pr.email NULLS LAST;
END;
$$;

-- 6. Trials - Assessment Sheet (Location Based)
DROP FUNCTION IF EXISTS get_trial_assessment_report(p_location TEXT);
CREATE OR REPLACE FUNCTION get_trial_assessment_report(p_location TEXT)
RETURNS TABLE (
    name TEXT,
    mobile TEXT,
    email TEXT,
    state TEXT,
    proficiency TEXT,
    current_level INT,
    l1_attendance TEXT,
    l1_result TEXT,
    l2_attendance TEXT,
    l2_result TEXT,
    final_status TEXT
)
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
    RETURN QUERY
    SELECT DISTINCT ON (tv.candidate_id)
        tv.name::TEXT,
        tv.mobile::TEXT,
        COALESCE(NULLIF(TRIM(tv.email), ''), pr.email)::TEXT as email,
        tv.state::TEXT,
        tv.proficiency::TEXT,
        tv.current_level,
        tv.l1_attendance::TEXT,
        tv.l1_result::TEXT,
        tv.l2_attendance::TEXT,
        tv.l2_result::TEXT,
        tv.final_status::TEXT
    FROM trial_view tv
    LEFT JOIN player_registrations pr 
        ON RIGHT(TRIM(COALESCE(tv.mobile, '')), 10) = RIGHT(TRIM(COALESCE(pr.phone, '')), 10)
        AND LENGTH(TRIM(COALESCE(tv.mobile, ''))) >= 10
        AND LENGTH(TRIM(COALESCE(pr.phone, ''))) >= 10
    WHERE 
        (tv.state ILIKE '%' || p_location || '%') OR
        (tv.email ILIKE '%' || p_location || '%') OR
        (pr.email ILIKE '%' || p_location || '%')
    ORDER BY tv.candidate_id, pr.email NULLS LAST;
END;
$$;
