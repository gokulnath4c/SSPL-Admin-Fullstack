import { useState, useEffect } from 'react'
import { Send, Users, AlertCircle, Upload, History as HistoryIcon } from 'lucide-react'
import { read, utils } from 'xlsx'
import { config } from '@lib/config'

const API_URL = config.api.url;

export default function BulkEmailPage() {
    const [subject, setSubject] = useState('')
    const [body, setBody] = useState('')
    const [filter, setFilter] = useState('paid_users')
    const [testEmail, setTestEmail] = useState('')
    const [sending, setSending] = useState(false)
    const [status, setStatus] = useState<{ type: 'success' | 'error', message: string } | null>(null)
    const [reportData, setReportData] = useState<any>(null)
    const [customRecipients, setCustomRecipients] = useState<string[]>([])
    const [activeTab, setActiveTab] = useState<'compose' | 'report' | 'history'>('compose')
    const [fileName, setFileName] = useState('')
    const [history, setHistory] = useState<any[]>([])
    const [attachment, setAttachment] = useState<{ name: string, contentBytes: string, contentType: string } | null>(null)
    const [page, setPage] = useState(1);
    const [totalPages, setTotalPages] = useState(1);

    const handleAttachmentUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0]
        if (!file) return

        if (file.size > 3 * 1024 * 1024) {
            setStatus({ type: 'error', message: 'File size too large. Max 3MB.' })
            return
        }

        const reader = new FileReader()
        reader.onload = () => {
            const result = reader.result as string
            // Remove data URL prefix
            const contentBytes = result.split(',')[1]

            setAttachment({
                name: file.name,
                contentType: file.type || 'application/octet-stream',
                contentBytes
            })
            setStatus({ type: 'success', message: `Attached: ${file.name}` })
        }
        reader.onerror = () => {
            setStatus({ type: 'error', message: 'Failed to read file' })
        }
        reader.readAsDataURL(file)
    }

    // Fetch history when tab is active or page changes
    useEffect(() => {
        if (activeTab === 'history') {
            fetch(`${API_URL}/admin/email/logs?page=${page}&limit=50`)
                .then(res => res.json())
                .then(data => {
                    if (data.data) {
                        setHistory(data.data);
                        setTotalPages(data.totalPages);
                    } else {
                        // Fallback for old API response (array)
                        setHistory(Array.isArray(data) ? data : []);
                    }
                })
                .catch(err => console.error(err))
        }
    }, [activeTab, page])

    const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0]
        if (!file) return

        try {
            setFileName(file.name)
            const data = await file.arrayBuffer()
            const workbook = read(data)
            const worksheet = workbook.Sheets[workbook.SheetNames[0]]
            const jsonData = utils.sheet_to_json(worksheet, { header: 1 }) as any[][]

            // Extract emails (assume first column or look for 'email' header)
            // Simple approach: Flatten all cells and find strings looking like emails
            // Or stricter: Column A

            const emails = new Set<string>()
            const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/

            jsonData.forEach(row => {
                row.forEach(cell => {
                    if (typeof cell === 'string' && emailRegex.test(cell.trim())) {
                        emails.add(cell.trim())
                    }
                })
            })

            const emailList = Array.from(emails)
            setCustomRecipients(emailList)
            setFilter('custom_upload')
            setStatus({ type: 'success', message: `Loaded ${emailList.length} unique emails from ${file.name}` })

        } catch (error) {
            console.error(error)
            setStatus({ type: 'error', message: 'Failed to parse Excel file' })
        }
    }

    const handleSend = async (isTest = false) => {
        if (!subject || !body) {
            alert('Please fill subject and body')
            return
        }

        if (isTest && !testEmail) {
            alert('Please enter a test email')
            return
        }

        if (filter === 'custom_upload' && customRecipients.length === 0 && !isTest) {
            alert('No recipients found in uploaded file')
            return
        }

        const recipientCount = filter === 'custom_upload' ? customRecipients.length : filter;
        const confirmMsg = isTest
            ? `Send test email to ${testEmail}?`
            : `Send BULK email to ${filter === 'custom_upload' ? recipientCount + ' uploaded' : filter} recipients? This cannot be undone.`

        if (!confirm(confirmMsg)) return

        setSending(true)
        setStatus(null)

        try {
            // If attachment exists, embed it in body
            let finalBody = body;
            const attachments = [];

            if (attachment) {
                const contentId = 'embedded-image';
                finalBody += `<br><br><img src="cid:${contentId}" style="max-width:100%; height:auto;" alt="Attached Image" /><br>`;

                attachments.push({
                    '@odata.type': '#microsoft.graph.fileAttachment',
                    name: attachment.name,
                    contentType: attachment.contentType,
                    contentBytes: attachment.contentBytes,
                    isInline: true,
                    contentId: contentId
                });
            }

            const response = await fetch(`${API_URL}/admin/email/bulk`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    subject,
                    body: finalBody,
                    filter,
                    testEmail: isTest ? testEmail : undefined,
                    recipients: filter === 'custom_upload' ? customRecipients : undefined,
                    attachments
                })
            })

            const result = await response.json()

            if (result.error) throw new Error(result.error)

            setReportData(result)
            setActiveTab('report')
            setStatus({
                type: 'success',
                message: isTest
                    ? `Test email sent: ${result.success ? 'Success' : 'Failed'}`
                    : `Bulk send complete. Success: ${result.success}, Failed: ${result.failed}`
            })

        } catch (error: any) {
            setStatus({ type: 'error', message: error.message })
        } finally {
            setSending(false)
        }
    }

    return (
        <div className="space-y-6 max-w-4xl mx-auto">
            <h1 className="text-2xl font-bold text-gray-900">Bulk Email Campaign</h1>

            <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden">

                {/* Tabs */}
                {/* Tabs */}
                <div className="flex border-b border-gray-200">
                    <button
                        onClick={() => setActiveTab('compose')}
                        className={`flex-1 py-4 text-sm font-medium text-center transition-colors ${activeTab === 'compose'
                            ? 'text-indigo-600 border-b-2 border-indigo-600 bg-gray-50'
                            : 'text-gray-500 hover:text-gray-700 hover:bg-gray-50'
                            }`}
                    >
                        Compose Message
                    </button>
                    <button
                        onClick={() => setActiveTab('report')}
                        className={`flex-1 py-4 text-sm font-medium text-center transition-colors ${activeTab === 'report'
                            ? 'text-indigo-600 border-b-2 border-indigo-600 bg-gray-50'
                            : 'text-gray-500 hover:text-gray-700 hover:bg-gray-50'
                            }`}
                    >
                        Delivery Report
                    </button>
                    <button
                        onClick={() => setActiveTab('history')}
                        className={`flex-1 py-4 text-sm font-medium text-center transition-colors flex items-center justify-center gap-2 ${activeTab === 'history'
                            ? 'text-indigo-600 border-b-2 border-indigo-600 bg-gray-50'
                            : 'text-gray-500 hover:text-gray-700 hover:bg-gray-50'
                            }`}
                    >
                        <HistoryIcon className="w-4 h-4" />
                        History
                    </button>
                </div>

                <div className="p-6">
                    {activeTab === 'compose' && (
                        <div className="space-y-6">
                            {/* Recipients */}
                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-2">Target Audience</label>
                                <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                                    {['paid_users', 'all_registrations', 'failed_payments'].map((f) => (
                                        <button
                                            key={f}
                                            onClick={() => setFilter(f)}
                                            className={`flex flex-col items-center justify-center p-4 rounded-lg border-2 transition-all ${filter === f
                                                ? 'border-indigo-600 bg-indigo-50 text-indigo-700'
                                                : 'border-gray-200 hover:border-indigo-200 text-gray-600'
                                                }`}
                                        >
                                            <Users className="w-5 h-5 mb-1" />
                                            <span className="font-medium text-sm capitalize text-center">{f.replace('_', ' ')}</span>
                                        </button>
                                    ))}

                                    {/* Custom Upload Button */}
                                    <div className={`relative flex flex-col items-center justify-center p-4 rounded-lg border-2 transition-all cursor-pointer ${filter === 'custom_upload'
                                        ? 'border-indigo-600 bg-indigo-50 text-indigo-700'
                                        : 'border-gray-200 hover:border-indigo-200 text-gray-600 hover:bg-gray-50'
                                        }`}>
                                        <input
                                            type="file"
                                            accept=".xlsx,.xls,.csv"
                                            onChange={handleFileUpload}
                                            className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
                                        />
                                        <Upload className="w-5 h-5 mb-1" />
                                        <span className="font-medium text-sm text-center">
                                            {filter === 'custom_upload' && customRecipients.length > 0
                                                ? `${customRecipients.length} Emails`
                                                : 'Upload Excel'}
                                        </span>
                                    </div>
                                </div>
                                {filter === 'custom_upload' && fileName && (
                                    <p className="text-xs text-gray-500 mt-2 ml-1">File: {fileName}</p>
                                )}
                            </div>

                            {/* Content */}
                            <div className="space-y-4">
                                <div>
                                    <label className="block text-sm font-medium text-gray-700 mb-1">Subject Line</label>
                                    <input
                                        type="text"
                                        className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 text-gray-900 bg-white"
                                        placeholder="Important Announcement..."
                                        value={subject}
                                        onChange={(e) => setSubject(e.target.value)}
                                    />
                                </div>

                                <div>
                                    <label className="block text-sm font-medium text-gray-700 mb-1">Email Body (HTML supported)</label>
                                    <textarea
                                        className="w-full h-64 px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 text-gray-900 bg-white font-mono text-sm"
                                        placeholder="<h1>Hello!</h1><p>We have news...</p>"
                                        value={body}
                                        onChange={(e) => setBody(e.target.value)}
                                    />
                                    <p className="text-xs text-gray-500 mt-1">Basic HTML tags are supported.</p>
                                </div>

                                {/* Attachment Upload */}
                                <div>
                                    <label className="block text-sm font-medium text-gray-700 mb-1">Attachment (Image)</label>
                                    <div className="flex items-center gap-4">
                                        <div className="relative flex items-center justify-center px-4 py-2 border border-gray-300 rounded-lg bg-white hover:bg-gray-50 cursor-pointer">
                                            <input
                                                type="file"
                                                accept="image/*"
                                                onChange={handleAttachmentUpload}
                                                className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
                                            />
                                            <Upload className="w-4 h-4 mr-2" />
                                            <span className="text-sm font-medium text-gray-700">
                                                {attachment ? 'Change Image' : 'Select Image'}
                                            </span>
                                        </div>
                                        {attachment && (
                                            <div className="flex items-center gap-2 bg-indigo-50 text-indigo-700 px-3 py-1 rounded-full text-xs font-medium">
                                                <span>{attachment.name}</span>
                                                <button
                                                    onClick={() => setAttachment(null)}
                                                    className="ml-1 text-indigo-400 hover:text-indigo-900"
                                                >
                                                    ✕
                                                </button>
                                            </div>
                                        )}
                                    </div>
                                    <p className="text-xs text-gray-500 mt-1">Supported formats: JPG, PNG. Max size: 3MB.</p>
                                </div>
                            </div>

                            {/* Test Send */}
                            <div className="bg-gray-50 p-4 rounded-lg flex items-center gap-4">
                                <input
                                    type="email"
                                    placeholder="Test Email Address"
                                    className="flex-1 px-3 py-2 border border-gray-300 rounded-md bg-white text-gray-900"
                                    value={testEmail}
                                    onChange={e => setTestEmail(e.target.value)}
                                />
                                <button
                                    onClick={() => handleSend(true)}
                                    disabled={sending}
                                    className="px-4 py-2 bg-gray-600 text-white rounded-md hover:bg-gray-700 disabled:opacity-50"
                                >
                                    Send Test
                                </button>
                            </div>

                            {/* Status Message */}
                            {status && (
                                <div className={`p-4 rounded-lg flex items-center space-x-2 ${status.type === 'success' ? 'bg-green-50 text-green-700' : 'bg-red-50 text-red-700'
                                    }`}>
                                    <AlertCircle className="w-5 h-5" />
                                    <span>{status.message}</span>
                                </div>
                            )}

                            {/* Main Action */}
                            <div className="pt-4 border-t border-gray-100 flex justify-end">
                                <button
                                    onClick={() => handleSend(false)}
                                    disabled={sending}
                                    className="flex items-center space-x-2 px-6 py-3 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 disabled:opacity-50 shadow-lg shadow-indigo-200"
                                >
                                    <Send className="w-5 h-5" />
                                    <span>{sending ? 'Sending...' : 'Send Bulk Campaign'}</span>
                                </button>
                            </div>
                        </div>
                    )}

                    {activeTab === 'report' && (
                        // Report Tab Content
                        <div className="space-y-6">
                            {!reportData ? (
                                <div className="text-center py-12">
                                    <div className="bg-gray-100 rounded-full w-16 h-16 flex items-center justify-center mx-auto mb-4">
                                        <AlertCircle className="w-8 h-8 text-gray-400" />
                                    </div>
                                    <h3 className="text-lg font-medium text-gray-900">No Report Available</h3>
                                    <p className="text-gray-500 mt-2">Send an email campaign to see the delivery report here.</p>
                                    <button
                                        onClick={() => setActiveTab('compose')}
                                        className="mt-4 text-indigo-600 font-medium hover:text-indigo-800"
                                    >
                                        Go to Compose
                                    </button>
                                </div>
                            ) : (
                                <div>
                                    <div className="mb-6 bg-gray-50 p-4 rounded-lg border border-gray-200 flex justify-between items-center">
                                        <div>
                                            <h3 className="text-lg font-semibold text-gray-900">Campaign Summary</h3>
                                            <p className="text-sm text-gray-500">Subject: {subject || 'Last Campaign'}</p>
                                        </div>
                                        <div className="flex gap-4">
                                            <div className="text-center">
                                                <div className="text-2xl font-bold text-green-600">{reportData.success}</div>
                                                <div className="text-xs text-gray-500 uppercase tracking-wide">Sent</div>
                                            </div>
                                            <div className="text-center">
                                                <div className="text-2xl font-bold text-red-600">{reportData.failed}</div>
                                                <div className="text-xs text-gray-500 uppercase tracking-wide">Failed</div>
                                            </div>
                                        </div>
                                    </div>

                                    {reportData.errors && reportData.errors.length > 0 && (
                                        <div className="mb-6 flex justify-end">
                                            <button
                                                onClick={() => {
                                                    const failedEmails = reportData.errors.map((e: any) => e.email);
                                                    setCustomRecipients(failedEmails);
                                                    setFilter('custom_upload'); // Mode for explicit list
                                                    if (confirm(`Retry sending to ${failedEmails.length} failed recipients?`)) {
                                                        handleSend(false);
                                                    }
                                                }}
                                                className="flex items-center space-x-2 px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 shadow-md"
                                            >
                                                <Send className="w-4 h-4" />
                                                <span>Retry Failed ({reportData.errors.length})</span>
                                            </button>
                                        </div>
                                    )}

                                    <div className="border border-gray-200 rounded-lg overflow-hidden">
                                        <div className="max-h-[500px] overflow-y-auto">
                                            <table className="w-full text-left text-sm">
                                                <thead className="bg-gray-50 sticky top-0 border-b border-gray-200">
                                                    <tr>
                                                        <th className="px-6 py-3 text-gray-600 font-medium">Email Address</th>
                                                        <th className="px-6 py-3 text-gray-600 font-medium">Status</th>
                                                        <th className="px-6 py-3 text-gray-600 font-medium">Message</th>
                                                    </tr>
                                                </thead>
                                                <tbody className="divide-y divide-gray-100">
                                                    {reportData.errors && reportData.errors.map((err: any, idx: number) => (
                                                        <tr key={`err-${idx}`} className="bg-white hover:bg-red-50">
                                                            <td className="px-6 py-3 font-medium text-gray-900">{err.email}</td>
                                                            <td className="px-6 py-3">
                                                                <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-red-100 text-red-800">
                                                                    Failed
                                                                </span>
                                                            </td>
                                                            <td className="px-6 py-3 text-red-500 max-w-xs truncate" title={err.error}>{err.error}</td>
                                                        </tr>
                                                    ))}
                                                    {reportData.successful && reportData.successful.map((email: string, idx: number) => (
                                                        <tr key={`succ-${idx}`} className="bg-white hover:bg-green-50">
                                                            <td className="px-6 py-3 font-medium text-gray-900">{email}</td>
                                                            <td className="px-6 py-3">
                                                                <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-green-100 text-green-800">
                                                                    Sent
                                                                </span>
                                                            </td>
                                                            <td className="px-6 py-3 text-gray-500">Delivered via Graph API</td>
                                                        </tr>
                                                    ))}
                                                </tbody>
                                            </table>
                                        </div>
                                    </div>
                                </div>
                            )}
                        </div>
                    )}

                    {activeTab === 'history' && (
                        <div className="space-y-6">
                            <h3 className="text-lg font-semibold text-gray-900">Email History</h3>
                            <div className="border border-gray-200 rounded-lg overflow-hidden">
                                <div className="max-h-[600px] overflow-y-auto">
                                    <table className="w-full text-left text-sm">
                                        <thead className="bg-gray-50 sticky top-0 border-b border-gray-200">
                                            <tr>
                                                <th className="px-6 py-3 text-gray-600 font-medium">Date</th>
                                                <th className="px-6 py-3 text-gray-600 font-medium">To</th>
                                                <th className="px-6 py-3 text-gray-600 font-medium">Status</th>
                                                <th className="px-6 py-3 text-gray-600 font-medium">Message</th>
                                            </tr>
                                        </thead>
                                        <tbody className="divide-y divide-gray-100">
                                            {history.length === 0 ? (
                                                <tr>
                                                    <td colSpan={4} className="px-6 py-8 text-center text-gray-500">
                                                        No history found.
                                                    </td>
                                                </tr>
                                            ) : (
                                                history.map((log: any) => (
                                                    <tr key={log.id} className="bg-white hover:bg-gray-50">
                                                        <td className="px-6 py-3 text-gray-500 whitespace-nowrap">
                                                            {new Date(log.sent_at).toLocaleString()}
                                                        </td>
                                                        <td className="px-6 py-3 font-medium text-gray-900">{log.recipient_email}</td>
                                                        <td className="px-6 py-3">
                                                            <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${log.status === 'success'
                                                                ? 'bg-green-100 text-green-800'
                                                                : 'bg-red-100 text-red-800'
                                                                }`}>
                                                                {log.status}
                                                            </span>
                                                        </td>
                                                        <td className="px-6 py-3 text-gray-500 max-w-xs truncate" title={log.error_message}>
                                                            {log.error_message || '-'}
                                                        </td>
                                                    </tr>
                                                ))
                                            )}
                                        </tbody>
                                    </table>
                                </div>
                            </div>

                            {/* Pagination Controls */}
                            <div className="flex justify-between items-center pt-4">
                                <button
                                    onClick={() => setPage(p => Math.max(1, p - 1))}
                                    disabled={page === 1}
                                    className="px-4 py-2 border border-gray-300 rounded-md text-sm font-medium text-gray-700 hover:bg-gray-50 disabled:opacity-50"
                                >
                                    Previous
                                </button>
                                <span className="text-sm text-gray-600">
                                    Page {page} of {totalPages}
                                </span>
                                <button
                                    onClick={() => setPage(p => Math.min(totalPages, p + 1))}
                                    disabled={page === totalPages}
                                    className="px-4 py-2 border border-gray-300 rounded-md text-sm font-medium text-gray-700 hover:bg-gray-50 disabled:opacity-50"
                                >
                                    Next
                                </button>
                            </div>
                        </div>
                    )}
                </div>
            </div>
        </div>
    )
}
