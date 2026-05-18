import { useState, useEffect, useMemo } from 'react';
import { supabase } from '@lib/supabase';
import playersData from '../Players_Data.json';
import { manualLocations, getStateForCity } from '../data';

// Type definitions
interface Player {
    name: string;
    mobile: string;
    state: string;
    city?: string;
    status: string;
    proficiency?: string;
}

const ITEMS_PER_PAGE = 100;

const SelectionStatusPage = () => {
    const [enrichedPlayers, setEnrichedPlayers] = useState<Player[]>([]);
    const [isLoading, setIsLoading] = useState(true);
    const [activeTab, setActiveTab] = useState<'ALL' | 'SELECTED' | 'NOT_SELECTED' | 'REGISTERED'>('SELECTED');
    const [searchQuery, setSearchQuery] = useState('');
    const [locationFilter, setLocationFilter] = useState('ALL');
    const [loadingMessage, setLoadingMessage] = useState('Loading local records...');
    const [currentPage, setCurrentPage] = useState(1);


    // Load and Enrich Data
    useEffect(() => {
        const loadData = async () => {
            setIsLoading(true);
            setLoadingMessage('Loading local records...');

            try {
                // 1. Load JSON Data
                console.log('Processing players data...');
                let rawList: any[] = [];
                if (playersData) {
                    if (Array.isArray(playersData)) {
                        rawList = playersData;
                    } else if ((playersData as any).default && Array.isArray((playersData as any).default)) {
                        rawList = (playersData as any).default;
                    }
                }

                if (rawList.length === 0) {
                    console.warn('Players data is empty or invalid');
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

                // 2. Prepare Manual Data Map
                const manualMap = new Map<string, string>();
                if (manualLocations) {
                    Object.entries(manualLocations).forEach(([mobile, city]) => {
                        const cleaned = cleanPhone(mobile);
                        if (cleaned.length >= 10) {
                            manualMap.set(cleaned, city);
                        }
                    });
                }

                // 3. Fetch DB Data
                let mobileMap = new Map();
                let nameMap = new Map();

                try {
                    setLoadingMessage('Fetching database records...');
                    // Short timeout for DB to prevent hanging
                    const timeoutPromise = new Promise((_, reject) =>
                        setTimeout(() => reject(new Error('Timeout')), 3000)
                    );

                    const fetchPromise = supabase
                        .from('player_registrations')
                        .select('phone, city, state, full_name')
                        .range(0, 4999);

                    const result: any = await Promise.race([fetchPromise, timeoutPromise]);
                    const { data: dbPlayers, error } = result;

                    if (!error && dbPlayers) {
                        dbPlayers.forEach((p: any) => {
                            const m = cleanPhone(p.phone);
                            if (m && m.length >= 10) mobileMap.set(m, p);
                            const n = cleanName(p.full_name);
                            if (n && n.length > 2) nameMap.set(n, p);
                        });
                    }
                } catch (dbErr) {
                    console.warn('Enrichment skipped/failed:', dbErr);
                }

                setLoadingMessage('Matching records...');

                // 4. Merge & Match (JSON + DB)
                const matchedDbPlayers = new Set<any>();

                // A. Process JSON List
                const combinedList: Player[] = rawList.map(p => {
                    if (!p) return null;
                    const jsonMobile = cleanPhone(p.mobile);
                    const jsonName = cleanName(p.name);

                    // 1. Try Manual Match
                    const manualCity = manualMap.get(jsonMobile);

                    // 2. Try DB Mobile Match
                    let dbP = mobileMap.get(jsonMobile);

                    if (!dbP) {
                        // 3. Try DB Name Match
                        dbP = nameMap.get(jsonName);
                    }

                    if (dbP) {
                        matchedDbPlayers.add(dbP);
                    }

                    // Determine Final Location Data
                    const finalCity = manualCity || dbP?.city || p.city || 'N/A';
                    let finalState = 'N/A';

                    if (manualCity) {
                        finalState = getStateForCity(manualCity);
                    } else if (dbP) {
                        finalState = dbP.state || 'N/A';
                    } else {
                        finalState = (p.state && p.state !== '') ? p.state : 'N/A';
                    }

                    if (finalCity !== 'N/A' && (finalState === 'N/A' || finalState === '')) {
                        const inferred = getStateForCity(finalCity);
                        if (inferred) finalState = inferred;
                    }

                    return {
                        ...p,
                        city: finalCity,
                        state: finalState,
                        status: p.status || 'NOT SELECTED'
                    };
                }).filter(Boolean) as Player[];


                setEnrichedPlayers(combinedList);

            } catch (err) {
                console.error('Critical failure in loadData:', err);
                setEnrichedPlayers([]); // Fallback
            } finally {
                // FORCE Loading off after catch
                setIsLoading(false);
            }
        };

        // Safety timeout in case async logic hangs indefinitely
        const safetyTimer = setTimeout(() => {
            setIsLoading(prev => {
                if (prev) {
                    console.warn('Force disabling loading state due to timeout.');
                    return false;
                }
                return prev;
            });
        }, 8000);

        loadData();

        return () => clearTimeout(safetyTimer);
    }, []);

    // Reset page
    useEffect(() => setCurrentPage(1), [activeTab, searchQuery, locationFilter]);

    // Unique Locations for Filter
    const uniqueLocations = useMemo(() => {
        const locs = new Set<string>();
        enrichedPlayers.forEach(p => {
            if (p.city && p.city !== 'N/A') locs.add(p.city);
        });
        return Array.from(locs).sort();
    }, [enrichedPlayers]);

    // Filter
    const filteredData = useMemo(() => {
        let data = enrichedPlayers;

        if (activeTab === 'SELECTED') {
            data = data.filter(p => p.status === 'SELECTED');
        } else if (activeTab === 'NOT_SELECTED') {
            data = data.filter(p => p.status === 'NOT SELECTED');
        }

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
    }, [enrichedPlayers, activeTab, searchQuery, locationFilter]);

    // Pagination
    const totalPages = Math.ceil(filteredData.length / ITEMS_PER_PAGE);
    const paginatedData = useMemo(() => {
        const start = (currentPage - 1) * ITEMS_PER_PAGE;
        return filteredData.slice(start, start + ITEMS_PER_PAGE);
    }, [filteredData, currentPage]);

    const exportCSV = () => {
        const headers = ['Name', 'Mobile', 'State', 'City', 'Status', 'Proficiency'];
        const csvContent = [
            headers.join(','),
            ...filteredData.map(p => [
                `"${p.name}"`,
                `"${p.mobile}"`,
                `"${p.state}"`,
                `"${p.city}"`,
                `"${p.status}"`,
                `"${p.proficiency || ''}"`
            ].join(','))
        ].join('\n');

        const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
        const url = URL.createObjectURL(blob);
        const link = document.createElement('a');
        link.href = url;
        link.setAttribute('download', `selection_status_${activeTab.toLowerCase()}.csv`);
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
    };

    if (isLoading) {
        return (
            <div className="flex flex-col items-center justify-center h-64">
                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mb-4"></div>
                <div className="text-xl text-gray-500 font-medium">{loadingMessage}</div>
            </div>
        );
    }

    const selectedCount = enrichedPlayers.filter(p => p.status === 'SELECTED').length;
    const notSelectedCount = enrichedPlayers.filter(p => p.status === 'NOT SELECTED').length;

    return (
        <div className="max-w-7xl mx-auto space-y-6">
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                <div>
                    <h1 className="text-2xl font-bold text-gray-900">Selection Results</h1>

                </div>

                <div className="flex items-center gap-2">
                    <button
                        onClick={exportCSV}
                        disabled={filteredData.length === 0}
                        className={`px-4 py-2 rounded-lg flex items-center gap-2 text-white ${filteredData.length === 0 ? 'bg-gray-400 cursor-not-allowed' : 'bg-green-600 hover:bg-green-700'}`}
                    >
                        <span>Export ({filteredData.length})</span>
                    </button>
                    <button
                        onClick={() => window.location.reload()}
                        className="p-2 text-gray-500 hover:text-gray-700 border rounded-lg hover:bg-gray-50"
                        title="Refresh Data"
                    >
                        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
                        </svg>
                    </button>
                </div>
            </div>

            {/* Statistics Cards */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div className="bg-green-50 p-6 rounded-lg shadow-sm border border-green-100">
                    <h3 className="text-green-700 text-sm font-medium">Selected</h3>
                    <p className="text-3xl font-bold text-green-700 mt-2">
                        {selectedCount}
                    </p>
                </div>
                <div className="bg-gray-50 p-6 rounded-lg shadow-sm border border-gray-200">
                    <h3 className="text-gray-600 text-sm font-medium">Not Selected</h3>
                    <p className="text-3xl font-bold text-gray-700 mt-2">
                        {notSelectedCount}
                    </p>
                </div>
            </div>

            {/* Main Content Card */}
            <div className="bg-white border rounded-lg shadow-sm">
                {/* Header / Tabs */}
                <div className="border-b px-6 py-4 flex flex-col gap-4">
                    <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                        <div className="flex space-x-1 bg-gray-100 p-1 rounded-lg overflow-x-auto">
                            <button
                                onClick={() => setActiveTab('ALL')}
                                className={`px-4 py-2 rounded-md text-sm font-medium transition-all whitespace-nowrap ${activeTab === 'ALL'
                                    ? 'bg-white text-gray-900 shadow-sm'
                                    : 'text-gray-500 hover:text-gray-900'
                                    }`}
                            >
                                All ({enrichedPlayers.length})
                            </button>
                            <button
                                onClick={() => setActiveTab('SELECTED')}
                                className={`px-4 py-2 rounded-md text-sm font-medium transition-all whitespace-nowrap ${activeTab === 'SELECTED'
                                    ? 'bg-white text-gray-900 shadow-sm'
                                    : 'text-gray-500 hover:text-gray-900'
                                    }`}
                            >
                                Selected ({selectedCount})
                            </button>
                            <button
                                onClick={() => setActiveTab('NOT_SELECTED')}
                                className={`px-4 py-2 rounded-md text-sm font-medium transition-all whitespace-nowrap ${activeTab === 'NOT_SELECTED'
                                    ? 'bg-white text-gray-900 shadow-sm'
                                    : 'text-gray-500 hover:text-gray-900'
                                    }`}
                            >
                                Not Selected ({notSelectedCount})
                            </button>
                        </div>
                    </div>

                    <div className="flex flex-col md:flex-row gap-4">
                        {/* Location Filter */}
                        <div className="relative md:w-64">
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
                            <div className="absolute inset-y-0 right-0 flex items-center pr-3 pointer-events-none">
                                <svg className="w-5 h-5 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                                </svg>
                            </div>
                        </div>

                        {/* Search */}
                        <div className="relative flex-1">
                            <input
                                type="text"
                                placeholder="Search name or mobile..."
                                value={searchQuery}
                                onChange={(e) => setSearchQuery(e.target.value)}
                                className="pl-4 pr-10 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 w-full"
                            />
                            <div className="absolute inset-y-0 right-0 flex items-center pr-3 pointer-events-none">
                                <svg className="w-5 h-5 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                                </svg>
                            </div>
                        </div>
                    </div>
                </div>

                {/* Table */}
                <div className="overflow-x-auto">
                    <table className="w-full text-sm text-left">
                        <thead className="text-xs text-gray-500 uppercase bg-gray-50 border-b">
                            <tr>
                                <th className="px-6 py-3 font-medium">Name</th>
                                <th className="px-6 py-3 font-medium">Mobile</th>
                                <th className="px-6 py-3 font-medium">Location</th>
                                <th className="px-6 py-3 font-medium">Status</th>
                                <th className="px-6 py-3 font-medium">Proficiency</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-gray-100">
                            {paginatedData.length === 0 ? (
                                <tr>
                                    <td colSpan={5} className="px-6 py-8 text-center text-gray-500">
                                        {enrichedPlayers.length === 0
                                            ? "No data loaded (Check console for errors)"
                                            : `No players found matching your filters.`}
                                    </td>
                                </tr>
                            ) : (
                                paginatedData.map((player, idx) => (
                                    <tr key={idx} className="hover:bg-gray-50 transition-colors">
                                        <td className="px-6 py-4 font-medium text-gray-900">{player.name}</td>
                                        <td className="px-6 py-4 text-gray-500 font-mono">{player.mobile}</td>
                                        <td className="px-6 py-4 text-gray-500">
                                            <div className="flex flex-col">
                                                <span className="font-medium text-gray-900">{player.city}</span>
                                                <span className="text-xs text-gray-400">{player.state}</span>
                                            </div>
                                        </td>
                                        <td className="px-6 py-4">
                                            <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${player.status === 'SELECTED'
                                                ? 'bg-green-100 text-green-800'
                                                : player.status === 'REGISTERED'
                                                    ? 'bg-blue-100 text-blue-800'
                                                    : 'bg-gray-100 text-gray-800'
                                                }`}>
                                                {player.status === 'REGISTERED' ? 'NO RESULT' : player.status}
                                            </span>
                                        </td>
                                        <td className="px-6 py-4 text-gray-500 truncate max-w-[200px]" title={player.proficiency}>
                                            {player.proficiency}
                                        </td>
                                    </tr>
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
        </div >
    );
};

export default SelectionStatusPage;
