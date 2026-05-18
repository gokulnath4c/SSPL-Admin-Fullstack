-- ==============================================================================
-- TRIALS WORKFLOW: REPORTING QUERIES
-- ==============================================================================
-- These optimized analytics queries use the FILTER clause to pivot data 
-- without extensive JOINs. They are perfect for exporting as Excel / CSV files.

-- Note: Adjust the parameter mappings (`filter_city`, etc.) in the CTE at the
-- top of each query to apply date or city filtering. Set them to NULL to ignore.

-- ------------------------------------------------------------------------------
-- REPORT 1: REGISTRATION SUMMARY 
-- (Note: trial_view only holds users imported via 'CAPTURED'. If your view includes
-- all users, this will accurately calculate failures as well).
-- ------------------------------------------------------------------------------
WITH filter_params AS (
    SELECT 
        NULL::VARCHAR AS target_city, 
        '2024-01-01'::TIMESTAMP AS start_date, 
        '2026-12-31'::TIMESTAMP AS end_date
)
SELECT 
    COUNT(*) AS "Total Registries Tracked",
    COUNT(*) FILTER (WHERE LOWER(payment_status) = 'captured') AS "Payments Captured",
    COUNT(*) FILTER (WHERE LOWER(payment_status) != 'captured' AND payment_status IS NOT NULL) AS "Payments Failed/Pending"
FROM trial_view, filter_params
WHERE 
    (target_city IS NULL OR city ILIKE target_city || '%')
    AND imported_at BETWEEN start_date AND end_date;


-- ------------------------------------------------------------------------------
-- REPORT 2: CALL STATUS PER LEVEL
-- ------------------------------------------------------------------------------
WITH filter_params AS (
    SELECT NULL::VARCHAR AS target_city, '2024-01-01'::TIMESTAMP AS start_date, '2026-12-31'::TIMESTAMP AS end_date
)
SELECT 
    -- Level 1
    COUNT(*) AS "L1 Eligible Pool",
    COUNT(*) FILTER (WHERE l1_called = true) AS "L1 Candidates Called",
    COUNT(*) FILTER (WHERE l1_called = false) AS "L1 Not Called",

    -- Level 2 (Eligibility = Selected in Level 1)
    COUNT(*) FILTER (WHERE l1_result = 'SELECTED') AS "L2 Eligible Pool",
    COUNT(*) FILTER (WHERE l1_result = 'SELECTED' AND l2_called = true) AS "L2 Candidates Called",
    COUNT(*) FILTER (WHERE l1_result = 'SELECTED' AND l2_called = false) AS "L2 Not Called",

    -- Level 3 (Eligibility = Selected in Level 2)
    COUNT(*) FILTER (WHERE l2_result = 'SELECTED') AS "L3 Eligible Pool",
    COUNT(*) FILTER (WHERE l2_result = 'SELECTED' AND l3_called = true) AS "L3 Candidates Called",
    COUNT(*) FILTER (WHERE l2_result = 'SELECTED' AND l3_called = false) AS "L3 Not Called"
FROM trial_view, filter_params
WHERE (target_city IS NULL OR city ILIKE target_city || '%') AND imported_at BETWEEN start_date AND end_date;


-- ------------------------------------------------------------------------------
-- REPORT 3: ATTENDANCE TRACKING
-- ------------------------------------------------------------------------------
WITH filter_params AS (
    SELECT NULL::VARCHAR AS target_city, '2024-01-01'::TIMESTAMP AS start_date, '2026-12-31'::TIMESTAMP AS end_date
)
SELECT 
    -- Level 1 
    COUNT(*) FILTER (WHERE l1_called = true) AS "L1 Expected Attendance",
    COUNT(*) FILTER (WHERE l1_attendance = 'ATTENDED') AS "L1 Attended",
    COUNT(*) FILTER (WHERE l1_attendance = 'ABSENT') AS "L1 Absent",
    COUNT(*) FILTER (WHERE l1_attendance = 'PENDING' AND l1_called = true) AS "L1 Awaiting Visit",

    -- Level 2
    COUNT(*) FILTER (WHERE l2_called = true) AS "L2 Expected Attendance",
    COUNT(*) FILTER (WHERE l2_attendance = 'ATTENDED') AS "L2 Attended",
    COUNT(*) FILTER (WHERE l2_attendance = 'ABSENT') AS "L2 Absent",
    COUNT(*) FILTER (WHERE l2_attendance = 'PENDING' AND l2_called = true) AS "L2 Awaiting Visit",

    -- Level 3
    COUNT(*) FILTER (WHERE l3_called = true) AS "L3 Expected Attendance",
    COUNT(*) FILTER (WHERE l3_attendance = 'ATTENDED') AS "L3 Attended",
    COUNT(*) FILTER (WHERE l3_attendance = 'ABSENT') AS "L3 Absent",
    COUNT(*) FILTER (WHERE l3_attendance = 'PENDING' AND l3_called = true) AS "L3 Awaiting Visit"
FROM trial_view, filter_params
WHERE (target_city IS NULL OR city ILIKE target_city || '%') AND imported_at BETWEEN start_date AND end_date;


-- ------------------------------------------------------------------------------
-- REPORT 4: SELECTION FUNNEL (Attended -> Selected -> Rejected)
-- ------------------------------------------------------------------------------
WITH filter_params AS (
    SELECT NULL::VARCHAR AS target_city, '2024-01-01'::TIMESTAMP AS start_date, '2026-12-31'::TIMESTAMP AS end_date
)
SELECT 
    -- Level 1 Funnel
    COUNT(*) FILTER (WHERE l1_attendance = 'ATTENDED') AS "L1 Valid Trials (Attended)",
    COUNT(*) FILTER (WHERE l1_result = 'SELECTED') AS "L1 Passed (Selected)",
    COUNT(*) FILTER (WHERE l1_result = 'REJECTED') AS "L1 Failed (Rejected)",

    -- Level 2 Funnel
    COUNT(*) FILTER (WHERE l2_attendance = 'ATTENDED') AS "L2 Valid Trials (Attended)",
    COUNT(*) FILTER (WHERE l2_result = 'SELECTED') AS "L2 Passed (Selected)",
    COUNT(*) FILTER (WHERE l2_result = 'REJECTED') AS "L2 Failed (Rejected)",

    -- Level 3 Funnel
    COUNT(*) FILTER (WHERE l3_attendance = 'ATTENDED') AS "L3 Valid Trials (Attended)",
    COUNT(*) FILTER (WHERE l3_result = 'SELECTED') AS "L3 Passed (Selected)",
    COUNT(*) FILTER (WHERE l3_result = 'REJECTED') AS "L3 Failed (Rejected)",
    
    -- Net Funnel Outcome
    COUNT(*) FILTER (WHERE final_status = 'SELECTED') AS "Net Campaign Selections"
FROM trial_view, filter_params
WHERE (target_city IS NULL OR city ILIKE target_city || '%') AND imported_at BETWEEN start_date AND end_date;


-- ------------------------------------------------------------------------------
-- REPORT 5: DROP-OFF ANALYSIS
-- ------------------------------------------------------------------------------
WITH filter_params AS (
    SELECT NULL::VARCHAR AS target_city, '2024-01-01'::TIMESTAMP AS start_date, '2026-12-31'::TIMESTAMP AS end_date
)
SELECT 
    -- Level 1 Drop-offs
    COUNT(*) FILTER (WHERE l1_called = false) AS "L1 Outflow: Ghosted / Not Called",
    COUNT(*) FILTER (WHERE l1_called = true AND l1_attendance = 'ABSENT') AS "L1 Outflow: Didn't Show Up",
    COUNT(*) FILTER (WHERE l1_result = 'REJECTED') AS "L1 Outflow: Performance Rejects",

    -- Level 2 Drop-offs (Starts from L1 Selections)
    COUNT(*) FILTER (WHERE l1_result = 'SELECTED' AND l2_called = false) AS "L2 Outflow: Passed L1 but Not Called",
    COUNT(*) FILTER (WHERE l2_called = true AND l2_attendance = 'ABSENT') AS "L2 Outflow: Didn't Show Up",
    COUNT(*) FILTER (WHERE l2_result = 'REJECTED') AS "L2 Outflow: Performance Rejects",

    -- Level 3 Drop-offs (Starts from L2 Selections)
    COUNT(*) FILTER (WHERE l2_result = 'SELECTED' AND l3_called = false) AS "L3 Outflow: Passed L2 but Not Called",
    COUNT(*) FILTER (WHERE l3_called = true AND l3_attendance = 'ABSENT') AS "L3 Outflow: Didn't Show Up",
    COUNT(*) FILTER (WHERE l3_result = 'REJECTED') AS "L3 Outflow: Performance Rejects",

    -- Overall Funnel Health
    COUNT(*) FILTER (WHERE final_status = 'REJECTED') AS "Total Workflow Rejections"
FROM trial_view, filter_params
WHERE (target_city IS NULL OR city ILIKE target_city || '%') AND imported_at BETWEEN start_date AND end_date;
