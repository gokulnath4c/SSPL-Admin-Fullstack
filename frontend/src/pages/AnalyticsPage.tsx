import { useState, useEffect } from 'react'
import { supabase } from '@/lib/supabase'
import GA4ReportViewer from '../components/GA4ReportViewer'
import UTMAnalyticsDashboard from '../components/UTMAnalyticsDashboard'

interface VisitorLead {
    id: string
    created_at: string
    name: string | null
    email: string | null
    phone: string | null
    utm_source: string | null
    utm_medium: string | null
    utm_campaign: string | null
    page_url: string | null
    qr_code_id: string | null
}


interface UTMEvent {
    id: string
    created_at: string
    event_type: string
    utm_source: string | null
    utm_medium: string | null
    utm_campaign: string | null
}

export default function AnalyticsPage() {
    const [activeTab, setActiveTab] = useState<'leads' | 'utm' | 'ga4' | 'dashboard'>('dashboard')
    const [leads, setLeads] = useState<VisitorLead[]>([])
    const [utmEvents, setUtmEvents] = useState<UTMEvent[]>([])
    const [loading, setLoading] = useState(false)
    const [page, setPage] = useState(1)
    const [totalPages, setTotalPages] = useState(1)
    const [totalLeads, setTotalLeads] = useState(0)
    const [startDate, setStartDate] = useState<string>('2025-06-01') // Default to June 1st 2025 as requested
    const [endDate, setEndDate] = useState<string>(new Date().toISOString().split('T')[0])
    const ITEMS_PER_PAGE = 20

    useEffect(() => {
        if (activeTab === 'leads') fetchLeads(1)
        if (activeTab === 'utm') fetchUtmEvents()
    }, [activeTab, startDate, endDate])

    const fetchLeads = async (pageNumber = 1) => {
        setLoading(true)
        const from = (pageNumber - 1) * ITEMS_PER_PAGE
        const to = from + ITEMS_PER_PAGE - 1

        try {
            let query = (supabase.from('visitor_leads' as any) as any).select('*', { count: 'exact', head: true })

            if (startDate) query = query.gte('created_at', `${startDate}T00:00:00`)
            if (endDate) query = query.lte('created_at', `${endDate}T23:59:59`)

            const { count, error: countError } = await query

            if (count !== null) {
                setTotalLeads(count)
                setTotalPages(Math.ceil(count / ITEMS_PER_PAGE))
            }

            let dataQuery = (supabase.from('visitor_leads' as any) as any).select('*')

            if (startDate) dataQuery = dataQuery.gte('created_at', `${startDate}T00:00:00`)
            if (endDate) dataQuery = dataQuery.lte('created_at', `${endDate}T23:59:59`)

            const { data, error } = await dataQuery
                .order('created_at', { ascending: false })
                .range(from, to)

            if (!error && data) {
                setLeads(data)
                setPage(pageNumber)
            } else {
                console.error('Error fetching leads:', error)
            }
        } catch (err) {
            console.error('Unexpected error fetching leads:', err)
        } finally {
            setLoading(false)
        }
    }

    const [downloading, setDownloading] = useState(false)

    const downloadLeadsCSV = async () => {
        setDownloading(true)
        try {
            let allLeads: VisitorLead[] = []
            let page = 0
            const pageSize = 1000
            let hasMore = true

            while (hasMore) {
                const from = page * pageSize
                const to = from + pageSize - 1

                let query = (supabase.from('visitor_leads' as any) as any).select('*')

                if (startDate) query = query.gte('created_at', `${startDate}T00:00:00`)
                if (endDate) query = query.lte('created_at', `${endDate}T23:59:59`)

                const { data, error } = await query
                    .order('created_at', { ascending: false })
                    .range(from, to)

                if (error) {
                    console.error('Error fetching leads for CSV:', error)
                    break
                }

                if (data && data.length > 0) {
                    allLeads = [...allLeads, ...data]
                    if (data.length < pageSize) {
                        hasMore = false
                    } else {
                        page++
                    }
                } else {
                    hasMore = false
                }
            }

            if (allLeads.length > 0) {
                const headers = ['Date', 'Name', 'Email', 'Phone', 'Source', 'Medium', 'Campaign', 'Page URL', 'QR Code']
                const csvContent = [
                    headers.join(','),
                    ...allLeads.map((lead: VisitorLead) => [
                        `"${lead.created_at}"`,
                        `"${lead.name || ''}"`,
                        `"${lead.email || ''}"`,
                        `"${lead.phone || ''}"`,
                        `"${lead.utm_source || ''}"`,
                        `"${lead.utm_medium || ''}"`,
                        `"${lead.utm_campaign || ''}"`,
                        `"${lead.page_url || ''}"`,
                        `"${lead.qr_code_id || ''}"`
                    ].join(','))
                ].join('\n')

                const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' })
                const url = URL.createObjectURL(blob)
                const link = document.createElement('a')
                link.href = url
                link.setAttribute('download', `visitor_leads_export_${new Date().toISOString().split('T')[0]}.csv`)
                document.body.appendChild(link)
                link.click()
                document.body.removeChild(link)
            }
        } catch (err) {
            console.error('Error downloading CSV:', err)
        } finally {
            setDownloading(false)
        }
    }

    const fetchUtmEvents = async () => {
        setLoading(true)
        const { data, error } = await supabase
            .from('utm_events')
            .select('*')
            .order('created_at', { ascending: false })
            .limit(100)

        if (!error && data) {
            setUtmEvents(data)
        }
        setLoading(false)
    }

    return (
        <div className="space-y-6 p-6">
            <h1 className="text-2xl font-bold text-gray-900">Analytics & Tracking</h1>

            {/* Tabs */}
            <div className="flex space-x-4 border-b border-gray-200 overflow-x-auto">
                <button
                    onClick={() => setActiveTab('dashboard')}
                    className={`py-2 px-4 font-medium text-sm focus:outline-none whitespace-nowrap ${activeTab === 'dashboard'
                        ? 'border-b-2 border-blue-500 text-blue-600'
                        : 'text-gray-500 hover:text-gray-700'
                        }`}
                >
                    Overview Dashboard
                </button>
                <button
                    onClick={() => setActiveTab('leads')}
                    className={`py-2 px-4 font-medium text-sm focus:outline-none ${activeTab === 'leads'
                        ? 'border-b-2 border-blue-500 text-blue-600'
                        : 'text-gray-500 hover:text-gray-700'
                        }`}
                >
                    Visitor Leads
                </button>
                <button
                    onClick={() => setActiveTab('utm')}
                    className={`py-2 px-4 font-medium text-sm focus:outline-none ${activeTab === 'utm'
                        ? 'border-b-2 border-blue-500 text-blue-600'
                        : 'text-gray-500 hover:text-gray-700'
                        }`}
                >
                    UTM Events
                </button>
                <button
                    onClick={() => setActiveTab('ga4')}
                    className={`py-2 px-4 font-medium text-sm focus:outline-none ${activeTab === 'ga4'
                        ? 'border-b-2 border-blue-500 text-blue-600'
                        : 'text-gray-500 hover:text-gray-700'
                        }`}
                >
                    Google Analytics 4
                </button>
            </div>

            {/* Content */}
            <div className="mt-6">
                {activeTab === 'dashboard' && <UTMAnalyticsDashboard />}

                {loading ? (
                    <div className="text-center py-10 text-gray-500">Loading data...</div>
                ) : (
                    <>
                        {activeTab === 'leads' && (
                            <div className="bg-white shadow overflow-hidden rounded-md">
                                <div className="px-6 py-4 border-b border-gray-200 flex justify-between items-center bg-gray-50">
                                    <h3 className="text-lg font-medium leading-6 text-gray-900">
                                        Visitor Leads ({totalLeads})
                                    </h3>
                                    <div className="flex flex-wrap items-center gap-4">
                                        <div className="flex items-center space-x-2">
                                            <label className="text-xs text-gray-500 font-medium">From:</label>
                                            <input
                                                type="date"
                                                value={startDate}
                                                onChange={(e) => setStartDate(e.target.value)}
                                                className="block w-full text-xs border-gray-300 rounded-md shadow-sm focus:ring-blue-500 focus:border-blue-500"
                                            />
                                        </div>
                                        <div className="flex items-center space-x-2">
                                            <label className="text-xs text-gray-500 font-medium">To:</label>
                                            <input
                                                type="date"
                                                value={endDate}
                                                onChange={(e) => setEndDate(e.target.value)}
                                                className="block w-full text-xs border-gray-300 rounded-md shadow-sm focus:ring-blue-500 focus:border-blue-500"
                                            />
                                        </div>
                                        <div className="flex space-x-2">
                                            <button
                                                onClick={() => fetchLeads(1)}
                                                className="inline-flex items-center px-4 py-2 border border-gray-300 text-sm font-medium rounded-md shadow-sm text-gray-700 bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
                                            >
                                                <svg className={`-ml-1 mr-2 h-5 w-5 text-gray-500 ${loading ? 'animate-spin' : ''}`} fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
                                                </svg>
                                                Refresh
                                            </button>
                                            <button
                                                onClick={downloadLeadsCSV}
                                                disabled={downloading}
                                                className={`inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md shadow-sm text-white ${downloading ? 'bg-green-400 cursor-not-allowed' : 'bg-green-600 hover:bg-green-700'} focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-green-500`}
                                            >
                                                {downloading ? (
                                                    <>
                                                        <svg className="animate-spin -ml-1 mr-2 h-5 w-5 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                                                            <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                                                            <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                                                        </svg>
                                                        Downloading...
                                                    </>
                                                ) : (
                                                    <>
                                                        <svg className="-ml-1 mr-2 h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" />
                                                        </svg>
                                                        Download CSV
                                                    </>
                                                )}
                                            </button>
                                        </div>
                                    </div>
                                </div>
                                <div className="overflow-x-auto">
                                    <table className="min-w-full divide-y divide-gray-200">
                                        <thead className="bg-gray-50">
                                            <tr>
                                                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Date</th>
                                                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Name</th>
                                                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Contact</th>
                                                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Source</th>
                                                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">QR Code</th>
                                            </tr>
                                        </thead>
                                        <tbody className="bg-white divide-y divide-gray-200">
                                            {leads.length === 0 ? (
                                                <tr>
                                                    <td colSpan={5} className="px-6 py-4 text-center text-gray-500">No leads found yet.</td>
                                                </tr>
                                            ) : (
                                                leads.map((lead) => (
                                                    <tr key={lead.id}>
                                                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                                                            {new Date(lead.created_at).toLocaleDateString()} {new Date(lead.created_at).toLocaleTimeString()}
                                                        </td>
                                                        <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">
                                                            {lead.name || '-'}
                                                        </td>
                                                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                                                            <div>{lead.phone || '-'}</div>
                                                            <div className="text-xs text-gray-400">{lead.email}</div>
                                                        </td>
                                                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                                                            <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-blue-100 text-blue-800">
                                                                {lead.utm_source || 'Direct'}
                                                            </span>
                                                            {lead.page_url && (
                                                                <div className="text-xs text-gray-400 mt-1 max-w-xs truncate" title={lead.page_url}>
                                                                    {new URL(lead.page_url).pathname}
                                                                </div>
                                                            )}
                                                        </td>
                                                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                                                            {lead.qr_code_id ? (
                                                                <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-purple-100 text-purple-800">
                                                                    📱 {lead.qr_code_id}
                                                                </span>
                                                            ) : (
                                                                <span className="text-gray-400">-</span>
                                                            )}
                                                        </td>
                                                    </tr>
                                                ))
                                            )}
                                        </tbody>
                                    </table>
                                </div>
                                {totalPages > 1 && (
                                    <div className="bg-white px-4 py-3 flex items-center justify-between border-t border-gray-200 sm:px-6">
                                        <div className="flex-1 flex justify-between sm:hidden">
                                            <button
                                                onClick={() => fetchLeads(page - 1)}
                                                disabled={page === 1}
                                                className="relative inline-flex items-center px-4 py-2 border border-gray-300 text-sm font-medium rounded-md text-gray-700 bg-white hover:bg-gray-50 disabled:bg-gray-100 disabled:cursor-not-allowed"
                                            >
                                                Previous
                                            </button>
                                            <button
                                                onClick={() => fetchLeads(page + 1)}
                                                disabled={page === totalPages}
                                                className="ml-3 relative inline-flex items-center px-4 py-2 border border-gray-300 text-sm font-medium rounded-md text-gray-700 bg-white hover:bg-gray-50 disabled:bg-gray-100 disabled:cursor-not-allowed"
                                            >
                                                Next
                                            </button>
                                        </div>
                                        <div className="hidden sm:flex-1 sm:flex sm:items-center sm:justify-between">
                                            <div>
                                                <p className="text-sm text-gray-700">
                                                    Showing <span className="font-medium">{(page - 1) * ITEMS_PER_PAGE + 1}</span> to <span className="font-medium">{Math.min(page * ITEMS_PER_PAGE, totalLeads)}</span> of <span className="font-medium">{totalLeads}</span> results
                                                </p>
                                            </div>
                                            <div>
                                                <nav className="relative z-0 inline-flex rounded-md shadow-sm -space-x-px" aria-label="Pagination">
                                                    <button
                                                        onClick={() => fetchLeads(page - 1)}
                                                        disabled={page === 1}
                                                        className="relative inline-flex items-center px-2 py-2 rounded-l-md border border-gray-300 bg-white text-sm font-medium text-gray-500 hover:bg-gray-50 disabled:bg-gray-100 disabled:cursor-not-allowed"
                                                    >
                                                        <span className="sr-only">Previous</span>
                                                        <svg className="h-5 w-5" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor" aria-hidden="true">
                                                            <path fillRule="evenodd" d="M12.707 5.293a1 1 0 010 1.414L9.414 10l3.293 3.293a1 1 0 01-1.414 1.414l-4-4a1 1 0 010-1.414l4-4a1 1 0 011.414 0z" clipRule="evenodd" />
                                                        </svg>
                                                    </button>
                                                    <span className="relative inline-flex items-center px-4 py-2 border border-gray-300 bg-white text-sm font-medium text-gray-700">
                                                        Page {page} of {totalPages}
                                                    </span>
                                                    <button
                                                        onClick={() => fetchLeads(page + 1)}
                                                        disabled={page === totalPages}
                                                        className="relative inline-flex items-center px-2 py-2 rounded-r-md border border-gray-300 bg-white text-sm font-medium text-gray-500 hover:bg-gray-50 disabled:bg-gray-100 disabled:cursor-not-allowed"
                                                    >
                                                        <span className="sr-only">Next</span>
                                                        <svg className="h-5 w-5" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor" aria-hidden="true">
                                                            <path fillRule="evenodd" d="M7.293 14.707a1 1 0 010-1.414L10.586 10 7.293 6.707a1 1 0 011.414-1.414l4 4a1 1 0 010 1.414l-4 4a1 1 0 01-1.414 0z" clipRule="evenodd" />
                                                        </svg>
                                                    </button>
                                                </nav>
                                            </div>
                                        </div>
                                    </div>
                                )}
                            </div>
                        )}

                        {activeTab === 'utm' && (
                            <div className="bg-white shadow overflow-hidden rounded-md">
                                <table className="min-w-full divide-y divide-gray-200">
                                    <thead className="bg-gray-50">
                                        <tr>
                                            <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Date</th>
                                            <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Event</th>
                                            <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Campaign</th>
                                        </tr>
                                    </thead>
                                    <tbody className="bg-white divide-y divide-gray-200">
                                        {utmEvents.length === 0 ? (
                                            <tr>
                                                <td colSpan={3} className="px-6 py-4 text-center text-gray-500">No events found.</td>
                                            </tr>
                                        ) : (
                                            utmEvents.map((event) => (
                                                <tr key={event.id}>
                                                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                                                        {new Date(event.created_at).toLocaleDateString()} {new Date(event.created_at).toLocaleTimeString()}
                                                    </td>
                                                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                                                        {event.event_type}
                                                    </td>
                                                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                                                        {event.utm_campaign} ({event.utm_source})
                                                    </td>
                                                </tr>
                                            ))
                                        )}
                                    </tbody>
                                </table>
                            </div>
                        )}

                        {activeTab === 'ga4' && (
                            <GA4ReportViewer />
                        )}
                    </>
                )}
            </div>
        </div>
    )
}
