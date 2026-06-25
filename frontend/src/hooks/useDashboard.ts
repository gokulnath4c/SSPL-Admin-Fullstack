import { useEffect, useState } from 'react'
import { supabase } from '@lib/supabase'

export interface DashboardStats {
  totalRegistrations: number
  capturedCount: number
  pendingCount: number
  failedTransactionsCount: number
  netFailedCount: number
  totalAbsentees: number
  inStationCount: number
  outStationCount: number
  calledForCount: number
  notCalledForCount: number
  selectedCount: number
  notSelectedCount: number
  level1Selected: number
  level2Selected: number
  level3Selected: number
  level1SelectedLevel2Absent: number
  stateDistribution: Array<{ state: string; count: number }>
  trialDistribution: Array<{ trial: string; count: number }>
  registrationTrend: Array<{ date: string; count: number }>
  inPlayersSplit: Array<{ label: string; count: number; icon: string; description: string }>
  proficiencySplit: Array<{ label: string; count: number; icon: string; description: string }>
}

interface UseDashboardReturn {
  stats: DashboardStats | null
  loading: boolean
  error: string | null
  isUsingMockData: boolean
  refetch: () => Promise<void>
}

const defaultStats: DashboardStats = {
  totalRegistrations: 0,
  capturedCount: 0,
  pendingCount: 0,
  failedTransactionsCount: 0,
  netFailedCount: 0,
  totalAbsentees: 0,
  inStationCount: 0,
  outStationCount: 0,
  calledForCount: 0,
  notCalledForCount: 0,
  selectedCount: 0,
  notSelectedCount: 0,
  level1Selected: 0,
  level2Selected: 0,
  level3Selected: 0,
  level1SelectedLevel2Absent: 0,
  stateDistribution: [],
  trialDistribution: [],
  registrationTrend: [],
  inPlayersSplit: [],
  proficiencySplit: [],
}

// Mock registrations for demonstration
const MOCK_REGISTRATIONS = [
  { id: '1', player_name: 'John Doe', registration_date: new Date(Date.now() - 15 * 24 * 60 * 60 * 1000).toISOString(), state: 'California', trial_name: 'Trial A', payment_status: 'completed' },
  { id: '2', player_name: 'Jane Smith', registration_date: new Date(Date.now() - 10 * 24 * 60 * 60 * 1000).toISOString(), state: 'Texas', trial_name: 'Trial B', payment_status: 'pending' },
  { id: '3', player_name: 'Bob Johnson', registration_date: new Date(Date.now() - 8 * 24 * 60 * 60 * 1000).toISOString(), state: 'California', trial_name: 'Trial A', payment_status: 'completed' },
  { id: '4', player_name: 'Alice Williams', registration_date: new Date(Date.now() - 5 * 24 * 60 * 60 * 1000).toISOString(), state: 'Florida', trial_name: 'Trial C', payment_status: 'completed' },
  { id: '5', player_name: 'Charlie Brown', registration_date: new Date(Date.now() - 3 * 24 * 60 * 60 * 1000).toISOString(), state: 'New York', trial_name: 'Trial B', payment_status: 'pending' },
  { id: '6', player_name: 'Diana Prince', registration_date: new Date(Date.now() - 2 * 24 * 60 * 60 * 1000).toISOString(), state: 'Texas', trial_name: 'Trial A', payment_status: 'completed' },
  { id: '7', player_name: 'Eve Adams', registration_date: new Date(Date.now() - 1 * 24 * 60 * 60 * 1000).toISOString(), state: 'California', trial_name: 'Trial C', payment_status: 'completed' },
  { id: '8', player_name: 'Frank Miller', registration_date: new Date().toISOString(), state: 'Pennsylvania', trial_name: 'Trial B', payment_status: 'pending' },
]

export function useDashboard(): UseDashboardReturn {
  const [stats, setStats] = useState<DashboardStats | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [isUsingMockData, setIsUsingMockData] = useState(false)

  const fetchStats = async () => {
    setLoading(true)
    setError(null)
    setIsUsingMockData(false)

    try {
      // 1. Fetch core registrations using pagination to get ALL records for accurate metrics
      let allRegistrations: any[] = [];
      let page = 0;
      const pageSize = 1000;
      let hasMore = true;
      let registrationsError: any = null;

      while (hasMore) {
        const { data, error } = await supabase
          .from('v_admin_player_registrations')
          .select('phone, email, payment_status, state, created_at')
          .range(page * pageSize, (page + 1) * pageSize - 1);

        if (error) {
          registrationsError = error;
          break;
        }

        if (data && data.length > 0) {
          allRegistrations = allRegistrations.concat(data);
          if (data.length < pageSize) hasMore = false;
          else page++;
        } else {
          hasMore = false;
        }
      }
      
      const registrations = allRegistrations;

      // 2. Fetch Trial Overall Stats (from RPC)
      let trialStats: any = null
      try {
        const { data: tsData, error: tsError } = await supabase.rpc('get_trial_overall_stats')
        if (!tsError) trialStats = tsData
      } catch (e) {
        console.warn('Failed to fetch trial overall stats', e)
      }

      // 3. Fetch Workflow Dashboard Stats (from RPC)
      let workflowStats: any = null
      try {
        const { data: wfData, error: wfError } = await supabase.rpc('get_workflow_dashboard_stats')
        if (!wfError) workflowStats = Array.isArray(wfData) ? wfData[0] : wfData
      } catch (e) {
        console.warn('Failed to fetch workflow dashboard stats', e)
      }

      // If fetch fails or no data, use mock data
      const dataToUse = !registrationsError && registrations && registrations.length > 0 ? registrations : MOCK_REGISTRATIONS

      if (registrationsError) {
        console.warn('Error fetching unique registrations:', registrationsError.message)
        setIsUsingMockData(true)
      }

      if (!dataToUse || dataToUse.length === 0) {
        setStats(defaultStats)
        return
      }

      // Fetch EXACT counts from DB to avoid the 2000 limit
      const { count: totalTransCount } = await supabase.from('player_registrations').select('*', { count: 'exact', head: true });
      const { count: capturedTransCount } = await supabase.from('player_registrations')
        .select('*', { count: 'exact', head: true })
        .in('payment_status', ['captured', 'completed', 'paid', 'success', 'CAPTURED', 'COMPLETED', 'PAID', 'SUCCESS']);

      // Calculate statistics from raw data
      const totalRegistrations = workflowStats?.total_registrations || totalTransCount || dataToUse.length
      const capturedCount = workflowStats?.completed_payments || capturedTransCount || dataToUse.filter((r: any) => ['captured', 'completed', 'paid', 'success'].includes(r.payment_status?.toLowerCase())).length
      const failedTransactionsCount = totalRegistrations - capturedCount;
      
      // Calculate net failed: Unique players who have NO successful payments
      const playerGroups = dataToUse.reduce((acc: any, p: any) => {
        const key = p.phone || p.email || 'unknown';
        if (!acc[key]) acc[key] = [];
        acc[key].push(p.payment_status?.toLowerCase());
        return acc;
      }, {});

      const capturedUnique = Object.values(playerGroups).filter((statuses: any) => 
        statuses.some((s: string) => ['captured', 'completed', 'paid', 'success'].includes(s))
      ).length;
      
      const totalUnique = Object.keys(playerGroups).length;
      const netFailedCount = totalUnique - capturedUnique;

      // Trial metrics
      const funnel = trialStats?.funnel || {}
      const attrition = trialStats?.attrition || {}

      let calledForCount = 0;
      let notCalledForCount = 0;
      let selectedCount = 0;
      let notSelectedCount = 0;
      
      let level1Selected = 0;
      let level2Selected = 0;
      let level3Selected = 0;

      // State-wise distribution
      const stateMap = new Map<string, number>()
      dataToUse.forEach((r: any) => {
        const state = r.state || 'Unknown'
        stateMap.set(state, (stateMap.get(state) || 0) + 1)
      })
      const stateDistribution = Array.from(stateMap.entries()).map(([state, count]) => ({
        state,
        count,
      }))

      // Trial-wise distribution
      const trialMap = new Map<string, number>()
      dataToUse.forEach((r: any) => {
        const trial = r.trial_name || 'General'
        trialMap.set(trial, (trialMap.get(trial) || 0) + 1)
      })
      const trialDistribution = Array.from(trialMap.entries()).map(([trial, count]) => ({
        trial,
        count,
      }))

      // Registration trend (last 30 days)
      const trendMap = new Map<string, number>()
      dataToUse.forEach((r: any) => {
        if (r.created_at) {
          const date = new Date(r.created_at).toISOString().split('T')[0]
          trendMap.set(date, (trendMap.get(date) || 0) + 1)
        }
      })

      // Sort by date and create cumulative trend
      const sortedDates = Array.from(trendMap.keys()).sort()
      let cumulative = 0
      const registrationTrend = sortedDates.map((date) => {
        cumulative += trendMap.get(date) || 0
        return { date, count: cumulative }
      })

      // Keep only last 30 days
      const thirtyDaysAgo = new Date()
      thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30)
      const filteredTrend = registrationTrend.filter((item) => new Date(item.date) >= thirtyDaysAgo)

      const [
        { count: count0 },
        { count: count1 },
        { count: count2 },
        { count: count3 },
        { count: batsmanCount },
        { count: bowlerCount },
        { count: arCount },
        { count: notSpecifiedCount },
        { count: totalAbsenteesCount },
        { count: level1SelectedCount },
        { count: level2SelectedCount },
        { count: level3SelectedCount },
        { count: finalSelectedCount },
        { count: finalRejectedCount },
        { count: l1CalledCount },
        { count: totalTrialCandidatesCount }
      ] = await Promise.all([
        supabase.from('trial_view').select('*', { count: 'exact', head: true }).eq('l1_attendance', 'ABSENT').eq('l2_attendance', 'ABSENT').eq('l3_attendance', 'ABSENT'), // count0: Completely Absent
        supabase.from('trial_view').select('*', { count: 'exact', head: true }).eq('l1_result', 'SELECTED').eq('l2_result', 'SELECTED').eq('l3_result', 'SELECTED'), // count1: Finally Selected
        supabase.from('trial_view').select('*', { count: 'exact', head: true }).eq('l1_result', 'SELECTED').eq('l2_attendance', 'ABSENT').eq('l3_attendance', 'ABSENT'), // count2: L2 Selected (but not processed for L3)
        supabase.from('trial_view').select('*', { count: 'exact', head: true }).eq('l1_result', 'SELECTED').eq('l2_result', 'SELECTED').eq('l3_attendance', 'ABSENT'), // count3: L3 Absent
        supabase.from('trial_view').select('*', { count: 'exact', head: true }).or('proficiency.ilike.%BATSMAN%,proficiency.ilike.%BATTING%').eq('l1_result', 'SELECTED').eq('l2_result', 'SELECTED').eq('l3_result', 'SELECTED'),
        supabase.from('trial_view').select('*', { count: 'exact', head: true }).or('proficiency.ilike.%BOWLER%,proficiency.ilike.%BOWLING%').eq('l1_result', 'SELECTED').eq('l2_result', 'SELECTED').eq('l3_result', 'SELECTED'),
        supabase.from('trial_view').select('*', { count: 'exact', head: true }).or('proficiency.ilike.%ALL ROUNDER%,proficiency.ilike.%AR%,proficiency.ilike.%ALL-ROUNDER%').eq('l1_result', 'SELECTED').eq('l2_result', 'SELECTED').eq('l3_result', 'SELECTED'),
        supabase.from('trial_view').select('*', { count: 'exact', head: true }).or('proficiency.is.null,proficiency.eq.,proficiency.eq.NA,proficiency.ilike.N/A%').eq('l1_result', 'SELECTED').eq('l2_result', 'SELECTED').eq('l3_result', 'SELECTED'),
        supabase.from('trial_view').select('*', { count: 'exact', head: true }).or('l1_attendance.eq.ABSENT,l2_attendance.eq.ABSENT,l3_attendance.eq.ABSENT'),
        supabase.from('trial_view').select('*', { count: 'exact', head: true }).eq('l1_result', 'SELECTED'),
        supabase.from('trial_view').select('*', { count: 'exact', head: true }).eq('l2_result', 'SELECTED'),
        supabase.from('trial_view').select('*', { count: 'exact', head: true }).eq('l3_result', 'SELECTED'),
        supabase.from('trial_view').select('*', { count: 'exact', head: true }).eq('final_status', 'SELECTED'),
        supabase.from('trial_view').select('*', { count: 'exact', head: true }).eq('final_status', 'REJECTED'),
        supabase.from('trial_view').select('*', { count: 'exact', head: true }).eq('l1_called', true),
        supabase.from('trial_view').select('*', { count: 'exact', head: true })
      ]);

      level1Selected = level1SelectedCount || 0;
      level2Selected = level2SelectedCount || 0;
      level3Selected = level3SelectedCount || 0;

      const totalTrialCandidates = totalTrialCandidatesCount || 0;
      calledForCount = l1CalledCount || 0;
      notCalledForCount = Math.max(0, totalTrialCandidates - calledForCount);
      selectedCount = finalSelectedCount || 0;
      notSelectedCount = Math.max(0, calledForCount - selectedCount);
      const computedOutStationCount = finalRejectedCount || 0;
      const inStationTotal = (count1 || 0) + (count2 || 0) + (count3 || 0) + (count0 || 0) + notCalledForCount;

      setStats({
        totalRegistrations,
        capturedCount,
        pendingCount: totalRegistrations - capturedCount,
        failedTransactionsCount,
        netFailedCount,
        totalAbsentees: totalAbsenteesCount || 0,
        inStationCount: inStationTotal,
        outStationCount: computedOutStationCount,
        calledForCount,
        notCalledForCount,
        selectedCount,
        notSelectedCount,
        level1Selected,
        level2Selected,
        level3Selected,
        level1SelectedLevel2Absent: count2 || 0,
        stateDistribution,
        trialDistribution,
        registrationTrend: filteredTrend.length > 0 ? filteredTrend : registrationTrend,
        inPlayersSplit: [
          { label: 'Finally Selected', count: count1 || 0, icon: '🏆', description: 'Cleared all 3 levels (SELECTED)' },
          { label: 'Level 2 Selected', count: count2 || 0, icon: '🔥', description: 'Selected in Level 2' },
          { label: 'Level 3 Absent', count: count3 || 0, icon: '👀', description: 'Attended Level 2, Absent Level 3' },
          { label: 'Completely Absent', count: count0 || 0, icon: '🏃', description: 'Never showed up (ABSENT for all)' },
          { label: 'Not Called Players', count: notCalledForCount, icon: '📅', description: 'Recent registrations not yet called' }
        ],
        proficiencySplit: [
          { label: 'Batsman', count: batsmanCount || 0, icon: '🏏', description: 'Players with Batsman proficiency' },
          { label: 'Bowler', count: bowlerCount || 0, icon: '⚾', description: 'Players with Bowler proficiency' },
          { label: 'All Rounder', count: arCount || 0, icon: '⭐', description: 'Players with All Rounder proficiency' },
          { label: 'Not Specified', count: notSpecifiedCount || 0, icon: '❓', description: 'Players with no proficiency listed' }
        ],
      })
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to fetch dashboard stats'
      console.warn('Error in useDashboard:', errorMessage)
      setIsUsingMockData(true)
      setStats(defaultStats)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    fetchStats()
  }, [])

  const refetch = async () => {
    await fetchStats()
  }

  return { stats, loading, error, isUsingMockData, refetch }
}

