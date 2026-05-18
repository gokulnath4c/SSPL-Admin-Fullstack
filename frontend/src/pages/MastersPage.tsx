import { useState, useEffect } from 'react'
import {
    getTrialCenters,
    getTrialSlots,
    createTrialCenter,
    updateTrialCenter,
    createTrialSlot,
    updateTrialSlot,
    TrialCenter,
    TrialSlot
} from '../api/trialsWorkflow'

export default function MastersPage() {
    const [centers, setCenters] = useState<TrialCenter[]>([])
    const [slots, setSlots] = useState<TrialSlot[]>([])
    const [loading, setLoading] = useState(false)
    const [error, setError] = useState<string | null>(null)

    // Modal States
    const [showCenterModal, setShowCenterModal] = useState(false)
    const [showSlotModal, setShowSlotModal] = useState(false)
    const [editingCenter, setEditingCenter] = useState<TrialCenter | null>(null)
    const [editingSlot, setEditingSlot] = useState<TrialSlot | null>(null)

    // Form States
    const [centerForm, setCenterForm] = useState({ center_name: '', center_address: '' })
    const [slotForm, setSlotForm] = useState({ slot_name: '', slot_time: '', slot_end_time: '' })

    useEffect(() => {
        fetchData()
    }, [])

    const fetchData = async () => {
        setLoading(true)
        setError(null)
        try {
            const [centersResponse, slotsResponse] = await Promise.all([
                getTrialCenters(),
                getTrialSlots()
            ])

            if (centersResponse.success) {
                setCenters(centersResponse.data || [])
            } else {
                throw new Error(centersResponse.error || 'Failed to fetch centers')
            }

            if (slotsResponse.success) {
                setSlots(slotsResponse.data || [])
            } else {
                throw new Error(slotsResponse.error || 'Failed to fetch slots')
            }
        } catch (err) {
            console.error('Error fetching masters data:', err)
            setError(err instanceof Error ? err.message : 'Failed to fetch data')
        } finally {
            setLoading(false)
        }
    }

    // Center Handlers
    const handleOpenCenterModal = (center?: TrialCenter) => {
        if (center) {
            setEditingCenter(center)
            setCenterForm({
                center_name: center.center_name,
                center_address: center.center_address || ''
            })
        } else {
            setEditingCenter(null)
            setCenterForm({ center_name: '', center_address: '' })
        }
        setShowCenterModal(true)
    }

    const handleSaveCenter = async () => {
        try {
            setLoading(true)
            if (editingCenter) {
                const response = await updateTrialCenter(editingCenter.center_id, centerForm)
                if (response.success) {
                    alert('Center updated successfully')
                } else {
                    throw new Error(response.error)
                }
            } else {
                const response = await createTrialCenter(centerForm)
                if (response.success) {
                    alert('Center created successfully')
                } else {
                    throw new Error(response.error)
                }
            }
            setShowCenterModal(false)
            fetchData()
        } catch (err) {
            alert(err instanceof Error ? err.message : 'Failed to save center')
        } finally {
            setLoading(false)
        }
    }

    // Slot Handlers
    const handleOpenSlotModal = (slot?: TrialSlot) => {
        if (slot) {
            setEditingSlot(slot)
            setSlotForm({
                slot_name: slot.slot_name,
                slot_time: slot.slot_time,
                slot_end_time: slot.slot_end_time || ''
            })
        } else {
            setEditingSlot(null)
            setSlotForm({ slot_name: '', slot_time: '', slot_end_time: '' })
        }
        setShowSlotModal(true)
    }

    const handleSaveSlot = async () => {
        try {
            setLoading(true)
            if (editingSlot) {
                const response = await updateTrialSlot(editingSlot.slot_id, slotForm)
                if (response.success) {
                    alert('Slot updated successfully')
                } else {
                    throw new Error(response.error)
                }
            } else {
                const response = await createTrialSlot(slotForm)
                if (response.success) {
                    alert('Slot created successfully')
                } else {
                    throw new Error(response.error)
                }
            }
            setShowSlotModal(false)
            fetchData()
        } catch (err) {
            alert(err instanceof Error ? err.message : 'Failed to save slot')
        } finally {
            setLoading(false)
        }
    }

    if (loading && centers.length === 0 && slots.length === 0) {
        return (
            <div className="flex items-center justify-center min-h-[400px]">
                <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
            </div>
        )
    }

    return (
        <div className="space-y-6">
            <div className="flex justify-between items-center">
                <h1 className="text-2xl font-bold text-gray-900">Masters Management</h1>
                <button
                    onClick={fetchData}
                    className="p-2 text-gray-600 hover:text-blue-600 rounded-full hover:bg-gray-100 transition-colors"
                    title="Refresh Data"
                >
                    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
                    </svg>
                </button>
            </div>

            {error && (
                <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded relative">
                    <span className="block sm:inline">{error}</span>
                </div>
            )}

            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                {/* Trial Centers Table */}
                <div className="bg-white rounded-lg shadow-md overflow-hidden">
                    <div className="px-6 py-4 border-b border-gray-200 flex justify-between items-center bg-gray-50">
                        <h2 className="text-lg font-semibold text-gray-800">Trials Centers</h2>
                        <div className="flex space-x-2">
                            <span className="bg-blue-100 text-blue-800 text-xs font-medium px-2.5 py-1 rounded-full flex items-center">
                                {centers.length} Records
                            </span>
                            <button
                                onClick={() => handleOpenCenterModal()}
                                className="bg-blue-600 hover:bg-blue-700 text-white text-xs font-semibold px-3 py-1 rounded transition duration-200"
                            >
                                + Add Center
                            </button>
                        </div>
                    </div>
                    <div className="overflow-x-auto">
                        <table className="min-w-full divide-y divide-gray-200">
                            <thead className="bg-gray-50">
                                <tr>
                                    <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                                        Center Name
                                    </th>
                                    <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                                        Address
                                    </th>
                                    <th scope="col" className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                                        Actions
                                    </th>
                                </tr>
                            </thead>
                            <tbody className="bg-white divide-y divide-gray-200">
                                {centers.length > 0 ? (
                                    centers.map((center) => (
                                        <tr key={center.center_id} className="hover:bg-gray-50 transition-colors">
                                            <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">
                                                {center.center_name}
                                            </td>
                                            <td className="px-6 py-4 text-sm text-gray-500">
                                                {center.center_address || '-'}
                                            </td>
                                            <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                                                <button
                                                    onClick={() => handleOpenCenterModal(center)}
                                                    className="text-blue-600 hover:text-blue-900"
                                                >
                                                    Edit
                                                </button>
                                            </td>
                                        </tr>
                                    ))
                                ) : (
                                    <tr>
                                        <td colSpan={3} className="px-6 py-12 text-center text-sm text-gray-500">
                                            No trial centers found
                                        </td>
                                    </tr>
                                )}
                            </tbody>
                        </table>
                    </div>
                </div>

                {/* Trial Slots Table */}
                <div className="bg-white rounded-lg shadow-md overflow-hidden">
                    <div className="px-6 py-4 border-b border-gray-200 flex justify-between items-center bg-gray-50">
                        <h2 className="text-lg font-semibold text-gray-800">Trials Slots</h2>
                        <div className="flex space-x-2">
                            <span className="bg-purple-100 text-purple-800 text-xs font-medium px-2.5 py-1 rounded-full flex items-center">
                                {slots.length} Records
                            </span>
                            <button
                                onClick={() => handleOpenSlotModal()}
                                className="bg-purple-600 hover:bg-purple-700 text-white text-xs font-semibold px-3 py-1 rounded transition duration-200"
                            >
                                + Add Slot
                            </button>
                        </div>
                    </div>
                    <div className="overflow-x-auto">
                        <table className="min-w-full divide-y divide-gray-200">
                            <thead className="bg-gray-50">
                                <tr>
                                    <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                                        Slot Name
                                    </th>
                                    <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                                        From
                                    </th>
                                    <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                                        To
                                    </th>
                                    <th scope="col" className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                                        Actions
                                    </th>
                                </tr>
                            </thead>
                            <tbody className="bg-white divide-y divide-gray-200">
                                {slots.length > 0 ? (
                                    slots.map((slot) => (
                                        <tr key={slot.slot_id} className="hover:bg-gray-50 transition-colors">
                                            <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">
                                                {slot.slot_name}
                                            </td>
                                            <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                                                {slot.slot_time}
                                            </td>
                                            <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                                                {slot.slot_end_time || '-'}
                                            </td>
                                            <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                                                <button
                                                    onClick={() => handleOpenSlotModal(slot)}
                                                    className="text-blue-600 hover:text-blue-900"
                                                >
                                                    Edit
                                                </button>
                                            </td>
                                        </tr>
                                    ))
                                ) : (
                                    <tr>
                                        <td colSpan={3} className="px-6 py-12 text-center text-sm text-gray-500">
                                            No trial slots found
                                        </td>
                                    </tr>
                                )}
                            </tbody>
                        </table>
                    </div>
                </div>
            </div>

            {/* Center Modal */}
            {showCenterModal && (
                <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
                    <div className="bg-white rounded-lg shadow-xl p-6 w-full max-w-md mx-4">
                        <h3 className="text-xl font-bold text-gray-900 mb-4">
                            {editingCenter ? 'Edit Trial Center' : 'Add Trial Center'}
                        </h3>
                        <div className="space-y-4">
                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-1">Center Name *</label>
                                <input
                                    type="text"
                                    value={centerForm.center_name}
                                    onChange={(e) => setCenterForm({ ...centerForm, center_name: e.target.value })}
                                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-1 focus:ring-blue-500"
                                    placeholder="e.g. City Stadium"
                                />
                            </div>
                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-1">Address</label>
                                <textarea
                                    value={centerForm.center_address}
                                    onChange={(e) => setCenterForm({ ...centerForm, center_address: e.target.value })}
                                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-1 focus:ring-blue-500"
                                    rows={3}
                                    placeholder="Full address"
                                />
                            </div>
                        </div>
                        <div className="mt-6 flex justify-end space-x-3">
                            <button
                                onClick={() => setShowCenterModal(false)}
                                className="px-4 py-2 text-gray-600 hover:text-gray-800 font-medium"
                            >
                                Cancel
                            </button>
                            <button
                                onClick={handleSaveCenter}
                                disabled={loading}
                                className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 disabled:opacity-50"
                            >
                                {loading ? 'Saving...' : 'Save'}
                            </button>
                        </div>
                    </div>
                </div>
            )}

            {/* Slot Modal */}
            {showSlotModal && (
                <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
                    <div className="bg-white rounded-lg shadow-xl p-6 w-full max-w-md mx-4">
                        <h3 className="text-xl font-bold text-gray-900 mb-4">
                            {editingSlot ? 'Edit Trial Slot' : 'Add Trial Slot'}
                        </h3>
                        <div className="space-y-4">
                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-1">Slot Name *</label>
                                <input
                                    type="text"
                                    value={slotForm.slot_name}
                                    onChange={(e) => setSlotForm({ ...slotForm, slot_name: e.target.value })}
                                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-1 focus:ring-blue-500"
                                    placeholder="e.g. Morning Batch 1"
                                />
                            </div>
                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-1">From Time *</label>
                                <input
                                    type="time"
                                    value={slotForm.slot_time}
                                    onChange={(e) => setSlotForm({ ...slotForm, slot_time: e.target.value })}
                                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-1 focus:ring-blue-500"
                                />
                            </div>
                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-1">To Time</label>
                                <input
                                    type="time"
                                    value={slotForm.slot_end_time}
                                    onChange={(e) => setSlotForm({ ...slotForm, slot_end_time: e.target.value })}
                                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-1 focus:ring-blue-500"
                                />
                            </div>
                        </div>
                        <div className="mt-6 flex justify-end space-x-3">
                            <button
                                onClick={() => setShowSlotModal(false)}
                                className="px-4 py-2 text-gray-600 hover:text-gray-800 font-medium"
                            >
                                Cancel
                            </button>
                            <button
                                onClick={handleSaveSlot}
                                disabled={loading}
                                className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 disabled:opacity-50"
                            >
                                {loading ? 'Saving...' : 'Save'}
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    )
}
