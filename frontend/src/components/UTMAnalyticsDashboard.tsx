/**
 * UTM Analytics Dashboard
 * Displays GA4 traffic data and Supabase registration data
 * Adapted for Admin Panel
 */
import { useState, useEffect, useCallback } from 'react';
import { supabase } from '@/lib/supabase'; // Adapted import
import { ga4DataFetchService, type GA4UTMReport } from '../services/ga4DataFetchService';

interface Registration {
    id: string;
    full_name: string;
    email: string;
    phone: string;
    city: string;
    state: string;
    payment_amount: number | null;
    payment_status: string;
    created_at: string;
}

interface QRPerformance {
    qr_code_id: string;
    qr_code_title: string;
    target_url: string;
    channel: string | null;
    is_active: boolean;
    total_scans: number;
    total_registrations: number;
    total_paid_registrations: number;
    total_revenue: number;
    scan_to_registration_rate: number | null;
    scan_to_payment_rate: number | null;
}

interface DashboardStats {
    totalRegistrations: number;
    paidRegistrations: number;
    pendingRegistrations: number;
    failedRegistrations: number;
    totalRevenue: number;
    totalGA4Users: number;
    totalGA4Sessions: number;
    totalGA4NewUsers: number;
    totalGA4PageViews: number;
    totalGA4Conversions: number;
    totalGA4Revenue: number;
    ga4TotalRows: number;
    ga4FetchedRows: number;
    totalQRScans: number;
    totalQRRegistrations: number;
    totalQRRevenue: number;
}

export default function UTMAnalyticsDashboard() {
    const [activeTab, setActiveTab] = useState<'overview' | 'ga4' | 'registrations' | 'qr'>('overview');
    const [ga4Data, setGA4Data] = useState<GA4UTMReport[]>([]);
    const [registrations, setRegistrations] = useState<Registration[]>([]);
    const [qrPerformance, setQRPerformance] = useState<QRPerformance[]>([]);
    const [stats, setStats] = useState<DashboardStats>({
        totalRegistrations: 0,
        paidRegistrations: 0,
        pendingRegistrations: 0,
        failedRegistrations: 0,
        totalRevenue: 0,
        totalGA4Users: 0,
        totalGA4Sessions: 0,
        totalGA4NewUsers: 0,
        totalGA4PageViews: 0,
        totalGA4Conversions: 0,
        totalGA4Revenue: 0,
        ga4TotalRows: 0,
        ga4FetchedRows: 0,
        totalQRScans: 0,
        totalQRRegistrations: 0,
        totalQRRevenue: 0,
    });
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);
    const [dateRange, setDateRange] = useState({
        startDate: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
        endDate: new Date().toISOString().split('T')[0],
    });

    // Fetch GA4 data
    const fetchGA4Data = useCallback(async () => {
        console.log('[UTMAnalytics] Fetching GA4 data...');
        try {
            const response = await ga4DataFetchService.getUTMCampaignReport(
                dateRange.startDate,
                dateRange.endDate
            );
            console.log('[UTMAnalytics] GA4 data received:', response);

            const data = response.data || [];
            setGA4Data(data);

            // Calculate GA4 totals from all data
            const totalUsers = data.reduce((sum, item) => sum + (item.users || 0), 0);
            const totalSessions = data.reduce((sum, item) => sum + (item.sessions || 0), 0);
            const totalNewUsers = data.reduce((sum, item) => sum + (item.newUsers || 0), 0);
            const totalPageViews = data.reduce((sum, item) => sum + (item.pageViews || 0), 0);
            const totalConversions = data.reduce((sum, item) => sum + (item.conversions || 0), 0);
            const totalGA4Revenue = data.reduce((sum, item) => sum + (item.revenue || 0), 0);

            setStats(prev => ({
                ...prev,
                totalGA4Users: totalUsers,
                totalGA4Sessions: totalSessions,
                totalGA4NewUsers: totalNewUsers,
                totalGA4PageViews: totalPageViews,
                totalGA4Conversions: totalConversions,
                totalGA4Revenue: totalGA4Revenue,
                ga4TotalRows: response.totalRows || data.length,
                ga4FetchedRows: response.fetchedRows || data.length,
            }));
        } catch (err) {
            console.error('[UTMAnalytics] GA4 fetch error:', err);
            setError(`GA4 Error: ${err instanceof Error ? err.message : 'Unknown error'}`);
        }
    }, [dateRange.startDate, dateRange.endDate]);

    // Fetch registrations from Supabase with proper payment data join
    const fetchRegistrations = useCallback(async () => {
        console.log('[UTMAnalytics] Fetching registrations with payment data...');
        console.log('[UTMAnalytics] Date range:', dateRange.startDate, 'to', dateRange.endDate);

        try {
            // Fetch player_registrations
            const { data: playerData, error: playerError } = await supabase
                .from('player_registrations')
                .select('id, full_name, email, phone, city, state, town, pincode, position, date_of_birth, payment_amount, payment_status, razorpay_payment_id, razorpay_order_id, created_at, updated_at')
                .order('created_at', { ascending: false });

            if (playerError) {
                console.error('[UTMAnalytics] Player registrations error:', playerError);
                throw playerError;
            }

            // Fetch registrations table (payment data) - table may not be in TypeScript types
            const { data: regPaymentData, error: regError } = await supabase
                .from('registrations' as any)
                .select('registration_id, status, amount, payment_id, order_id');

            if (regError) {
                console.error('[UTMAnalytics] Registrations payment error:', regError);
                // Continue without payment join if registrations table doesn't exist
            }

            console.log('[UTMAnalytics] Player registrations:', playerData?.length || 0);
            console.log('[UTMAnalytics] Payment records:', regPaymentData?.length || 0);

            // Create a map of registration_id -> payment data
            const paymentMap = new Map();
            if (regPaymentData) {
                regPaymentData.forEach((r: any) => {
                    if (r.registration_id) {
                        paymentMap.set(r.registration_id, {
                            status: r.status,
                            amount: r.amount,
                            payment_id: r.payment_id,
                            order_id: r.order_id
                        });
                    }
                });
            }
            console.log('[UTMAnalytics] Payment map entries:', paymentMap.size);

            // Join the data - use COALESCE logic like the SQL query
            const joinedData = (playerData || []).map((p: any) => {
                const payment = paymentMap.get(p.id);
                return {
                    id: p.id,
                    full_name: p.full_name,
                    email: p.email,
                    phone: p.phone,
                    city: p.city,
                    state: p.state,
                    // Use payment from registrations table if available, otherwise from player_registrations
                    payment_status: payment?.status || p.payment_status,
                    payment_amount: payment?.amount || p.payment_amount,
                    razorpay_payment_id: payment?.payment_id || p.razorpay_payment_id,
                    razorpay_order_id: payment?.order_id || p.razorpay_order_id,
                    created_at: p.created_at,
                    updated_at: p.updated_at
                };
            });

            console.log('[UTMAnalytics] Joined data sample:', joinedData.slice(0, 5).map((r: any) => ({
                id: r.id?.substring(0, 8),
                name: r.full_name,
                payment_status: r.payment_status,
                payment_amount: r.payment_amount,
                razorpay_payment_id: r.razorpay_payment_id
            })));

            // Log payment status distribution after join
            const statusCounts = joinedData.reduce((acc: Record<string, number>, r: any) => {
                const status = r.payment_status || 'null/empty';
                acc[status] = (acc[status] || 0) + 1;
                return acc;
            }, {});
            console.log('[UTMAnalytics] Payment status distribution (after join):', statusCounts);

            // Filter by date range
            const startDate = new Date(dateRange.startDate);
            startDate.setHours(0, 0, 0, 0);
            const endDate = new Date(dateRange.endDate);
            endDate.setHours(23, 59, 59, 999);

            const filteredData = joinedData.filter((r: any) => {
                const createdAt = new Date(r.created_at);
                return createdAt >= startDate && createdAt <= endDate;
            });

            console.log('[UTMAnalytics] Filtered registrations:', filteredData.length, 'records');

            // Log unique payment statuses for debugging
            const uniqueStatuses = [...new Set(filteredData.map((r: any) => r.payment_status))];
            console.log('[UTMAnalytics] Unique payment statuses in filtered:', uniqueStatuses);

            const regData = filteredData as Registration[];
            setRegistrations(regData);

            // Calculate registration stats - handle various status values (case-insensitive)
            const paid = regData.filter(r => {
                const status = (r.payment_status || '').toLowerCase();
                return status === 'paid' || status === 'completed' || status === 'success' || status === 'captured';
            }).length;

            const pending = regData.filter(r => {
                const status = (r.payment_status || '').toLowerCase();
                return status === 'pending' || status === 'created' || status === 'initiated' || status === '';
            }).length;

            const failed = regData.filter(r => {
                const status = (r.payment_status || '').toLowerCase();
                return status === 'failed' || status === 'error' || status === 'cancelled' || status === 'refunded';
            }).length;

            const revenue = regData
                .filter(r => {
                    const status = (r.payment_status || '').toLowerCase();
                    return status === 'paid' || status === 'completed' || status === 'success' || status === 'captured';
                })
                .reduce((sum, r) => sum + (r.payment_amount || 0), 0);

            console.log('[UTMAnalytics] Stats - Total:', regData.length, 'Paid:', paid, 'Pending:', pending, 'Failed:', failed, 'Revenue:', revenue);

            setStats(prev => ({
                ...prev,
                totalRegistrations: regData.length,
                paidRegistrations: paid,
                pendingRegistrations: pending,
                failedRegistrations: failed,
                totalRevenue: revenue,
            }));
        } catch (err) {
            console.error('[UTMAnalytics] Registration fetch error:', err);
            setError(`Registration Error: ${err instanceof Error ? err.message : 'Unknown error'}`);
        }
    }, [dateRange.startDate, dateRange.endDate]);

    // Fetch QR Code Performance data
    const fetchQRPerformance = useCallback(async () => {
        console.log('[UTMAnalytics] Fetching QR Performance data...');
        try {
            const { data, error: qrError } = await (supabase
                .from('qr_code_performance' as any) as any)
                .select('*')
                .order('total_revenue', { ascending: false });

            if (qrError) {
                console.error('[UTMAnalytics] QR Performance error:', qrError);
                return;
            }

            console.log('[UTMAnalytics] QR Performance data:', data?.length || 0, 'records');
            setQRPerformance(data || []);

            // Calculate QR totals
            const totalScans = (data || []).reduce((sum: number, item: any) => sum + (item.total_scans || 0), 0);
            const totalRegs = (data || []).reduce((sum: number, item: any) => sum + (item.total_registrations || 0), 0);
            const totalRev = (data || []).reduce((sum: number, item: any) => sum + (item.total_revenue || 0), 0);

            setStats(prev => ({
                ...prev,
                totalQRScans: totalScans,
                totalQRRegistrations: totalRegs,
                totalQRRevenue: totalRev,
            }));
        } catch (err) {
            console.error('[UTMAnalytics] QR Performance fetch error:', err);
        }
    }, []);

    // Load all data
    const loadAllData = useCallback(async () => {
        setLoading(true);
        setError(null);
        await Promise.all([fetchGA4Data(), fetchRegistrations(), fetchQRPerformance()]);
        setLoading(false);
    }, [fetchGA4Data, fetchRegistrations, fetchQRPerformance]);

    // Auto-load data on mount and date change
    useEffect(() => {
        loadAllData();
    }, [loadAllData]);

    // Format currency
    const formatCurrency = (amount: number) => {
        return new Intl.NumberFormat('en-IN', {
            style: 'currency',
            currency: 'INR',
            minimumFractionDigits: 0,
        }).format(amount);
    };

    // Get status badge style
    const getStatusBadgeClass = (status: string) => {
        const s = (status || '').toLowerCase();
        if (['paid', 'completed', 'success', 'captured'].includes(s)) {
            return 'bg-green-100 text-green-800';
        }
        if (['pending', 'created', 'initiated', ''].includes(s)) {
            return 'bg-yellow-100 text-yellow-800';
        }
        if (['failed', 'error', 'cancelled', 'refunded'].includes(s)) {
            return 'bg-red-100 text-red-800';
        }
        return 'bg-gray-100 text-gray-800'; // default for unknown statuses
    };

    // Format date
    const formatDate = (dateStr: string) => {
        return new Date(dateStr).toLocaleDateString('en-IN', {
            year: 'numeric',
            month: 'short',
            day: 'numeric',
            hour: '2-digit',
            minute: '2-digit',
        });
    };

    return (
        <div className="bg-gray-50 py-8">
            <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
                {/* Header */}
                <div className="mb-8">
                    <h1 className="text-3xl font-bold text-gray-900">UTM Analytics Dashboard</h1>
                    <p className="mt-2 text-gray-600">GA4 Traffic & Registration Data</p>
                </div>

                {/* Date Range Filter */}
                <div className="bg-white rounded-lg shadow p-4 mb-6">
                    <div className="flex flex-wrap items-center gap-4">
                        <div>
                            <label htmlFor="utm-start-date" className="block text-sm font-medium text-gray-700 mb-1">Start Date</label>
                            <input
                                id="utm-start-date"
                                type="date"
                                value={dateRange.startDate}
                                onChange={(e) => setDateRange(prev => ({ ...prev, startDate: e.target.value }))}
                                className="border border-gray-300 rounded-md px-3 py-2 text-sm focus:ring-2 focus:ring-blue-500"
                            />
                        </div>
                        <div>
                            <label htmlFor="utm-end-date" className="block text-sm font-medium text-gray-700 mb-1">End Date</label>
                            <input
                                id="utm-end-date"
                                type="date"
                                value={dateRange.endDate}
                                onChange={(e) => setDateRange(prev => ({ ...prev, endDate: e.target.value }))}
                                className="border border-gray-300 rounded-md px-3 py-2 text-sm focus:ring-2 focus:ring-blue-500"
                            />
                        </div>
                        <div className="flex items-end">
                            <button
                                onClick={loadAllData}
                                disabled={loading}
                                className="bg-blue-600 text-white px-4 py-2 rounded-md hover:bg-blue-700 disabled:opacity-50 text-sm font-medium"
                            >
                                {loading ? 'Loading...' : 'Refresh Data'}
                            </button>
                        </div>
                    </div>
                </div>

                {/* Error Display */}
                {error && (
                    <div className="bg-red-50 border border-red-200 rounded-lg p-4 mb-6">
                        <p className="text-red-800">{error}</p>
                    </div>
                )}

                {/* Stats Cards - GA4 */}
                <div className="mb-4">
                    <h3 className="text-sm font-medium text-gray-500 mb-2">GA4 Analytics ({stats.ga4FetchedRows.toLocaleString()} records)</h3>
                    <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-6 gap-4">
                        <div className="bg-white rounded-lg shadow p-4">
                            <p className="text-sm text-gray-500">Total Users</p>
                            <p className="text-2xl font-bold text-blue-600">{stats.totalGA4Users.toLocaleString()}</p>
                        </div>
                        <div className="bg-white rounded-lg shadow p-4">
                            <p className="text-sm text-gray-500">New Users</p>
                            <p className="text-2xl font-bold text-blue-500">{stats.totalGA4NewUsers.toLocaleString()}</p>
                        </div>
                        <div className="bg-white rounded-lg shadow p-4">
                            <p className="text-sm text-gray-500">Sessions</p>
                            <p className="text-2xl font-bold text-blue-600">{stats.totalGA4Sessions.toLocaleString()}</p>
                        </div>
                        <div className="bg-white rounded-lg shadow p-4">
                            <p className="text-sm text-gray-500">Page Views</p>
                            <p className="text-2xl font-bold text-indigo-600">{stats.totalGA4PageViews.toLocaleString()}</p>
                        </div>
                        <div className="bg-white rounded-lg shadow p-4">
                            <p className="text-sm text-gray-500">Conversions</p>
                            <p className="text-2xl font-bold text-green-600">{stats.totalGA4Conversions.toLocaleString()}</p>
                        </div>
                        <div className="bg-white rounded-lg shadow p-4">
                            <p className="text-sm text-gray-500">GA4 Revenue</p>
                            <p className="text-2xl font-bold text-green-600">{formatCurrency(stats.totalGA4Revenue)}</p>
                        </div>
                    </div>
                </div>

                {/* Stats Cards - Registrations */}
                <div className="mb-6">
                    <h3 className="text-sm font-medium text-gray-500 mb-2">Registrations & Payments</h3>
                    <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
                        <div className="bg-white rounded-lg shadow p-4">
                            <p className="text-sm text-gray-500">Total Registrations</p>
                            <p className="text-2xl font-bold text-purple-600">{stats.totalRegistrations}</p>
                        </div>
                        <div className="bg-white rounded-lg shadow p-4">
                            <p className="text-sm text-gray-500">Paid</p>
                            <p className="text-2xl font-bold text-green-600">{stats.paidRegistrations}</p>
                        </div>
                        <div className="bg-white rounded-lg shadow p-4">
                            <p className="text-sm text-gray-500">Pending</p>
                            <p className="text-2xl font-bold text-yellow-600">{stats.pendingRegistrations}</p>
                        </div>
                        <div className="bg-white rounded-lg shadow p-4">
                            <p className="text-sm text-gray-500">Failed</p>
                            <p className="text-2xl font-bold text-red-600">{stats.failedRegistrations}</p>
                        </div>
                        <div className="bg-white rounded-lg shadow p-4">
                            <p className="text-sm text-gray-500">Revenue</p>
                            <p className="text-2xl font-bold text-green-600">{formatCurrency(stats.totalRevenue)}</p>
                        </div>
                    </div>
                </div>

                {/* Tabs */}
                <div className="bg-white rounded-lg shadow">
                    <div className="border-b border-gray-200">
                        <nav className="flex -mb-px">
                            {(['overview', 'ga4', 'qr', 'registrations'] as const).map((tab) => (
                                <button
                                    key={tab}
                                    onClick={() => setActiveTab(tab)}
                                    className={`py-4 px-6 text-sm font-medium border-b-2 ${activeTab === tab
                                        ? 'border-blue-500 text-blue-600'
                                        : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                                        }`}
                                >
                                    {tab === 'overview' ? 'Overview' : tab === 'ga4' ? 'GA4 Traffic' : tab === 'qr' ? 'QR Codes' : 'Registrations'}
                                </button>
                            ))}
                        </nav>
                    </div>

                    <div className="p-6">
                        {loading ? (
                            <div className="flex items-center justify-center py-12">
                                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
                                <span className="ml-3 text-gray-600">Loading data...</span>
                            </div>
                        ) : (
                            <>
                                {/* Overview Tab */}
                                {activeTab === 'overview' && (
                                    <div className="space-y-8">
                                        <div>
                                            <h3 className="text-lg font-semibold mb-4">Top Traffic Sources (GA4)</h3>
                                            {ga4Data.length > 0 ? (
                                                <div className="overflow-x-auto">
                                                    <table className="min-w-full divide-y divide-gray-200">
                                                        <thead className="bg-gray-50">
                                                            <tr>
                                                                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Source</th>
                                                                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Medium</th>
                                                                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Campaign</th>
                                                                <th className="px-4 py-3 text-right text-xs font-medium text-gray-500 uppercase">Users</th>
                                                                <th className="px-4 py-3 text-right text-xs font-medium text-gray-500 uppercase">Sessions</th>
                                                            </tr>
                                                        </thead>
                                                        <tbody className="bg-white divide-y divide-gray-200">
                                                            {ga4Data.slice(0, 5).map((item, idx) => (
                                                                <tr key={idx}>
                                                                    <td className="px-4 py-3 text-sm text-gray-900">{item.utm_source || '(direct)'}</td>
                                                                    <td className="px-4 py-3 text-sm text-gray-600">{item.utm_medium || '(none)'}</td>
                                                                    <td className="px-4 py-3 text-sm text-gray-600">{item.utm_campaign || '(not set)'}</td>
                                                                    <td className="px-4 py-3 text-sm text-right text-gray-900">{item.users.toLocaleString()}</td>
                                                                    <td className="px-4 py-3 text-sm text-right text-gray-600">{item.sessions.toLocaleString()}</td>
                                                                </tr>
                                                            ))}
                                                        </tbody>
                                                    </table>
                                                </div>
                                            ) : (
                                                <p className="text-gray-500 text-center py-4">No GA4 traffic data available</p>
                                            )}
                                        </div>

                                        <div>
                                            <h3 className="text-lg font-semibold mb-4">Recent Registrations</h3>
                                            {registrations.length > 0 ? (
                                                <div className="overflow-x-auto">
                                                    <table className="min-w-full divide-y divide-gray-200">
                                                        <thead className="bg-gray-50">
                                                            <tr>
                                                                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Name</th>
                                                                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Email</th>
                                                                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Location</th>
                                                                <th className="px-4 py-3 text-right text-xs font-medium text-gray-500 uppercase">Amount</th>
                                                                <th className="px-4 py-3 text-center text-xs font-medium text-gray-500 uppercase">Status</th>
                                                                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Date</th>
                                                            </tr>
                                                        </thead>
                                                        <tbody className="bg-white divide-y divide-gray-200">
                                                            {registrations.slice(0, 5).map((reg) => (
                                                                <tr key={reg.id}>
                                                                    <td className="px-4 py-3 text-sm text-gray-900">{reg.full_name}</td>
                                                                    <td className="px-4 py-3 text-sm text-gray-600">{reg.email}</td>
                                                                    <td className="px-4 py-3 text-sm text-gray-600">{reg.city}, {reg.state}</td>
                                                                    <td className="px-4 py-3 text-sm text-right text-gray-900">
                                                                        {reg.payment_amount ? formatCurrency(reg.payment_amount) : '-'}
                                                                    </td>
                                                                    <td className="px-4 py-3 text-sm text-center">
                                                                        <span className={`inline-flex px-2 py-1 text-xs font-medium rounded-full ${getStatusBadgeClass(reg.payment_status)}`}>
                                                                            {reg.payment_status || 'unknown'}
                                                                        </span>
                                                                    </td>
                                                                    <td className="px-4 py-3 text-sm text-gray-600">{formatDate(reg.created_at)}</td>
                                                                </tr>
                                                            ))}
                                                        </tbody>
                                                    </table>
                                                </div>
                                            ) : (
                                                <p className="text-gray-500 text-center py-4">No registrations found</p>
                                            )}
                                        </div>
                                    </div>
                                )}

                                {/* GA4 Traffic Tab */}
                                {activeTab === 'ga4' && (
                                    <div>
                                        <h3 className="text-lg font-semibold mb-4">GA4 Traffic Sources ({ga4Data.length} records)</h3>
                                        {ga4Data.length > 0 ? (
                                            <div className="overflow-x-auto max-h-[600px] overflow-y-auto">
                                                <table className="min-w-full divide-y divide-gray-200">
                                                    <thead className="bg-gray-50 sticky top-0">
                                                        <tr>
                                                            <th className="px-3 py-3 text-left text-xs font-medium text-gray-500 uppercase">Date</th>
                                                            <th className="px-3 py-3 text-left text-xs font-medium text-gray-500 uppercase">Source</th>
                                                            <th className="px-3 py-3 text-left text-xs font-medium text-gray-500 uppercase">Medium</th>
                                                            <th className="px-3 py-3 text-left text-xs font-medium text-gray-500 uppercase">Campaign</th>
                                                            <th className="px-3 py-3 text-right text-xs font-medium text-gray-500 uppercase">Users</th>
                                                            <th className="px-3 py-3 text-right text-xs font-medium text-gray-500 uppercase">New</th>
                                                            <th className="px-3 py-3 text-right text-xs font-medium text-gray-500 uppercase">Sessions</th>
                                                            <th className="px-3 py-3 text-right text-xs font-medium text-gray-500 uppercase">Pages</th>
                                                            <th className="px-3 py-3 text-right text-xs font-medium text-gray-500 uppercase">Bounce%</th>
                                                            <th className="px-3 py-3 text-right text-xs font-medium text-gray-500 uppercase">Conv.</th>
                                                            <th className="px-3 py-3 text-right text-xs font-medium text-gray-500 uppercase">Revenue</th>
                                                        </tr>
                                                    </thead>
                                                    <tbody className="bg-white divide-y divide-gray-200">
                                                        {ga4Data.map((item, idx) => (
                                                            <tr key={idx} className="hover:bg-gray-50">
                                                                <td className="px-3 py-2 text-sm text-gray-500">{item.date || '-'}</td>
                                                                <td className="px-3 py-2 text-sm text-gray-900">{item.utm_source || '(direct)'}</td>
                                                                <td className="px-3 py-2 text-sm text-gray-600">{item.utm_medium || '(none)'}</td>
                                                                <td className="px-3 py-2 text-sm text-gray-600 max-w-[150px] truncate" title={item.utm_campaign}>{item.utm_campaign || '(not set)'}</td>
                                                                <td className="px-3 py-2 text-sm text-right text-gray-900">{item.users?.toLocaleString() || 0}</td>
                                                                <td className="px-3 py-2 text-sm text-right text-blue-600">{item.newUsers?.toLocaleString() || 0}</td>
                                                                <td className="px-3 py-2 text-sm text-right text-gray-600">{item.sessions?.toLocaleString() || 0}</td>
                                                                <td className="px-3 py-2 text-sm text-right text-gray-600">{item.pageViews?.toLocaleString() || 0}</td>
                                                                <td className="px-3 py-2 text-sm text-right text-gray-600">{(item.bounceRate * 100)?.toFixed(1) || 0}%</td>
                                                                <td className="px-3 py-2 text-sm text-right text-green-600">{item.conversions?.toLocaleString() || 0}</td>
                                                                <td className="px-3 py-2 text-sm text-right text-green-600">{formatCurrency(item.revenue || 0)}</td>
                                                            </tr>
                                                        ))}
                                                    </tbody>
                                                </table>
                                            </div>
                                        ) : (
                                            <div className="text-center py-8">
                                                <p className="text-gray-500 mb-2">No GA4 traffic data available</p>
                                                <p className="text-sm text-gray-400">Make sure the GA4 Edge Function is configured correctly</p>
                                            </div>
                                        )}
                                    </div>
                                )}

                                {/* Registrations Tab */}
                                {activeTab === 'registrations' && (
                                    <div>
                                        <h3 className="text-lg font-semibold mb-4">All Registrations ({registrations.length})</h3>
                                        {registrations.length > 0 ? (
                                            <div className="overflow-x-auto">
                                                <table className="min-w-full divide-y divide-gray-200">
                                                    <thead className="bg-gray-50">
                                                        <tr>
                                                            <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Name</th>
                                                            <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Email</th>
                                                            <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Phone</th>
                                                            <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Location</th>
                                                            <th className="px-4 py-3 text-right text-xs font-medium text-gray-500 uppercase">Amount</th>
                                                            <th className="px-4 py-3 text-center text-xs font-medium text-gray-500 uppercase">Status</th>
                                                            <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Date</th>
                                                        </tr>
                                                    </thead>
                                                    <tbody className="bg-white divide-y divide-gray-200">
                                                        {registrations.map((reg) => (
                                                            <tr key={reg.id}>
                                                                <td className="px-4 py-3 text-sm text-gray-900">{reg.full_name}</td>
                                                                <td className="px-4 py-3 text-sm text-gray-600">{reg.email}</td>
                                                                <td className="px-4 py-3 text-sm text-gray-600">{reg.phone}</td>
                                                                <td className="px-4 py-3 text-sm text-gray-600">{reg.city}, {reg.state}</td>
                                                                <td className="px-4 py-3 text-sm text-right text-gray-900">
                                                                    {reg.payment_amount ? formatCurrency(reg.payment_amount) : '-'}
                                                                </td>
                                                                <td className="px-4 py-3 text-sm text-center">
                                                                    <span className={`inline-flex px-2 py-1 text-xs font-medium rounded-full ${getStatusBadgeClass(reg.payment_status)}`}>
                                                                        {reg.payment_status || 'unknown'}
                                                                    </span>
                                                                </td>
                                                                <td className="px-4 py-3 text-sm text-gray-600">{formatDate(reg.created_at)}</td>
                                                            </tr>
                                                        ))}
                                                    </tbody>
                                                </table>
                                            </div>
                                        ) : (
                                            <div className="text-center py-8">
                                                <p className="text-gray-500 mb-2">No registrations found</p>
                                                <p className="text-sm text-gray-400">Try adjusting the date range</p>
                                            </div>
                                        )}
                                    </div>
                                )}

                                {/* QR Codes Tab */}
                                {activeTab === 'qr' && (
                                    <div>
                                        <div className="flex justify-between items-center mb-4">
                                            <h3 className="text-lg font-semibold">QR Code Performance ({qrPerformance.length} codes)</h3>
                                            <div className="flex gap-4 text-sm">
                                                <span className="text-purple-600 font-medium">Total Scans: {stats.totalQRScans.toLocaleString()}</span>
                                                <span className="text-blue-600 font-medium">Registrations: {stats.totalQRRegistrations.toLocaleString()}</span>
                                                <span className="text-green-600 font-medium">Revenue: {formatCurrency(stats.totalQRRevenue)}</span>
                                            </div>
                                        </div>
                                        {qrPerformance.length > 0 ? (
                                            <div className="overflow-x-auto max-h-[600px] overflow-y-auto">
                                                <table className="min-w-full divide-y divide-gray-200">
                                                    <thead className="bg-gray-50 sticky top-0">
                                                        <tr>
                                                            <th className="px-3 py-3 text-left text-xs font-medium text-gray-500 uppercase">QR Code</th>
                                                            <th className="px-3 py-3 text-left text-xs font-medium text-gray-500 uppercase">Title</th>
                                                            <th className="px-3 py-3 text-left text-xs font-medium text-gray-500 uppercase">Channel</th>
                                                            <th className="px-3 py-3 text-right text-xs font-medium text-gray-500 uppercase">Scans</th>
                                                            <th className="px-3 py-3 text-right text-xs font-medium text-gray-500 uppercase">Registrations</th>
                                                            <th className="px-3 py-3 text-right text-xs font-medium text-gray-500 uppercase">Paid</th>
                                                            <th className="px-3 py-3 text-right text-xs font-medium text-gray-500 uppercase">Scan→Reg%</th>
                                                            <th className="px-3 py-3 text-right text-xs font-medium text-gray-500 uppercase">Scan→Pay%</th>
                                                            <th className="px-3 py-3 text-right text-xs font-medium text-gray-500 uppercase">Revenue</th>
                                                            <th className="px-3 py-3 text-center text-xs font-medium text-gray-500 uppercase">Status</th>
                                                        </tr>
                                                    </thead>
                                                    <tbody className="bg-white divide-y divide-gray-200">
                                                        {qrPerformance.map((qr) => (
                                                            <tr key={qr.qr_code_id} className="hover:bg-gray-50">
                                                                <td className="px-3 py-2 text-sm">
                                                                    <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-purple-100 text-purple-800">
                                                                        📱 {qr.qr_code_id}
                                                                    </span>
                                                                </td>
                                                                <td className="px-3 py-2 text-sm text-gray-900 max-w-[150px] truncate" title={qr.qr_code_title}>
                                                                    {qr.qr_code_title || '-'}
                                                                </td>
                                                                <td className="px-3 py-2 text-sm text-gray-600">{qr.channel || '-'}</td>
                                                                <td className="px-3 py-2 text-sm text-right text-purple-600 font-medium">{qr.total_scans?.toLocaleString() || 0}</td>
                                                                <td className="px-3 py-2 text-sm text-right text-blue-600">{qr.total_registrations?.toLocaleString() || 0}</td>
                                                                <td className="px-3 py-2 text-sm text-right text-green-600">{qr.total_paid_registrations?.toLocaleString() || 0}</td>
                                                                <td className="px-3 py-2 text-sm text-right text-gray-600">
                                                                    {qr.scan_to_registration_rate != null ? `${qr.scan_to_registration_rate.toFixed(1)}%` : '-'}
                                                                </td>
                                                                <td className="px-3 py-2 text-sm text-right text-gray-600">
                                                                    {qr.scan_to_payment_rate != null ? `${qr.scan_to_payment_rate.toFixed(1)}%` : '-'}
                                                                </td>
                                                                <td className="px-3 py-2 text-sm text-right text-green-600 font-medium">{formatCurrency(qr.total_revenue || 0)}</td>
                                                                <td className="px-3 py-2 text-sm text-center">
                                                                    <span className={`inline-flex px-2 py-1 text-xs font-medium rounded-full ${qr.is_active ? 'bg-green-100 text-green-800' : 'bg-gray-100 text-gray-800'}`}>
                                                                        {qr.is_active ? 'Active' : 'Inactive'}
                                                                    </span>
                                                                </td>
                                                            </tr>
                                                        ))}
                                                    </tbody>
                                                </table>
                                            </div>
                                        ) : (
                                            <div className="text-center py-8">
                                                <p className="text-gray-500 mb-2">No QR codes found</p>
                                                <p className="text-sm text-gray-400">Create QR codes from the QR Management section</p>
                                            </div>
                                        )}
                                    </div>
                                )}
                            </>
                        )}
                    </div>
                </div>

                {/* Debug Info (collapsed by default) */}
                <details className="mt-6 bg-gray-100 rounded-lg p-4">
                    <summary className="cursor-pointer text-sm text-gray-600 font-medium">Debug Information</summary>
                    <div className="mt-4 space-y-2 text-xs font-mono">
                        <p>GA4 Total Rows in GA4: {stats.ga4TotalRows.toLocaleString()}</p>
                        <p>GA4 Fetched Rows: {stats.ga4FetchedRows.toLocaleString()}</p>
                        <p>GA4 Data in Dashboard: {ga4Data.length}</p>
                        <p>Registration Records: {registrations.length}</p>
                        <p>Date Range: {dateRange.startDate} to {dateRange.endDate}</p>
                        <p>Last Error: {error || 'None'}</p>
                    </div>
                </details>
            </div>
        </div>
    );
}
