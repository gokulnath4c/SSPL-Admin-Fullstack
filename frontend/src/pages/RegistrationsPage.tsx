import { useState } from 'react'
import { useRegistrations } from '@hooks/useRegistrations'
import type { PlayerRegistration } from '../types'
import PlayerDetailsModal from '@components/PlayerDetailsModal'
import ImportExportButtons from '@components/ImportExportButtons'

export default function RegistrationsPage() {
  const { registrations, loading, error, isUsingMockData, refetch } = useRegistrations()
  const [selectedRegistration, setSelectedRegistration] = useState<PlayerRegistration | null>(null)
  const [isModalOpen, setIsModalOpen] = useState(false)

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

  const pendingCount = registrations.filter((r) => r.status === 'pending').length
  const approvedCount = registrations.filter((r) => r.status === 'approved').length
  const paymentCompleted = registrations.filter((r) => r.payment_status === 'completed').length



  return (
    <div className="space-y-6">
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

      {/* Mock Data Banner */}
      {isUsingMockData && (
        <div className="bg-yellow-50 border border-yellow-300 rounded-lg p-4 flex items-start gap-3">
          <div className="text-2xl">⚠️</div>
          <div>
            <p className="text-yellow-900 font-semibold">Demo Data</p>
            <p className="text-yellow-800 text-sm">
              Displaying mock data. Set up the Supabase RPC function <code className="bg-yellow-100 px-2 py-1 rounded text-xs">get_player_registrations</code> to see real data.
            </p>
          </div>
        </div>
      )}

      {/* Stats */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
        <div className="bg-white rounded-lg shadow p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-gray-600 text-sm">Total Registrations</p>
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
              <p className="text-gray-600 text-sm">Approved</p>
              <p className="text-3xl font-bold text-green-600 mt-1">{approvedCount}</p>
            </div>
            <div className="text-4xl">✅</div>
          </div>
        </div>

        <div className="bg-white rounded-lg shadow p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-gray-600 text-sm">Payments Done</p>
              <p className="text-3xl font-bold text-blue-600 mt-1">{paymentCompleted}</p>
            </div>
            <div className="text-4xl">💳</div>
          </div>
        </div>
      </div>

      {/* Table */}
      {registrations.length > 0 ? (
        <div className="bg-white rounded-lg shadow overflow-hidden">
          <table className="w-full">
            <thead className="bg-gray-50 border-b border-gray-200">
              <tr>
                <th className="px-6 py-4 text-left text-sm font-semibold text-gray-900">Player Name</th>
                <th className="px-6 py-4 text-left text-sm font-semibold text-gray-900">Email</th>
                <th className="px-6 py-4 text-left text-sm font-semibold text-gray-900">Phone</th>
                <th className="px-6 py-4 text-left text-sm font-semibold text-gray-900">Reg Date</th>
                <th className="px-6 py-4 text-left text-sm font-semibold text-gray-900">Payment</th>
                <th className="px-6 py-4 text-left text-sm font-semibold text-gray-900">Amount</th>
                <th className="px-6 py-4 text-left text-sm font-semibold text-gray-900">Details</th>
                <th className="px-6 py-4 text-left text-sm font-semibold text-gray-900">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-200">
              {registrations.map((registration) => (
                <tr key={registration.id} className="hover:bg-gray-50 transition-colors">
                  <td className="px-6 py-4 text-sm text-gray-900 font-medium">{registration.player_name}</td>
                  <td className="px-6 py-4 text-sm text-gray-600">{registration.player_email}</td>
                  <td className="px-6 py-4 text-sm text-gray-600">{registration.phone || '-'}</td>
                  <td className="px-6 py-4 text-sm text-gray-600">
                    {new Date(registration.registration_date).toLocaleDateString()}
                  </td>
                  <td className="px-6 py-4 text-sm">
                    <span
                      className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${registration.payment_status === 'completed'
                        ? 'bg-green-100 text-green-800'
                        : registration.payment_status === 'failed'
                          ? 'bg-red-100 text-red-800'
                          : 'bg-yellow-100 text-yellow-800'
                        }`}
                    >
                      {(registration.payment_status || 'pending').charAt(0).toUpperCase() + (registration.payment_status || 'pending').slice(1)}
                    </span>
                  </td>
                  <td className="px-6 py-4 text-sm text-gray-900 font-medium">
                    {registration.payment_amount ? `$${registration.payment_amount.toFixed(2)}` : '-'}
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
                  <td className="px-6 py-4 text-sm space-x-2">
                    <button className="text-blue-600 hover:text-blue-700 font-medium">Send Mail</button>
                    <button className="text-green-600 hover:text-green-700 font-medium">Move to Trials</button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      ) : (
        <div className="bg-white rounded-lg shadow p-12 text-center">
          <p className="text-gray-600 text-lg">No registrations found</p>
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
