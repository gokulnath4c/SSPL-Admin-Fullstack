import React, { useState, useEffect } from 'react'
import { supabase } from '@lib/supabase'

interface ChatLog {
    id: string
    role: string
    message: string
    platform: string
    mobile_number: string | null
    metadata: any
    created_at: string
    session_id?: string
    language?: string
    mode?: string
}

interface ChatConversation {
    id: string
    session_id: string
    mobile: string | null
    language: string
    mode: string
    messages: { role: string; content: string }[]
    created_at: string
    updated_at: string
}

type ViewMode = 'logs' | 'conversations'

export default function ChatConversationsPage() {
    const [chatLogs, setChatLogs] = useState<ChatLog[]>([])
    const [conversations, setConversations] = useState<ChatConversation[]>([])
    const [loading, setLoading] = useState(true)
    const [viewMode, setViewMode] = useState<ViewMode>('logs')
    const [filterMode, setFilterMode] = useState<'all' | 'chat' | 'customer_care'>('all')
    const [searchMobile, setSearchMobile] = useState('')
    const [expandedId, setExpandedId] = useState<string | null>(null)
    const [stats, setStats] = useState({ totalLogs: 0, totalConversations: 0, todayLogs: 0, calls: 0 })
    const [error, setError] = useState<string | null>(null)
    const [downloading, setDownloading] = useState(false)

    // Download ALL chat logs as CSV (paginated to get everything)
    const downloadAllLogs = async () => {
        setDownloading(true)
        try {
            const allLogs: ChatLog[] = []
            const pageSize = 1000
            let offset = 0
            let hasMore = true

            while (hasMore) {
                const { data, error: fetchError } = await supabase
                    .from('chat_logs')
                    .select('*')
                    .order('created_at', { ascending: false })
                    .range(offset, offset + pageSize - 1)

                if (fetchError) {
                    console.error('Download error:', fetchError)
                    setError(`Download failed: ${fetchError.message}`)
                    break
                }

                if (data && data.length > 0) {
                    allLogs.push(...data)
                    offset += pageSize
                    hasMore = data.length === pageSize
                } else {
                    hasMore = false
                }
            }

            if (allLogs.length === 0) {
                setError('No logs to download')
                return
            }

            // Build CSV
            const headers = ['Date', 'Time', 'Role', 'Message', 'Mobile Number', 'Platform']
            const csvRows = [headers.join(',')]

            allLogs.forEach(log => {
                const d = new Date(log.created_at)
                const date = d.toLocaleDateString('en-IN')
                const time = d.toLocaleTimeString('en-IN')
                const message = `"${(log.message || '').replace(/"/g, '""').replace(/\n/g, ' ')}"`
                const mobile = log.mobile_number || ''
                const platform = log.platform || 'web'
                csvRows.push([date, time, log.role, message, mobile, platform].join(','))
            })

            const csvContent = csvRows.join('\n')
            const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' })
            const url = URL.createObjectURL(blob)
            const link = document.createElement('a')
            link.href = url
            link.download = `chat_logs_${new Date().toISOString().split('T')[0]}.csv`
            link.click()
            URL.revokeObjectURL(url)
        } catch (err: any) {
            console.error('Download error:', err)
            setError(`Download error: ${err?.message || 'Unknown'}`)
        } finally {
            setDownloading(false)
        }
    }

    // Fetch chat_logs (Edge Function already populates this)
    const fetchChatLogs = async () => {
        setLoading(true)
        setError(null)
        try {
            let query = supabase
                .from('chat_logs')
                .select('*')
                .order('created_at', { ascending: false })
                .limit(200)

            if (searchMobile.trim()) {
                query = query.ilike('mobile_number', `%${searchMobile.trim()}%`)
            }

            const { data, error: fetchError } = await query

            if (fetchError) {
                console.error('Error fetching chat_logs:', fetchError)
                setError(`Failed to load chat logs: ${fetchError.message}`)
                setChatLogs([])
                return
            }

            setChatLogs(data || [])

            // Stats from chat_logs
            const { count: totalLogCount } = await supabase
                .from('chat_logs')
                .select('*', { count: 'exact', head: true })

            const today = new Date().toISOString().split('T')[0]
            const { count: todayLogCount } = await supabase
                .from('chat_logs')
                .select('*', { count: 'exact', head: true })
                .gte('created_at', today)

            setStats(prev => ({
                ...prev,
                totalLogs: totalLogCount || 0,
                todayLogs: todayLogCount || 0
            }))
        } catch (err: any) {
            console.error('Error:', err)
            setError(`Error: ${err?.message || 'Unknown error'}`)
        } finally {
            setLoading(false)
        }
    }

    // Fetch chat_conversations (new table for session-based view)
    const fetchConversations = async () => {
        setLoading(true)
        setError(null)
        try {
            let query = supabase
                .from('chat_conversations')
                .select('*')
                .order('updated_at', { ascending: false })
                .limit(100)

            if (filterMode !== 'all') {
                query = query.eq('mode', filterMode)
            }

            if (searchMobile.trim()) {
                query = query.ilike('mobile', `%${searchMobile.trim()}%`)
            }

            const { data, error: fetchError } = await query

            if (fetchError) {
                console.error('Error fetching chat_conversations:', fetchError)
                // Table might not exist yet — fall back gracefully
                if (fetchError.message.includes('does not exist') || fetchError.code === '42P01') {
                    setError('The chat_conversations table has not been created yet. Please run the SQL migration. Showing chat_logs instead.')
                    setViewMode('logs')
                    fetchChatLogs()
                    return
                }
                setError(`Failed to load conversations: ${fetchError.message}`)
                setConversations([])
                return
            }

            setConversations(data || [])

            // Stats
            const { count: totalConvCount } = await supabase
                .from('chat_conversations')
                .select('*', { count: 'exact', head: true })

            const { count: callCount } = await supabase
                .from('chat_conversations')
                .select('*', { count: 'exact', head: true })
                .eq('mode', 'customer_care')

            setStats(prev => ({
                ...prev,
                totalConversations: totalConvCount || 0,
                calls: callCount || 0
            }))
        } catch (err: any) {
            console.error('Error:', err)
            setError(`Error: ${err?.message || 'Unknown error'}`)
        } finally {
            setLoading(false)
        }
    }

    useEffect(() => {
        if (viewMode === 'logs') {
            fetchChatLogs()
        } else {
            fetchConversations()
        }
    }, [viewMode, filterMode, searchMobile])

    const formatDate = (dateStr: string) => {
        try {
            const d = new Date(dateStr)
            return d.toLocaleString('en-IN', {
                day: '2-digit',
                month: 'short',
                year: 'numeric',
                hour: '2-digit',
                minute: '2-digit'
            })
        } catch {
            return dateStr
        }
    }

    const getLangLabel = (lang: string) => {
        const map: Record<string, string> = {
            en: 'English', hi: 'Hindi', ta: 'Tamil', te: 'Telugu',
            ma: 'Malayalam', ka: 'Kannada', ur: 'Urdu'
        }
        return map[lang] || lang || '—'
    }

    // Group chat logs by mobile number for display  
    const groupedLogs = chatLogs.reduce((acc, log) => {
        const key = log.mobile_number || 'unknown'
        if (!acc[key]) acc[key] = []
        acc[key].push(log)
        return acc
    }, {} as Record<string, ChatLog[]>)

    return (
        <div className="space-y-6">
            {/* Header */}
            <div>
                <h1 className="text-3xl font-bold text-gray-900">💬 Chat Logs</h1>
                <p className="text-gray-600 mt-1">View all chatbot conversations and customer care calls</p>
            </div>

            {/* Stats */}
            <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                <div className="bg-white rounded-lg shadow p-5 border-l-4 border-blue-500">
                    <p className="text-sm text-gray-500">Total Chat Messages</p>
                    <p className="text-3xl font-bold text-gray-900">{stats.totalLogs}</p>
                </div>
                <div className="bg-white rounded-lg shadow p-5 border-l-4 border-green-500">
                    <p className="text-sm text-gray-500">Today's Messages</p>
                    <p className="text-3xl font-bold text-gray-900">{stats.todayLogs}</p>
                </div>
                <div className="bg-white rounded-lg shadow p-5 border-l-4 border-purple-500">
                    <p className="text-sm text-gray-500">Conversations</p>
                    <p className="text-3xl font-bold text-gray-900">{stats.totalConversations}</p>
                </div>
                <div className="bg-white rounded-lg shadow p-5 border-l-4 border-red-500">
                    <p className="text-sm text-gray-500">Customer Care Calls</p>
                    <p className="text-3xl font-bold text-gray-900">{stats.calls}</p>
                </div>
            </div>

            {/* View Toggle & Filters */}
            <div className="bg-white rounded-lg shadow p-4 flex flex-wrap gap-4 items-center">
                {/* View mode toggle */}
                <div className="flex gap-1 bg-gray-100 p-1 rounded-lg">
                    <button
                        onClick={() => setViewMode('logs')}
                        className={`px-4 py-2 rounded-md text-sm font-medium transition-colors ${viewMode === 'logs' ? 'bg-white shadow text-blue-600' : 'text-gray-600 hover:text-gray-900'
                            }`}
                    >
                        📋 Message Logs
                    </button>
                    <button
                        onClick={() => setViewMode('conversations')}
                        className={`px-4 py-2 rounded-md text-sm font-medium transition-colors ${viewMode === 'conversations' ? 'bg-white shadow text-blue-600' : 'text-gray-600 hover:text-gray-900'
                            }`}
                    >
                        💬 Conversations
                    </button>
                </div>

                {/* Mode filter (conversations view only) */}
                {viewMode === 'conversations' && (
                    <div className="flex gap-2">
                        {(['all', 'chat', 'customer_care'] as const).map(f => (
                            <button
                                key={f}
                                onClick={() => setFilterMode(f)}
                                className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-colors ${filterMode === f
                                    ? 'bg-blue-600 text-white'
                                    : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                                    }`}
                            >
                                {f === 'all' ? 'All' : f === 'chat' ? '💬 Chat' : '📞 Calls'}
                            </button>
                        ))}
                    </div>
                )}

                {/* Search */}
                <input
                    type="text"
                    placeholder="Search by mobile number..."
                    value={searchMobile}
                    onChange={e => setSearchMobile(e.target.value)}
                    className="px-4 py-2 border border-gray-300 rounded-lg text-sm flex-1 min-w-[200px] focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                />
                <button
                    onClick={() => viewMode === 'logs' ? fetchChatLogs() : fetchConversations()}
                    className="px-4 py-2 bg-gray-100 hover:bg-gray-200 rounded-lg text-sm font-medium transition-colors"
                >
                    🔄 Refresh
                </button>
                <button
                    onClick={downloadAllLogs}
                    disabled={downloading}
                    className="px-4 py-2 bg-green-600 hover:bg-green-700 disabled:bg-gray-400 text-white rounded-lg text-sm font-medium transition-colors"
                >
                    {downloading ? '⏳ Downloading...' : '📥 Download All Logs (CSV)'}
                </button>
            </div>

            {/* Error Banner */}
            {error && (
                <div className="bg-red-50 border border-red-200 rounded-lg p-4 text-red-800 text-sm">
                    ⚠️ {error}
                </div>
            )}

            {/* Content */}
            <div className="bg-white rounded-lg shadow overflow-hidden">
                {loading ? (
                    <div className="p-8 text-center text-gray-500">
                        <div className="inline-block animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mb-4"></div>
                        <p>Loading...</p>
                    </div>
                ) : viewMode === 'logs' ? (
                    /* ==================== MESSAGE LOGS VIEW ==================== */
                    chatLogs.length === 0 ? (
                        <div className="p-8 text-center text-gray-500">
                            <p className="text-xl mb-2">📭</p>
                            <p>No chat logs found</p>
                        </div>
                    ) : (
                        <table className="min-w-full divide-y divide-gray-200">
                            <thead className="bg-gray-50">
                                <tr>
                                    <th className="px-4 py-3 text-left text-xs font-semibold text-gray-500 uppercase">Role</th>
                                    <th className="px-4 py-3 text-left text-xs font-semibold text-gray-500 uppercase">Message</th>
                                    <th className="px-4 py-3 text-left text-xs font-semibold text-gray-500 uppercase">Mobile</th>
                                    <th className="px-4 py-3 text-left text-xs font-semibold text-gray-500 uppercase">Platform</th>
                                    <th className="px-4 py-3 text-left text-xs font-semibold text-gray-500 uppercase">Time</th>
                                </tr>
                            </thead>
                            <tbody className="bg-white divide-y divide-gray-200">
                                {chatLogs.map(log => (
                                    <tr key={log.id} className="hover:bg-gray-50">
                                        <td className="px-4 py-3">
                                            <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${log.role === 'user'
                                                ? 'bg-blue-100 text-blue-800'
                                                : log.role === 'assistant'
                                                    ? 'bg-green-100 text-green-800'
                                                    : 'bg-gray-100 text-gray-800'
                                                }`}>
                                                {log.role === 'user' ? '👤 User' : '🤖 Bot'}
                                            </span>
                                        </td>
                                        <td className="px-4 py-3 text-sm text-gray-900 max-w-md">
                                            <p className="truncate" title={log.message}>{log.message}</p>
                                        </td>
                                        <td className="px-4 py-3 text-sm text-gray-600 font-mono">
                                            {log.mobile_number || '—'}
                                        </td>
                                        <td className="px-4 py-3 text-sm text-gray-500">
                                            {log.platform || 'web'}
                                        </td>
                                        <td className="px-4 py-3 text-sm text-gray-500 whitespace-nowrap">
                                            {formatDate(log.created_at)}
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    )
                ) : (
                    /* ==================== CONVERSATIONS VIEW ==================== */
                    conversations.length === 0 ? (
                        <div className="p-8 text-center text-gray-500">
                            <p className="text-xl mb-2">📭</p>
                            <p>No conversations found</p>
                            <p className="text-xs mt-2 text-gray-400">Make sure you have run the SQL migration to create the chat_conversations table</p>
                        </div>
                    ) : (
                        <table className="min-w-full divide-y divide-gray-200">
                            <thead className="bg-gray-50">
                                <tr>
                                    <th className="px-4 py-3 text-left text-xs font-semibold text-gray-500 uppercase">Type</th>
                                    <th className="px-4 py-3 text-left text-xs font-semibold text-gray-500 uppercase">Mobile</th>
                                    <th className="px-4 py-3 text-left text-xs font-semibold text-gray-500 uppercase">Language</th>
                                    <th className="px-4 py-3 text-left text-xs font-semibold text-gray-500 uppercase">Messages</th>
                                    <th className="px-4 py-3 text-left text-xs font-semibold text-gray-500 uppercase">Started</th>
                                    <th className="px-4 py-3 text-left text-xs font-semibold text-gray-500 uppercase">Last Active</th>
                                    <th className="px-4 py-3 text-left text-xs font-semibold text-gray-500 uppercase">Actions</th>
                                </tr>
                            </thead>
                            <tbody className="bg-white divide-y divide-gray-200">
                                {conversations.map(conv => (
                                    <React.Fragment key={conv.id}>
                                        <tr
                                            className="hover:bg-gray-50 cursor-pointer transition-colors"
                                            onClick={() => setExpandedId(expandedId === conv.id ? null : conv.id)}
                                        >
                                            <td className="px-4 py-3">
                                                <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${conv.mode === 'customer_care'
                                                    ? 'bg-red-100 text-red-800'
                                                    : 'bg-blue-100 text-blue-800'
                                                    }`}>
                                                    {conv.mode === 'customer_care' ? '📞 Call' : '💬 Chat'}
                                                </span>
                                            </td>
                                            <td className="px-4 py-3 text-sm text-gray-900 font-mono">
                                                {conv.mobile || '—'}
                                            </td>
                                            <td className="px-4 py-3 text-sm text-gray-600">
                                                {getLangLabel(conv.language)}
                                            </td>
                                            <td className="px-4 py-3 text-sm text-gray-600">
                                                {conv.messages?.filter(m => m.role === 'user').length || 0} user msgs
                                            </td>
                                            <td className="px-4 py-3 text-sm text-gray-500 whitespace-nowrap">
                                                {formatDate(conv.created_at)}
                                            </td>
                                            <td className="px-4 py-3 text-sm text-gray-500 whitespace-nowrap">
                                                {formatDate(conv.updated_at)}
                                            </td>
                                            <td className="px-4 py-3">
                                                <button className="text-blue-600 hover:text-blue-800 text-sm font-medium">
                                                    {expandedId === conv.id ? '▼ Hide' : '▶ View'}
                                                </button>
                                            </td>
                                        </tr>
                                        {expandedId === conv.id && (
                                            <tr>
                                                <td colSpan={7} className="px-4 py-4 bg-gray-50">
                                                    <div className="max-h-80 overflow-y-auto space-y-3 p-4 bg-white rounded-lg border border-gray-200">
                                                        <div className="text-xs text-gray-400 mb-2">Session: {conv.session_id}</div>
                                                        {conv.messages?.map((msg, idx) => (
                                                            <div
                                                                key={idx}
                                                                className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}
                                                            >
                                                                <div
                                                                    className={`max-w-[80%] px-3 py-2 rounded-lg text-sm ${msg.role === 'user'
                                                                        ? 'bg-blue-600 text-white'
                                                                        : msg.role === 'system'
                                                                            ? 'bg-yellow-100 text-yellow-800 italic'
                                                                            : 'bg-gray-100 text-gray-800'
                                                                        }`}
                                                                >
                                                                    <div className="text-[10px] font-semibold mb-0.5 opacity-70">
                                                                        {msg.role === 'user' ? '👤 User' : msg.role === 'system' ? '⚙️ System' : '🤖 Bot'}
                                                                    </div>
                                                                    {msg.content}
                                                                </div>
                                                            </div>
                                                        ))}
                                                    </div>
                                                </td>
                                            </tr>
                                        )}
                                    </React.Fragment>
                                ))}
                            </tbody>
                        </table>
                    )
                )}
            </div>

            {/* Info box */}
            <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 text-blue-800 text-sm">
                <p className="font-semibold mb-1">ℹ️ How Chat Logging Works</p>
                <ul className="list-disc list-inside space-y-1 text-blue-700">
                    <li><strong>Message Logs</strong> — Every user question and bot response is recorded individually by the Edge Function (chat_logs table)</li>
                    <li><strong>Conversations</strong> — Full conversation sessions with context are saved from the chat widget (chat_conversations table)</li>
                </ul>
            </div>
        </div>
    )
}
