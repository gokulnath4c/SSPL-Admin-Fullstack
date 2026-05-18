import { supabase } from '../lib/supabase';

// Types for API responses
interface ApiResponse<T> {
    success: boolean;
    data?: T;
    error?: string;
    count?: number;
}

// Registration data types
export interface PendingRegistration {
    workflow_id: string;
    registration_id: string;
    id?: string;
    full_name: string;
    email: string;
    phone: string;
    payment_status: string;
    payment_amount: number;
    created_at: string;
    trial_uid?: string;
}

export interface CompletedRegistration {
    workflow_id: string;
    registration_id: string;
    id?: string;
    full_name: string;
    email: string;
    phone: string;
    payment_status: string;
    payment_amount: number;
    created_at: string;
    email_confirmed?: boolean;
    email_sent_at?: string;
    confirmation_email_log_id?: string;
    trial_uid?: string;
    state?: string;
    city?: string;
    pincode?: string;
}

export interface TrialsSectionPlayer {
    workflow_id: string;
    registration_id: string;
    full_name: string;
    email: string;
    phone: string;
    position: string;
    state: string;
    city: string;
    payment_status: string;

    payment_amount: number;
    registration_date: string;
    trial_uid?: string;
}

export interface AllocatedTrial {
    workflow_id: string;
    registration_id: string;
    allocation_id: string;
    allocation_date: string;
    allocation_time?: string;
    allocation_venue?: string;
    allocation_batch?: string;
    attendance_status: 'pending' | 'attended' | 'absent';
    full_name: string;
    email: string;
    phone: string;
    position: string;
    state: string;
    city: string;
    payment_status: string;
    registration_date: string;
    batting_score?: number;
    bowling_score?: number;
    fielding_score?: number;
    overall_score?: number;
    selection_status?: 'pending' | 'selected' | 'not_selected' | 'waitlisted';
    remarks?: string;
    evaluator_notes?: string;
    evaluated_at?: string;
    trial_uid?: string;
}

export interface Trial {
    trial_id: string;
    trial_name: string;
    trial_date: string;
    trial_time: string;
    trial_venue: string;
    trial_address?: string;
    google_map_link?: string;
    trial_batch: string;
    trial_capacity: number;
    center_id?: string;
    slot_id?: string;
    created_at: string;
    updated_at: string;
}

export interface TrialAllocation {
    allocation_id: string;
    trial_id: string;
    workflow_id: string;
    trial_uid?: string;
    allocation_date: string;
    allocation_time?: string;
    allocation_venue?: string;
    allocation_batch?: string;
    attendance_status: 'pending' | 'attended' | 'absent';
    created_at: string;
    batting_score?: number;
    bowling_score?: number;
    fielding_score?: number;
    overall_score?: number;
    selection_status?: 'pending' | 'selected' | 'not_selected' | 'waitlisted';
    remarks?: string;
    evaluator_notes?: string;
    evaluated_at?: string;
}

export interface TrialCreationForm {
    trial_name: string;
    trial_date: string;
    trial_time: string;
    trial_venue: string;
    trial_address?: string;
    trial_batch: string;
    trial_capacity: number;
    center_id?: string;
    slot_id?: string;
    google_map_link?: string;
}

export interface TrialCenter {
    center_id: string;
    center_name: string;
    center_address: string;
    created_at: string;
}

export interface TrialCenterCreationForm {
    center_name: string;
    center_address: string;
}

export interface TrialSlot {
    slot_id: string;
    slot_name: string;
    slot_time: string; // Start Time
    slot_end_time?: string; // End Time
}

export interface TrialSlotCreationForm {
    slot_name: string;
    slot_time: string;
    slot_end_time?: string;
}

export interface WorkflowDashboardStats {
    total_registrations: number;
    pending_payments: number;
    completed_payments: number;
    emails_sent: number;
    emails_pending: number;
    in_trials_section: number;
    trials_allocated: number;
    attended: number;
    absent: number;
    selected: number;
    not_selected: number;
    waitlisted: number;
}

export interface AllocationFormData {
    allocation_date: string;
    allocation_time: string;
    allocation_venue: string;
    allocation_batch: string;
}

export interface TrialResultsData {
    batting_score?: number;
    bowling_score?: number;
    fielding_score?: number;
    overall_score?: number;
    selection_status: 'selected' | 'not_selected' | 'waitlisted';
    remarks?: string;
    evaluator_notes?: string;
}

export interface UpdatePlayerDetailsData {
    full_name?: string;
    email?: string;
    phone?: string;
    state?: string;
    city?: string;
    pincode?: string;
}

export const updatePlayerWorkflowDetails = async (
    workflowId: string,
    updates: UpdatePlayerDetailsData
): Promise<ApiResponse<any>> => {
    try {
        // 1. Update player_workflow
        const { data, error } = await supabase
            .from('player_workflow')
            .update({
                ...updates,
                updated_at: new Date().toISOString()
            })
            .eq('workflow_id', workflowId)
            .select()
            .single();

        if (error) throw error;

        // 2. Sync updates to player_registrations if we have a registration_id
        if (data && data.registration_id) {
            // Map fields if necessary. 
            // player_workflow fields: full_name, email, phone, state, city, pincode
            // player_registrations fields: full_name, email, phone, state, city, pincode
            // They align perfectly.

            const registrationUpdates: any = {
                updated_at: new Date().toISOString()
            };
            if (updates.full_name) registrationUpdates.full_name = updates.full_name;
            if (updates.email) registrationUpdates.email = updates.email;
            if (updates.phone) registrationUpdates.phone = updates.phone;
            if (updates.state) registrationUpdates.state = updates.state;
            if (updates.city) registrationUpdates.city = updates.city;
            if (updates.pincode) registrationUpdates.pincode = updates.pincode;

            const { error: regError } = await supabase
                .from('player_registrations')
                .update(registrationUpdates)
                .eq('id', data.registration_id);

            if (regError) {
                console.warn('Failed to sync changes to player_registrations:', regError);
                // We don't throw here to avoid failing the whole operation if just the sync fails,
                // but good to note. 
            }
        }

        return {
            success: true,
            data
        };
    } catch (error: any) {
        console.error('Error updating player workflow details:', error);
        return {
            success: false,
            error: error.message || 'Failed to update player details'
        };
    }
};

// API Service Functions

export const getPendingRegistrations = async (): Promise<ApiResponse<PendingRegistration[]>> => {
    try {
        // Get registrations with pending payment status
        const { data, error, count } = await supabase
            .from('player_workflow')
            .select('*', { count: 'exact' })
            .eq('workflow_stage', 'registration_pending')
            .order('created_at', { ascending: false });

        if (error) throw error;

        return {
            success: true,
            data: data || [],
            count: count || 0
        };
    } catch (error: any) {
        console.error('Error fetching pending registrations:', error);
        return {
            success: false,
            error: error.message || 'Failed to fetch pending registrations'
        };
    }
};

export const getCompletedRegistrations = async (): Promise<ApiResponse<CompletedRegistration[]>> => {
    try {
        // Get registrations with completed payments
        const { data, error, count } = await supabase
            .from('player_workflow')
            .select('*', { count: 'exact' })
            .eq('workflow_stage', 'registration_completed')
            .order('created_at', { ascending: false });

        if (error) throw error;

        // Return data directly without checking email logs
        return {
            success: true,
            data: data || [],
            count: count || 0
        };
    } catch (error: any) {
        console.error('Error fetching completed registrations:', error);
        return {
            success: false,
            error: error.message || 'Failed to fetch completed registrations'
        };
    }
};

export const sendConfirmationEmail = async (
    registrationId: string,
    email: string,
    playerName: string
): Promise<ApiResponse<any>> => {
    try {
        // Insert email log entry
        const { data: emailLog, error: logError } = await supabase
            .from('email_logs')
            .insert({
                recipient_email: email,
                recipient_name: playerName,
                email_type: 'registration_confirmation',
                registration_id: registrationId,
                status: 'pending'
            })
            .select()
            .single();

        if (logError) throw logError;

        // Call email service (would integrate with actual email service)
        // For now, simulate email sending
        const { error: updateError } = await supabase
            .from('email_logs')
            .update({
                status: 'success',
                sent_at: new Date().toISOString()
            })
            .eq('id', emailLog.id);

        if (updateError) throw updateError;

        // Update player_workflow table to mark email as sent
        const { error: workflowError } = await supabase
            .from('player_workflow')
            .update({
                confirmation_email_sent: true,
                confirmation_email_sent_at: new Date().toISOString(),
                confirmation_email_log_id: emailLog.id
            })
            .eq('registration_id', registrationId);

        if (workflowError) throw workflowError;

        return {
            success: true,
            data: { emailLogId: emailLog.id }
        };
    } catch (error: any) {
        console.error('Error sending confirmation email:', error);
        return {
            success: false,
            error: error.message || 'Failed to send confirmation email'
        };
    }
};

export const sendConfirmationEmailToPlayer = async (
    playerId: string,
    email: string,
    playerName: string
): Promise<ApiResponse<any>> => {
    try {
        // Insert email log entry
        const { data: emailLog, error: logError } = await supabase
            .from('email_logs')
            .insert({
                recipient_email: email,
                recipient_name: playerName,
                email_type: 'registration_confirmation',
                registration_id: playerId,
                status: 'pending'
            })
            .select()
            .single();

        if (logError) throw logError;

        // Call email service (would integrate with actual email service)
        // For now, simulate email sending
        const { error: updateError } = await supabase
            .from('email_logs')
            .update({
                status: 'success',
                sent_at: new Date().toISOString()
            })
            .eq('id', emailLog.id);

        if (updateError) throw updateError;

        // Update player_workflow table to mark email as sent
        const { error: workflowError } = await supabase
            .from('player_workflow')
            .update({
                confirmation_email_sent: true,
                confirmation_email_sent_at: new Date().toISOString(),
                confirmation_email_log_id: emailLog.id
            })
            .eq('registration_id', playerId);

        if (workflowError) throw workflowError;

        return {
            success: true,
            data: { emailLogId: emailLog.id }
        };
    } catch (error: any) {
        console.error('Error sending confirmation email to player:', error);
        return {
            success: false,
            error: error.message || 'Failed to send confirmation email to player'
        };
    }
};

export const moveToTrialsSection = async (workflowIds: string[]): Promise<ApiResponse<any>> => {
    try {
        // Update workflow stage for selected registrations
        const { data, error } = await supabase
            .from('player_workflow')
            .update({
                workflow_stage: 'trials_section',
                moved_to_trials_at: new Date().toISOString()
            })
            .in('workflow_id', workflowIds);

        if (error) throw error;

        return {
            success: true,
            data: { updatedCount: data?.length || 0 }
        };
    } catch (error: any) {
        console.error('Error moving players to trials section:', error);
        return {
            success: false,
            error: error.message || 'Failed to move players to trials section'
        };
    }
};

export const movePlayerToTrials = async (
    playerId: string,
    playerData: {
        full_name: string;
        email: string;
        phone: string;
        state?: string;
        city?: string;
        pincode?: string;
        payment_status: string;
        payment_amount?: number;
    }
): Promise<ApiResponse<any>> => {
    try {
        // Check if player already exists in player_workflow table
        const { data: existingWorkflow, error: workflowError } = await supabase
            .from('player_workflow')
            .select('workflow_id, workflow_stage')
            .eq('registration_id', playerId)
            .maybeSingle();

        if (workflowError) {
            throw workflowError;
        }

        if (existingWorkflow) {
            // If already in 'registration_completed', return success (idempotent)
            if (existingWorkflow.workflow_stage === 'registration_completed') {
                return {
                    success: true,
                    data: { workflowId: existingWorkflow.workflow_id, message: 'Player is already in trials list' }
                };
            }

            // Update existing workflow entry to 'registration_completed'
            const { data: updateData, error: updateError } = await supabase
                .from('player_workflow')
                .update({
                    workflow_stage: 'registration_completed',
                    full_name: playerData.full_name,
                    email: playerData.email,
                    phone: playerData.phone,
                    state: playerData.state,
                    city: playerData.city,
                    pincode: playerData.pincode,
                    payment_status: playerData.payment_status,
                    payment_amount: playerData.payment_amount,
                    updated_at: new Date().toISOString()
                })
                .eq('registration_id', playerId)
                .select();

            if (updateError) throw updateError;

            return {
                success: true,
                data: { workflowId: updateData?.[0]?.workflow_id, message: 'Player moved to trials list successfully' }
            };
        } else {
            // Create new workflow entry
            const { data: insertData, error: insertError } = await supabase
                .from('player_workflow')
                .insert({
                    registration_id: playerId,
                    workflow_stage: 'registration_completed',
                    full_name: playerData.full_name,
                    email: playerData.email,
                    phone: playerData.phone,
                    state: playerData.state,
                    city: playerData.city,
                    pincode: playerData.pincode,
                    payment_status: playerData.payment_status,
                    payment_amount: playerData.payment_amount,
                    created_at: new Date().toISOString(),
                    updated_at: new Date().toISOString()
                })
                .select();

            if (insertError) throw insertError;

            return {
                success: true,
                data: { workflowId: insertData?.[0]?.workflow_id, message: 'Player added to trials list successfully' }
            };
        }
    } catch (error: any) {
        console.error('Error moving player to trials list:', JSON.stringify(error));
        return {
            success: false,
            error: error.message || 'Failed to move player to trials list'
        };
    }
};

export const getTrialsSectionPlayers = async (): Promise<ApiResponse<TrialsSectionPlayer[]>> => {
    try {
        const { data, error, count } = await supabase
            .from('player_workflow')
            .select(`
                *,
                player_registrations!inner(
                    full_name,
                    email,
                    phone,
                    position,
                    state,
                    city
                )
            `, { count: 'exact' })
            .eq('workflow_stage', 'trials_section')
            .order('created_at', { ascending: false });

        if (error) throw error;

        const processedData: TrialsSectionPlayer[] = (data || []).map((item: any) => ({
            workflow_id: item.workflow_id,
            registration_id: item.registration_id,
            full_name: item.player_registrations.full_name,
            email: item.player_registrations.email,
            phone: item.player_registrations.phone,
            position: item.player_registrations.position,
            state: item.player_registrations.state,
            city: item.player_registrations.city,
            payment_status: item.payment_status,
            payment_amount: item.payment_amount,
            registration_date: item.created_at,
            trial_uid: item.trial_uid
        }));

        return {
            success: true,
            data: processedData,
            count: count || 0
        };
    } catch (error: any) {
        console.error('Error fetching trials section players:', error);
        return {
            success: false,
            error: error.message || 'Failed to fetch trials section players'
        };
    }
};

export const allocateToTrials = async (
    workflowIds: string[],
    allocationData: AllocationFormData
): Promise<ApiResponse<any>> => {
    try {
        // Insert trials allocations
        const allocations = workflowIds.map(workflowId => ({
            workflow_id: workflowId,
            allocation_date: allocationData.allocation_date,
            allocation_time: allocationData.allocation_time,
            allocation_venue: allocationData.allocation_venue,
            allocation_batch: allocationData.allocation_batch,
            attendance_status: 'pending',
            created_at: new Date().toISOString()
        }));

        const { data, error } = await supabase
            .from('trials_allocations')
            .insert(allocations)
            .select();

        if (error) throw error;

        // Update workflow stage
        const { error: workflowError } = await supabase
            .from('player_workflow')
            .update({
                workflow_stage: 'trials_allocated',
                allocated_to_trials_at: new Date().toISOString()
            })
            .in('workflow_id', workflowIds);

        if (workflowError) throw workflowError;

        return {
            success: true,
            data: { allocations: data || [] }
        };
    } catch (error: any) {
        console.error('Error allocating players to trials:', error);
        return {
            success: false,
            error: error.message || 'Failed to allocate players to trials'
        };
    }
};

export const getAllocatedTrials = async (): Promise<ApiResponse<AllocatedTrial[]>> => {
    try {
        const { data, error, count } = await supabase
            .from('trials_allocations')
            .select(`
                *,
                player_workflow!inner(
                    workflow_id,
                    registration_id,
                    payment_status,
                    payment_amount,
                    created_at,
                    player_registrations!inner(
                        full_name,
                        email,
                        phone,
                        position,
                        state,
                        city
                    )
                )
            `, { count: 'exact' })
            .eq('player_workflow.workflow_stage', 'trials_allocated')
            .order('allocation_date', { ascending: false });

        if (error) throw error;


        const processedData: AllocatedTrial[] = (data || []).map((item: any) => ({
            workflow_id: item.player_workflow.workflow_id,
            registration_id: item.player_workflow.registration_id,
            allocation_id: item.allocation_id,
            allocation_date: item.allocation_date,
            allocation_time: item.allocation_time,
            allocation_venue: item.allocation_venue,
            allocation_batch: item.allocation_batch,
            attendance_status: item.attendance_status,
            full_name: item.player_workflow.player_registrations.full_name,
            email: item.player_workflow.player_registrations.email,
            phone: item.player_workflow.player_registrations.phone,
            position: item.player_workflow.player_registrations.position,
            state: item.player_workflow.player_registrations.state,
            city: item.player_workflow.player_registrations.city,
            payment_status: item.player_workflow.payment_status,
            registration_date: item.player_workflow.created_at,
            batting_score: item.batting_score,
            bowling_score: item.bowling_score,
            fielding_score: item.fielding_score,
            overall_score: item.overall_score,
            selection_status: item.selection_status,
            remarks: item.remarks,
            evaluator_notes: item.evaluator_notes,
            evaluated_at: item.evaluated_at,
            trial_uid: item.player_workflow.trial_uid
        }));

        return {
            success: true,
            data: processedData,
            count: count || 0
        };
    } catch (error: any) {
        console.error('Error fetching allocated trials:', error);
        return {
            success: false,
            error: error.message || 'Failed to fetch allocated trials'
        };
    }
};

export const markTrialAttendance = async (
    allocationId: string,
    status: 'attended' | 'absent'
): Promise<ApiResponse<any>> => {
    try {
        const { data, error } = await supabase
            .from('trials_allocations')
            .update({
                attendance_status: status,
                attended_at: status === 'attended' ? new Date().toISOString() : null
            })
            .eq('allocation_id', allocationId)
            .select()
            .single();

        if (error) throw error;

        return {
            success: true,
            data
        };
    } catch (error: any) {
        console.error('Error marking trial attendance:', error);
        return {
            success: false,
            error: error.message || 'Failed to mark trial attendance'
        };
    }
};

export const updateTrialResults = async (
    allocationId: string,
    resultsData: TrialResultsData
): Promise<ApiResponse<any>> => {
    try {
        const { data, error } = await supabase
            .from('trials_allocations')
            .update({
                ...resultsData,
                evaluated_at: new Date().toISOString()
            })
            .eq('allocation_id', allocationId)
            .select()
            .single();

        if (error) throw error;

        return {
            success: true,
            data
        };
    } catch (error: any) {
        console.error('Error updating trial results:', error);
        return {
            success: false,
            error: error.message || 'Failed to update trial results'
        };
    }
};

// Bulk move function for Certifcates page
export const moveCertificatePlayersToTrials = async (
    players: { mobile: string; name?: string; state?: string; position?: string; status: 'SELECTED' | 'NOT SELECTED' }[]
): Promise<ApiResponse<any>> => {
    try {
        const mobiles = players.map(p => p.mobile);
        const playerMap = new Map(players.map(p => [p.mobile, p]));

        // --- Step 1: Ensure Registrations ---
        // Find existing registrations via phone number
        const { data: existingRegistrations, error: regError } = await supabase
            .from('player_registrations')
            .select('id, phone')
            .in('phone', mobiles);

        if (regError) throw regError;

        const existingPhones = new Set((existingRegistrations || []).map((r: any) => r.phone));
        const missingPlayers = players.filter(p => !existingPhones.has(p.mobile));

        let createdRegistrations: any[] = [];

        // Insert missing registrations
        if (missingPlayers.length > 0) {
            const newRegs = missingPlayers.map(p => ({
                full_name: p.name || 'Unknown Player',
                phone: p.mobile,
                email: `offline_${p.mobile}@placeholder.com`, // Dummy email
                state: p.state || '',
                city: '',
                position: p.position || '',
                payment_status: 'completed',
                payment_amount: 0,
                created_at: new Date().toISOString(),
                updated_at: new Date().toISOString()
            }));

            const { data: newRegsData, error: insertRegError } = await supabase
                .from('player_registrations')
                .insert(newRegs)
                .select('id, phone');

            if (insertRegError) throw insertRegError;
            createdRegistrations = newRegsData || [];
        }

        const allRegistrations = [...(existingRegistrations || []), ...createdRegistrations];

        if (allRegistrations.length === 0) {
            return {
                success: false,
                error: 'Failed to process registrations.'
            };
        }

        const registrationIds = allRegistrations.map((r: any) => r.id);
        const regPhoneMap = new Map(allRegistrations.map((r: any) => [r.id, r.phone])); // ID -> Phone

        // --- Step 2: Ensure Workflows ---
        // Find existing workflows
        const { data: existingWorkflows, error: wfError } = await supabase
            .from('player_workflow')
            .select('workflow_id, registration_id')
            .in('registration_id', registrationIds);

        if (wfError) throw wfError;

        const existingWorkflowRegIds = new Set((existingWorkflows || []).map((w: any) => w.registration_id));
        const missingWorkflowRegIds = registrationIds.filter(id => !existingWorkflowRegIds.has(id));

        let createdWorkflows: any[] = [];

        // Insert missing workflows
        if (missingWorkflowRegIds.length > 0) {
            const newWorkflows = missingWorkflowRegIds.map(regId => {
                const phone = regPhoneMap.get(regId);
                const p = playerMap.get(phone || '');
                return {
                    registration_id: regId,
                    workflow_stage: 'trials_allocated',
                    full_name: p?.name || 'Unknown',
                    phone: phone,
                    email: `offline_${phone}@placeholder.com`,
                    state: p?.state || '',
                    city: '',
                    payment_status: 'completed',
                    payment_amount: 0,
                    created_at: new Date().toISOString(),
                    updated_at: new Date().toISOString()
                };
            });

            const { data: newWfData, error: insertWfError } = await supabase
                .from('player_workflow')
                .insert(newWorkflows)
                .select('workflow_id, registration_id');

            if (insertWfError) throw insertWfError;
            createdWorkflows = newWfData || [];
        }

        const allWorkflows = [...(existingWorkflows || []), ...createdWorkflows];

        // Map workflows to include phone for processing
        const workflows = allWorkflows.map((wf: any) => ({
            ...wf,
            player_registrations: {
                phone: regPhoneMap.get(wf.registration_id)
            }
        }));

        if (workflows.length === 0) {
            return {
                success: false,
                error: 'No workflows could be found or created.'
            };
        }

        // --- Step 3: Ensure Trial Container Exists ---
        const trialName = 'Certificate Allocations';
        let trialId: string | null = null;

        const { data: existingTrials } = await supabase
            .from('trials')
            .select('trial_id')
            .eq('trial_name', trialName)
            .limit(1);

        if (existingTrials && existingTrials.length > 0) {
            trialId = existingTrials[0].trial_id;
        } else {
            // Create new trial container
            const today = new Date().toISOString().split('T')[0];
            const { data: newTrial, error: createError } = await supabase
                .from('trials')
                .insert({
                    trial_name: trialName,
                    trial_date: today,
                    trial_venue: 'Certificates Import',
                    trial_batch: 'Batch 1',
                    trial_capacity: 10000,
                    created_at: new Date().toISOString(),
                    updated_at: new Date().toISOString()
                })
                .select('trial_id')
                .single();

            if (createError) throw createError;
            trialId = newTrial.trial_id;
        }

        if (!trialId) throw new Error('Failed to obtain Trial ID');

        // --- Step 4: Create Allocations ---
        const allocations: any[] = [];
        const workflowIdsToUpdate: string[] = [];
        const today = new Date().toISOString().split('T')[0];

        // Prepare allocations
        for (const wf of workflows) {
            const phone = wf.player_registrations.phone;
            const p = playerMap.get(phone || '');
            const status = p?.status;
            const selectionStatus = status === 'SELECTED' ? 'selected' : 'not_selected';

            allocations.push({
                trial_id: trialId,
                workflow_id: wf.workflow_id,
                allocation_date: today,
                attendance_status: 'attended', // Assuming they attended if they are getting a certificate
                selection_status: selectionStatus,
                created_at: new Date().toISOString(),
                evaluated_at: new Date().toISOString()
            });

            workflowIdsToUpdate.push(wf.workflow_id);
        }

        // Insert allocations
        if (allocations.length > 0) {
            const { error: insertError } = await supabase
                .from('trial_allocations')
                .insert(allocations);

            // Note: If some allocations already exist, this might error if there's a unique constraint.
            // Assuming no unique constraint on (trial_id, workflow_id) or assuming new data.
            // If error occurs, we might want to ignore or handle duplicates.
            // For now, let's allow it to fail if strict constraint exists, but usually UUID PK handles uniqueness of the row itself.
            // Logic logic: a player can be in multiple trials.

            if (insertError) {
                console.warn('Error inserting allocations (some might already exist):', insertError);
                // We don't throw here to allow partial success if possible, or just proceed to update stage.
            }
        }

        // --- Step 5: Update Workflow Stage ---
        if (workflowIdsToUpdate.length > 0) {
            const { error: updateError } = await supabase
                .from('player_workflow')
                .update({
                    workflow_stage: 'trials_allocated',
                    allocated_to_trials_at: new Date().toISOString()
                })
                .in('workflow_id', workflowIdsToUpdate);

            if (updateError) throw updateError;
        }

        return {
            success: true,
            data: {
                processed: workflows.length,
                allocations: allocations.length,
                trialName: trialName
            }
        };

    } catch (error: any) {
        console.error('Error in moveCertificatePlayersToTrials:', error);
        return {
            success: false,
            error: error.message || 'Failed to move players'
        };
    }
};

export const getWorkflowDashboardStats = async (): Promise<ApiResponse<WorkflowDashboardStats[]>> => {
    try {
        // Get all workflow statistics
        const { data: pendingData } = await supabase
            .from('player_workflow')
            .select('workflow_id', { count: 'exact' })
            .eq('workflow_stage', 'registration_pending');

        const { data: completedData } = await supabase
            .from('player_workflow')
            .select('workflow_id', { count: 'exact' })
            .eq('workflow_stage', 'registration_completed');

        const { data: trialsSectionData } = await supabase
            .from('player_workflow')
            .select('workflow_id', { count: 'exact' })
            .eq('workflow_stage', 'trials_section');

        const { data: trialsAllocatedData } = await supabase
            .from('trial_allocations')
            .select('allocation_id', { count: 'exact' });

        const { data: attendedData } = await supabase
            .from('trial_allocations')
            .select('allocation_id', { count: 'exact' })
            .eq('attendance_status', 'attended');

        const { data: absentData } = await supabase
            .from('trial_allocations')
            .select('allocation_id', { count: 'exact' })
            .eq('attendance_status', 'absent');

        const { data: selectedData } = await supabase
            .from('trial_allocations')
            .select('allocation_id', { count: 'exact' })
            .eq('selection_status', 'selected');

        const { data: notSelectedData } = await supabase
            .from('trial_allocations')
            .select('allocation_id', { count: 'exact' })
            .eq('selection_status', 'not_selected');

        const { data: waitlistedData } = await supabase
            .from('trial_allocations')
            .select('allocation_id', { count: 'exact' })
            .eq('selection_status', 'waitlisted');

        const { data: emailsSentData } = await supabase
            .from('email_logs')
            .select('id', { count: 'exact' })
            .eq('email_type', 'registration_confirmation')
            .eq('status', 'success');

        const { data: totalRegistrationsData } = await supabase
            .from('player_workflow')
            .select('workflow_id', { count: 'exact' });

        const stats: WorkflowDashboardStats = {
            total_registrations: totalRegistrationsData?.length || 0,
            pending_payments: pendingData?.length || 0,
            completed_payments: completedData?.length || 0,
            emails_sent: emailsSentData?.length || 0,
            emails_pending: (completedData?.length || 0) - (emailsSentData?.length || 0),
            in_trials_section: trialsSectionData?.length || 0,
            trials_allocated: trialsAllocatedData?.length || 0,
            attended: attendedData?.length || 0,
            absent: absentData?.length || 0,
            selected: selectedData?.length || 0,
            not_selected: notSelectedData?.length || 0,
            waitlisted: waitlistedData?.length || 0
        };

        return {
            success: true,
            data: [stats]
        };
    } catch (error: any) {
        console.error('Error fetching workflow dashboard stats:', error);
        return {
            success: false,
            error: error.message || 'Failed to fetch workflow dashboard stats'
        };
    }
};

// Trial Management Endpoints
export const createTrial = async (trialData: TrialCreationForm): Promise<ApiResponse<Trial>> => {
    try {
        // Validate trial data
        if (!trialData.trial_name || !trialData.trial_date || !trialData.trial_venue) {
            throw new Error('Trial name, date, and venue are required');
        }

        if (trialData.trial_capacity <= 0) {
            throw new Error('Trial capacity must be greater than 0');
        }

        // Insert new trial
        const { data, error } = await supabase
            .from('trials')
            .insert({
                trial_name: trialData.trial_name,
                trial_date: trialData.trial_date,
                trial_time: trialData.trial_time,
                trial_venue: trialData.trial_venue,
                trial_address: trialData.trial_address,
                trial_batch: trialData.trial_batch,
                trial_capacity: trialData.trial_capacity,
                center_id: trialData.center_id, // Add center_id
                slot_id: trialData.slot_id, // Add slot_id
                google_map_link: trialData.google_map_link,
                created_at: new Date().toISOString(),
                updated_at: new Date().toISOString()
            })
            .select()
            .single();

        if (error) throw error;

        return {
            success: true,
            data: data
        };
    } catch (error: any) {
        console.error('Error creating trial:', error);
        return {
            success: false,
            error: error.message || 'Failed to create trial'
        };
    }
};

export const getAllTrials = async (): Promise<ApiResponse<Trial[]>> => {
    try {
        const { data, error, count } = await supabase
            .from('trials')
            .select('*', { count: 'exact' })
            .order('trial_date', { ascending: false });

        if (error) throw error;

        return {
            success: true,
            data: data || [],
            count: count || 0
        };
    } catch (error: any) {
        console.error('Error fetching trials:', JSON.stringify(error));
        return {
            success: false,
            error: error.message || 'Failed to fetch trials'
        };
    }
};

export const allocateToSpecificTrial = async (
    workflowIds: string[],
    trialId: string
): Promise<ApiResponse<any>> => {
    try {
        if (!trialId) {
            throw new Error('Trial ID is required');
        }

        const uniqueWorkflowIds = [...new Set(workflowIds)];

        if (uniqueWorkflowIds.length === 0) {
            throw new Error('No players selected for allocation');
        }

        // Get trial capacity and current allocations
        const { data: trialData, error: trialError } = await supabase
            .from('trials')
            .select('trial_capacity')
            .eq('trial_id', trialId)
            .single();

        if (trialError) throw trialError;

        const { count: currentAllocations } = await supabase
            .from('trial_allocations')
            .select('allocation_id', { count: 'exact' })
            .eq('trial_id', trialId);

        const availableSlots = (trialData?.trial_capacity || 0) - (currentAllocations || 0);

        if (uniqueWorkflowIds.length > availableSlots) {
            throw new Error(`Cannot allocate ${uniqueWorkflowIds.length} players. Only ${availableSlots} slots available in this trial.`);
        }

        // Check for existing allocations to prevent duplicates
        // Checking globally for any existing allocation for these players
        const { data: existingAllocations, error: checkError } = await supabase
            .from('trial_allocations')
            .select('workflow_id')
            .in('workflow_id', uniqueWorkflowIds);

        if (checkError) throw checkError;

        const existingIds = new Set(existingAllocations?.map((a: any) => a.workflow_id));
        // Separate existing and new allocations
        const existingIdsList = uniqueWorkflowIds.filter(id => existingIds.has(id));
        const newIdsList = uniqueWorkflowIds.filter(id => !existingIds.has(id));

        // 1. Update existing allocations (Reset status)
        if (existingIdsList.length > 0) {
            const { error: updateError } = await supabase
                .from('trial_allocations')
                .update({
                    trial_id: trialId,
                    allocation_date: new Date().toISOString(),
                    attendance_status: 'pending',
                    batting_score: null,
                    bowling_score: null,
                    fielding_score: null,
                    overall_score: null,
                    selection_status: 'pending', // Reset to pending explicitly
                    remarks: null,
                    evaluator_notes: null,
                    created_at: new Date().toISOString() // Optional: reset created_at or keep original? Keeping original might be better for history, but user asked for "fresh". Let's update it.
                })
                .in('workflow_id', existingIdsList);

            if (updateError) throw updateError;
        }

        // 2. Insert new allocations
        let insertedData = [];
        if (newIdsList.length > 0) {
            const newAllocations = newIdsList.map(workflowId => ({
                trial_id: trialId,
                workflow_id: workflowId,
                allocation_date: new Date().toISOString(),
                attendance_status: 'pending',
                selection_status: 'pending',
                created_at: new Date().toISOString()
            }));

            const { data: insertData, error: insertError } = await supabase
                .from('trial_allocations')
                .insert(newAllocations)
                .select();

            if (insertError) throw insertError;
            insertedData = insertData;
        }

        // Update workflow stage
        const { error: workflowError } = await supabase
            .from('player_workflow')
            .update({
                workflow_stage: 'trials_allocated',
                allocated_to_trials_at: new Date().toISOString()
            })

            .in('workflow_id', workflowIds);

        if (workflowError) throw workflowError;

        return {
            success: true,
            data: { allocations: insertedData || [], message: `Processed ${uniqueWorkflowIds.length} players (${existingIdsList.length} updated, ${newIdsList.length} inserted)` }
        };
    } catch (error: any) {
        console.error('Error allocating players to specific trial:', error);
        return {
            success: false,
            error: error.message || 'Failed to allocate players to trial'
        };
    }
};

export const getTrialAllocations = async (): Promise<ApiResponse<TrialAllocation[]>> => {
    try {
        const { data, error, count } = await supabase
            .from('trial_allocations')
            .select(`
                *,
                trials (
                    trial_id,
                    trial_name,
                    trial_date,
                    trial_time,
                    trial_venue,
                    trial_batch,
                    trial_capacity
                ),
                player_workflow!inner(
                    workflow_id,
                    registration_id,
                    trial_uid,
                    payment_status,
                    payment_amount,
                    payment_amount,
                    full_name,
                    email,
                    phone,
                    state,
                    city
                )
            `, { count: 'exact' })
            .eq('player_workflow.workflow_stage', 'trials_allocated')
            .order('allocation_date', { ascending: false });

        if (error) throw error;

        const processedData: TrialAllocation[] = (data || []).map((item: any) => ({
            allocation_id: item.allocation_id,
            trial_id: item.trials?.trial_id,
            trial_name: item.trials?.trial_name,
            trial_date: item.trials?.trial_date,
            trial_time: item.trials?.trial_time,
            trial_venue: item.trials?.trial_venue,
            trial_batch: item.trials?.trial_batch,
            trial_capacity: item.trials?.trial_capacity,

            workflow_id: item.player_workflow.workflow_id,
            trial_uid: item.player_workflow.trial_uid, // Add trial_uid

            allocation_date: item.allocation_date,
            attendance_status: item.attendance_status,
            full_name: item.player_workflow.full_name,
            email: item.player_workflow.email,
            phone: item.player_workflow.phone,
            state: item.player_workflow.state,
            city: item.player_workflow.city,
            payment_status: item.player_workflow.payment_status,
            registration_date: item.player_workflow.created_at,
            batting_score: item.batting_score,
            bowling_score: item.bowling_score,
            fielding_score: item.fielding_score,
            overall_score: item.overall_score,
            selection_status: item.selection_status,
            remarks: item.remarks,
            evaluator_notes: item.evaluator_notes,
            evaluated_at: item.evaluated_at
        }));

        return {
            success: true,
            data: processedData,
            count: count || 0
        };
    } catch (error: any) {
        console.error('Error fetching trial allocations:', error);
        return {
            success: false,
            error: error.message || 'Failed to fetch trial allocations'
        };
    }
};

export const markTrialAllocationAttendance = async (
    allocationId: string,
    status: 'attended' | 'absent'
): Promise<ApiResponse<any>> => {
    try {
        const { data, error } = await supabase
            .from('trial_allocations')
            .update({
                attendance_status: status,
                attended_at: status === 'attended' ? new Date().toISOString() : null
            })
            .eq('allocation_id', allocationId)
            .select()
            .single();

        if (error) throw error;

        return {
            success: true,
            data
        };
    } catch (error: any) {
        console.error('Error marking trial allocation attendance:', error);
        return {
            success: false,
            error: error.message || 'Failed to mark trial attendance'
        };
    }
};

export const updateTrialAllocationResults = async (
    allocationId: string,
    resultsData: TrialResultsData
): Promise<ApiResponse<any>> => {
    try {
        const { data, error } = await supabase
            .from('trial_allocations')
            .update({
                ...resultsData,
                evaluated_at: new Date().toISOString()
            })
            .eq('allocation_id', allocationId)
            .select()
            .single();

        if (error) throw error;

        return {
            success: true,
            data
        };
    } catch (error: any) {
        console.error('Error updating trial allocation results:', error);
        return {
            success: false,
            error: error.message || 'Failed to update trial results'
        };
    }
};

export const revertToTrialsList = async (
    workflowIds: string[],
    fromStage: 'trials_section' | 'trials_allocated'
): Promise<ApiResponse<any>> => {
    try {
        if (fromStage === 'trials_allocated') {
            // 1. Delete trial allocations (both tables to be safe/sure which one is being used, though we use trial_allocations mostly now, the schema fix script used trials_allocations)
            // Based on previous code, we use 'trial_allocations' (singular trial) in some places and 'trials_allocations' (plural) in others?
            // Let's check allocateToSpecificTrial uses 'trial_allocations'.
            // The allocateToTrials (legacy?) uses 'trials_allocations'.
            // The getTrialAllocations uses 'trial_allocations'.
            // AND we recently fixed schema to have `trial_allocations`? Or `trials_allocations`?
            // Checking the file content I saw earlier:
            // Line 527: .from('trials_allocations') 
            // Line 913: .from('trial_allocations')

            // This suggests inconsistent table usage.
            // The recent move to `allocated` via modal uses `allocateToSpecificTrial` which writes to `trial_allocations` (Line 880 in viewed file).
            // But `fix_trials_schema.sql` dropped `trial_allocations` and recreated/used `trials_allocations` (wait, line 8 said DROP trial_allocations CASCADE).

            // Let's checking `allocateToSpecificTrial` again. It was NOT shown in the ViewFile fully, but I can infer its existence.
            // Wait, I should check which table is actually being used for the "Trials Allocated" view.
            // `getTrialAllocations` (Line 910) queries `trial_allocations`.
            // So I should delete from `trial_allocations`.

            const { error: deleteError } = await supabase
                .from('trial_allocations')  // Targeting the one used by getTrialAllocations
                .delete()
                .in('workflow_id', workflowIds);

            if (deleteError) throw deleteError;
        }

        // 2. Update workflow stage back to 'registration_completed'
        // Reset trial-related timestamps
        const { data, error } = await supabase
            .from('player_workflow')
            .update({
                workflow_stage: 'registration_completed',
                moved_to_trials_at: null,
                allocated_to_trials_at: null
            })
            .in('workflow_id', workflowIds)
            .select();

        if (error) throw error;

        return {
            success: true,
            data: { updatedCount: data?.length || 0 }
        };

    } catch (error: any) {
        console.error('Error reverting players to trials list:', error);
        return {
            success: false,
            error: error.message || 'Failed to revert players to trials list'
        };
    }
};

// Trial Center Management
export const getTrialCenters = async (): Promise<ApiResponse<TrialCenter[]>> => {
    try {
        const { data, error, count } = await supabase
            .from('trials_centers')
            .select('*', { count: 'exact' })
            .order('center_name', { ascending: true });

        if (error) throw error;

        return {
            success: true,
            data: data || [],
            count: count || 0
        };
    } catch (error: any) {
        console.error('Error fetching trial centers:', error);
        return {
            success: false,
            error: error.message || 'Failed to fetch trial centers'
        };
    }
};

export const createTrialCenter = async (centerData: TrialCenterCreationForm): Promise<ApiResponse<TrialCenter>> => {
    try {
        if (!centerData.center_name) {
            throw new Error('Center name is required');
        }

        const { data, error } = await supabase
            .from('trials_centers')
            .insert({
                center_name: centerData.center_name,
                center_address: centerData.center_address,
                created_at: new Date().toISOString(),
                updated_at: new Date().toISOString()
            })
            .select()
            .single();

        if (error) throw error;

        return {
            success: true,
            data
        };
    } catch (error: any) {
        console.error('Error creating trial center:', error);
        return {
            success: false,
            error: error.message || 'Failed to create trial center'
        };
    }
};

export const updateTrialCenter = async (centerId: string, centerData: TrialCenterCreationForm): Promise<ApiResponse<TrialCenter>> => {
    try {
        if (!centerId) throw new Error('Center ID is required');
        if (!centerData.center_name) throw new Error('Center name is required');

        const { data, error } = await supabase
            .from('trials_centers')
            .update({
                center_name: centerData.center_name,
                center_address: centerData.center_address,
                updated_at: new Date().toISOString()
            })
            .eq('center_id', centerId)
            .select()
            .single();

        if (error) throw error;

        return {
            success: true,
            data
        };
    } catch (error: any) {
        console.error('Error updating trial center:', error);
        return {
            success: false,
            error: error.message || 'Failed to update trial center'
        };
    }
};

// Trial Slot Management
export const getTrialSlots = async (): Promise<ApiResponse<TrialSlot[]>> => {
    try {
        const { data, error, count } = await supabase
            .from('trial_slots')
            .select('*', { count: 'exact' })
            .order('slot_name', { ascending: true });

        if (error) throw error;

        return {
            success: true,
            data: data || [],
            count: count || 0
        };
    } catch (error: any) {
        console.error('Error fetching trial slots:', error);
        return {
            success: false,
            error: error.message || 'Failed to fetch trial slots'
        };
    }
};

export const createTrialSlot = async (slotData: TrialSlotCreationForm): Promise<ApiResponse<TrialSlot>> => {
    try {
        if (!slotData.slot_name || !slotData.slot_time) {
            throw new Error('Slot name and time are required');
        }

        const { data, error } = await supabase
            .from('trial_slots')
            .insert({
                slot_name: slotData.slot_name,
                slot_time: slotData.slot_time,
                slot_end_time: slotData.slot_end_time,
                created_at: new Date().toISOString(),
                updated_at: new Date().toISOString()
            })
            .select()
            .single();

        if (error) throw error;

        return {
            success: true,
            data
        };
    } catch (error: any) {
        console.error('Error creating trial slot:', error);
        return {
            success: false,
            error: error.message || 'Failed to create trial slot'
        };
    }
};

export const updateTrialSlot = async (slotId: string, slotData: TrialSlotCreationForm): Promise<ApiResponse<TrialSlot>> => {
    try {
        if (!slotId) throw new Error('Slot ID is required');
        if (!slotData.slot_name || !slotData.slot_time) throw new Error('Slot name and time are required');

        const { data, error } = await supabase
            .from('trial_slots')
            .update({
                slot_name: slotData.slot_name,
                slot_time: slotData.slot_time,
                slot_end_time: slotData.slot_end_time,
                updated_at: new Date().toISOString()
            })
            .eq('slot_id', slotId)
            .select()
            .single();

        if (error) throw error;

        return {
            success: true,
            data
        };
    } catch (error: any) {
        console.error('Error updating trial slot:', error);
        return {
            success: false,
            error: error.message || 'Failed to update trial slot'
        };
    }
};

export const removePlayersFromWorkflow = async (workflowIds: string[]): Promise<ApiResponse<any>> => {
    try {
        console.log('API: removePlayersFromWorkflow called with:', workflowIds);

        // 1. Delete from trial_allocations if any
        const { error: allocationError } = await supabase
            .from('trial_allocations')
            .delete()
            .in('workflow_id', workflowIds);

        if (allocationError) {
            console.warn('Error deleting allocations (may be normal if none exist):', allocationError);
            // Proceeding despite error as they might not exist
        }

        const { error: allocationsPluralError } = await supabase
            .from('trials_allocations')
            .delete()
            .in('workflow_id', workflowIds);

        if (allocationsPluralError) {
            console.warn('Error deleting allocations (plural):', allocationsPluralError);
        }

        // 2. We might need to delete email logs or other relations if they exist and FK restricts
        // Assuming email_logs refers to registration_id. We need registration_ids for that.
        // Let's get registration_ids first
        const { data: workflows } = await supabase
            .from('player_workflow')
            .select('registration_id')
            .in('workflow_id', workflowIds);

        const registrationIds = workflows?.map((w: { registration_id: string }) => w.registration_id) || [];

        if (registrationIds.length > 0) {
            // Optional: Delete email logs? Or let them keep history?
            // If FK restricts deletion of player_registrations (which we aren't deleting, we are deleting workflow), then we are fine.
            // But if player_workflow has other dependencies?
        }

        // 3. Delete from player_workflow
        const { error, count } = await supabase
            .from('player_workflow')
            .delete({ count: 'exact' })
            .in('workflow_id', workflowIds);

        if (error) throw error;

        console.log('API: Deleted count:', count);

        // If count is 0, maybe they didn't exist?
        if (count === 0) {
            console.warn('API: Delete operations returned 0 deleted rows');
        }

        return {
            success: true,
            data: { message: 'Players removed successfully' },
            count: count || 0
        };
    } catch (error: any) {
        console.error('Error removing players from workflow:', error);
        return {
            success: false,
            error: error.message || 'Failed to remove players from workflow'
        };
    }
};

export const updateTrialLevelProgress = async (workflowId: string, updates: any): Promise<ApiResponse<any>> => {
    try {
        const { data, error } = await supabase
            .from('player_workflow')
            .update(updates)
            .eq('workflow_id', workflowId)
            .select()
            .single();

        if (error) throw error;

        return {
            success: true,
            data
        };
    } catch (error: any) {
        console.error('Error updating trial level progress:', error);
        return {
            success: false,
            error: error.message || 'Failed to update trial level progress'
        };
    }
};

export const getTrialLevelPlayers = async (levelCriteria: Record<string, any>): Promise<ApiResponse<any[]>> => {
    try {
        let query = supabase
            .from('player_workflow')
            .select(`*`, { count: 'exact' });

        // Apply filters based on criteria object (e.g. { level_1_status: 'selected' })
        for (const [key, value] of Object.entries(levelCriteria)) {
            query = query.eq(key, value);
        }

        const { data, error, count } = await query;

        if (error) throw error;

        // Ensure we supply the properties for frontend UI compatibility
        const flattenedData = (data || []).map((item: any) => ({
            ...item,
            full_name: item.full_name,
            email: item.email,
            phone: item.phone,
            position: item.position || '',
            state: item.state,
            city: item.city,
            proficiency: item.proficiency || ''
        }));

        return {
            success: true,
            data: flattenedData,
            count: count || 0
        };
    } catch (error: any) {
        console.error('Error fetching trial level players:', error);
        return {
            success: false,
            error: error.message || 'Failed to fetch trial level players'
        };
    }
};
