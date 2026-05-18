import { useState, useEffect, useMemo } from 'react';
import { supabase } from '../lib/supabase';
import playersData from '../Players_Data.json';
import { manualLocations, getStateForCity } from '../data';
import {
    updateTrialResults,
    getAllocatedTrials,
    updateTrialLevelProgress
} from '../api/trialsWorkflow';

// Type definitions
interface Player {
    // Basic info from JSON/DB merge
    name: string;
    mobile: string;
    state: string;
    city?: string;
    status: string;
    proficiency?: string;

    // Linked DB info (if available)
    workflow_id?: string;
    registration_id?: string;
    allocation_id?: string;
    email?: string;

    // Trial specific
    attendance_status?: 'pending' | 'attended' | 'absent';
    batting_score?: number;
    bowling_score?: number;
    fielding_score?: number;
    overall_score?: number;
    remarks?: string;
}

const ITEMS_PER_PAGE = 50;

const TrialLevel1Tab = () => {
    const [enrichedPlayers, setEnrichedPlayers] = useState<Player[]>([]);
    const [isLoading, setIsLoading] = useState(true);
    const [searchQuery, setSearchQuery] = useState('');
    const [locationFilter, setLocationFilter] = useState('ALL');
    const [statusFilter, setStatusFilter] = useState('ALL');
    const [loadingMessage, setLoadingMessage] = useState('Loading players...');
    const [currentPage, setCurrentPage] = useState(1);
    const [selectedPlayers, setSelectedPlayers] = useState<Set<string>>(new Set());
    const [isBulkSaving, setIsBulkSaving] = useState(false);

    // Load Data
    useEffect(() => {
        const loadData = async () => {
            setIsLoading(true);
            setLoadingMessage('Loading local records...');

            try {
                // 1. Fetch Allocations first
                const allocationsRes = await getAllocatedTrials();
                const allocMap = new Map();
                if (allocationsRes.success && allocationsRes.data) {
                    allocationsRes.data.forEach(a => {
                        if (a.phone) allocMap.set(a.phone.replace(/[^0-9]/g, '').slice(-10), a);
                    });
                }

                // 2. Load JSON Data
                let rawList: any[] = [];
                if (playersData) {
                    if (Array.isArray(playersData)) {
                        rawList = playersData;
                    } else if ((playersData as any).default && Array.isArray((playersData as any).default)) {
                        rawList = (playersData as any).default;
                    }
                }

                // --- Normalization Helpers ---
                const cleanPhone = (p: any) => {
                    if (!p) return '';
                    const s = String(p).replace(/[^0-9]/g, '');
                    return s.length > 10 ? s.slice(-10) : s;
                };

                const cleanName = (n: any) => {
                    if (!n) return '';
                    return String(n).toLowerCase().replace(/\s+/g, ' ').trim();
                };
                // -----------------------------

                // 3. Prepare Manual Data Map
                const manualMap = new Map<string, string>();
                if (manualLocations) {
                    Object.entries(manualLocations).forEach(([mobile, city]) => {
                        const cleaned = cleanPhone(mobile);
                        if (cleaned.length >= 10) {
                            manualMap.set(cleaned, city);
                        }
                    });
                }

                // 4. Fetch DB Data (Player Registrations)
                let mobileMap = new Map();
                let nameMap = new Map();

                setLoadingMessage('Fetching database records...');
                const { data: dbPlayers } = await supabase
                    .from('player_registrations')
                    .select('id, phone, city, state, full_name, email');

                if (dbPlayers) {
                    dbPlayers.forEach((p: any) => {
                        const m = cleanPhone(p.phone);
                        if (m && m.length >= 10) mobileMap.set(m, p);
                        const n = cleanName(p.full_name);
                        if (n && n.length > 2) nameMap.set(n, p);
                    });
                }

                setLoadingMessage('Matching records...');

                // 5. Merge & Match (JSON + DB)
                const combinedList: Player[] = rawList.map(p => {
                    if (!p) return null;

                    // Removed 'SELECTED' filter - fetching ALL players now
                    // if (p.status !== 'SELECTED') return null;

                    const jsonMobile = cleanPhone(p.mobile);
                    const jsonName = cleanName(p.name);

                    // Try Manual Match
                    const manualCity = manualMap.get(jsonMobile);

                    // Try DB Mobile Match
                    let dbP = mobileMap.get(jsonMobile);
                    if (!dbP) dbP = nameMap.get(jsonName);

                    // Determine Final Location Data
                    const finalCity = manualCity || dbP?.city || p.city || 'N/A';
                    let finalState = 'N/A';

                    if (manualCity) finalState = getStateForCity(manualCity);
                    else if (dbP) finalState = dbP.state || 'N/A';
                    else finalState = (p.state && p.state !== '') ? p.state : 'N/A';

                    if (finalCity !== 'N/A' && (finalState === 'N/A' || finalState === '')) {
                        const inferred = getStateForCity(finalCity);
                        if (inferred) finalState = inferred;
                    }

                    // Check for existing allocation
                    const allocation = allocMap.get(jsonMobile);

                    return {
                        name: p.name,
                        mobile: jsonMobile,
                        state: finalState,
                        city: finalCity,
                        status: p.status,
                        proficiency: p.proficiency,
                        workflow_id: allocation?.workflow_id,
                        allocation_id: allocation?.allocation_id,
                        attendance_status: allocation?.attendance_status || 'pending',
                        batting_score: allocation?.batting_score,
                        bowling_score: allocation?.bowling_score,
                        fielding_score: allocation?.fielding_score,
                        overall_score: allocation?.overall_score,
                        remarks: allocation?.remarks,
                        email: dbP?.email || allocation?.email || ''
                    };
                }).filter(Boolean) as Player[];

                setEnrichedPlayers(combinedList);

            } catch (err) {
                console.error('Error in loadData:', err);
                setEnrichedPlayers([]);
            } finally {
                setIsLoading(false);
            }
        };

        loadData();
    }, []);

    // Unique Locations for Filter
    const uniqueLocations = useMemo(() => {
        const locs = new Set<string>();
        enrichedPlayers.forEach(p => {
            if (p.city && p.city !== 'N/A') locs.add(p.city);
        });
        return Array.from(locs).sort();
    }, [enrichedPlayers]);

    const uniqueStatuses = useMemo(() => {
        const stats = new Set<string>();
        enrichedPlayers.forEach(p => stats.add(p.status));
        return Array.from(stats).sort();
    }, [enrichedPlayers]);

    // Filter
    const filteredData = useMemo(() => {
        let data = enrichedPlayers;

        if (locationFilter !== 'ALL') {
            data = data.filter(p => p.city === locationFilter);
        }

        if (statusFilter !== 'ALL') {
            data = data.filter(p => p.status === statusFilter);
        }

        if (searchQuery) {
            const q = searchQuery.toLowerCase();
            data = data.filter(p =>
                p.name.toLowerCase().includes(q) ||
                p.mobile.includes(q)
            );
        }

        return data;
    }, [enrichedPlayers, searchQuery, locationFilter, statusFilter]);

    // Pagination
    const totalPages = Math.ceil(filteredData.length / ITEMS_PER_PAGE);
    const paginatedData = useMemo(() => {
        const start = (currentPage - 1) * ITEMS_PER_PAGE;
        return filteredData.slice(start, start + ITEMS_PER_PAGE);
    }, [filteredData, currentPage]);


    // Handlers
    const togglePlayerSelection = (mobile: string) => {
        setSelectedPlayers(prev => {
            const newSet = new Set(prev);
            if (newSet.has(mobile)) {
                newSet.delete(mobile);
            } else {
                newSet.add(mobile);
            }
            return newSet;
        });
    };

    const toggleSelectAll = () => {
        if (selectedPlayers.size === paginatedData.length) {
            setSelectedPlayers(new Set());
        } else {
            setSelectedPlayers(new Set(paginatedData.map(p => p.mobile)));
        }
    };

    const handleBulkMarkSelected = async () => {
        const playersToUpdate = paginatedData.filter(p => selectedPlayers.has(p.mobile));
        if (playersToUpdate.length === 0) {
            alert('No players selected');
            return;
        }

        setIsBulkSaving(true);

        let dbSuccessCount = 0;
        for (const player of playersToUpdate) {
            if (player.workflow_id) {
                // Update player_workflow directly for level_1
                const res = await updateTrialLevelProgress(player.workflow_id, {
                    level_1_status: 'selected',
                    level_1_score: player.overall_score || 0,
                    level_1_remarks: player.remarks || ''
                });
                if (res.success) dbSuccessCount++;
            } else {
                 console.warn("No workflow_id for player: ", player.name);
            }
        }

        setIsBulkSaving(false);
        setSelectedPlayers(new Set());
        alert(`${playersToUpdate.length} players marked for Level 2!${dbSuccessCount > 0 ? ` (${dbSuccessCount} saved to DB)` : ''}`);
    };


    // Component for a row to handle input state
    const PlayerRow = ({ player, isSelected, onToggle }: { player: Player; isSelected: boolean; onToggle: () => void }) => {
        const [formData, setFormData] = useState({
            score: player.overall_score || '',
            remarks: player.remarks || ''
        });
        const [selectionStatus, setSelectionStatus] = useState<string>('waitlisted');

        const [isSaving, setIsSaving] = useState(false);

        const onSave = async () => {
            if (!player.workflow_id) {
                alert("Cannot save marks: Player not in workflow.");
                return;
            }

            setIsSaving(true);
            const res = await updateTrialLevelProgress(player.workflow_id, {
                level_1_status: selectionStatus,
                level_1_score: Number(formData.score) || 0,
                level_1_remarks: formData.remarks
            });
            
            if (res.success && selectionStatus === 'not_selected') {
                try {
                    await fetch('/api/admin/email/send-rejection', {
                        method: 'POST',
                        headers: { 'Content-Type': 'application/json' },
                        body: JSON.stringify({ email: player.email, playerName: player.name })
                    });
                } catch (e) {
                    console.error("Failed to send rejection email", e);
                }
            }
            
            setIsSaving(false);

            if (res.success) {
                // Success
            } else {
                alert("Failed to save: " + res.error);
            }
        };

        return (
            <tr className="hover:bg-gray-50 transition-colors">
                <td className="px-3 py-4">
                    <input
                        type="checkbox"
                        checked={isSelected}
                        onChange={onToggle}
                        className="w-4 h-4 rounded border-gray-300"
                    />
                </td>
                <td className="px-6 py-4 font-medium text-gray-900">
                    {player.name}
                </td>
                <td className="px-6 py-4 text-gray-500 font-mono text-xs">{player.mobile}</td>
                <td className="px-6 py-4 text-gray-500">
                    <div className="flex flex-col">
                        <span className="font-medium text-gray-900 text-sm">{player.city}</span>
                        <span className="text-xs text-gray-400">{player.state}</span>
                    </div>
                </td>
                <td className="px-6 py-4">
                    <span className={`inline-flex items-center px-2 py-0.5 rounded text-xs font-medium mb-1 ${player.status === 'SELECTED' ? 'bg-green-100 text-green-800' : 'bg-gray-100 text-gray-800'
                        }`}>
                        {player.status}
                    </span>
                </td>
                <td className="px-6 py-4">
                    <input
                        type="number"
                        placeholder="Score"
                        className="w-20 px-2 py-1 text-xs border rounded"
                        value={formData.score}
                        onChange={(e) => setFormData({ ...formData, score: e.target.value })}
                    />
                </td>
                <td className="px-6 py-4">
                    <input
                        type="text"
                        placeholder="Remarks"
                        className="w-full px-2 py-1 text-xs border rounded"
                        value={formData.remarks}
                        onChange={(e) => setFormData({ ...formData, remarks: e.target.value })}
                    />
                </td>
                <td className="px-6 py-4">
                    <div className="flex items-center gap-1">
                        <select
                            value={selectionStatus}
                            onChange={(e) => setSelectionStatus(e.target.value)}
                            className="px-2 py-1 text-xs border rounded bg-white"
                        >
                            <option value="waitlisted">Waitlisted</option>
                            <option value="selected">Selected (→ L2)</option>
                            <option value="absent">Absent</option>
                            <option value="not_selected">Not Selected</option>
                        </select>
                        <button
                            onClick={onSave}
                            disabled={isSaving}
                            className="text-blue-600 hover:text-blue-800"
                            title="Save marks"
                        >
                            {isSaving ? '...' : '💾'}
                        </button>

                    </div>
                </td>
            </tr>
        );
    };

    if (isLoading) {
        return (
            <div className="flex flex-col items-center justify-center h-64">
                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mb-4"></div>
                <div className="text-xl text-gray-500 font-medium">{loadingMessage}</div>
            </div>
        );
    }

    return (
        <div className="space-y-4">
            {/* Filters */}
            <div className="flex flex-col md:flex-row gap-4 bg-gray-50 p-4 rounded-lg">
                <div className="relative md:w-48">
                    <select
                        value={locationFilter}
                        onChange={(e) => setLocationFilter(e.target.value)}
                        className="w-full pl-4 pr-10 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 appearance-none bg-white"
                    >
                        <option value="ALL">All Locations</option>
                        {uniqueLocations.map(city => (
                            <option key={city} value={city}>{city}</option>
                        ))}
                    </select>
                </div>

                <div className="relative md:w-48">
                    <select
                        value={statusFilter}
                        onChange={(e) => setStatusFilter(e.target.value)}
                        className="w-full pl-4 pr-10 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 appearance-none bg-white"
                    >
                        <option value="ALL">All Statuses</option>
                        {uniqueStatuses.map(status => (
                            <option key={status} value={status}>{status}</option>
                        ))}
                    </select>
                </div>

                <div className="relative flex-1">
                    <input
                        type="text"
                        placeholder="Search name or mobile..."
                        value={searchQuery}
                        onChange={(e) => setSearchQuery(e.target.value)}
                        className="pl-4 pr-10 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 w-full"
                    />
                </div>
            </div>

            {/* Bulk Action */}
            {selectedPlayers.size > 0 && (
                <div className="bg-blue-50 border border-blue-200 rounded-lg p-3 flex items-center justify-between">
                    <span className="text-blue-800 text-sm">
                        <strong>{selectedPlayers.size}</strong> player(s) selected
                    </span>
                    <button
                        onClick={handleBulkMarkSelected}
                        disabled={isBulkSaving}
                        className="bg-green-600 hover:bg-green-700 text-white font-medium py-1.5 px-4 rounded text-sm transition-colors disabled:opacity-50"
                    >
                        {isBulkSaving ? 'Saving...' : 'Mark Selected for Level 2'}
                    </button>
                </div>
            )}

            {/* Table */}
            <div className="bg-white border rounded-lg shadow-sm overflow-hidden">
                <div className="overflow-x-auto">
                    <table className="w-full text-sm text-left">
                        <thead className="text-xs text-gray-500 uppercase bg-gray-50 border-b">
                            <tr>
                                <th className="px-3 py-3">
                                    <input
                                        type="checkbox"
                                        checked={selectedPlayers.size === paginatedData.length && paginatedData.length > 0}
                                        onChange={toggleSelectAll}
                                        className="w-4 h-4 rounded border-gray-300"
                                    />
                                </th>
                                <th className="px-6 py-3 font-medium">Name</th>
                                <th className="px-6 py-3 font-medium">Mobile</th>
                                <th className="px-6 py-3 font-medium">Location</th>
                                <th className="px-6 py-3 font-medium">Status</th>
                                <th className="px-6 py-3 font-medium">Score</th>
                                <th className="px-6 py-3 font-medium">Remarks</th>
                                <th className="px-6 py-3 font-medium">L1 Selection</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-gray-100">
                            {paginatedData.length === 0 ? (
                                <tr>
                                    <td colSpan={8} className="px-6 py-8 text-center text-gray-500">
                                        No players found.
                                    </td>
                                </tr>
                            ) : (
                                paginatedData.map((player, idx) => (
                                    <PlayerRow
                                        key={`${player.mobile}-${idx}`}
                                        player={player}
                                        isSelected={selectedPlayers.has(player.mobile)}
                                        onToggle={() => togglePlayerSelection(player.mobile)}
                                    />
                                ))
                            )}
                        </tbody>
                    </table>
                </div>
                {/* Pagination Footer */}
                {filteredData.length > 0 && (
                    <div className="px-6 py-4 border-t bg-gray-50 text-xs text-gray-500 flex items-center justify-between">
                        <div>
                            Showing {((currentPage - 1) * ITEMS_PER_PAGE) + 1} to {Math.min(currentPage * ITEMS_PER_PAGE, filteredData.length)} of {filteredData.length} entries
                        </div>
                        <div className="flex items-center space-x-2">
                            <button
                                onClick={() => setCurrentPage(p => Math.max(1, p - 1))}
                                disabled={currentPage === 1}
                                className={`px-3 py-1 rounded border ${currentPage === 1 ? 'bg-gray-100 text-gray-400 cursor-not-allowed' : 'bg-white hover:bg-gray-50 text-gray-700'}`}
                            >
                                Previous
                            </button>
                            <span className="text-gray-600">
                                Page {currentPage} of {Math.max(1, totalPages)}
                            </span>
                            <button
                                onClick={() => setCurrentPage(p => Math.min(totalPages, p + 1))}
                                disabled={currentPage === totalPages || totalPages === 0}
                                className={`px-3 py-1 rounded border ${currentPage === totalPages || totalPages === 0 ? 'bg-gray-100 text-gray-400 cursor-not-allowed' : 'bg-white hover:bg-gray-50 text-gray-700'}`}
                            >
                                Next
                            </button>
                        </div>
                    </div>
                )}
            </div>
        </div>
    );
};

export default TrialLevel1Tab;
