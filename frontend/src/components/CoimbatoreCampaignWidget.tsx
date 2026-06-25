import { useState, useEffect } from 'react';
import { supabase } from '../lib/supabase';
import { ga4DataFetchService } from '../services/ga4DataFetchService';
import DrillDownModal from './DrillDownModal';

export default function CoimbatoreCampaignWidget() {
  const [metrics, setMetrics] = useState({
    scans: 0,
    visits: 0,
    successfulRegistrations: 0,
    failedRegistrations: 0,
  });
  const [loading, setLoading] = useState(true);
  
  // Store raw database records for the drill-down
  const [rawRegistrations, setRawRegistrations] = useState<any[]>([]);
  const [rawLeads, setRawLeads] = useState<any[]>([]);
  const [ga4History, setGa4History] = useState<any[]>([]);
  // Drill-down modal state
  const [drillDown, setDrillDown] = useState<{
    isOpen: boolean;
    title: string;
    players: any[];
    infoMessage?: string;
  }>({
    isOpen: false,
    title: '',
    players: [],
    infoMessage: undefined
  });

  const handleCardClick = (type: 'all' | 'successful' | 'failed' | 'scans' | 'visits') => {
    let filtered = rawRegistrations;
    let title = 'All Registrations (Coimbatore Campaign)';
    let infoMessage = undefined;
    let playersList: any[] = [];

    if (type === 'successful') {
      filtered = rawRegistrations.filter((r: any) => 
        r.payment_status === 'captured' || 
        r.payment_status === 'paid' || 
        r.payment_status === 'success' ||
        r.payment_status === 'completed'
      );
      title = 'Successful Registrations (Coimbatore Campaign)';
      playersList = filtered.map((p: any) => ({
        name: p.full_name,
        phone: p.phone,
        email: p.email,
        city: p.city,
        state: p.state,
        status: p.status,
        payment_status: p.payment_status,
        date: p.created_at ? new Date(p.created_at).toLocaleDateString() : undefined
      }));
    } else if (type === 'failed') {
      filtered = rawRegistrations.filter((r: any) => !(
        r.payment_status === 'captured' || 
        r.payment_status === 'paid' || 
        r.payment_status === 'success' ||
        r.payment_status === 'completed'
      ));
      title = 'Failed / Pending Registrations (Coimbatore Campaign)';
      playersList = filtered.map((p: any) => ({
        name: p.full_name,
        phone: p.phone,
        email: p.email,
        city: p.city,
        state: p.state,
        status: p.status,
        payment_status: p.payment_status,
        date: p.created_at ? new Date(p.created_at).toLocaleDateString() : undefined
      }));
    } else if (type === 'scans' || type === 'visits') {
      // 1. Show raw visitor leads if we have them
      if (rawLeads.length > 0) {
        title = type === 'visits' ? 'Website Visits (Real-time)' : 'QR Scans (Real-time)';
        infoMessage = "Displaying real-time visitor captures including anonymous device data.";
        playersList = rawLeads.map((l: any) => ({
          name: l.name || 'Anonymous Visitor',
          phone: l.phone || '-',
          email: l.email || '-',
          city: l.utm_source || '-',
          state: l.utm_medium || '-',
          status: l.utm_campaign || 'Lead',
          payment_status: 'N/A',
          date: l.created_at ? new Date(l.created_at).toLocaleDateString() : undefined
        }));
      } 
      // 2. Show GA4 historical aggregate data if raw visitor leads are empty
      else if (ga4History.length > 0) {
        title = type === 'visits' ? 'Website Visits (Historical Aggregate)' : 'QR Scans (Historical Aggregate)';
        infoMessage = "Real-time tracking was recently added. Displaying historical aggregated data from Google Analytics.";
        playersList = ga4History.map((row: any) => ({
          name: row.utm_source || 'N/A',
          phone: '-',
          email: '-',
          city: row.utm_medium || '-',
          state: '-',
          status: type === 'visits' ? `Users: ${row.users || 0}` : `Sessions: ${row.sessions || 0}`,
          payment_status: 'N/A',
          date: row.date ? `${row.date.substring(0,4)}-${row.date.substring(4,6)}-${row.date.substring(6,8)}` : 'N/A'
        })).filter(row => row.status !== 'Users: 0' && row.status !== 'Sessions: 0');
      }
      // 3. Fallback to registrations
      else {
        title = 'Registrations (Fallback)';
        infoMessage = 'No analytics data available. Displaying registered players.';
        playersList = rawRegistrations.map((p: any) => ({
          name: p.full_name,
          phone: p.phone,
          email: p.email,
          city: p.city,
          state: p.state,
          status: p.status,
          payment_status: p.payment_status,
          date: p.created_at ? new Date(p.created_at).toLocaleDateString() : undefined
        }));
      }
    }
    
    setDrillDown({
      isOpen: true,
      title,
      players: playersList,
      infoMessage
    });
  };

  useEffect(() => {
    let isMounted = true;
    let isInitialLoad = true;

    async function fetchMetrics() {
      try {
        if (isInitialLoad) {
          setLoading(true);
        }

        let ga4Scans = 0;
        let ga4Visits = 0;
        let ga4Conversions = 0;
        try {
          const startDate = '2025-01-01';
          const endDate = new Date().toISOString().split('T')[0];
          const dbFilter = 'utm_source.ilike.%karthikeyan%,utm_campaign.ilike.%coimbatore%';
          const ga4Response = await ga4DataFetchService.getUTMCampaignReport(startDate, endDate, dbFilter);
          const ga4Data = ga4Response?.data || [];
          const campaignData = ga4Data.filter((d: any) => 
            (d.utm_source || '').toLowerCase().includes('karthikeyan') ||
            (d.utm_campaign || '').toLowerCase().includes('coimbatore')
          );
          
          ga4Scans = campaignData.reduce((sum: number, item: any) => sum + (item.sessions || 0), 0);
          ga4Visits = campaignData.reduce((sum: number, item: any) => sum + (item.users || 0), 0);
          ga4Conversions = campaignData.reduce((sum: number, item: any) => sum + (item.conversions || 0), 0);
          
          setGa4History(campaignData);
        } catch (e) {
          console.error("GA4 fetch error:", e);
        }

        // 2. Fetch Supabase precise tracking data directly from player_registrations
        const { data: regsData, error } = await supabase
          .from('player_registrations')
          .select('full_name, phone, email, city, state, status, payment_status, created_at')
          .ilike('utm_source', '%KARTHIKEYAN%')
          .ilike('utm_campaign', '%coimbatore%');

        if (error) {
          console.error("Supabase fetch error:", error);
        }
        
        let totalDBRegistrations = 0;
        let successfulDBRegistrations = 0;
        let failedDBRegistrations = 0;
        
        if (regsData) {
          if (isMounted) setRawRegistrations(regsData);
          totalDBRegistrations = regsData.length;
          
          regsData.forEach((r: any) => {
            const isSuccessful = r.payment_status === 'captured' || 
                                 r.payment_status === 'paid' || 
                                 r.payment_status === 'success' ||
                                 r.payment_status === 'completed';
            
            if (isSuccessful) {
              successfulDBRegistrations++;
            } else {
              failedDBRegistrations++;
            }
          });
        }

        // 3. Fetch visitor leads for anonymous device tracking
        const { data: leadsData, error: leadsError } = await supabase
          .from('visitor_leads')
          .select('name, email, phone, created_at, utm_source, utm_medium, utm_campaign')
          .or('utm_source.ilike.%KARTHIKEYAN%,utm_campaign.ilike.%coimbatore%');

        if (!leadsError && leadsData && isMounted) {
          setRawLeads(leadsData);
        }

        if (isMounted) {
          setMetrics({
            // Prefer GA4 metrics for scans/visits since it captures anonymous traffic.
            // Fall back to registration attempts if GA4 returns 0 or fails (e.g. edge function 500 error).
            scans: ga4Scans > 0 ? ga4Scans : totalDBRegistrations,
            visits: ga4Visits > 0 ? ga4Visits : totalDBRegistrations,
            successfulRegistrations: ga4Conversions > 0 ? ga4Conversions : successfulDBRegistrations,
            failedRegistrations: failedDBRegistrations
          });
          setLoading(false);
          isInitialLoad = false;
        }
      } catch (err) {
        console.error("Error fetching Coimbatore campaign metrics:", err);
        if (isMounted) setLoading(false);
      }
    }

    fetchMetrics();
    
    // Auto-update every 60 seconds as a fallback for GA4 data
    const interval = setInterval(fetchMetrics, 60000);

    // Setup Supabase Realtime Subscriptions for immediate updates
    const subscription = supabase
      .channel('coimbatore_campaign_updates')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'player_registrations' }, () => {
        if (isMounted) fetchMetrics();
      })
      .on('postgres_changes', { event: '*', schema: 'public', table: 'visitor_leads' }, () => {
        if (isMounted) fetchMetrics();
      })
      .subscribe();

    return () => {
      isMounted = false;
      clearInterval(interval);
      supabase.removeChannel(subscription);
    };
  }, []);

  return (
    <div className="bg-gradient-to-r from-purple-50 to-pink-50 rounded-lg shadow-sm p-6 border border-purple-100 mb-6">
      <h2 className="text-xl font-bold text-gray-900 flex items-center gap-2 mb-4">
        <span>📍</span> Coimbatore Campaign (Mr. Karthikeyan)
      </h2>
      
      {loading ? (
        <div className="flex animate-pulse space-x-4">
          <div className="h-16 bg-purple-200 rounded-lg w-1/4"></div>
          <div className="h-16 bg-purple-200 rounded-lg w-1/4"></div>
          <div className="h-16 bg-purple-200 rounded-lg w-1/4"></div>
          <div className="h-16 bg-purple-200 rounded-lg w-1/4"></div>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
          <div 
            onClick={() => handleCardClick('scans')}
            className="bg-white rounded-lg shadow-sm p-4 border border-purple-50 cursor-pointer hover:shadow-md transition-shadow"
          >
            <div className="flex items-center justify-between">
              <div>
                <p className="text-purple-600 text-sm font-medium">Number of Scans</p>
                <p className="text-3xl font-bold text-gray-900 mt-1">{metrics.scans}</p>
              </div>
              <div className="text-3xl">📱</div>
            </div>
            <p className="text-xs text-gray-500 mt-2">Total Sessions via QR Scan</p>
          </div>
          
          <div 
            onClick={() => handleCardClick('visits')}
            className="bg-white rounded-lg shadow-sm p-4 border border-purple-50 cursor-pointer hover:shadow-md transition-shadow"
          >
            <div className="flex items-center justify-between">
              <div>
                <p className="text-blue-600 text-sm font-medium">Website Visits</p>
                <p className="text-3xl font-bold text-gray-900 mt-1">{metrics.visits}</p>
              </div>
              <div className="text-3xl">🌐</div>
            </div>
            <p className="text-xs text-gray-500 mt-2">Unique Visitors</p>
          </div>
          
          <div 
            onClick={() => handleCardClick('successful')}
            className="bg-white rounded-lg shadow-sm p-4 border border-purple-50 cursor-pointer hover:shadow-md transition-shadow"
          >
            <div className="flex items-center justify-between">
              <div>
                <p className="text-green-600 text-sm font-medium">Successful</p>
                <p className="text-3xl font-bold text-gray-900 mt-1">{metrics.successfulRegistrations}</p>
              </div>
              <div className="text-3xl">✅</div>
            </div>
            <p className="text-xs text-gray-500 mt-2">Paid Registrations</p>
          </div>

          <div 
            onClick={() => handleCardClick('failed')}
            className="bg-white rounded-lg shadow-sm p-4 border border-purple-50 cursor-pointer hover:shadow-md transition-shadow"
          >
            <div className="flex items-center justify-between">
              <div>
                <p className="text-red-600 text-sm font-medium">Failed / Pending</p>
                <p className="text-3xl font-bold text-gray-900 mt-1">{metrics.failedRegistrations}</p>
              </div>
              <div className="text-3xl">❌</div>
            </div>
            <p className="text-xs text-gray-500 mt-2">Dropped off or failed pay</p>
          </div>
        </div>
      )}

      <DrillDownModal
        isOpen={drillDown.isOpen}
        onClose={() => setDrillDown(prev => ({ ...prev, isOpen: false }))}
        title={drillDown.title}
        players={drillDown.players}
        infoMessage={drillDown.infoMessage}
        loading={false}
      />
    </div>
  );
}
