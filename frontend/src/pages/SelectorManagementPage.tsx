import { useState, useEffect } from 'react'
import { supabase } from '@lib/supabase'
import { Loader2, Download, Eye, CheckCircle, XCircle, FileText, FileSpreadsheet } from 'lucide-react'
import { exportToCSV } from '../utils/exportUtils'

interface Selector {
    id: string;
    full_name: string;
    age: number;
    email: string;
    contact_number: string;
    city_state: string;
    years_of_experience: string;
    highest_level_played: string;
    previously_worked_as_selector: string;
    availability: string[] | null;
    preferred_region: string;
    status: string;
    document_url?: string;
    created_at: string;
}

export default function SelectorManagementPage() {
    const [selectors, setSelectors] = useState<Selector[]>([])
    const [loading, setLoading] = useState(true)
    const [selectedSelector, setSelectedSelector] = useState<Selector | null>(null)
    const [isDetailsOpen, setIsDetailsOpen] = useState(false)
    const [searchTerm, setSearchTerm] = useState('')

    useEffect(() => {
        fetchSelectors()
    }, [])

    const fetchSelectors = async () => {
        setLoading(true)
        try {
            const { data, error } = await supabase
                .from('selectors')
                .select('*')
                .order('created_at', { ascending: false })

            if (error) throw error
            setSelectors(data || [])
        } catch (error) {
            console.error('Error fetching selectors:', error)
        } finally {
            setLoading(false)
        }
    }

    const updateStatus = async (id: string, newStatus: string) => {
        try {
            const { error } = await supabase
                .from('selectors')
                .update({ status: newStatus })
                .eq('id', id)

            if (error) throw error

            setSelectors(selectors.map(s => s.id === id ? { ...s, status: newStatus } : s))
        } catch (error) {
            console.error('Error updating status:', error)
        }
    }

    const handleExportCSV = () => {
        const dataToExport = selectors.map(s => ({
            'Full Name': s.full_name,
            'Email': s.email,
            'Contact': s.contact_number,
            'Age': s.age,
            'City/State': s.city_state,
            'Experience': s.years_of_experience,
            'Highest Level': s.highest_level_played,
            'Previous Exp': s.previously_worked_as_selector,
            'Availability': s.availability ? s.availability.join(', ') : '',
            'Preferred Region': s.preferred_region,
            'Status': s.status,
            'Registration Date': new Date(s.created_at).toLocaleString()
        }))
        exportToCSV(dataToExport, 'selectors_list')
    }

    const filteredSelectors = selectors.filter(s =>
        s.full_name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        s.email?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        s.city_state?.toLowerCase().includes(searchTerm.toLowerCase())
    )

    if (loading) {
        return (
            <div className="flex items-center justify-center min-h-screen">
                <Loader2 className="w-8 h-8 animate-spin text-blue-600" />
            </div>
        )
    }

    return (
        <div className="space-y-6">
            <div className="flex items-center justify-between">
                <div>
                    <h2 className="text-3xl font-bold text-gray-900">Selector Management</h2>
                    <p className="text-gray-600 mt-1">Manage selector applications and reviews</p>
                </div>
                <div className="flex gap-2">
                    <button
                        onClick={handleExportCSV}
                        className="bg-green-600 hover:bg-green-700 text-white font-semibold py-2 px-4 rounded-lg transition duration-200 flex items-center gap-2"
                        title="Download CSV"
                    >
                        <FileSpreadsheet className="w-4 h-4" />
                        Export CSV
                    </button>
                    <button
                        onClick={fetchSelectors}
                        className="bg-blue-600 hover:bg-blue-700 text-white font-semibold py-2 px-6 rounded-lg transition duration-200"
                    >
                        Refresh
                    </button>
                </div>
            </div>

            {/* Filters */}
            <div className="bg-white rounded-lg shadow p-6">
                <input
                    type="text"
                    placeholder="Search by name, email, or city..."
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none"
                />
            </div>

            {/* Table */}
            <div className="bg-white rounded-lg shadow overflow-hidden">
                <div className="overflow-x-auto">
                    <table className="w-full">
                        <thead className="bg-gray-50 border-b border-gray-200">
                            <tr>
                                <th className="px-6 py-4 text-left text-sm font-semibold text-gray-900">Name</th>
                                <th className="px-6 py-4 text-left text-sm font-semibold text-gray-900">Contact</th>
                                <th className="px-6 py-4 text-left text-sm font-semibold text-gray-900">Experience</th>
                                <th className="px-6 py-4 text-left text-sm font-semibold text-gray-900">Location</th>
                                <th className="px-6 py-4 text-left text-sm font-semibold text-gray-900">Status</th>
                                <th className="px-6 py-4 text-left text-sm font-semibold text-gray-900">Actions</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-gray-200">
                            {filteredSelectors.length === 0 ? (
                                <tr>
                                    <td colSpan={6} className="px-6 py-12 text-center text-gray-500">
                                        No selectors found
                                    </td>
                                </tr>
                            ) : (
                                filteredSelectors.map((selector) => (
                                    <tr key={selector.id} className="hover:bg-gray-50 transition-colors">
                                        <td className="px-6 py-4 text-sm font-medium text-gray-900">{selector.full_name}</td>
                                        <td className="px-6 py-4 text-sm text-gray-600">
                                            <div>{selector.email}</div>
                                            <div className="text-xs text-gray-500">{selector.contact_number}</div>
                                        </td>
                                        <td className="px-6 py-4 text-sm text-gray-600">
                                            {selector.years_of_experience}
                                        </td>
                                        <td className="px-6 py-4 text-sm text-gray-600">
                                            {selector.city_state}
                                        </td>
                                        <td className="px-6 py-4 text-sm">
                                            <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${selector.status === 'approved' ? 'bg-green-100 text-green-800' :
                                                selector.status === 'rejected' ? 'bg-red-100 text-red-800' :
                                                    'bg-yellow-100 text-yellow-800'
                                                }`}>
                                                {selector.status.toUpperCase()}
                                            </span>
                                        </td>
                                        <td className="px-6 py-4 text-sm">
                                            <div className="flex gap-2">
                                                <button
                                                    onClick={() => {
                                                        setSelectedSelector(selector)
                                                        setIsDetailsOpen(true)
                                                    }}
                                                    className="p-1 text-blue-600 hover:bg-blue-50 rounded"
                                                    title="View Details"
                                                >
                                                    <Eye className="w-5 h-5" />
                                                </button>
                                                <button
                                                    onClick={() => updateStatus(selector.id, 'approved')}
                                                    className="p-1 text-green-600 hover:bg-green-50 rounded"
                                                    title="Approve"
                                                >
                                                    <CheckCircle className="w-5 h-5" />
                                                </button>
                                                <button
                                                    onClick={() => updateStatus(selector.id, 'rejected')}
                                                    className="p-1 text-red-600 hover:bg-red-50 rounded"
                                                    title="Reject"
                                                >
                                                    <XCircle className="w-5 h-5" />
                                                </button>
                                            </div>
                                        </td>
                                    </tr>
                                ))
                            )}
                        </tbody>
                    </table>
                </div>
            </div>

            {/* Details Modal */}
            {isDetailsOpen && selectedSelector && (
                <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black bg-opacity-50">
                    <div className="bg-white rounded-lg shadow-xl w-full max-w-3xl max-h-[90vh] overflow-y-auto">
                        <div className="p-6 border-b border-gray-200 flex justify-between items-center sticky top-0 bg-white">
                            <div>
                                <h3 className="text-xl font-bold text-gray-900">Selector Details</h3>
                                <p className="text-sm text-gray-500">Application for {selectedSelector.full_name}</p>
                            </div>
                            <button
                                onClick={() => setIsDetailsOpen(false)}
                                className="text-gray-400 hover:text-gray-500"
                            >
                                <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                                </svg>
                            </button>
                        </div>

                        <div className="p-6 space-y-6">
                            {/* Personal Info */}
                            <div>
                                <h4 className="text-lg font-semibold text-gray-900 border-b pb-2 mb-4">Personal Information</h4>
                                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                    <div>
                                        <p className="text-sm font-medium text-gray-500">Full Name</p>
                                        <p className="text-gray-900">{selectedSelector.full_name}</p>
                                    </div>
                                    <div>
                                        <p className="text-sm font-medium text-gray-500">Age</p>
                                        <p className="text-gray-900">{selectedSelector.age}</p>
                                    </div>
                                    <div>
                                        <p className="text-sm font-medium text-gray-500">Location</p>
                                        <p className="text-gray-900">{selectedSelector.city_state}</p>
                                    </div>
                                    <div>
                                        <p className="text-sm font-medium text-gray-500">Contact</p>
                                        <p className="text-gray-900">{selectedSelector.contact_number}</p>
                                    </div>
                                    <div className="md:col-span-2">
                                        <p className="text-sm font-medium text-gray-500">Email</p>
                                        <p className="text-gray-900">{selectedSelector.email}</p>
                                    </div>
                                </div>
                            </div>

                            {/* Professional Details */}
                            <div>
                                <h4 className="text-lg font-semibold text-gray-900 border-b pb-2 mb-4">Professional Details</h4>
                                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                    <div>
                                        <p className="text-sm font-medium text-gray-500">Experience</p>
                                        <p className="text-gray-900">{selectedSelector.years_of_experience}</p>
                                    </div>
                                    <div>
                                        <p className="text-sm font-medium text-gray-500">Highest Level Played</p>
                                        <p className="text-gray-900">{selectedSelector.highest_level_played}</p>
                                    </div>
                                    <div>
                                        <p className="text-sm font-medium text-gray-500">Previous Selector Exp.</p>
                                        <p className="text-gray-900 capitalize">{selectedSelector.previously_worked_as_selector}</p>
                                    </div>
                                    <div>
                                        <p className="text-sm font-medium text-gray-500">Preferred Region</p>
                                        <p className="text-gray-900">{selectedSelector.preferred_region}</p>
                                    </div>
                                </div>
                            </div>

                            {/* Availability & Docs */}
                            <div>
                                <h4 className="text-lg font-semibold text-gray-900 border-b pb-2 mb-4">Availability & Documents</h4>
                                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                                    <div>
                                        <p className="text-sm font-medium text-gray-500 mb-2">Availability</p>
                                        <div className="flex flex-wrap gap-2">
                                            {selectedSelector.availability && Array.isArray(selectedSelector.availability) ? (
                                                selectedSelector.availability.map((day, idx) => (
                                                    <span key={idx} className="px-2 py-1 bg-blue-50 text-blue-700 text-xs rounded-full border border-blue-100 capitalize">
                                                        {day}
                                                    </span>
                                                ))
                                            ) : (
                                                <span className="text-gray-500">No availability specified</span>
                                            )}
                                        </div>
                                    </div>

                                    <div>
                                        <p className="text-sm font-medium text-gray-500 mb-2">Attached Document</p>
                                        {selectedSelector.document_url ? (
                                            <div className="flex items-center p-3 border rounded-lg bg-gray-50 hover:bg-gray-100 transition-colors">
                                                <FileText className="w-8 h-8 text-blue-500 mr-3" />
                                                <div className="flex-1 overflow-hidden">
                                                    <p className="text-sm font-medium text-gray-900 truncate">Document Upload</p>
                                                    <p className="text-xs text-gray-500">Click to view/download</p>
                                                </div>
                                                <a
                                                    href={selectedSelector.document_url}
                                                    target="_blank"
                                                    rel="noopener noreferrer"
                                                    className="flex items-center px-3 py-1.5 bg-white border border-gray-300 rounded text-sm text-gray-700 hover:bg-gray-50 transition-colors ml-2"
                                                >
                                                    <Download className="w-4 h-4 mr-1.5" />
                                                    View
                                                </a>
                                            </div>
                                        ) : (
                                            <p className="text-gray-500 italic p-3 border border-dashed rounded-lg bg-gray-50 text-center">
                                                No document attached
                                            </p>
                                        )}
                                    </div>
                                </div>
                            </div>
                        </div>

                        <div className="p-6 border-t border-gray-200 bg-gray-50 flex justify-end">
                            <button
                                onClick={() => setIsDetailsOpen(false)}
                                className="px-4 py-2 bg-white border border-gray-300 rounded-lg text-gray-700 hover:bg-gray-50 font-medium"
                            >
                                Close
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    )
}
