import { useState, useEffect } from 'react'
import { Search, RotateCw, ExternalLink, Download, Calendar } from 'lucide-react'
import { config } from '@lib/config'

const API_URL = config.api.url;

interface Transaction {
    id: string
    payment_id: string | null
    order_id: string
    amount: number
    status: string
    contact: string
    email: string
    method: string
    created_at: string
    razorpay_dashboard_url: string
}

export default function RazorpayTransactionsPage() {
    const [transactions, setTransactions] = useState<Transaction[]>([])
    const [loading, setLoading] = useState(true)
    const [searchTerm, setSearchTerm] = useState('')
    const [statusFilter, setStatusFilter] = useState('')
    const [page, setPage] = useState(1)
    const [limit, setLimit] = useState(20)
    const [totalPages, setTotalPages] = useState(1)
    const [stats, setStats] = useState({
        total_count: 0,
        total_volume: 0,
        success_count: 0,
        success_volume: 0,
        failed_count: 0,
        net_failed_count: 0
    })

    // Date Filters
    const [dateRange, setDateRange] = useState({
        from: '',
        to: ''
    })

    const fetchTransactions = async () => {
        setLoading(true)
        try {
            // Construct API URL with params
            const params = new URLSearchParams()
            params.append('page', page.toString())
            params.append('limit', limit.toString())
            if (searchTerm) params.append('search', searchTerm)
            if (statusFilter) params.append('status', statusFilter)
            if (activeTab === 'net_failed') params.append('view', 'net_failed')

            if (dateRange.from) {
                // Set to start of day in local time explicitly
                params.append('from', new Date(dateRange.from + 'T00:00:00').toISOString())
            }
            if (dateRange.to) {
                // End of day
                const toDate = new Date(dateRange.to + 'T23:59:59.999')
                params.append('to', toDate.toISOString())
            }

            const qs = params.toString();

            // Fetch Data
            const response = await fetch(`${API_URL}/admin/razorpay/transactions?${qs}`)
            const data = await response.json()

            // Fetch Stats
            const statsRes = await fetch(`${API_URL}/admin/razorpay/stats?${qs}`)
            const statsData = await statsRes.json()
            if (statsData) setStats(statsData)

            if (data.data) {
                setTransactions(data.data)
                setTotalPages(Math.ceil(data.pagination.total / data.pagination.limit))
            }
        } catch (error) {
            console.error('Failed to fetch transactions', error)
        } finally {
            setLoading(false)
        }
    }

    const [activeTab, setActiveTab] = useState<'transactions' | 'history' | 'net_failed'>('transactions')
    const [historyLogs, setHistoryLogs] = useState<any[]>([])
    const [historyLoading, setHistoryLoading] = useState(false)

    const fetchHistory = async () => {
        setHistoryLoading(true)
        try {
            const response = await fetch(`${API_URL}/admin/email/logs?type=payment_reminder&limit=100`)
            const data = await response.json()
            if (Array.isArray(data)) {
                setHistoryLogs(data)
            }
        } catch (error) {
            console.error('Failed to fetch history', error)
        } finally {
            setHistoryLoading(false)
        }
    }

    useEffect(() => {
        setTransactions([]) // Clear stale data when switching tabs/filters
        if (activeTab === 'history') {
            fetchHistory()
        } else {
            fetchTransactions()
        }
    }, [page, limit, searchTerm, statusFilter, dateRange, activeTab])

    const handleTabChange = (tab: 'transactions' | 'history' | 'net_failed') => {
        setPage(1)
        setActiveTab(tab)
    }

    const handleReconcile = async () => {
        if (!confirm('Start reconciliation for the last 24 hours?')) return
        try {
            const yesterday = new Date();
            yesterday.setDate(yesterday.getDate() - 1);
            const from = yesterday.toISOString();
            const to = new Date().toISOString();
            await fetch(`${API_URL}/admin/razorpay/reconcile?from=${from}&to=${to}`)
            alert('Reconciliation started/completed. Check logs.')
            fetchTransactions()
        } catch (e) {
            alert('Reconciliation failed')
        }
    }

    const handlePreset = (days: number) => {
        const today = new Date();
        const pastDate = new Date();
        pastDate.setDate(today.getDate() - days);

        // Format as YYYY-MM-DD using Local Time
        const toStr = today.getFullYear() + '-' + String(today.getMonth() + 1).padStart(2, '0') + '-' + String(today.getDate()).padStart(2, '0');
        const fromStr = pastDate.getFullYear() + '-' + String(pastDate.getMonth() + 1).padStart(2, '0') + '-' + String(pastDate.getDate()).padStart(2, '0');

        setDateRange({
            from: fromStr,
            to: toStr
        })
    }

    const handleLimitChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
        setLimit(Number(e.target.value))
        setPage(1)
    }

    const handleExport = () => {
        const params = new URLSearchParams()
        if (searchTerm) params.append('search', searchTerm)
        if (statusFilter) params.append('status', statusFilter)

        if (dateRange.from) {
            params.append('from', new Date(dateRange.from + 'T00:00:00').toISOString())
        }
        if (dateRange.to) {
            const toDate = new Date(dateRange.to + 'T23:59:59.999')
            params.append('to', toDate.toISOString())
        }

        window.open(`${API_URL}/admin/razorpay/export?${params.toString()}`, '_blank')
    }

    return (
        <div className="space-y-6">
            <div className="flex justify-between items-center">
                <h1 className="text-2xl font-bold text-gray-900">Razorpay Transactions</h1>
                <div className="flex gap-2">
                    <button
                        onClick={handleExport}
                        className="flex items-center space-x-2 px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700"
                    >
                        <Download className="w-4 h-4" />
                        <span>Export CSV</span>
                    </button>
                    <button
                        onClick={handleReconcile}
                        className="flex items-center space-x-2 px-4 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700"
                    >
                        <RotateCw className="w-4 h-4" />
                        <span>Reconcile</span>
                    </button>
                </div>
            </div>

            {/* Stats Cards */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div className="bg-white p-4 rounded-xl shadow-sm border border-gray-200">
                    <p className="text-sm text-gray-500">Total Payments</p>
                    <p className="text-2xl font-bold text-gray-900">{stats.total_count}</p>
                    <p className="text-xs text-gray-400">Volume: ₹{stats.total_volume.toLocaleString()}</p>
                </div>
                <div className="bg-white p-4 rounded-xl shadow-sm border border-gray-200">
                    <p className="text-sm text-gray-500">Successful</p>
                    <p className="text-2xl font-bold text-green-600">{stats.success_count}</p>
                    <p className="text-xs text-gray-400">Volume: ₹{stats.success_volume.toLocaleString()}</p>
                </div>
                <div className="bg-white p-4 rounded-xl shadow-sm border border-gray-200">
                    <p className="text-sm text-gray-500">Net Failed</p>
                    <p className="text-2xl font-bold text-orange-600">{stats.net_failed_count}</p>
                    <p className="text-xs text-gray-400">Failed attempts with no backup capture</p>
                </div>
            </div>

            <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden">
                {/* Tabs */}
                <div className="flex border-b border-gray-200">
                    <button
                        onClick={() => handleTabChange('transactions')}
                        className={`flex-1 py-4 text-sm font-medium text-center transition-colors ${activeTab === 'transactions'
                            ? 'text-indigo-600 border-b-2 border-indigo-600 bg-gray-50'
                            : 'text-gray-500 hover:text-gray-700 hover:bg-gray-50'
                            }`}
                    >
                        Transactions
                    </button>
                    <button
                        onClick={() => handleTabChange('history')}
                        className={`flex-1 py-4 text-sm font-medium text-center transition-colors ${activeTab === 'history'
                            ? 'text-indigo-600 border-b-2 border-indigo-600 bg-gray-50'
                            : 'text-gray-500 hover:text-gray-700 hover:bg-gray-50'
                            }`}
                    >
                        Reminders History
                    </button>
                    <button
                        onClick={() => handleTabChange('net_failed')}
                        className={`flex-1 py-4 text-sm font-medium text-center transition-colors ${activeTab === 'net_failed'
                            ? 'text-red-600 border-b-2 border-red-600 bg-red-50'
                            : 'text-gray-500 hover:text-gray-700 hover:bg-gray-50'
                            }`}
                    >
                        Net Failed ({stats.net_failed_count})
                    </button>
                </div>

                <div className="p-6">
                    {activeTab !== 'history' ? (
                        <div className="space-y-4">
                            {/* Search & Status */}
                            <div className="flex flex-col md:flex-row gap-4">
                                <div className="flex-1 relative">
                                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 w-5 h-5" />
                                    <input
                                        type="text"
                                        placeholder="Search by Payment ID or Email"
                                        className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 text-gray-900 bg-white"
                                        value={searchTerm}
                                        onChange={(e) => setSearchTerm(e.target.value)}
                                    />
                                </div>
                                {activeTab !== 'net_failed' && (
                                    <select
                                        className="px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 text-gray-900 bg-white"
                                        value={statusFilter}
                                        onChange={(e) => setStatusFilter(e.target.value)}
                                    >
                                        <option value="">All Statuses</option>
                                        <option value="captured">Captured</option>
                                        <option value="authorized">Authorized</option>
                                        <option value="failed">Failed</option>
                                    </select>
                                )}
                            </div>

                            {/* Date Filters */}
                            <div className="flex flex-col md:flex-row items-center gap-4 py-2 border-t border-gray-100">
                                <div className="text-sm font-medium text-gray-600 flex items-center gap-2">
                                    <Calendar className="w-4 h-4" />
                                    Date Range:
                                </div>
                                <input
                                    type="date"
                                    value={dateRange.from}
                                    onChange={(e) => setDateRange(prev => ({ ...prev, from: e.target.value }))}
                                    className="px-3 py-1.5 border rounded-lg text-sm bg-white text-gray-900"
                                />
                                <span className="text-gray-400">to</span>
                                <input
                                    type="date"
                                    value={dateRange.to}
                                    onChange={(e) => setDateRange(prev => ({ ...prev, to: e.target.value }))}
                                    className="px-3 py-1.5 border rounded-lg text-sm bg-white text-gray-900"
                                />

                                <div className="flex gap-2 ml-auto">
                                    <button onClick={() => handlePreset(7)} className="px-3 py-1 text-xs bg-gray-100 hover:bg-gray-200 rounded-full text-gray-700">Last 7 Days</button>
                                    <button onClick={() => handlePreset(30)} className="px-3 py-1 text-xs bg-gray-100 hover:bg-gray-200 rounded-full text-gray-700">Last 30 Days</button>
                                    <button onClick={() => handlePreset(90)} className="px-3 py-1 text-xs bg-gray-100 hover:bg-gray-200 rounded-full text-gray-700">Last Quarter</button>
                                    <button onClick={() => setDateRange({ from: '', to: '' })} className="px-3 py-1 text-xs text-red-600 hover:text-red-800">Clear</button>
                                </div>
                            </div>

                            {loading ? (
                                <div className="text-center py-10">Loading...</div>
                            ) : (
                                <>
                                    <div className="overflow-x-auto">
                                        <table className="w-full text-left">
                                            <thead>
                                                <tr className="border-b border-gray-200">
                                                    <th className="pb-3 text-sm font-semibold text-gray-600">Payment ID</th>
                                                    <th className="pb-3 text-sm font-semibold text-gray-600">Amount</th>
                                                    <th className="pb-3 text-sm font-semibold text-gray-600">Status</th>
                                                    <th className="pb-3 text-sm font-semibold text-gray-600">Email</th>
                                                    <th className="pb-3 text-sm font-semibold text-gray-600">Mobile</th>
                                                    <th className="pb-3 text-sm font-semibold text-gray-600">Date</th>
                                                    <th className="pb-3 text-sm font-semibold text-gray-600">Actions</th>
                                                </tr>
                                            </thead>
                                            <tbody className="text-gray-600">
                                                {transactions.map((tx, index) => (
                                                    <tr key={tx.id || `tx-${index}`} className="border-b border-gray-100 hover:bg-gray-50">
                                                        <td className="py-3 font-medium text-gray-900">{tx.payment_id}</td>
                                                        <td className="py-3">₹{tx.amount}</td>
                                                        <td className="py-3">
                                                            <span className={`px-2 py-1 rounded-full text-xs ${tx.status === 'captured' ? 'bg-green-100 text-green-700' :
                                                                tx.status === 'failed' ? 'bg-red-100 text-red-700' :
                                                                    'bg-yellow-100 text-yellow-700'
                                                                }`}>
                                                                {tx.status}
                                                            </span>
                                                        </td>
                                                        <td className="py-3">{tx.email}</td>
                                                        <td className="py-3">{tx.contact}</td>
                                                        <td className="py-3">{new Date(tx.created_at).toLocaleDateString()}</td>
                                                        <td className="py-3">
                                                            <a
                                                                href={tx.razorpay_dashboard_url}
                                                                target="_blank"
                                                                rel="noopener noreferrer"
                                                                className="text-indigo-600 hover:text-indigo-800"
                                                                title="View in RabbitPay Dashboard"
                                                            >
                                                                <ExternalLink className="w-4 h-4" />
                                                            </a>
                                                        </td>
                                                    </tr>
                                                ))}
                                            </tbody>
                                        </table>
                                    </div>

                                    <div className="mt-4 flex flex-col md:flex-row justify-between items-center text-gray-600 gap-4">
                                        <div className="flex items-center gap-2">
                                            <span className="text-sm">Rows per page:</span>
                                            <select
                                                value={limit}
                                                onChange={handleLimitChange}
                                                className="px-2 py-1 border border-gray-300 rounded text-sm bg-white"
                                            >
                                                <option value={20}>20</option>
                                                <option value={50}>50</option>
                                                <option value={100}>100</option>
                                                <option value={200}>200</option>
                                            </select>
                                        </div>

                                        <div className="flex gap-2">
                                            <button
                                                disabled={page === 1}
                                                onClick={() => setPage(1)}
                                                className="px-3 py-1 border rounded disabled:opacity-50 hover:bg-gray-50"
                                                title="First Page"
                                            >
                                                &laquo; First
                                            </button>
                                            <button
                                                disabled={page === 1}
                                                onClick={() => setPage(page - 1)}
                                                className="px-3 py-1 border rounded disabled:opacity-50 hover:bg-gray-50"
                                            >
                                                Previous
                                            </button>
                                        </div>

                                        <span className="font-medium">Page {page} of {totalPages}</span>

                                        <div className="flex gap-2">
                                            <button
                                                disabled={page === totalPages}
                                                onClick={() => setPage(page + 1)}
                                                className="px-3 py-1 border rounded disabled:opacity-50 hover:bg-gray-50"
                                            >
                                                Next
                                            </button>
                                            <button
                                                disabled={page === totalPages}
                                                onClick={() => setPage(totalPages)}
                                                className="px-3 py-1 border rounded disabled:opacity-50 hover:bg-gray-50"
                                                title="Last Page"
                                            >
                                                Last &raquo;
                                            </button>
                                        </div>
                                    </div>
                                </>
                            )}
                        </div>
                    ) : (
                        // History Tab
                        <div className="space-y-4">
                            {historyLoading ? (
                                <div className="text-center py-10">Loading history...</div>
                            ) : (
                                <div className="overflow-x-auto">
                                    <table className="w-full text-left">
                                        <thead>
                                            <tr className="border-b border-gray-200">
                                                <th className="pb-3 text-sm font-semibold text-gray-600">Date Sent</th>
                                                <th className="pb-3 text-sm font-semibold text-gray-600">Recipient</th>
                                                <th className="pb-3 text-sm font-semibold text-gray-600">Reason</th>
                                                <th className="pb-3 text-sm font-semibold text-gray-600">Status</th>
                                                <th className="pb-3 text-sm font-semibold text-gray-600">Error</th>
                                            </tr>
                                        </thead>
                                        <tbody className="text-gray-600">
                                            {historyLogs.length === 0 ? (
                                                <tr>
                                                    <td colSpan={5} className="py-8 text-center text-gray-500">
                                                        No payment reminders sent yet.
                                                    </td>
                                                </tr>
                                            ) : (
                                                historyLogs.map((log: any, index: number) => (
                                                    <tr key={log.id || `log-${index}`} className="border-b border-gray-100 hover:bg-gray-50">
                                                        <td className="py-3">{new Date(log.sent_at).toLocaleString()}</td>
                                                        <td className="py-3 font-medium text-gray-900">{log.recipient_email}</td>
                                                        <td className="py-3 text-sm">
                                                            <span className={`px-2 py-1 rounded-full text-xs ${log.recipient_name === 'Pending Registration' ? 'bg-orange-100 text-orange-700' : 'bg-gray-100 text-gray-700'
                                                                }`}>
                                                                {log.recipient_name || 'Failed Payment'}
                                                            </span>
                                                        </td>
                                                        <td className="py-3">
                                                            <span className={`px-2 py-1 rounded-full text-xs ${log.status === 'success' ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-700'
                                                                }`}>
                                                                {log.status}
                                                            </span>
                                                        </td>
                                                        <td className="py-3 text-red-500 text-sm max-w-xs truncate" title={log.error_message}>
                                                            {log.error_message || '-'}
                                                        </td>
                                                    </tr>
                                                ))
                                            )}
                                        </tbody>
                                    </table>
                                </div>
                            )}
                        </div>
                    )}
                </div>
            </div>
        </div>
    )
}
