import { supabase } from '../lib/supabase';

export interface TrialFetchOptions {
    page?: number;
    limit?: number;
    level?: number;
    called?: boolean;
    attendance?: string;
    result?: string;
    city?: string;
}

export const fetchTrialCandidates = async (options: TrialFetchOptions = {}) => {
    const {
        page = 1,
        limit = 50,
        level,
        called,
        attendance,
        result,
        city
    } = options;

    const from = (page - 1) * limit;
    const to = from + limit - 1;

    let query = supabase
        .from('trial_view')
        .select('*', { count: 'exact' });

    if (city && city !== 'ALL') query = query.ilike('city', `%${city}%`);
    if (level) query = query.eq('current_level', level);

    if (level && called !== undefined) query = query.eq(`l${level}_called`, called);
    if (level && attendance && attendance !== 'ALL') query = query.eq(`l${level}_attendance`, attendance);
    if (level && result && result !== 'ALL') query = query.eq(`l${level}_result`, result);

    query = query.range(from, to).order('imported_at', { ascending: false });

    const { data, error, count } = await query;
    
    if (error) {
        throw new Error(`[Fetch Error] ${error.message}`);
    }
    
    return { data: data || [], total: count || 0, page, totalPages: Math.ceil((count || 0) / limit) };
}

export const getTrialOverallStats = async () => {
    // Fetch core trial stats from RPC
    const { data: rpcData, error } = await supabase.rpc('get_trial_overall_stats');
    if (error) throw new Error(error.message);

    // Fetch extra payment stats for reconciliation
    const { count: totalTrans } = await supabase.from('player_registrations').select('*', { count: 'exact', head: true });
    const { count: capturedTransCount } = await supabase.from('player_registrations')
        .select('*', { count: 'exact', head: true })
        .in('payment_status', ['captured', 'completed', 'paid', 'success', 'CAPTURED', 'COMPLETED', 'PAID', 'SUCCESS']);
    
    const { data: allRegs } = await supabase.from('player_registrations').select('phone, payment_status');
    
    // Calculate Net Failed (Unique phones never captured)
    const playerGroups = (allRegs || []).reduce((acc: any, p: any) => {
        const key = p.phone || 'unknown';
        if (!acc[key]) acc[key] = [];
        acc[key].push(p.payment_status?.toLowerCase());
        return acc;
    }, {});

    const capturedPhones = Object.values(playerGroups).filter((statuses: any) => 
        statuses.some((s: string) => ['captured', 'completed', 'paid', 'success'].includes(s))
    ).length;
    
    const totalUnique = Object.keys(playerGroups).length;
    const netFailedUnique = totalUnique - capturedPhones;

    // Merge into the response
    return {
        ...rpcData,
        funnel: {
            ...rpcData.funnel,
            total_attempts: totalTrans,
            captured_transactions: capturedTransCount,
            captured_unique: capturedPhones,
            l1_pool: totalTrans,
        },
        attrition: {
            ...rpcData.attrition,
            net_failed: netFailedUnique,
            failed_transactions: (totalTrans || 0) - (capturedTransCount || 0),
        }
    };
}

export const markCandidateCalled = async (candidateId: string, level: number) => {
    const { data, error } = await supabase.rpc('mark_called', {
        p_candidate_id: candidateId,
        p_level: level
    });
    if (error) throw new Error(error.message);
    return data;
}

export const markCandidateAttendance = async (candidateId: string, level: number, status: string) => {
    const { data, error } = await supabase.rpc('mark_attendance', {
        p_candidate_id: candidateId,
        p_level: level,
        p_status: status
    });
    if (error) throw new Error(error.message);
    return data;
}

export const markCandidateResult = async (candidateId: string, level: number, result: string) => {
    const { data, error } = await supabase.rpc('mark_result', {
        p_candidate_id: candidateId,
        p_level: level,
        p_result: result
    });
    if (error) throw new Error(error.message);
    return data;
}
