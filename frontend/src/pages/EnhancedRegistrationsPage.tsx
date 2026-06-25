import { useState } from 'react'
import { useRegistrations } from '@hooks/useRegistrations'
import { sendConfirmationEmailToPlayer, movePlayerToTrials } from '../api/trialsWorkflow'
import type { PlayerRegistration } from '../types'
import PlayerDetailsModal from '@components/PlayerDetailsModal'
import ImportExportButtons from '@components/ImportExportButtons'

export default function EnhancedRegistrationsPage() {
    const { registrations, loading, error, refetch } = useRegistrations()
    const [currentPage, setCurrentPage] = useState(1)
    const [itemsPerPage] = useState(10)
    const [paymentFilter, setPaymentFilter] = useState('all')
    const [searchTerm, setSearchTerm] = useState('')
    const [dateRange, setDateRange] = useState({ start: '', end: '' })
    const [selectedRegistration, setSelectedRegistration] = useState<PlayerRegistration | null>(null)
    const [isModalOpen, setIsModalOpen] = useState(false)
    const [selectedRegistrations, setSelectedRegistrations] = useState<string[]>([])
    const [activeMenuId, setActiveMenuId] = useState<string | null>(null)
    const [emailLoading, setEmailLoading] = useState(false)
    const [emailError, setEmailError] = useState<string | null>(null)
    const [emailSuccess, setEmailSuccess] = useState<string | null>(null)
    const [moveToTrialsLoading, setMoveToTrialsLoading] = useState(false)
    const [moveToTrialsError, setMoveToTrialsError] = useState<string | null>(null)
    const [moveToTrialsSuccess, setMoveToTrialsSuccess] = useState<string | null>(null)

    // Filter registrations based on search and filters
    const filteredRegistrations = registrations.filter((reg) => {
        // Payment status filter
        if (paymentFilter !== 'all' && reg.payment_status !== paymentFilter) {
            return false
        }

        // Search term filter (search in name, email, phone)
        if (searchTerm && !(
            reg.player_name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
            reg.player_email?.toLowerCase().includes(searchTerm.toLowerCase()) ||
            (reg.phone && String(reg.phone).includes(searchTerm))
        )) {
            return false
        }

        // Date range filter
        if (dateRange.start && reg.registration_date) {
            const regDate = new Date(reg.registration_date)
            const startDate = new Date(dateRange.start)
            if (regDate < startDate) return false
        }

        if (dateRange.end && reg.registration_date) {
            const regDate = new Date(reg.registration_date)
            const endDate = new Date(dateRange.end)
            if (regDate > endDate) return false
        }

        return true
    })

    // Pagination logic
    const indexOfLastItem = currentPage * itemsPerPage
    const indexOfFirstItem = indexOfLastItem - itemsPerPage
    const currentItems = filteredRegistrations.slice(indexOfFirstItem, indexOfLastItem)
    const totalPages = Math.ceil(filteredRegistrations.length / itemsPerPage)

    // Calculate payment statistics
    const capturedAmount = registrations
        .filter(reg => reg.payment_status === 'captured' || reg.payment_status === 'completed')
        .reduce((sum, reg) => sum + (reg.payment_amount || 0), 0)

    const pendingCount = registrations.filter((r) => r.payment_status === 'pending').length
    const approvedCount = registrations.filter((r) => r.payment_status === 'completed' || r.payment_status === 'captured').length
    const capturedCount = registrations.filter((r) => r.payment_status === 'captured' || r.payment_status === 'completed').length

    const getStatusBadge = (status: string) => {
        switch (status) {
            case 'pending':
                return 'bg-yellow-100 text-yellow-800'
            case 'approved':
                return 'bg-green-100 text-green-800'
            case 'completed':
                return 'bg-green-100 text-green-800'
            case 'captured':
                return 'bg-blue-100 text-blue-800'
            case 'failed':
                return 'bg-red-100 text-red-800'
            default:
                return 'bg-gray-100 text-gray-800'
        }
    }

    // Handle menu toggle
    const toggleMenu = (registrationId: string) => {
        setActiveMenuId(activeMenuId === registrationId ? null : registrationId)
    }

    // Action handlers
    const handleSendEmail = async (registration: PlayerRegistration) => {
        try {
            setEmailLoading(true);
            setEmailError(null);
            setEmailSuccess(null);

            const response = await sendConfirmationEmailToPlayer(
                registration.id,
                registration.player_email,
                registration.player_name
            );

            if (response.success) {
                setEmailSuccess(`Email sent successfully to ${registration.player_name}`);
                // Refresh data to update email status
                refetch();
            } else {
                throw new Error(response.error || 'Failed to send email');
            }
        } catch (error: any) {
            console.error('Error sending email:', error);
            setEmailError(error.message || 'Failed to send email');
        } finally {
            setEmailLoading(false);
            setActiveMenuId(null);
        }
    }

    const handleMoveToTrials = async (registration: PlayerRegistration) => {
        try {
            setMoveToTrialsLoading(true);
            setMoveToTrialsError(null);
            setMoveToTrialsSuccess(null);

            const response = await movePlayerToTrials(registration.id, {
                full_name: registration.player_name,
                email: registration.player_email,
                phone: registration.phone || '',
                state: registration.state,
                city: registration.city,
                pincode: registration.pincode,
                payment_status: registration.payment_status,
                payment_amount: registration.payment_amount
            });

            if (response.success) {
                setMoveToTrialsSuccess(`Player ${registration.player_name} moved to trials successfully`);
                // Refresh data to update the list
                refetch();
            } else {
                throw new Error(response.error || 'Failed to move player to trials');
            }
        } catch (error: any) {
            console.error('Error moving player to trials:', error);
            setMoveToTrialsError(error.message || 'Failed to move player to trials');
        } finally {
            setMoveToTrialsLoading(false);
            setActiveMenuId(null);
        }
    }

    const handleMoveSelectedToTrials = async () => {
        if (selectedRegistrations.length === 0) return;

        try {
            setMoveToTrialsLoading(true);
            setMoveToTrialsError(null);
            setMoveToTrialsSuccess(null);

            let successCount = 0;
            let failureCount = 0;

            // Process with Promise.all
            const promises = selectedRegistrations.map(async (id) => {
                const registration = registrations.find(r => r.id === id);
                if (!registration) return { success: false, error: 'Registration not found' };

                const response = await movePlayerToTrials(id, {
                    full_name: registration.player_name,
                    email: registration.player_email,
                    phone: registration.phone || '',
                    state: registration.state,
                    city: registration.city,
                    pincode: registration.pincode,
                    payment_status: registration.payment_status || 'pending',
                    payment_amount: registration.payment_amount
                });

                return response;
            });

            const results = await Promise.all(promises);

            results.forEach(res => {
                if (res.success) successCount++;
                else failureCount++;
            });

            if (successCount > 0) {
                setMoveToTrialsSuccess(`Successfully moved ${successCount} players to trials.${failureCount > 0 ? ` Failed: ${failureCount}` : ''}`);
                refetch();
                setSelectedRegistrations([]);
            } else {
                setMoveToTrialsError(`Failed to move players. Errors: ${failureCount}`);
            }

        } catch (error: any) {
            console.error('Error moving players to trials:', error);
            setMoveToTrialsError(error.message || 'Failed to move players to trials');
        } finally {
            setMoveToTrialsLoading(false);
        }
    }

    // Handle page change
    const paginate = (pageNumber: number) => setCurrentPage(pageNumber)

    // Clear filters
    const clearFilters = () => {
        setPaymentFilter('all')
        setSearchTerm('')
        setDateRange({ start: '', end: '' })
        setCurrentPage(1)
        setSelectedRegistrations([])
    }

    // Selection handlers
    const handleSelectRegistration = (id: string) => {
        setSelectedRegistrations(prev =>
            prev.includes(id) ? prev.filter(i => i !== id) : [...prev, id]
        )
    }

    const handleSelectAll = () => {
        if (selectedRegistrations.length === currentItems.length) {
            setSelectedRegistrations([])
        } else {
            setSelectedRegistrations(currentItems.map(item => item.id))
        }
    }

    // Options Menu Component
    const OptionsMenu = ({ registrationId, onSendEmail, onMoveToTrials }: { registrationId: string, onSendEmail: () => void, onMoveToTrials: () => void }) => {
        const isOpen = activeMenuId === registrationId

        return (
            <div className="relative">
                <button
                    onClick={(e) => {
                        e.stopPropagation()
                        toggleMenu(registrationId)
                    }}
                    className="text-gray-600 hover:text-gray-800 focus:outline-none p-1"
                    aria-label="Options menu"
                >
                    <span className="text-lg">⋮</span>
                </button>

                {isOpen && (
                    <div className="absolute right-0 mt-2 w-48 bg-white rounded-md shadow-lg z-50 border border-gray-200">
                        <div className="py-1">
                            <button
                                onClick={(e) => {
                                    e.stopPropagation()
                                    onSendEmail()
                                }}
                                className="w-full text-left px-4 py-2 text-sm text-gray-700 hover:bg-gray-100 hover:text-gray-900 flex items-center"
                            >
                                <span className="mr-2">📧</span> Send Email
                            </button>
                            <button
                                onClick={(e) => {
                                    e.stopPropagation()
                                    onMoveToTrials()
                                }}
                                className="w-full text-left px-4 py-2 text-sm text-gray-700 hover:bg-gray-100 hover:text-gray-900 flex items-center"
                            >
                                <span className="mr-2">🏃</span> Move to Trials
                            </button>
                        </div>
                    </div>
                )}
            </div>
        )
    }

    if (loading) {
        return (
            <div className="flex items-center justify-center min-h-screen">
                <div className="text-center">
                    <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto"></div>
                    <p className="mt-4 text-gray-600">Loading registrations...</p>
                </div>
            </div>
        )
    }

    if (error) {
        return (
            <div className="space-y-6">
                <div>
                    <h2 className="text-3xl font-bold text-gray-900">Registrations</h2>
                    <p className="text-gray-600 mt-1">Manage player registrations and payments</p>
                </div>
                <div className="bg-red-50 border border-red-200 rounded-lg p-6">
                    <p className="text-red-700 font-medium">Error loading registrations:</p>
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
            {/* Email Status Notifications */}
            {emailLoading && (
                <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
                    <p className="text-blue-700 font-medium">Sending email...</p>
                </div>
            )}
            {emailSuccess && (
                <div className="bg-green-50 border border-green-200 rounded-lg p-4">
                    <p className="text-green-700 font-medium">{emailSuccess}</p>
                </div>
            )}
            {emailError && (
                <div className="bg-red-50 border border-red-200 rounded-lg p-4">
                    <p className="text-red-700 font-medium">Error: {emailError}</p>
                </div>
            )}

            {/* Move to Trials Status Notifications */}
            {moveToTrialsLoading && (
                <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
                    <p className="text-blue-700 font-medium">Moving player to trials...</p>
                </div>
            )}
            {moveToTrialsSuccess && (
                <div className="bg-green-50 border border-green-200 rounded-lg p-4">
                    <p className="text-green-700 font-medium">{moveToTrialsSuccess}</p>
                </div>
            )}
            {moveToTrialsError && (
                <div className="bg-red-50 border border-red-200 rounded-lg p-4">
                    <p className="text-red-700 font-medium">Error: {moveToTrialsError}</p>
                </div>
            )}

            {/* Header */}
            <div className="flex items-center justify-between">
                <div>
                    <h2 className="text-3xl font-bold text-gray-900">Registrations</h2>
                    <p className="text-gray-600 mt-1">Manage player registrations and payments</p>
                </div>
                <div className="flex items-center space-x-4">
                    <ImportExportButtons
                        registrations={registrations}
                        onImportSuccess={refetch}
                    />
                    <button
                        onClick={refetch}
                        className="bg-blue-600 hover:bg-blue-700 text-white font-semibold py-2 px-6 rounded-lg transition duration-200"
                    >
                        Refresh
                    </button>
                </div>
            </div>

            {/* Payment Statistics Cards */}
            <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
                <div className="bg-white rounded-lg shadow p-6">
                    <div className="flex items-center justify-between">
                        <div>
                            <p className="text-gray-600 text-sm">Total Entries</p>
                            <p className="text-3xl font-bold text-gray-900 mt-1">{registrations.length}</p>
                        </div>
                        <div className="text-4xl">📊</div>
                    </div>
                </div>

                <div className="bg-white rounded-lg shadow p-6">
                    <div className="flex items-center justify-between">
                        <div>
                            <p className="text-gray-600 text-sm">Pending</p>
                            <p className="text-3xl font-bold text-yellow-600 mt-1">{pendingCount}</p>
                        </div>
                        <div className="text-4xl">⏳</div>
                    </div>
                </div>

                <div className="bg-white rounded-lg shadow p-6">
                    <div className="flex items-center justify-between">
                        <div>
                            <p className="text-gray-600 text-sm">Total Registrations</p>
                            <p className="text-3xl font-bold text-green-600 mt-1">{approvedCount}</p>
                        </div>
                        <div className="text-4xl">✅</div>
                    </div>
                </div>

                <div className="bg-white rounded-lg shadow p-6">
                    <div className="flex items-center justify-between">
                        <div>
                            <p className="text-gray-600 text-sm">Payments Captured</p>
                            <p className="text-3xl font-bold text-blue-600 mt-1">{capturedCount}</p>
                            <p className="text-xs text-gray-500 mt-1">₹{capturedAmount.toFixed(2)}</p>
                        </div>
                        <div className="text-4xl">💳</div>
                    </div>
                </div>
            </div>

            {/* Filters Section */}
            <div className="bg-white rounded-lg shadow p-6">
                <h3 className="text-lg font-semibold text-gray-900 mb-4">🔍 Filters</h3>
                <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                    <select
                        value={paymentFilter}
                        onChange={(e) => { setPaymentFilter(e.target.value); setCurrentPage(1) }}
                        className="px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none"
                    >
                        <option value="all">All Payment Status</option>
                        <option value="pending">Pending</option>
                        <option value="completed">Completed</option>
                        <option value="captured">Captured</option>
                        <option value="failed">Failed</option>
                    </select>

                    <input
                        type="text"
                        placeholder="Search name, email, phone..."
                        value={searchTerm}
                        onChange={(e) => { setSearchTerm(e.target.value); setCurrentPage(1) }}
                        className="px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none"
                    />

                    <input
                        type="date"
                        placeholder="Start date"
                        value={dateRange.start}
                        onChange={(e) => { setDateRange({ ...dateRange, start: e.target.value }); setCurrentPage(1) }}
                        className="px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none"
                    />

                    <input
                        type="date"
                        placeholder="End date"
                        value={dateRange.end}
                        onChange={(e) => { setDateRange({ ...dateRange, end: e.target.value }); setCurrentPage(1) }}
                        className="px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none"
                    />
                </div>
                <button
                    onClick={clearFilters}
                    className="mt-4 text-sm text-gray-600 hover:text-gray-800 underline"
                >
                    Clear all filters
                </button>
            </div>

            {/* Selection Info */}
            {currentItems.length > 0 && (
                <div className="bg-white rounded-lg shadow p-4 mb-4">
                    <div className="flex items-center justify-between">
                        <div className="flex items-center space-x-4">
                            <div className="flex items-center space-x-2">
                                <input
                                    type="checkbox"
                                    checked={selectedRegistrations.length === currentItems.length && currentItems.length > 0}
                                    onChange={handleSelectAll}
                                    className="h-4 w-4 rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                                />
                                <span className="text-sm font-medium">Select All</span>
                            </div>
                            <span className="text-sm text-gray-500">
                                {selectedRegistrations.length} of {currentItems.length} selected
                            </span>
                        </div>
                        {selectedRegistrations.length > 0 && (
                            <div className="flex space-x-2">
                                <button className="bg-blue-600 hover:bg-blue-700 text-white font-semibold py-2 px-4 rounded-lg text-sm transition duration-200">
                                    Send Email to Selected
                                </button>
                                <button
                                    onClick={handleMoveSelectedToTrials}
                                    disabled={moveToTrialsLoading}
                                    className="bg-green-600 hover:bg-green-700 text-white font-semibold py-2 px-4 rounded-lg text-sm transition duration-200 disabled:opacity-50"
                                >
                                    {moveToTrialsLoading ? 'Moving...' : 'Move Selected to Trials'}
                                </button>
                            </div>
                        )}
                    </div>
                </div>
            )}

            {/* Table */}
            {currentItems.length > 0 ? (
                <div className="bg-white rounded-lg shadow overflow-hidden">
                    <table className="w-full">
                        <thead className="bg-gray-50 border-b border-gray-200">
                            <tr>
                                <th className="px-6 py-4 text-left text-sm font-semibold text-gray-900">
                                    <input
                                        type="checkbox"
                                        checked={selectedRegistrations.length === currentItems.length && currentItems.length > 0}
                                        onChange={handleSelectAll}
                                        className="h-4 w-4 rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                                    />
                                </th>
                                <th className="px-6 py-4 text-left text-sm font-semibold text-gray-900">Player Name</th>
                                <th className="px-6 py-4 text-left text-sm font-semibold text-gray-900">Email</th>
                                <th className="px-6 py-4 text-left text-sm font-semibold text-gray-900">Phone</th>
                                <th className="px-6 py-4 text-left text-sm font-semibold text-gray-900">State</th>
                                <th className="px-6 py-4 text-left text-sm font-semibold text-gray-900">City</th>
                                <th className="px-6 py-4 text-left text-sm font-semibold text-gray-900">Pincode</th>
                                <th className="px-6 py-4 text-left text-sm font-semibold text-gray-900">Reg Date</th>
                                <th className="px-6 py-4 text-left text-sm font-semibold text-gray-900">Payment</th>
                                <th className="px-6 py-4 text-left text-sm font-semibold text-gray-900">Details</th>
                                <th className="px-6 py-4 text-left text-sm font-semibold text-gray-900">Actions</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-gray-200">
                            {currentItems.map((registration) => (
                                <tr key={registration.id} className="hover:bg-gray-50 transition-colors">
                                    <td className="px-6 py-4 text-sm">
                                        <input
                                            type="checkbox"
                                            checked={selectedRegistrations.includes(registration.id)}
                                            onChange={() => handleSelectRegistration(registration.id)}
                                            className="h-4 w-4 rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                                        />
                                    </td>
                                    <td className="px-6 py-4 text-sm text-gray-900 font-medium">{registration.player_name}</td>
                                    <td className="px-6 py-4 text-sm text-gray-600">{registration.player_email}</td>
                                    <td className="px-6 py-4 text-sm text-gray-600">{registration.phone || '-'}</td>
                                    <td className="px-6 py-4 text-sm text-gray-600">{registration.state || '-'}</td>
                                    <td className="px-6 py-4 text-sm text-gray-600">{registration.city || '-'}</td>
                                    <td className="px-6 py-4 text-sm text-gray-600">{registration.pincode || '-'}</td>
                                    <td className="px-6 py-4 text-sm text-gray-600">
                                        {new Date(registration.registration_date).toLocaleDateString()}
                                    </td>
                                    <td className="px-6 py-4 text-sm">
                                        <span
                                            className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${getStatusBadge(registration.payment_status || 'pending')}`}
                                        >
                                            {(registration.payment_status || 'pending').charAt(0).toUpperCase() + (registration.payment_status || 'pending').slice(1)}
                                        </span>
                                    </td>
                                    <td className="px-6 py-4 text-sm text-gray-600">
                                        <button
                                            className="text-blue-600 hover:text-blue-700 font-medium text-sm"
                                            onClick={() => {
                                                setSelectedRegistration(registration)
                                                setIsModalOpen(true)
                                            }}
                                        >
                                            📋 View
                                        </button>
                                    </td>
                                    <td className="px-6 py-4 text-sm">
                                        <OptionsMenu
                                            registrationId={registration.id}
                                            onSendEmail={() => handleSendEmail(registration)}
                                            onMoveToTrials={() => handleMoveToTrials(registration)}
                                        />
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                    </table>

                    {/* Pagination */}
                    <div className="px-6 py-4 bg-gray-50 border-t border-gray-200 flex items-center justify-between">
                        <div className="text-sm text-gray-600">
                            Showing {indexOfFirstItem + 1}-{Math.min(indexOfLastItem, filteredRegistrations.length)} of {filteredRegistrations.length} registrations
                        </div>
                        <div className="flex items-center space-x-2">
                            <button
                                onClick={() => paginate(1)}
                                disabled={currentPage === 1}
                                className="px-3 py-1 border border-gray-300 rounded-lg text-sm font-medium disabled:opacity-50 disabled:cursor-not-allowed hidden sm:block"
                            >
                                First
                            </button>
                            <button
                                onClick={() => paginate(Math.max(1, currentPage - 1))}
                                disabled={currentPage === 1}
                                className="px-3 py-1 border border-gray-300 rounded-lg text-sm font-medium disabled:opacity-50 disabled:cursor-not-allowed"
                            >
                                Previous
                            </button>
                            {(() => {
                                const windowSize = Math.min(5, totalPages)
                                let startPage = Math.max(1, currentPage - 2)

                                if (startPage + windowSize - 1 > totalPages) {
                                    startPage = Math.max(1, totalPages - windowSize + 1)
                                }

                                return Array.from({ length: windowSize }, (_, i) => startPage + i).map(page => (
                                    <button
                                        key={page}
                                        onClick={() => paginate(page)}
                                        className={`px-3 py-1 border border-gray-300 rounded-lg text-sm font-medium ${currentPage === page ? 'bg-blue-600 text-white' : 'hover:bg-gray-100'}`}
                                    >
                                        {page}
                                    </button>
                                ))
                            })()}
                            <button
                                onClick={() => paginate(Math.min(totalPages, currentPage + 1))}
                                disabled={currentPage === totalPages}
                                className="px-3 py-1 border border-gray-300 rounded-lg text-sm font-medium disabled:opacity-50 disabled:cursor-not-allowed"
                            >
                                Next
                            </button>
                            <button
                                onClick={() => paginate(totalPages)}
                                disabled={currentPage === totalPages}
                                className="px-3 py-1 border border-gray-300 rounded-lg text-sm font-medium disabled:opacity-50 disabled:cursor-not-allowed hidden sm:block"
                            >
                                Last
                            </button>
                        </div>
                    </div>
                </div>
            ) : (
                <div className="bg-white rounded-lg shadow p-12 text-center">
                    <p className="text-gray-600 text-lg">No registrations found</p>
                    <p className="text-gray-500 text-sm mt-2">Try adjusting your filters</p>
                    <button
                        onClick={refetch}
                        className="mt-4 bg-blue-600 hover:bg-blue-700 text-white font-semibold py-2 px-6 rounded-lg transition duration-200"
                    >
                        Refresh Data
                    </button>
                </div>
            )}

            {/* Player Details Modal */}
            <PlayerDetailsModal
                isOpen={isModalOpen}
                onClose={() => setIsModalOpen(false)}
                registration={selectedRegistration}
            />
        </div>
    )
}