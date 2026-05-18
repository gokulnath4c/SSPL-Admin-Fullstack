import { useState, useEffect, useMemo } from 'react';
import { supabase } from '../lib/supabase';
import playersData from '../Players_Data.json';
import { manualLocations, getStateForCity } from '../data';
import {
    updateTrialLevelProgress,
    getTrialLevelPlayers
} from '../api/trialsWorkflow';

// Type definitions
interface Player {
    name: string;
    mobile: string;
    state: string;
    city?: string;
    status: string;
    proficiency?: string;
    workflow_id?: string;
    registration_id?: string;
    allocation_id?: string;
    attendance_status?: 'pending' | 'attended' | 'absent';
    overall_score?: number;
    level_3_status?: 'pending' | 'selected' | 'not_selected' | 'absent';
    level_3_score?: number;
    remarks?: string;
    email?: string;
}

const ITEMS_PER_PAGE = 50;

const TrialLevel3Tab = () => {
    const [enrichedPlayers, setEnrichedPlayers] = useState<Player[]>([]);
    const [isLoading, setIsLoading] = useState(true);
    const [searchQuery, setSearchQuery] = useState('');
    const [locationFilter, setLocationFilter] = useState('ALL');
    const [loadingMessage, setLoadingMessage] = useState('Loading players...');
    const [currentPage, setCurrentPage] = useState(1);

    // Load Data - Read from localStorage for Level 2 selected players
    useEffect(() => {
        const loadData = async () => {
            setIsLoading(true);
            setLoadingMessage('Loading Level 3 players from Database...');

            try {
                // Fetch players who passed Level 2 directly from DB
                const res = await getTrialLevelPlayers({ level_2_status: 'selected' });
                
                if (res.success && res.data) {
                    const mapped: Player[] = res.data.map(p => ({
                        name: p.full_name || '',
                        email: p.email || '',
                        mobile: p.phone?.replace(/[^0-9]/g, '').slice(-10) || '',
                        state: p.state || 'N/A',
                        city: p.city || 'N/A',
                        status: 'SELECTED',
                        proficiency: p.proficiency || '',
                        workflow_id: p.workflow_id,
                        registration_id: p.registration_id,
                        attendance_status: p.level_3_status === 'absent' ? 'absent' : (p.level_3_status && p.level_3_status !== 'pending' ? 'attended' : 'pending'),
                        level_3_status: p.level_3_status || 'pending',
                        level_3_score: p.level_3_score || 0,
                        remarks: p.level_3_remarks || ''
                    }));
                    setEnrichedPlayers(mapped);
                } else {
                    setEnrichedPlayers([]);
                }
            } catch (err) {
                console.error('Error in loadData:', err);
                setEnrichedPlayers([]);
            } finally {
                setIsLoading(false);
            }
        };

        loadData();
    }, []);

    const uniqueLocations = useMemo(() => {
        const locs = new Set<string>();
        enrichedPlayers.forEach(p => {
            if (p.city && p.city !== 'N/A') locs.add(p.city);
        });
        return Array.from(locs).sort();
    }, [enrichedPlayers]);

    const filteredData = useMemo(() => {
        let data = enrichedPlayers;

        if (locationFilter !== 'ALL') {
            data = data.filter(p => p.city === locationFilter);
        }

        if (searchQuery) {
            const q = searchQuery.toLowerCase();
            data = data.filter(p =>
                p.name.toLowerCase().includes(q) ||
                p.mobile.includes(q)
            );
        }

        return data;
    }, [enrichedPlayers, searchQuery, locationFilter]);

    const totalPages = Math.ceil(filteredData.length / ITEMS_PER_PAGE);
    const paginatedData = useMemo(() => {
        const start = (currentPage - 1) * ITEMS_PER_PAGE;
        return filteredData.slice(start, start + ITEMS_PER_PAGE);
    }, [filteredData, currentPage]);


    // Component for a row
    const PlayerRow = ({ player }: { player: Player }) => {
        const [attendance, setAttendance] = useState<'pending' | 'attended' | 'absent'>(player.attendance_status || 'pending');
        const [formData, setFormData] = useState({
            score: player.level_3_score || '',
            remarks: player.remarks || ''
        });
        const [selectionStatus, setSelectionStatus] = useState<'pending' | 'selected' | 'not_selected' | 'absent'>(player.level_3_status || 'pending');
        const [isSaving, setIsSaving] = useState(false);

        const handleAttendance = async (status: 'attended' | 'absent') => {
            setAttendance(status);
            if (status === 'absent') {
                 setSelectionStatus('absent');
            } else if (selectionStatus === 'absent' || selectionStatus === 'pending') {
                 // if they were marked absent or pending, and now marked attended, just keep them pending for selection evaluation
                 setSelectionStatus('pending');
            }
        };

        const onSave = async () => {
            setIsSaving(true);

            if (!player.workflow_id) {
                 alert("Cannot save: Player not in workflow database.");
                 setIsSaving(false);
                 return;
            }

            const res = await updateTrialLevelProgress(player.workflow_id, {
                level_3_status: selectionStatus,
                level_3_score: Number(formData.score) || 0,
                level_3_remarks: formData.remarks
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
                 alert('Saved!');
            } else {
                 alert('Failed to save to database: ' + res.error);
            }
        };

        return (
            <tr className="hover:bg-gray-50 transition-colors">
                <td className="px-4 py-3 font-medium text-gray-900 text-sm">{player.name}</td>
                <td className="px-4 py-3 text-gray-500 font-mono text-xs">{player.mobile}</td>
                <td className="px-4 py-3 text-gray-500 text-xs">
                    <span className="font-medium text-gray-900">{player.city}</span>
                    <span className="text-gray-400 ml-1">({player.state})</span>
                </td>
                <td className="px-4 py-3">
                    <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-green-100 text-green-800">
                        L2 Selected
                    </span>
                </td>
                <td className="px-4 py-3">
                    <div className="flex items-center gap-1">
                        <button
                            onClick={() => handleAttendance('attended')}
                            className={`px-2 py-1 rounded text-xs font-medium transition-colors ${attendance === 'attended' ? 'bg-green-600 text-white' : 'bg-gray-100 text-gray-600 hover:bg-green-100'}`}
                        >
                            Present
                        </button>
                        <button
                            onClick={() => handleAttendance('absent')}
                            className={`px-2 py-1 rounded text-xs font-medium transition-colors ${attendance === 'absent' ? 'bg-red-600 text-white' : 'bg-gray-100 text-gray-600 hover:bg-red-100'}`}
                        >
                            Absent
                        </button>
                    </div>
                </td>
                <td className="px-4 py-3">
                    {attendance === 'attended' ? (
                        <input
                            type="number"
                            placeholder="Score"
                            className="w-16 px-2 py-1 text-xs border rounded"
                            value={formData.score}
                            onChange={(e) => setFormData({ ...formData, score: e.target.value })}
                        />
                    ) : (
                        <span className="text-xs text-gray-400">—</span>
                    )}
                </td>
                <td className="px-4 py-3">
                    {attendance === 'attended' ? (
                        <input
                            type="text"
                            placeholder="Remarks"
                            className="w-full px-2 py-1 text-xs border rounded"
                            value={formData.remarks}
                            onChange={(e) => setFormData({ ...formData, remarks: e.target.value })}
                        />
                    ) : (
                        <span className="text-xs text-gray-400">—</span>
                    )}
                </td>
                <td className="px-4 py-3">
                    {attendance === 'attended' ? (
                        <div className="flex items-center gap-1">
                            <select
                                value={selectionStatus}
                                onChange={(e) => setSelectionStatus(e.target.value as any)}
                                className="px-2 py-1 text-xs border rounded bg-white"
                            >
                                <option value="pending">Pending</option>
                                <option value="selected">Selected</option>
                                <option value="not_selected">Not Selected</option>
                            </select>
                            <button
                                onClick={onSave}
                                disabled={isSaving}
                                className="text-blue-600 hover:text-blue-800 px-1"
                                title="Save"
                            >
                                {isSaving ? '...' : '💾'}
                            </button>
                        </div>
                    ) : (
                        <span className="text-xs text-gray-400">—</span>
                    )}
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
            <div className="bg-blue-50 border border-blue-200 rounded-lg p-3">
                <p className="text-blue-800 text-sm">
                    <strong>Trial Level 3:</strong> Players marked as "Selected" in Level 2. Mark attendance, enter final scores, and set final selection status for the tournament.
                </p>
            </div>

            <div className="flex flex-col md:flex-row gap-4 bg-gray-50 p-4 rounded-lg">
                <div className="relative md:w-48">
                    <select
                        value={locationFilter}
                        onChange={(e) => setLocationFilter(e.target.value)}
                        className="w-full pl-4 pr-10 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 appearance-none bg-white text-sm"
                    >
                        <option value="ALL">All Locations</option>
                        {uniqueLocations.map(city => (
                            <option key={city} value={city}>{city}</option>
                        ))}
                    </select>
                </div>

                <div className="relative flex-1">
                    <input
                        type="text"
                        placeholder="Search name or mobile..."
                        value={searchQuery}
                        onChange={(e) => setSearchQuery(e.target.value)}
                        className="pl-4 pr-10 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 w-full text-sm"
                    />
                </div>
            </div>

            <div className="bg-white border rounded-lg shadow-sm overflow-hidden">
                <div className="overflow-x-auto">
                    <table className="w-full text-sm text-left">
                        <thead className="text-xs text-gray-500 uppercase bg-gray-50 border-b">
                            <tr>
                                <th className="px-4 py-3 font-medium">Name</th>
                                <th className="px-4 py-3 font-medium">Mobile</th>
                                <th className="px-4 py-3 font-medium">Location</th>
                                <th className="px-4 py-3 font-medium">L2 Status</th>
                                <th className="px-4 py-3 font-medium">Attendance</th>
                                <th className="px-4 py-3 font-medium">Score</th>
                                <th className="px-4 py-3 font-medium">Remarks</th>
                                <th className="px-4 py-3 font-medium">L3 Selection</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-gray-100">
                            {paginatedData.length === 0 ? (
                                <tr>
                                    <td colSpan={8} className="px-4 py-8 text-center text-gray-500">
                                        No Level 3 players found. Select players in Level 2.
                                    </td>
                                </tr>
                            ) : (
                                paginatedData.map((player, idx) => (
                                    <PlayerRow key={`${player.mobile}-${idx}`} player={player} />
                                ))
                            )}
                        </tbody>
                    </table>
                </div>
                {filteredData.length > 0 && (
                    <div className="px-4 py-3 border-t bg-gray-50 text-xs text-gray-500 flex items-center justify-between">
                        <div>
                            Showing {((currentPage - 1) * ITEMS_PER_PAGE) + 1} to {Math.min(currentPage * ITEMS_PER_PAGE, filteredData.length)} of {filteredData.length}
                        </div>
                        <div className="flex items-center space-x-2">
                            <button
                                onClick={() => setCurrentPage(p => Math.max(1, p - 1))}
                                disabled={currentPage === 1}
                                className={`px-3 py-1 rounded border ${currentPage === 1 ? 'bg-gray-100 text-gray-400' : 'bg-white hover:bg-gray-50 text-gray-700'}`}
                            >
                                Previous
                            </button>
                            <span>Page {currentPage} of {Math.max(1, totalPages)}</span>
                            <button
                                onClick={() => setCurrentPage(p => Math.min(totalPages, p + 1))}
                                disabled={currentPage === totalPages || totalPages === 0}
                                className={`px-3 py-1 rounded border ${currentPage === totalPages || totalPages === 0 ? 'bg-gray-100 text-gray-400' : 'bg-white hover:bg-gray-50 text-gray-700'}`}
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

export default TrialLevel3Tab;
