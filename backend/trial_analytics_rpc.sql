-- ==============================================================================
-- TRIALS ANALYTICS RPC
-- ==============================================================================

CREATE OR REPLACE FUNCTION get_trial_overall_stats()
RETURNS JSON AS $$
DECLARE
    result JSON;
BEGIN
    SELECT json_build_object(
        'campaign_summary', (
            SELECT json_build_object(
                'total_tracked', COUNT(*),
                -- Everyone in trial_candidates is now 'captured' for metrics consistency
                'payments_captured', COUNT(*) FILTER (WHERE LOWER(payment_status) = 'captured'),
                'payments_failed', COUNT(*) FILTER (WHERE LOWER(payment_status) != 'captured' AND payment_status IS NOT NULL)
            )
            FROM trial_candidates
        ),
        'funnel', (
            SELECT json_build_object(
                'l1_pool', COUNT(*),
                'l1_called', COUNT(*) FILTER (WHERE l1_called = true),
                'l1_attended', COUNT(*) FILTER (WHERE l1_attendance = 'ATTENDED'),
                'l1_selected', COUNT(*) FILTER (WHERE l1_result = 'SELECTED'),
                
                'l2_pool', COUNT(*) FILTER (WHERE l1_result = 'SELECTED'),
                'l2_called', COUNT(*) FILTER (WHERE l1_result = 'SELECTED' AND l2_called = true),
                'l2_attended', COUNT(*) FILTER (WHERE l2_attendance = 'ATTENDED'),
                'l2_selected', COUNT(*) FILTER (WHERE l2_result = 'SELECTED'),
                
                'l3_pool', COUNT(*) FILTER (WHERE l2_result = 'SELECTED'),
                'l3_called', COUNT(*) FILTER (WHERE l2_result = 'SELECTED' AND l3_called = true),
                'l3_attended', COUNT(*) FILTER (WHERE l3_attendance = 'ATTENDED'),
                'l3_selected', COUNT(*) FILTER (WHERE l3_result = 'SELECTED'),
                
                'net_finalists', COUNT(*) FILTER (WHERE final_status = 'SELECTED')
            )
            FROM trial_progress
        ),
        'attrition', (
            SELECT json_build_object(
                'rejected', COUNT(*) FILTER (WHERE final_status = 'REJECTED'),
                'absent', (
                    SELECT COUNT(*) FILTER (WHERE l1_attendance = 'ABSENT') + 
                           COUNT(*) FILTER (WHERE l2_attendance = 'ABSENT') + 
                           COUNT(*) FILTER (WHERE l3_attendance = 'ABSENT')
                    FROM trial_progress
                )
            )
            FROM trial_progress
        )
    ) INTO result;

    RETURN result;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;


-- ==============================================================================
-- MAIN WORKFLOW DASHBOARD STATS (SQL REGISTRATIONS)
-- ==============================================================================

CREATE OR REPLACE FUNCTION get_workflow_dashboard_stats()
RETURNS SETOF JSON AS $$
BEGIN
    RETURN QUERY
    SELECT json_build_object(
        'total_registrations', (SELECT COUNT(*) FROM player_registrations),
        'pending_payments', (SELECT COUNT(*) FROM player_registrations WHERE payment_status NOT IN ('captured', 'completed', 'paid', 'success')),
        'completed_payments', (SELECT COUNT(*) FROM player_registrations WHERE payment_status IN ('captured', 'completed', 'paid', 'success')),
        'emails_sent', (SELECT COUNT(*) FROM player_workflow WHERE confirmation_email_sent = true),
        'emails_pending', (SELECT COUNT(*) FROM player_workflow WHERE confirmation_email_sent = false),
        'in_trials_section', (SELECT COUNT(*) FROM player_workflow WHERE workflow_stage = 'trials_section'),
        'trials_allocated', (SELECT COUNT(*) FROM player_workflow WHERE workflow_stage = 'trials_allocated'),
        
        -- Unified Trial counts for display in main dashboard too (optional but helpful)
        'attended', (SELECT COUNT(*) FILTER (WHERE l1_attendance = 'ATTENDED') + 
                           COUNT(*) FILTER (WHERE l2_attendance = 'ATTENDED') + 
                           COUNT(*) FILTER (WHERE l3_attendance = 'ATTENDED') 
                    FROM trial_progress),
        'absent', (SELECT COUNT(*) FILTER (WHERE l1_attendance = 'ABSENT') + 
                          COUNT(*) FILTER (WHERE l2_attendance = 'ABSENT') + 
                          COUNT(*) FILTER (WHERE l3_attendance = 'ABSENT') 
                   FROM trial_progress),
        'selected', (SELECT COUNT(*) FROM trial_progress WHERE final_status = 'SELECTED'),
        'not_selected', (SELECT COUNT(*) FROM trial_progress WHERE final_status = 'REJECTED'),
        'waitlisted', 0
    );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
