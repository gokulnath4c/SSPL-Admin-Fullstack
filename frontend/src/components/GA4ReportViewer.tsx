import React, { useState } from 'react';
import { ga4DataFetchService, GA4UTMReport } from '../services/ga4DataFetchService';
import { RefreshCw, TrendingUp, Users, DollarSign, Activity } from 'lucide-react';

/**
 * GA4 Report Viewer Component
 * Displays UTM campaign data from Google Analytics 4
 * Adapted for Admin Panel (Raw Tailwind CSS)
 */
const GA4ReportViewer: React.FC = () => {
    const [reports, setReports] = useState<GA4UTMReport[]>([]);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [lastUpdated, setLastUpdated] = useState<Date | null>(null);
    const [dateRange, setDateRange] = useState({ start: '30daysAgo', end: 'today' });

    const fetchGA4Data = async () => {
        setLoading(true);
        setError(null);

        try {
            const response = await ga4DataFetchService.getUTMCampaignReport(
                dateRange.start,
                dateRange.end
            );

            const data = response.data || [];
            setReports(data);
            setLastUpdated(new Date());

            if (data.length === 0) {
                setError('No data available for the selected date range. This could mean no UTM events were tracked in GA4 or the custom dimensions are not set up.');
            }
        } catch (err) {
            setError(err instanceof Error ? err.message : 'Failed to fetch GA4 data');
            console.error('Error fetching GA4 data:', err);
        } finally {
            setLoading(false);
        }
    };

    const getTotalStats = () => {
        return reports.reduce(
            (acc, report) => ({
                totalUsers: acc.totalUsers + (report.users || 0),
                totalSessions: acc.totalSessions + (report.sessions || 0),
                totalConversions: acc.totalConversions + (report.conversions || 0),
                totalRevenue: acc.totalRevenue + (report.revenue || 0),
            }),
            { totalUsers: 0, totalSessions: 0, totalConversions: 0, totalRevenue: 0 }
        );
    };

    const stats = getTotalStats();
    const conversionRate = stats.totalSessions > 0
        ? ((stats.totalConversions / stats.totalSessions) * 100).toFixed(2)
        : '0.00';

    return (
        <div className="space-y-6">
            {/* Header Card */}
            <div className="bg-white rounded-lg shadow-sm border border-gray-200">
                <div className="p-6 flex items-center justify-between border-b border-gray-200">
                    <div>
                        <h3 className="text-2xl font-semibold leading-none tracking-tight">Google Analytics 4 Reports</h3>
                        <p className="text-sm text-gray-500 mt-1">
                            UTM Campaign Performance from GA4 Data API
                            {lastUpdated && (
                                <span className="ml-2 text-xs">
                                    Last updated: {lastUpdated.toLocaleTimeString()}
                                </span>
                            )}
                        </p>
                    </div>
                    <button
                        onClick={fetchGA4Data}
                        disabled={loading}
                        className="inline-flex items-center justify-center rounded-md text-sm font-medium transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:opacity-50 disabled:pointer-events-none ring-offset-background bg-slate-900 text-white hover:bg-slate-900/90 h-10 py-2 px-4 ml-auto gap-2"
                    >
                        <RefreshCw className={`h-4 w-4 ${loading ? 'animate-spin' : ''}`} />
                        {loading ? 'Loading...' : 'Fetch GA4 Data'}
                    </button>
                </div>
                <div className="p-6">
                    <div className="flex gap-4 mb-4">
                        <div className="flex-1">
                            <label className="block text-sm font-medium mb-2" htmlFor="ga4-start-date">
                                Start Date
                            </label>
                            <select
                                id="ga4-start-date"
                                className="w-full p-2 border border-gray-300 rounded-md bg-white text-sm"
                                value={dateRange.start}
                                onChange={(e) => setDateRange({ ...dateRange, start: e.target.value })}
                            >
                                <option value="7daysAgo">Last 7 days</option>
                                <option value="14daysAgo">Last 14 days</option>
                                <option value="30daysAgo">Last 30 days</option>
                                <option value="60daysAgo">Last 60 days</option>
                                <option value="90daysAgo">Last 90 days</option>
                            </select>
                        </div>
                        <div className="flex-1">
                            <label className="block text-sm font-medium mb-2" htmlFor="ga4-end-date">
                                End Date
                            </label>
                            <select
                                id="ga4-end-date"
                                className="w-full p-2 border border-gray-300 rounded-md bg-white text-sm"
                                value={dateRange.end}
                                onChange={(e) => setDateRange({ ...dateRange, end: e.target.value })}
                            >
                                <option value="today">Today</option>
                                <option value="yesterday">Yesterday</option>
                            </select>
                        </div>
                    </div>

                    {error && (
                        <div className="bg-red-50 border border-red-200 text-red-800 rounded-lg p-4 mb-4" role="alert">
                            <div className="text-sm font-medium">{error}</div>
                        </div>
                    )}
                </div>
            </div>

            {/* Summary Stats */}
            {reports.length > 0 && (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                    <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
                        <div className="flex items-center justify-between">
                            <div>
                                <p className="text-sm text-gray-500">Total Users</p>
                                <p className="text-2xl font-bold">{stats.totalUsers.toLocaleString()}</p>
                            </div>
                            <Users className="h-8 w-8 text-blue-500" />
                        </div>
                    </div>

                    <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
                        <div className="flex items-center justify-between">
                            <div>
                                <p className="text-sm text-gray-500">Total Sessions</p>
                                <p className="text-2xl font-bold">{stats.totalSessions.toLocaleString()}</p>
                            </div>
                            <Activity className="h-8 w-8 text-green-500" />
                        </div>
                    </div>

                    <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
                        <div className="flex items-center justify-between">
                            <div>
                                <p className="text-sm text-gray-500">Conversions</p>
                                <p className="text-2xl font-bold">{stats.totalConversions.toLocaleString()}</p>
                                <p className="text-xs text-gray-400">{conversionRate}% rate</p>
                            </div>
                            <TrendingUp className="h-8 w-8 text-purple-500" />
                        </div>
                    </div>

                    <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
                        <div className="flex items-center justify-between">
                            <div>
                                <p className="text-sm text-gray-500">Total Revenue</p>
                                <p className="text-2xl font-bold">₹{stats.totalRevenue.toLocaleString()}</p>
                            </div>
                            <DollarSign className="h-8 w-8 text-orange-500" />
                        </div>
                    </div>
                </div>
            )}

            {/* Campaign Details Table */}
            {reports.length > 0 && (
                <div className="bg-white rounded-lg shadow-sm border border-gray-200">
                    <div className="flex flex-col space-y-1.5 p-6">
                        <h3 className="text-2xl font-semibold leading-none tracking-tight">Campaign Breakdown</h3>
                        <p className="text-sm text-gray-500">UTM campaign performance details from GA4</p>
                    </div>
                    <div className="p-6 pt-0">
                        <div className="overflow-x-auto">
                            <table className="w-full text-sm">
                                <thead>
                                    <tr className="border-b transition-colors hover:bg-muted/50 data-[state=selected]:bg-muted">
                                        <th className="h-12 px-4 text-left align-middle font-medium text-gray-500">UTM ID</th>
                                        <th className="h-12 px-4 text-left align-middle font-medium text-gray-500">Source</th>
                                        <th className="h-12 px-4 text-left align-middle font-medium text-gray-500">Medium</th>
                                        <th className="h-12 px-4 text-left align-middle font-medium text-gray-500">Campaign</th>
                                        <th className="h-12 px-4 text-right align-middle font-medium text-gray-500">Users</th>
                                        <th className="h-12 px-4 text-right align-middle font-medium text-gray-500">Sessions</th>
                                        <th className="h-12 px-4 text-right align-middle font-medium text-gray-500">Conversions</th>
                                        <th className="h-12 px-4 text-right align-middle font-medium text-gray-500">Revenue</th>
                                        <th className="h-12 px-4 text-right align-middle font-medium text-gray-500">Conv. Rate</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    {reports.map((report, index) => {
                                        const rate = report.sessions > 0
                                            ? ((report.conversions / report.sessions) * 100).toFixed(1)
                                            : '0.0';

                                        return (
                                            <tr key={index} className="border-b transition-colors hover:bg-gray-100/50">
                                                <td className="p-4 align-middle font-mono text-xs">{report.utm_id || 'N/A'}</td>
                                                <td className="p-4 align-middle">{report.utm_source || 'N/A'}</td>
                                                <td className="p-4 align-middle">{report.utm_medium || 'N/A'}</td>
                                                <td className="p-4 align-middle">{report.utm_campaign || 'N/A'}</td>
                                                <td className="p-4 align-middle text-right">{report.users || 0}</td>
                                                <td className="p-4 align-middle text-right">{report.sessions || 0}</td>
                                                <td className="p-4 align-middle text-right font-semibold text-gray-900">{report.conversions || 0}</td>
                                                <td className="p-4 align-middle text-right">₹{(report.revenue || 0).toLocaleString()}</td>
                                                <td className="p-4 align-middle text-right text-muted-foreground">{rate}%</td>
                                            </tr>
                                        );
                                    })}
                                </tbody>
                            </table>
                        </div>
                    </div>
                </div>
            )}

            {/* Empty State */}
            {!loading && reports.length === 0 && !error && (
                <div className="bg-white rounded-lg shadow-sm border border-gray-200">
                    <div className="p-12 text-center">
                        <Activity className="h-16 w-16 mx-auto mb-4 text-gray-300" />
                        <h3 className="text-lg font-semibold mb-2 text-gray-900">No GA4 Data</h3>
                        <p className="text-gray-500 mb-4">
                            Click "Fetch GA4 Data" to load analytics from Google Analytics 4
                        </p>
                        <button
                            onClick={fetchGA4Data}
                            disabled={loading}
                            className="inline-flex items-center justify-center rounded-md text-sm font-medium transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:opacity-50 disabled:pointer-events-none ring-offset-background bg-blue-600 text-white hover:bg-blue-700 h-10 py-2 px-4"
                        >
                            Fetch GA4 Data
                        </button>
                    </div>
                </div>
            )}
        </div>
    );
};

export default GA4ReportViewer;
