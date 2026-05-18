import { useState } from 'react'
import { useTournamentOrganizers } from '@hooks/useTournamentOrganizers'
import type { TournamentOrganizer } from '../types'
import OrganizerDetailsModal from '../components/OrganizerDetailsModal'
import { FileSpreadsheet } from 'lucide-react'
import { exportToCSV } from '../utils/exportUtils'

export default function TournamentOrganizersPage() {
    const { organizers, loading, error, refetch } = useTournamentOrganizers()
    const [searchTerm, setSearchTerm] = useState('')

    const [selectedOrganizer, setSelectedOrganizer] = useState<TournamentOrganizer | null>(null)
    const [isModalOpen, setIsModalOpen] = useState(false)

    // Filter organizers based on search
    const filteredOrganizers = organizers.filter((org) => {
        if (searchTerm && !(
            org.organisation_name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
            org.organiser_name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
            org.mobile_primary?.includes(searchTerm) ||
            org.email?.toLowerCase().includes(searchTerm.toLowerCase())
        )) {
            return false
        }
        return true
    })

    const handleViewDetails = (org: TournamentOrganizer) => {
        setSelectedOrganizer(org)
        setIsModalOpen(true)
    }

    const handleCloseModal = () => {
        setIsModalOpen(false)
        setSelectedOrganizer(null)
    }

    const handleExportCSV = () => {
        const dataToExport = organizers.map(org => ({
            'Organization': org.organisation_name,
            'Organizer': org.organiser_name,
            'Designation': org.designation,
            'Mobile': org.mobile_primary,
            'Email': org.email,
            'State': org.state,
            'City': org.city_district,
            'Tournament Type': org.tournament_type,
            'Categories': org.tournament_category?.join(', '),
            'Start Date': org.start_date ? new Date(org.start_date).toLocaleDateString() : '',
            'Status': org.status,
            'Registration Date': new Date(org.created_at).toLocaleString()
        }))
        exportToCSV(dataToExport, 'organizers_list')
    }

    if (loading) {
        return (
            <div className="flex items-center justify-center min-h-screen">
                <div className="text-center">
                    <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto"></div>
                    <p className="mt-4 text-gray-600">Loading organizers...</p>
                </div>
            </div>
        )
    }

    if (error) {
        return (
            <div className="space-y-6">
                <div>
                    <h2 className="text-3xl font-bold text-gray-900">Tournament Organizers</h2>
                    <p className="text-gray-600 mt-1">Manage tournament organizers and requests</p>
                </div>
                <div className="bg-red-50 border border-red-200 rounded-lg p-6">
                    <p className="text-red-700 font-medium">Error loading organizers:</p>
                    <p className="text-red-600 text-sm mt-1">{error}</p>
                    <button
                        onClick={refetch}
                        className="mt-4 bg-red-600 hover:bg-red-700 text-white font-semibold py-2 px-6 rounded-lg transition duration-200"
                    >
                        Try Again
                    </button>
                </div>
            </div>
        )
    }

    return (
        <div className="space-y-6">
            {/* Header */}
            <div className="flex items-center justify-between">
                <div>
                    <h2 className="text-3xl font-bold text-gray-900">Tournament Organizers</h2>
                    <p className="text-gray-600 mt-1">Manage tournament organizers and requests</p>
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
                        onClick={refetch}
                        className="bg-blue-600 hover:bg-blue-700 text-white font-semibold py-2 px-6 rounded-lg transition duration-200"
                    >
                        Refresh
                    </button>
                </div>
            </div>

            {/* Filters */}
            <div className="bg-white rounded-lg shadow p-6">
                <div className="flex items-center space-x-4">
                    <input
                        type="text"
                        placeholder="Search organization, name, email..."
                        value={searchTerm}
                        onChange={(e) => setSearchTerm(e.target.value)}
                        className="flex-1 px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none"
                    />
                </div>
            </div>

            {/* Table */}
            <div className="bg-white rounded-lg shadow overflow-hidden">
                <div className="overflow-x-auto">
                    <table className="w-full">
                        <thead className="bg-gray-50 border-b border-gray-200">
                            <tr>
                                <th className="px-6 py-4 text-left text-sm font-semibold text-gray-900">Organization</th>
                                <th className="px-6 py-4 text-left text-sm font-semibold text-gray-900">Organizer</th>
                                <th className="px-6 py-4 text-left text-sm font-semibold text-gray-900">Contact</th>
                                <th className="px-6 py-4 text-left text-sm font-semibold text-gray-900">Location</th>
                                <th className="px-6 py-4 text-left text-sm font-semibold text-gray-900">Tournament</th>
                                <th className="px-6 py-4 text-left text-sm font-semibold text-gray-900">Start Date</th>
                                <th className="px-6 py-4 text-left text-sm font-semibold text-gray-900">Status</th>
                                <th className="px-6 py-4 text-right text-sm font-semibold text-gray-900">Actions</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-gray-200">
                            {filteredOrganizers.length > 0 ? (
                                filteredOrganizers.map((org) => (
                                    <tr key={org.id} className="hover:bg-gray-50 transition-colors">
                                        <td className="px-6 py-4 text-sm font-medium text-gray-900">{org.organisation_name}</td>
                                        <td className="px-6 py-4 text-sm text-gray-600">
                                            <div>{org.organiser_name}</div>
                                            <div className="text-xs text-gray-500">{org.designation}</div>
                                        </td>
                                        <td className="px-6 py-4 text-sm text-gray-600">
                                            <div>{org.mobile_primary}</div>
                                            <div className="text-xs text-gray-500">{org.email}</div>
                                        </td>
                                        <td className="px-6 py-4 text-sm text-gray-600">
                                            {org.city_district}, {org.state}
                                        </td>
                                        <td className="px-6 py-4 text-sm text-gray-600">
                                            <div>{org.tournament_type}</div>
                                            <div className="text-xs text-gray-500">{org.venue_name}</div>
                                        </td>
                                        <td className="px-6 py-4 text-sm text-gray-600">
                                            {org.start_date ? new Date(org.start_date).toLocaleDateString() : '-'}
                                        </td>
                                        <td className="px-6 py-4 text-sm">
                                            <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${org.status === 'approved' ? 'bg-green-100 text-green-800' :
                                                org.status === 'rejected' ? 'bg-red-100 text-red-800' :
                                                    'bg-yellow-100 text-yellow-800'
                                                }`}>
                                                {org.status ? org.status.charAt(0).toUpperCase() + org.status.slice(1) : 'Pending'}
                                            </span>
                                        </td>
                                        <td className="px-6 py-4 text-sm text-right">
                                            <button
                                                onClick={() => handleViewDetails(org)}
                                                className="text-blue-600 hover:text-blue-900 font-medium"
                                            >
                                                View
                                            </button>
                                        </td>
                                    </tr>
                                ))
                            ) : (
                                <tr>
                                    <td colSpan={8} className="px-6 py-12 text-center text-gray-500">
                                        No organizers found
                                    </td>
                                </tr>
                            )}
                        </tbody>
                    </table>
                </div>
            </div>

            {/* Details Modal */}
            <OrganizerDetailsModal
                isOpen={isModalOpen}
                onClose={handleCloseModal}
                organizer={selectedOrganizer}
            />
        </div>
    )
}
