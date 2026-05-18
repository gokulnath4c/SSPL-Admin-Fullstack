import { useState, useEffect } from 'react'
import * as XLSX from 'xlsx'

import {
    getCompletedRegistrations,

    getWorkflowDashboardStats,
    createTrial,
    getAllTrials,
    allocateToSpecificTrial,
    getTrialAllocations,
    getTrialCenters,
    createTrialCenter,
    getTrialSlots,
    createTrialSlot,
    removePlayersFromWorkflow,
    updatePlayerWorkflowDetails
} from '../api/trialsWorkflow'
import { getTrialOverallStats } from '../api/trialsV2'

import ImportExportButtons from '../components/ImportExportButtons'
import PlayerDetailsModal from '../components/PlayerDetailsModal'
import TrialLevelView from '../components/TrialLevelView'
import TrialsAnalyticsReport from '../components/TrialsAnalyticsReport'
import TrialsReportViewer from '../components/TrialsReportViewer'
import ImportVerificationTab from '../components/ImportVerificationTab'

export default function TrialsWorkflowPage() {
    const [activeTab, setActiveTab] = useState('completed')
    const [showReportsModal, setShowReportsModal] = useState(false)
    const [loading, setLoading] = useState(false)
    const [error, setError] = useState<string | null>(null)

    // Data states

    const [completedRegistrations, setCompletedRegistrations] = useState<any[]>([])

    const [dashboardStats, setDashboardStats] = useState<any>(null)
    const [trials, setTrials] = useState<any[]>([])
    // const [trialAllocations, setTrialAllocations] = useState<any[]>([])
    const [trialCenters, setTrialCenters] = useState<any[]>([])
    const [trialSlots, setTrialSlots] = useState<any[]>([])
    const [isCreatingCenter, setIsCreatingCenter] = useState(false)
    const [isCreatingSlot, setIsCreatingSlot] = useState(false)

    // Selection states

    const [selectedCompleted, setSelectedCompleted] = useState<string[]>([])



    const [selectedTrial, setSelectedTrial] = useState<string | null>(null)
    const [filterListLocation, setFilterListLocation] = useState<string>('')

    // Allocation Filter States
    const [filterSlotId, setFilterSlotId] = useState<string>('')
    const [filterDate, setFilterDate] = useState<string>('')

    // Form states
    // Allocation Form removed

    // Results Form removed

    // Trial Creation Modal
    const [showTrialCreationModal, setShowTrialCreationModal] = useState(false)
    const [trialCreationForm, setTrialCreationForm] = useState({
        trial_name: '',
        trial_date: '',
        trial_time: '',
        trial_venue: '',
        trial_address: '',
        trial_batch: '',
        trial_capacity: 50,
        center_id: '',
        slot_id: '',
        google_map_link: ''
    })
    const [trialCreationError, setTrialCreationError] = useState<string | null>(null)

    // Allocation Modal (from Trials List)
    const [showAllocationModal, setShowAllocationModal] = useState(false)
    const [allocationModalError, setAllocationModalError] = useState<string | null>(null)

    // Edit/View State
    const [viewingPlayer, setViewingPlayer] = useState<any>(null)
    const [editingPlayer, setEditingPlayer] = useState<any>(null)
    const [editForm, setEditForm] = useState({
        full_name: '',
        email: '',
        phone: '',
        state: '',
        city: '',
        pincode: ''
    })

    // Fetch data based on active tab
    useEffect(() => {
        fetchData()
    }, [activeTab])

    const handleViewClick = (player: any) => {
        setViewingPlayer({
            id: player.registration_id,
            player_name: player.full_name,
            player_email: player.email,
            phone: player.phone,
            registration_date: player.created_at,
            status: 'approved',
            payment_status: player.payment_status,
            payment_amount: player.payment_amount,
            // Use created_at as proxy for payment date if needed, or null
            payment_date: player.created_at,
            state: player.state,
            city: player.city,
            pincode: player.pincode,
            notes: ''
        })
    }

    const handleEditClick = (player: any) => {
        setEditingPlayer(player)
        setEditForm({
            full_name: player.full_name || '',
            email: player.email || '',
            phone: player.phone || '',
            state: player.state || '',
            city: player.city || '',
            pincode: player.pincode || ''
        })
    }

    const handleSaveEdit = async () => {
        if (!editingPlayer) return

        try {
            setLoading(true)
            const result = await updatePlayerWorkflowDetails(editingPlayer.workflow_id, editForm)
            if (result.success) {
                // Update local list to reflect changes immediately
                const updatedList = completedRegistrations.map(p =>
                    p.workflow_id === editingPlayer.workflow_id ? { ...p, ...editForm } : p
                )
                setCompletedRegistrations(updatedList)
                setEditingPlayer(null)
            } else {
                alert('Failed to update: ' + (result.error || 'Unknown error'))
            }
        } catch (err) {
            console.error(err)
            alert('Error updating player')
        } finally {
            setLoading(false)
        }
    }

    const fetchData = async () => {
        setLoading(true)
        setError(null)

        try {
            // Fetch stats independently (don't let it block other data)
            try {
                const stats = await getTrialOverallStats()
                setDashboardStats(stats)
            } catch (ignore) { console.warn('Failed to fetch stats', ignore); }

            // Always fetch trials
            try {
                const trialsResponse = await getAllTrials()
                if (trialsResponse.success) {
                    setTrials(trialsResponse.data || [])
                }
            } catch (ignore) { console.warn('Failed to fetch trials', ignore); }

            const centersResponse = await getTrialCenters()
            if (centersResponse.success) {
                setTrialCenters(centersResponse.data || [])
            }

            const slotsResponse = await getTrialSlots()
            if (slotsResponse.success) {
                setTrialSlots(slotsResponse.data || [])
            }

            // Fetch data based on active tab
            switch (activeTab) {

                case 'completed':
                    try {
                        const completedResponse = await getCompletedRegistrations()
                        if (completedResponse.success) {
                            // Sort by registration date (created_at) in descending order (most recent first)
                            const sortedData = (completedResponse.data || []).sort((a: any, b: any) => {
                                const dateA = new Date(a.created_at || 0).getTime()
                                const dateB = new Date(b.created_at || 0).getTime()
                                return dateB - dateA // Descending order
                            })
                            setCompletedRegistrations(sortedData)
                        } else {
                            console.error('Failed to fetch completed registrations:', completedResponse.error);
                        }
                    } catch (e) { console.error('Exception fetching completed:', e); }
                    break

            }
        } catch (err) {
            console.error('Error fetching data:', err)
            // Only set global error if critical checks fail? No, let's just log.
            // setError('Failed to fetch data. Please try again.')
        } finally {
            setLoading(false)
        }
    }





    const handleOpenAllocationModal = () => {
        if (selectedCompleted.length === 0) {
            setError('Please select at least one player to allocate to trials')
            return
        }
        setShowAllocationModal(true)
        setAllocationModalError(null)
        setSelectedTrial('') // Reset trial selection
    }

    const handleConfirmAllocation = async () => {
        if (!selectedTrial) {
            setAllocationModalError('Please select a trial center')
            return
        }

        if (!filterDate) {
            setAllocationModalError('Please select an allocation date')
            return
        }

        const centerId = selectedTrial
        const date = filterDate

        // Find existing trial
        let targetTrialId = trials.find(t => t.center_id === centerId && t.trial_date === date && (!filterSlotId || t.slot_id === filterSlotId))?.trial_id
        let targetTrialData = trials.find(t => t.center_id === centerId && t.trial_date === date && (!filterSlotId || t.slot_id === filterSlotId))

        try {
            setLoading(true)

            // Auto-create trial if not found
            if (!targetTrialId) {
                const center = trialCenters.find(c => c.center_id === centerId)
                if (!center) {
                    setAllocationModalError('Selected center not found')
                    setLoading(false)
                    return
                }

                // Determine slot time if slot selected
                let time = '09:00'
                if (filterSlotId) {
                    const slot = trialSlots.find(s => s.slot_id === filterSlotId)
                    if (slot) {
                        time = slot.slot_time
                    }
                }

                // Create new trial
                const newTrialRes = await createTrial({
                    trial_name: `${center.center_name} Trial`,
                    trial_date: date,
                    trial_time: time,
                    trial_venue: center.center_name,
                    trial_address: center.center_address,
                    trial_batch: 'Batch A', // Default batch
                    trial_capacity: 100, // Default capacity
                    center_id: centerId,
                    slot_id: filterSlotId || undefined,
                    google_map_link: ''
                })

                if (!newTrialRes.success || !newTrialRes.data) {
                    throw new Error(newTrialRes.error || 'Failed to auto-create trial event')
                }

                targetTrialId = newTrialRes.data.trial_id
                targetTrialData = newTrialRes.data
            }

            if (!targetTrialId || !targetTrialData) {
                throw new Error('Failed to identify target trial')
            }

            // First check current allocations for this trial
            const allocationsResponse = await getTrialAllocations()
            if (!allocationsResponse.success) {
                throw new Error(allocationsResponse.error || 'Failed to check trial allocations')
            }

            const currentAllocations = (allocationsResponse.data || []).filter(
                (allocation: any) => allocation.trial_id === targetTrialId
            )

            const availableSlots = targetTrialData.trial_capacity - currentAllocations.length
            if (selectedCompleted.length > availableSlots) {
                setAllocationModalError(`Not enough capacity. Only ${availableSlots} slots available in ${targetTrialData.trial_name}.`)
                setLoading(false)
                return
            }

            const response = await allocateToSpecificTrial(selectedCompleted, targetTrialId)

            if (response.success) {
                alert(`${response.data.allocations.length} players allocated to ${targetTrialData.trial_name} successfully`)
                setShowAllocationModal(false)
                setSelectedCompleted([])
                setSelectedTrial(null)
                fetchData() // Refresh data
            } else {
                throw new Error(response.error || 'Failed to allocate players')
            }
        } catch (err) {
            console.error('Error allocating players:', err)
            setAllocationModalError(err instanceof Error ? err.message : 'Failed to allocate players')
        } finally {
            setLoading(false)
        }
    }







    // Selection handlers


    const handleSelectCompleted = (id: string) => {
        setSelectedCompleted(prev =>
            prev.includes(id) ? prev.filter(i => i !== id) : [...prev, id]
        )
    }







    const handleSelectAllCompleted = () => {
        if (selectedCompleted.length === completedRegistrations.length) {
            setSelectedCompleted([])
        } else {
            setSelectedCompleted(completedRegistrations.map(reg => reg.workflow_id))
        }
    }







    const handleRemoveFromTrialsList = async () => {
        if (selectedCompleted.length === 0) return

        if (!confirm(`Are you sure you want to REMOVE ${selectedCompleted.length} players from the Trials List? This action cannot be undone.`)) return

        try {
            setLoading(true)
            console.log('Attempting to remove workflow IDs:', selectedCompleted);
            const response = await removePlayersFromWorkflow(selectedCompleted)
            console.log('Remove response:', response);

            if (response.success) {
                const count = response.data?.count ?? 'unknown';
                if (count === 0) {
                    alert(`Operation completed but 0 records were deleted. This usually means the records were not found or permission was denied. IDs: ${selectedCompleted.join(', ')}`);
                } else {
                    alert(`Players removed successfully. Deleted count: ${count}`);
                    setSelectedCompleted([])
                    fetchData()
                }
            } else {
                console.error('Remove failed:', response.error);
                alert(`Failed to remove players: ${response.error}`)
                throw new Error(response.error)
            }
        } catch (err) {
            console.error('Error removing players:', err)
            const msg = err instanceof Error ? err.message : 'Failed to remove players';
            alert(`Error: ${msg}`);
            setError(msg)
        } finally {
            setLoading(false)
        }
    }

    // Trial Creation Handlers
    const handleCreateTrial = async () => {
        try {
            setLoading(true)
            setTrialCreationError(null)

            // Handle center creation if needed
            let centerId = trialCreationForm.center_id;

            if (isCreatingCenter) {
                if (!trialCreationForm.trial_venue) {
                    setTrialCreationError('Center name is required')
                    setLoading(false)
                    return
                }

                // Create the center first
                const centerResponse = await createTrialCenter({
                    center_name: trialCreationForm.trial_venue,
                    center_address: trialCreationForm.trial_address || ''
                })

                if (centerResponse.success && centerResponse.data) {
                    centerId = centerResponse.data.center_id
                } else {
                    throw new Error(centerResponse.error || 'Failed to create trial center')
                }
            }

            // Handle slot creation if needed
            let slotId = trialCreationForm.slot_id;

            if (isCreatingSlot) {
                if (!trialCreationForm.trial_batch || !trialCreationForm.trial_time) {
                    setTrialCreationError('Slot name and time are required')
                    setLoading(false)
                    return
                }

                // Create the slot first
                const slotResponse = await createTrialSlot({
                    slot_name: trialCreationForm.trial_batch,
                    slot_time: trialCreationForm.trial_time
                })

                if (slotResponse.success && slotResponse.data) {
                    slotId = slotResponse.data.slot_id
                } else {
                    throw new Error(slotResponse.error || 'Failed to create trial slot')
                }
            } else if (!slotId) {
                // Should allow manual time if no slot selected? User wants "Provision to create Slot Timings for Trials".
                // If not creating slot, and no slot selected, we might still want to capture time manually?
                // But request says "Slot to be captured". Let's assume Slot is the way.
                // Actually, if we use slot, "trial name" and "trial time" come from slot?
                // "Name and Time of trials to be captured. Upon creating Trial Center, slot to be captured in the dropdown, create slot to be populated in the dropdown"
                // If I select a slot, trial_name and trial_time should probably match the slot?
                // Or trial_name is "U19 Selection Trial" and slot is "Morning Batch (9:00)"?
                // The "trial_name" in the form is "Trial Name" (e.g. U19 Selection Trials).
                // The "trial_time" is the time.
                // The "slot" has name and time.
                // If I select a slot, `trial_time` becomes `slot.slot_time`.
            }

            // Validate form
            if (!trialCreationForm.trial_name.trim()) {
                setTrialCreationError('Trial name is required')
                setLoading(false)
                return
            }

            if (trialCreationForm.trial_name.length > 100) {
                setTrialCreationError('Trial name must be 100 characters or less')
                return
            }

            if (!trialCreationForm.trial_date) {
                setTrialCreationError('Trial date is required')
                return
            }

            // Validate date is not in the past
            const today = new Date().toISOString().split('T')[0]
            if (trialCreationForm.trial_date < today) {
                setTrialCreationError('Trial date cannot be in the past')
                return
            }

            if (!trialCreationForm.trial_venue.trim()) {
                setTrialCreationError('Trial venue is required')
                return
            }

            if (trialCreationForm.trial_venue.length > 200) {
                setTrialCreationError('Trial venue must be 200 characters or less')
                return
            }

            if (trialCreationForm.trial_capacity <= 0) {
                setTrialCreationError('Trial capacity must be greater than 0')
                return
            }

            if (trialCreationForm.trial_capacity > 500) {
                setTrialCreationError('Trial capacity cannot exceed 500 players')
                return
            }

            if (trialCreationForm.trial_batch && trialCreationForm.trial_batch.length > 50) {
                setTrialCreationError('Trial batch must be 50 characters or less')
                return
            }

            const response = await createTrial({
                ...trialCreationForm,
                trial_venue: trialCreationForm.trial_venue,
                center_id: centerId,
                trial_name: trialCreationForm.trial_name,
                trial_time: trialCreationForm.trial_time,
                slot_id: slotId
            })

            if (response.success) {
                alert('Trial created successfully')
                setShowTrialCreationModal(false)
                setTrialCreationForm({
                    trial_name: '',
                    trial_date: '',
                    trial_time: '',
                    trial_venue: '',
                    trial_address: '',
                    trial_batch: '',
                    trial_capacity: 50,
                    center_id: '',
                    slot_id: '',
                    google_map_link: ''
                })
                setIsCreatingCenter(false)
                setIsCreatingSlot(false)
                fetchData() // Refresh data including trials list
            } else {
                throw new Error(response.error || 'Failed to create trial')
            }
        } catch (err) {
            console.error('Error creating trial:', err)
            setTrialCreationError(err instanceof Error ? err.message : 'Failed to create trial')
            alert(err instanceof Error ? err.message : 'Failed to create trial')
        } finally {
            setLoading(false)
        }
    }

    // Trial Allocation Handlers






    const handleExportCSV = () => {
        let dataToExport: any[] = [];
        let filename = 'trials_workflow';

        switch (activeTab) {
            case 'completed':
                dataToExport = completedRegistrations;
                filename = 'trials_list';
                break;
        }

        if (dataToExport.length === 0) {
            alert('No data to export');
            return;
        }

        const wb = XLSX.utils.book_new();
        const ws = XLSX.utils.json_to_sheet(dataToExport);
        XLSX.utils.book_append_sheet(wb, ws, "Sheet1");
        XLSX.writeFile(wb, `${filename}_${new Date().toISOString().split('T')[0]}.csv`);
    };



    return (

        <div className="space-y-6">
            {/* Header */}
            <div className="flex items-center justify-between">
                <div>
                    <h2 className="text-3xl font-bold text-gray-900">Trials Workflow Management</h2>
                    <p className="text-gray-600 mt-1">Manage player trials workflow from registration to selection</p>
                </div>
                <div className="flex items-center space-x-4">

                    <button
                        onClick={handleExportCSV}
                        className="bg-gray-600 hover:bg-gray-700 text-white font-semibold py-2 px-6 rounded-lg transition duration-200"
                    >
                        Export CSV
                    </button>
                    <ImportExportButtons

                        registrations={[]}
                        onImportSuccess={() => fetchData()}
                    />
                    <button
                        onClick={() => setShowTrialCreationModal(true)}
                        className="bg-green-600 hover:bg-green-700 text-white font-semibold py-2 px-6 rounded-lg transition duration-200"
                        disabled={loading}
                    >
                        Create Trial
                    </button>
                    <button
                        onClick={() => setShowReportsModal(true)}
                        className="bg-indigo-600 hover:bg-indigo-700 text-white font-semibold py-2 px-6 rounded-lg transition duration-200"
                        disabled={loading}
                    >
                        Reports Viewer
                    </button>
                    <button
                        onClick={fetchData}
                        className="bg-blue-600 hover:bg-blue-700 text-white font-semibold py-2 px-6 rounded-lg transition duration-200"
                        disabled={loading}
                    >
                        {loading ? 'Refreshing...' : 'Refresh Data'}
                    </button>
                </div>
            </div>

            {/* Dashboard Stats */}
            <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
                <div className="bg-white rounded-lg shadow p-6 border-l-4 border-blue-500">
                    <div className="flex items-center justify-between">
                        <div>
                            <p className="text-gray-600 text-sm">Candidates Pool</p>
                            <p className="text-3xl font-bold text-gray-900 mt-1">{dashboardStats?.funnel?.l1_pool || 0}</p>
                        </div>
                        <div className="text-4xl text-blue-500">📋</div>
                    </div>
                </div>

                <div className="bg-white rounded-lg shadow p-6 border-l-4 border-amber-500">
                    <div className="flex items-center justify-between">
                        <div>
                            <p className="text-gray-600 text-sm">L1 Attended</p>
                            <p className="text-3xl font-bold text-amber-600 mt-1">{dashboardStats?.funnel?.l1_attended || 0}</p>
                        </div>
                        <div className="text-4xl text-amber-500">🏏</div>
                    </div>
                </div>

                <div className="bg-white rounded-lg shadow p-6 border-l-4 border-green-500">
                    <div className="flex items-center justify-between">
                        <div>
                            <p className="text-gray-600 text-sm">L1 Selected</p>
                            <p className="text-3xl font-bold text-green-600 mt-1">{dashboardStats?.funnel?.l1_selected || 0}</p>
                        </div>
                        <div className="text-4xl text-green-500">✓</div>
                    </div>
                </div>

                <div className="bg-white rounded-lg shadow p-6 border-l-4 border-purple-500">
                    <div className="flex items-center justify-between">
                        <div>
                            <p className="text-gray-600 text-sm">Net Finalists</p>
                            <p className="text-3xl font-bold text-purple-600 mt-1">{dashboardStats?.funnel?.net_finalists || 0}</p>
                        </div>
                        <div className="text-4xl text-purple-500">🏆</div>
                    </div>
                </div>
            </div>

            {/* Error Display */}
            {error && (
                <div className="bg-red-50 border border-red-200 rounded-lg p-6">
                    <p className="text-red-700 font-medium">Error:</p>
                    <p className="text-red-600 text-sm mt-1">{error}</p>
                </div>
            )}

            {/* Tabs Navigation */}
            <div className="bg-white rounded-lg shadow p-6">
                <div className="flex space-x-4 border-b border-gray-200 mb-6">

                    <button
                        onClick={() => setActiveTab('completed')}
                        className={`pb-2 px-4 text-sm font-medium ${activeTab === 'completed' ? 'border-b-2 border-blue-600 text-blue-600' : 'text-gray-500 hover:text-gray-700'}`}
                    >
                        Trials List
                    </button>

                    <button
                        onClick={() => setActiveTab('bucket')}
                        className={`pb-2 px-4 text-sm font-medium ${activeTab === 'bucket' ? 'border-b-2 border-blue-600 text-blue-600' : 'text-gray-500 hover:text-gray-700'}`}
                    >
                        Trials Bucket
                    </button>

                    <button
                        onClick={() => setActiveTab('trial-level-1')}
                        className={`pb-2 px-4 text-sm font-medium ${activeTab === 'trial-level-1' ? 'border-b-2 border-blue-600 text-blue-600' : 'text-gray-500 hover:text-gray-700'}`}
                    >
                        Trial Level 1
                    </button>

                    <button
                        onClick={() => setActiveTab('trial-level-2')}
                        className={`pb-2 px-4 text-sm font-medium ${activeTab === 'trial-level-2' ? 'border-b-2 border-blue-600 text-blue-600' : 'text-gray-500 hover:text-gray-700'}`}
                    >
                        Trial Level 2
                    </button>

                    <button
                        onClick={() => setActiveTab('trial-level-3')}
                        className={`pb-2 px-4 text-sm font-medium ${activeTab === 'trial-level-3' ? 'border-b-2 border-blue-600 text-blue-600' : 'text-gray-500 hover:text-gray-700'}`}
                    >
                        Trial Level 3
                    </button>

                    <button
                        onClick={() => setActiveTab('analytics')}
                        className={`pb-2 px-4 text-sm font-medium ${activeTab === 'analytics' ? 'border-b-2 border-blue-600 text-blue-600' : 'text-gray-500 hover:text-gray-700'}`}
                    >
                        Analytics
                    </button>

                    <button
                        onClick={() => setActiveTab('import-data')}
                        className={`pb-2 px-4 text-sm font-medium ${activeTab === 'import-data' ? 'border-b-2 border-blue-600 text-blue-600' : 'text-gray-500 hover:text-gray-700'}`}
                    >
                        Import Data
                    </button>

                    <button
                        onClick={() => setActiveTab('reports')}
                        className={`pb-2 px-4 text-sm font-medium ${activeTab === 'reports' ? 'border-b-2 border-blue-600 text-blue-600' : 'text-gray-500 hover:text-gray-700'}`}
                    >
                        Reports
                    </button>
                </div>

                <div className="space-y-8">
                    {activeTab === 'analytics' && <TrialsAnalyticsReport />}
                    {activeTab === 'import-data' && <ImportVerificationTab />}
                    {activeTab === 'reports' && <TrialsReportViewer />}

                    {activeTab === 'bucket' && <TrialLevelView level={1} hideCalled={true} />}
                    {activeTab === 'trial-level-1' && <TrialLevelView level={1} />}
                    {activeTab === 'trial-level-2' && <TrialLevelView level={2} />}
                    {activeTab === 'trial-level-3' && <TrialLevelView level={3} />}

                    {/* Trials List Tab */}
                    {activeTab === 'completed' && (
                        <div>
                            <div className="flex items-center justify-between mb-4">
                                <h3 className="text-lg font-semibold text-gray-900">Trials List</h3>
                                <div className="flex space-x-4">
                                    <input
                                        type="text"
                                        placeholder="Filter by Location (City/State)"
                                        value={filterListLocation}
                                        onChange={(e) => setFilterListLocation(e.target.value)}
                                        className="px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none"
                                    />
                                    <button
                                        onClick={handleRemoveFromTrialsList}
                                        disabled={selectedCompleted.length === 0 || loading}
                                        className="bg-red-600 hover:bg-red-700 text-whites font-semibold py-2 px-6 rounded-lg transition duration-200 disabled:opacity-50 text-white mr-2"
                                    >
                                        Remove ({selectedCompleted.length})
                                    </button>
                                    <button
                                        onClick={handleOpenAllocationModal}
                                        disabled={selectedCompleted.length === 0 || loading}
                                        className="bg-blue-600 hover:bg-blue-700 text-white font-semibold py-2 px-6 rounded-lg transition duration-200 disabled:opacity-50"
                                    >
                                        {loading ? 'Allocating...' : `Allocate to Trials (${selectedCompleted.length})`}
                                    </button>
                                </div>
                            </div>
                            <div className="bg-white rounded-lg shadow overflow-y-auto max-h-[600px]">
                                <table className="w-full">
                                    <thead className="bg-gray-50 border-b border-gray-200">
                                        <tr>
                                            <th className="px-6 py-4 text-left text-sm font-semibold text-gray-900">
                                                <input
                                                    type="checkbox"
                                                    checked={selectedCompleted.length === completedRegistrations.length && completedRegistrations.length > 0}
                                                    onChange={handleSelectAllCompleted}
                                                    className="h-4 w-4 rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                                                />
                                            </th>
                                            <th className="px-6 py-4 text-left text-sm font-semibold text-gray-900">Unique ID</th>
                                            <th className="px-6 py-4 text-left text-sm font-semibold text-gray-900">Player Name</th>
                                            <th className="px-6 py-4 text-left text-sm font-semibold text-gray-900">Email</th>
                                            <th className="px-6 py-4 text-left text-sm font-semibold text-gray-900">Phone</th>
                                            <th className="px-6 py-4 text-left text-sm font-semibold text-gray-900">State</th>
                                            <th className="px-6 py-4 text-left text-sm font-semibold text-gray-900">City</th>
                                            <th className="px-6 py-4 text-left text-sm font-semibold text-gray-900">Pincode</th>
                                            <th className="px-6 py-4 text-left text-sm font-semibold text-gray-900">Actions</th>
                                        </tr>
                                    </thead>
                                    <tbody className="divide-y divide-gray-200">
                                        {completedRegistrations
                                            .filter(reg => {
                                                if (!filterListLocation) return true;
                                                const searchTerm = filterListLocation.toLowerCase();
                                                return (
                                                    (reg.city && reg.city.toLowerCase().includes(searchTerm)) ||
                                                    (reg.state && reg.state.toLowerCase().includes(searchTerm)) ||
                                                    (reg.pincode && reg.pincode.toLowerCase().includes(searchTerm))
                                                );
                                            })
                                            .length > 0 ? (
                                            completedRegistrations
                                                .filter(reg => {
                                                    if (!filterListLocation) return true;
                                                    const searchTerm = filterListLocation.toLowerCase();
                                                    return (
                                                        (reg.city && reg.city.toLowerCase().includes(searchTerm)) ||
                                                        (reg.state && reg.state.toLowerCase().includes(searchTerm)) ||
                                                        (reg.pincode && reg.pincode.toLowerCase().includes(searchTerm))
                                                    );
                                                })
                                                .map((reg) => (
                                                    <tr key={reg.workflow_id} className="hover:bg-gray-50 transition-colors">
                                                        <td className="px-6 py-4 text-left text-sm">
                                                            <input
                                                                type="checkbox"
                                                                checked={selectedCompleted.includes(reg.workflow_id)}
                                                                onChange={() => handleSelectCompleted(reg.workflow_id)}
                                                                className="h-4 w-4 rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                                                            />
                                                        </td>
                                                        <td className="px-6 py-4 text-left text-sm text-gray-900 font-medium">{reg.trial_uid || '-'}</td>
                                                        <td className="px-6 py-4 text-left text-sm text-gray-900 font-medium">{reg.full_name}</td>
                                                        <td className="px-6 py-4 text-left text-sm text-gray-600">{reg.email}</td>
                                                        <td className="px-6 py-4 text-left text-sm text-gray-600">{reg.phone}</td>
                                                        <td className="px-6 py-4 text-left text-sm text-gray-600">{reg.state || 'N/A'}</td>
                                                        <td className="px-6 py-4 text-left text-sm text-gray-600">{reg.city || 'N/A'}</td>
                                                        <td className="px-6 py-4 text-left text-sm text-gray-600">{reg.pincode || 'N/A'}</td>
                                                        <td className="px-6 py-4 text-left text-sm space-x-2 flex">
                                                            <button
                                                                onClick={() => handleViewClick(reg)}
                                                                className="text-blue-600 hover:text-blue-900"
                                                                title="View Details"
                                                            >
                                                                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                                                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
                                                                </svg>
                                                            </button>
                                                            <button
                                                                onClick={() => handleEditClick(reg)}
                                                                className="text-green-600 hover:text-green-900"
                                                                title="Edit Details"
                                                            >
                                                                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                                                                </svg>
                                                            </button>
                                                        </td>
                                                    </tr>
                                                ))
                                        ) : (
                                            <tr>
                                                <td colSpan={9} className="px-6 py-4 text-left text-center text-sm text-gray-500">
                                                    No completed registrations found
                                                </td>
                                            </tr>
                                        )}
                                    </tbody>
                                </table>
                            </div>
                        </div>
                    )}

                </div>
            </div>


            {/* Trial Creation Modal */}
            {
                showTrialCreationModal && (
                    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
                        <div className="bg-white rounded-lg shadow-xl p-6 w-full max-w-2xl mx-4">
                            <div className="flex items-center justify-between mb-6">
                                <h3 className="text-xl font-bold text-gray-900">Create New Trial</h3>
                                <button
                                    onClick={() => setShowTrialCreationModal(false)}
                                    className="text-gray-400 hover:text-gray-600"
                                    disabled={loading}
                                >
                                    <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                                    </svg>
                                </button>
                            </div>

                            {trialCreationError && (
                                <div className="bg-red-50 border border-red-200 rounded-lg p-4 mb-4">
                                    <p className="text-red-700 text-sm">{trialCreationError}</p>
                                </div>
                            )}

                            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-6">
                                <div className="space-y-2">
                                    <label className="text-sm font-medium text-gray-700">Trial Name *</label>
                                    <input
                                        type="text"
                                        value={trialCreationForm.trial_name}
                                        onChange={(e) => setTrialCreationForm({ ...trialCreationForm, trial_name: e.target.value })}
                                        placeholder="e.g., U19 Selection Trials"
                                        className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none"
                                        disabled={loading}
                                    />
                                </div>

                                <div className="space-y-2">
                                    <label className="text-sm font-medium text-gray-700">Trial Date *</label>
                                    <input
                                        type="date"
                                        value={trialCreationForm.trial_date}
                                        onChange={(e) => setTrialCreationForm({ ...trialCreationForm, trial_date: e.target.value })}
                                        className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none"
                                        disabled={loading}
                                    />
                                </div>

                                <div className="space-y-2">
                                    <label className="text-sm font-medium text-gray-700">Slot (Time)</label>
                                    {!isCreatingSlot ? (
                                        <div className="flex space-x-2">
                                            <select
                                                value={trialCreationForm.slot_id || ''}
                                                onChange={(e) => {
                                                    const selectedId = e.target.value;
                                                    if (selectedId === 'new') {
                                                        setIsCreatingSlot(true);
                                                        setTrialCreationForm({
                                                            ...trialCreationForm,
                                                            slot_id: '',
                                                            trial_time: ''
                                                            // Keep trial_name as is, because "Slot Name" might be distinct from "Trial Name" (U19 Selection vs Morning Batch)
                                                            // Wait, if I create a new slot, I need inputs for Slot Name and Slot Time.
                                                            // But where do I put them?
                                                            // I can use `trial_batch` as Slot Name temp storage if needed, or just add new fields?
                                                            // Let's use `trial_batch` for Slot Name and `trial_time` for Slot Time when creating new slot.
                                                        });
                                                    } else {
                                                        const slot = trialSlots.find(s => s.slot_id === selectedId);
                                                        setTrialCreationForm({
                                                            ...trialCreationForm,
                                                            slot_id: selectedId,
                                                            trial_time: slot?.slot_time || '',
                                                            trial_batch: slot?.slot_name || '' // Use batch field to display slot name if desired
                                                        });
                                                    }
                                                }}
                                                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none"
                                                disabled={loading}
                                            >
                                                <option value="">Select a Slot</option>
                                                {trialSlots.map((slot) => (
                                                    <option key={slot.slot_id} value={slot.slot_id}>
                                                        {slot.slot_name} ({slot.slot_time})
                                                    </option>
                                                ))}
                                                <option value="new">+ Create New Slot</option>
                                            </select>
                                        </div>
                                    ) : (
                                        <div className="space-y-2">
                                            <input
                                                type="text"
                                                value={trialCreationForm.trial_batch} // Utilizing batch field for Slot Name
                                                onChange={(e) => setTrialCreationForm({ ...trialCreationForm, trial_batch: e.target.value })}
                                                placeholder="Slot Name (e.g., Morning Batch)"
                                                className="w-full px-4 py-2 border border-blue-300 ring-1 ring-blue-500 rounded-lg mb-2 outline-none"
                                                autoFocus
                                            />
                                            <div className="flex items-center space-x-2">
                                                <input
                                                    type="time"
                                                    value={trialCreationForm.trial_time}
                                                    onChange={(e) => setTrialCreationForm({ ...trialCreationForm, trial_time: e.target.value })}
                                                    className="w-full px-4 py-2 border border-blue-300 ring-1 ring-blue-500 rounded-lg outline-none"
                                                />
                                                <button
                                                    onClick={() => setIsCreatingSlot(false)}
                                                    className="text-sm text-blue-600 hover:text-blue-800 underline whitespace-nowrap"
                                                    type="button"
                                                >
                                                    Cancel
                                                </button>
                                            </div>
                                        </div>
                                    )}
                                </div>

                                <div className="space-y-2">
                                    <label className="text-sm font-medium text-gray-700">Place of Trials *</label>
                                    {!isCreatingCenter ? (
                                        <div className="flex space-x-2">
                                            <select
                                                value={trialCreationForm.center_id || ''}
                                                onChange={(e) => {
                                                    const selectedId = e.target.value;
                                                    if (selectedId === 'new') {
                                                        setIsCreatingCenter(true);
                                                        setTrialCreationForm({
                                                            ...trialCreationForm,
                                                            center_id: '',
                                                            trial_venue: '',
                                                            trial_address: ''
                                                        });
                                                    } else {
                                                        const center = trialCenters.find(c => c.center_id === selectedId);
                                                        setTrialCreationForm({
                                                            ...trialCreationForm,
                                                            center_id: selectedId,
                                                            trial_venue: center?.center_name || '',
                                                            trial_address: center?.center_address || ''
                                                        });
                                                    }
                                                }}
                                                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none"
                                                disabled={loading}
                                            >
                                                <option value="">Select a Center</option>
                                                {trialCenters.map((center) => (
                                                    <option key={center.center_id} value={center.center_id}>
                                                        {center.center_name}
                                                    </option>
                                                ))}
                                                <option value="new">+ Create New Center</option>
                                            </select>
                                        </div>
                                    ) : (
                                        <div className="flex items-center space-x-2">
                                            <input
                                                type="text"
                                                value={trialCreationForm.trial_venue}
                                                onChange={(e) => setTrialCreationForm({ ...trialCreationForm, trial_venue: e.target.value })}
                                                placeholder="Enter new center name"
                                                className="w-full px-4 py-2 border border-blue-300 ring-1 ring-blue-500 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none"
                                                autoFocus
                                                disabled={loading}
                                            />
                                            <button
                                                onClick={() => setIsCreatingCenter(false)}
                                                className="text-sm text-blue-600 hover:text-blue-800 underline"
                                                type="button"
                                            >
                                                Select Existing
                                            </button>
                                        </div>
                                    )}
                                </div>

                                <div className="space-y-2">
                                    <label className="text-sm font-medium text-gray-700">Address of the Trials Center</label>
                                    <input
                                        type="text"
                                        value={trialCreationForm.trial_address || ''}
                                        onChange={(e) => setTrialCreationForm({ ...trialCreationForm, trial_address: e.target.value })}
                                        placeholder="e.g., 123 Stadium Rd, City"
                                        className={`w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none ${!isCreatingCenter && trialCreationForm.center_id ? 'bg-gray-100' : ''}`}
                                        disabled={loading || (!isCreatingCenter && !!trialCreationForm.center_id)}
                                    />
                                </div>

                                <div className="space-y-2">
                                    <label className="text-sm font-medium text-gray-700">Google Map Link</label>
                                    <input
                                        type="text"
                                        value={trialCreationForm.google_map_link || ''}
                                        onChange={(e) => setTrialCreationForm({ ...trialCreationForm, google_map_link: e.target.value })}
                                        placeholder="https://maps.google.com/..."
                                        className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none"
                                        disabled={loading}
                                    />
                                </div>

                                <div className="space-y-2">
                                    <label className="text-sm font-medium text-gray-700">Google Map Link</label>
                                    <input
                                        type="text"
                                        value={trialCreationForm.google_map_link || ''}
                                        onChange={(e) => setTrialCreationForm({ ...trialCreationForm, google_map_link: e.target.value })}
                                        placeholder="https://maps.google.com/..."
                                        className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none"
                                        disabled={loading}
                                    />
                                </div>



                                <div className="space-y-2">
                                    <label className="text-sm font-medium text-gray-700">Capacity *</label>
                                    <input
                                        type="number"
                                        value={trialCreationForm.trial_capacity}
                                        onChange={(e) => setTrialCreationForm({ ...trialCreationForm, trial_capacity: parseInt(e.target.value) || 0 })}
                                        min="1"
                                        className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none"
                                        disabled={loading}
                                    />
                                </div>
                            </div>

                            <div className="flex items-center justify-end space-x-4">
                                <button
                                    onClick={() => setShowTrialCreationModal(false)}
                                    className="px-6 py-2 text-gray-600 hover:text-gray-800 font-medium transition duration-200"
                                    disabled={loading}
                                >
                                    Cancel
                                </button>
                                <button
                                    onClick={handleCreateTrial}
                                    className="bg-blue-600 hover:bg-blue-700 text-white font-semibold px-6 py-2 rounded-lg transition duration-200 disabled:opacity-50"
                                    disabled={loading}
                                >
                                    {loading ? 'Creating...' : 'Create Trial'}
                                </button>
                            </div>
                        </div>
                    </div>
                )
            }
            {/* Allocation Modal */}
            {
                showAllocationModal && (
                    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
                        <div className="bg-white rounded-lg shadow-xl p-6 w-full max-w-md mx-4">
                            <div className="flex items-center justify-between mb-6">
                                <h3 className="text-xl font-bold text-gray-900">Allocate to Trial</h3>
                                <button
                                    onClick={() => setShowAllocationModal(false)}
                                    className="text-gray-400 hover:text-gray-600"
                                    disabled={loading}
                                >
                                    <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                                    </svg>
                                </button>
                            </div>

                            {allocationModalError && (
                                <div className="bg-red-50 border border-red-200 rounded-lg p-4 mb-4">
                                    <p className="text-red-700 text-sm">{allocationModalError}</p>
                                </div>
                            )}

                            <div className="space-y-4 mb-6">
                                <div className="space-y-4">
                                    {/* Allocation Date (was Filter by Date) */}
                                    <div>
                                        <label className="text-sm font-medium text-gray-700">Allocation Date</label>
                                        <input
                                            type="date"
                                            value={filterDate}
                                            onChange={(e) => {
                                                setFilterDate(e.target.value)
                                            }}
                                            className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none"
                                        />
                                    </div>

                                    {/* Filter: Slot */}
                                    <div>
                                        <label className="text-sm font-medium text-gray-700">Slot (Optional)</label>
                                        <select
                                            value={filterSlotId}
                                            onChange={(e) => {
                                                setFilterSlotId(e.target.value)
                                            }}
                                            className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none"
                                        >
                                            <option value="">Any Slot</option>
                                            {trialSlots.map(slot => (
                                                <option key={slot.slot_id} value={slot.slot_id}>
                                                    {slot.slot_name} ({slot.slot_time} - {slot.slot_end_time || '?'})
                                                </option>
                                            ))}
                                        </select>
                                    </div>

                                    {/* Select Center Dropdown */}
                                    <div>
                                        <label className="text-sm font-medium text-gray-700">Select Trial Center *</label>
                                        <select
                                            value={selectedTrial || ''} // Using selectedTrial state to store center_id temporarily
                                            onChange={(e) => setSelectedTrial(e.target.value)}
                                            className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none"
                                            disabled={loading}
                                        >
                                            <option value="">Select a Center</option>
                                            {trialCenters.map((center) => (
                                                <option key={center.center_id} value={center.center_id}>
                                                    {center.center_name}
                                                </option>
                                            ))}
                                        </select>
                                    </div>
                                </div>
                                <p className="text-sm text-gray-500">
                                    Allocating {selectedCompleted.length} selected player(s).
                                    <br />
                                    <span className="text-xs text-blue-600">Note: If a trial event doesn't exist for this center/date, one will be created automatically.</span>
                                </p>
                            </div>

                            <div className="flex items-center justify-end space-x-4">
                                <button
                                    onClick={() => setShowAllocationModal(false)}
                                    className="px-6 py-2 text-gray-600 hover:text-gray-800 font-medium transition duration-200"
                                    disabled={loading}
                                >
                                    Cancel
                                </button>
                                <button
                                    onClick={handleConfirmAllocation}
                                    className="bg-blue-600 hover:bg-blue-700 text-white font-semibold px-6 py-2 rounded-lg transition duration-200 disabled:opacity-50"
                                    disabled={loading || !selectedTrial || !filterDate}
                                >
                                    {loading ? 'Allocating...' : 'Confirm Allocation'}
                                </button>
                            </div>
                        </div>
                    </div>
                )
            }

            {/* View Player Modal */}
            <PlayerDetailsModal
                isOpen={!!viewingPlayer}
                onClose={() => setViewingPlayer(null)}
                registration={viewingPlayer}
            />

            {/* Edit Player Modal */}
            {editingPlayer && (
                <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
                    <div className="bg-white rounded-lg shadow-xl p-6 w-full max-w-lg mx-4">
                        <div className="flex items-center justify-between mb-6">
                            <h3 className="text-xl font-bold text-gray-900">Edit Player Details</h3>
                            <button
                                onClick={() => setEditingPlayer(null)}
                                className="text-gray-400 hover:text-gray-600"
                            >
                                <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                                </svg>
                            </button>
                        </div>

                        <div className="space-y-4">
                            <div>
                                <label className="text-sm font-medium text-gray-700">Full Name</label>
                                <input
                                    type="text"
                                    value={editForm.full_name}
                                    onChange={(e) => setEditForm({ ...editForm, full_name: e.target.value })}
                                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none"
                                />
                            </div>
                            <div className="grid grid-cols-2 gap-4">
                                <div>
                                    <label className="text-sm font-medium text-gray-700">Email</label>
                                    <input
                                        type="email"
                                        value={editForm.email}
                                        onChange={(e) => setEditForm({ ...editForm, email: e.target.value })}
                                        className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none"
                                    />
                                </div>
                                <div>
                                    <label className="text-sm font-medium text-gray-700">Phone</label>
                                    <input
                                        type="text"
                                        value={editForm.phone}
                                        onChange={(e) => setEditForm({ ...editForm, phone: e.target.value })}
                                        className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none"
                                    />
                                </div>
                            </div>
                            <div className="grid grid-cols-3 gap-4">
                                <div>
                                    <label className="text-sm font-medium text-gray-700">State</label>
                                    <input
                                        type="text"
                                        value={editForm.state}
                                        onChange={(e) => setEditForm({ ...editForm, state: e.target.value })}
                                        className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none"
                                    />
                                </div>
                                <div>
                                    <label className="text-sm font-medium text-gray-700">City</label>
                                    <input
                                        type="text"
                                        value={editForm.city}
                                        onChange={(e) => setEditForm({ ...editForm, city: e.target.value })}
                                        className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none"
                                    />
                                </div>
                                <div>
                                    <label className="text-sm font-medium text-gray-700">Pincode</label>
                                    <input
                                        type="text"
                                        value={editForm.pincode}
                                        onChange={(e) => setEditForm({ ...editForm, pincode: e.target.value })}
                                        className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none"
                                    />
                                </div>
                            </div>
                        </div>

                        <div className="flex items-center justify-end space-x-4 mt-8">
                            <button
                                onClick={() => setEditingPlayer(null)}
                                className="px-6 py-2 text-gray-600 hover:text-gray-800 font-medium transition duration-200"
                            >
                                Cancel
                            </button>
                            <button
                                onClick={handleSaveEdit}
                                disabled={loading}
                                className="bg-blue-600 hover:bg-blue-700 text-white font-semibold px-6 py-2 rounded-lg transition duration-200 disabled:opacity-50"
                            >
                                {loading ? 'Saving...' : 'Save Changes'}
                            </button>
                        </div>
                    </div>
                </div>
            )}
            {/* Reports Modal */}
            {showReportsModal && (
                <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
                    <div className="bg-white rounded-lg shadow-xl w-full max-w-6xl max-h-[90vh] overflow-hidden flex flex-col">
                        <div className="bg-indigo-600 text-white px-6 py-4 flex items-center justify-between">
                            <h3 className="text-xl font-bold">Trials Reporting Suite</h3>
                            <button
                                onClick={() => setShowReportsModal(false)}
                                className="text-white hover:text-gray-200 transition-colors"
                            >
                                <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                                </svg>
                            </button>
                        </div>
                        <div className="p-6 overflow-y-auto">
                            <TrialsReportViewer />
                        </div>
                        <div className="bg-gray-50 px-6 py-3 text-right">
                            <button
                                onClick={() => setShowReportsModal(false)}
                                className="bg-gray-200 hover:bg-gray-300 text-gray-800 font-semibold py-2 px-6 rounded-lg transition duration-200"
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