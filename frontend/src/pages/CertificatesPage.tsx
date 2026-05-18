import { useState, useRef, useEffect, useMemo } from 'react';
import { useReactToPrint } from 'react-to-print';
import playersData from '../Players_Data.json';
import CertificateTemplate from '@components/CertificateTemplate';
import { supabase } from '@lib/supabase';
import { manualLocations, getStateForCity } from '../data';

interface Player {
    name: string;
    mobile: string;
    state: string;
    city?: string;
    status: string;
    proficiency?: string;
}

const CertificatesPage = () => {
    const [filter, setFilter] = useState<'ALL' | 'SELECTED' | 'NOT SELECTED' | 'REGISTERED'>('ALL');
    const [searchTerm, setSearchTerm] = useState('');
    const [selectedPlayers, setSelectedPlayers] = useState<string[]>([]); // Array of mobile numbers
    const [enrichedPlayers, setEnrichedPlayers] = useState<Player[]>([]);
    const [isLoading, setIsLoading] = useState(true);
    const printRef = useRef<HTMLDivElement>(null);

    // Load and Enrich Data
    useEffect(() => {
        const loadData = async () => {
            setIsLoading(true);
            try {
                // 1. Load JSON Data
                const rawList = Array.isArray(playersData)
                    ? playersData
                    : (playersData as any).default || [];

                // Helpers
                const cleanPhone = (p: any) => {
                    if (!p) return '';
                    const s = String(p).replace(/[^0-9]/g, '');
                    return s.length > 10 ? s.slice(-10) : s;
                };
                const cleanName = (n: any) => {
                    if (!n) return '';
                    return String(n).toLowerCase().replace(/\s+/g, ' ').trim();
                };

                // 2. Prepare Manual Data Map
                const manualMap = new Map<string, string>();
                if (manualLocations) {
                    Object.entries(manualLocations).forEach(([mobile, city]) => {
                        const cleaned = cleanPhone(mobile);
                        if (cleaned.length >= 10) manualMap.set(cleaned, city);
                    });
                }

                // 3. Fetch DB Data
                let mobileMap = new Map();
                let nameMap = new Map();
                // let dbPlayersList: any[] = [];

                try {
                    const { data: dbPlayers, error } = await supabase
                        .from('player_registrations')
                        .select('phone, city, state, full_name')
                        .range(0, 4999);

                    if (!error && dbPlayers) {
                        // dbPlayersList = dbPlayers;
                        dbPlayers.forEach((p: any) => {
                            const m = cleanPhone(p.phone);
                            if (m && m.length >= 10) mobileMap.set(m, p);
                            const n = cleanName(p.full_name);
                            if (n && n.length > 2) nameMap.set(n, p);
                        });
                    }
                } catch (dbErr) {
                    console.warn('DB Fetch failed:', dbErr);
                }

                // 4. Merge & Match (JSON + DB)
                const matchedDbPlayers = new Set<any>();

                // A. Process JSON List
                const combinedList: Player[] = (rawList as any[]).map(p => {
                    const jsonMobile = cleanPhone(p.mobile);
                    const jsonName = cleanName(p.name);

                    const manualCity = manualMap.get(jsonMobile);
                    let dbP = mobileMap.get(jsonMobile);

                    if (!dbP) dbP = nameMap.get(jsonName);

                    if (dbP) matchedDbPlayers.add(dbP);

                    return {
                        ...p,
                        city: manualCity || dbP?.city || p.city || 'N/A',
                        state: manualCity ? getStateForCity(manualCity) : (dbP?.state || p.state || 'N/A'),
                        status: p.status || 'NOT SELECTED'
                    };
                });

                setEnrichedPlayers(combinedList);
            } catch (err) {
                console.error('Error loading data:', err);
            } finally {
                setIsLoading(false);
            }
        };

        loadData();
    }, []);


    const filteredPlayers = useMemo(() => {
        return enrichedPlayers.filter((player: any) => {
            // Status Filter
            let matchesFilter = false;
            if (filter === 'ALL') matchesFilter = true;
            else if (filter === 'SELECTED') matchesFilter = player.status === 'SELECTED';
            else if (filter === 'NOT SELECTED') matchesFilter = player.status === 'NOT SELECTED'; // Strict match

            const matchesSearch = player.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
                player.mobile.includes(searchTerm);
            return matchesFilter && matchesSearch;
        });
    }, [enrichedPlayers, filter, searchTerm]);

    const handlePrint = useReactToPrint({
        content: () => printRef.current,
        documentTitle: 'Certificates',
    } as any);

    const handleSelectAll = (e: React.ChangeEvent<HTMLInputElement>) => {
        if (e.target.checked) {
            setSelectedPlayers(filteredPlayers.map((p: any) => p.mobile));
        } else {
            setSelectedPlayers([]);
        }
    };

    const handleSelectPlayer = (mobile: string) => {
        setSelectedPlayers(prev =>
            prev.includes(mobile)
                ? prev.filter(p => p !== mobile)
                : [...prev, mobile]
        );
    };

    if (isLoading) {
        return (
            <div className="flex justify-center items-center h-64">
                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
                <span className="ml-2 text-gray-600">Loading records...</span>
            </div>
        );
    }

    return (
        <div className="bg-white p-6 rounded-lg shadow-md">
            <div className="flex justify-between items-center mb-6">
                <div>
                    <h2 className="text-2xl font-bold">Certificates Generation</h2>
                    <p className="text-sm text-gray-500 mt-1">Total Records: {enrichedPlayers.length}</p>
                </div>
            </div>

            <div className="flex flex-col md:flex-row justify-between items-center mb-6 gap-4">
                <div className="flex gap-2 bg-gray-100 p-1 rounded-lg">
                    <button
                        onClick={() => setFilter('ALL')}
                        className={`px-4 py-2 rounded-lg transition-colors text-sm font-medium ${filter === 'ALL' ? 'bg-white text-gray-900 shadow-sm' : 'text-gray-500 hover:text-gray-900'}`}
                    >
                        All
                    </button>
                    <button
                        onClick={() => setFilter('SELECTED')}
                        className={`px-4 py-2 rounded-lg transition-colors text-sm font-medium ${filter === 'SELECTED' ? 'bg-white text-gray-900 shadow-sm' : 'text-gray-500 hover:text-gray-900'}`}
                    >
                        Selected
                    </button>
                    <button
                        onClick={() => setFilter('NOT SELECTED')}
                        className={`px-4 py-2 rounded-lg transition-colors text-sm font-medium ${filter === 'NOT SELECTED' ? 'bg-white text-gray-900 shadow-sm' : 'text-gray-500 hover:text-gray-900'}`}
                    >
                        Not Selected
                    </button>
                </div>

                <div className="flex gap-4 w-full md:w-auto items-center">
                    <input
                        type="text"
                        placeholder="Search by name or mobile..."
                        value={searchTerm}
                        onChange={(e) => setSearchTerm(e.target.value)}
                        className="px-4 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 w-full md:w-64"
                    />

                    <button
                        onClick={handlePrint}
                        disabled={selectedPlayers.length === 0}
                        className={`flex items-center space-x-2 px-6 py-2 rounded-lg transition-colors text-white 
                            ${selectedPlayers.length === 0 ? 'bg-gray-400 cursor-not-allowed' : 'bg-indigo-600 hover:bg-indigo-700'}`}
                    >
                        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 17h2a2 2 0 002-2v-4a2 2 0 00-2-2H5a2 2 0 00-2 2v4a2 2 0 002 2h2m2 4h6a2 2 0 002-2v-4a2 2 0 00-2-2H9a2 2 0 00-2 2v4a2 2 0 002 2zm8-12V5a2 2 0 00-2-2H9a2 2 0 00-2 2v4h10z" />
                        </svg>
                        <span>Print ({selectedPlayers.length})</span>
                    </button>
                </div>
            </div>

            <div className="overflow-x-auto border rounded-lg h-[600px] overflow-y-auto">
                <table className="min-w-full divide-y divide-gray-200">
                    <thead className="bg-gray-50 sticky top-0 z-10">
                        <tr>
                            <th className="px-6 py-3 text-left">
                                <input
                                    type="checkbox"
                                    className="rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                                    checked={filteredPlayers.length > 0 && selectedPlayers.length === filteredPlayers.length}
                                    onChange={handleSelectAll}
                                />
                            </th>
                            <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Name</th>
                            <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Mobile</th>
                            <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Status</th>
                            <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">City</th>
                        </tr>
                    </thead>
                    <tbody className="bg-white divide-y divide-gray-200">
                        {filteredPlayers.length === 0 ? (
                            <tr>
                                <td colSpan={5} className="px-6 py-4 text-center text-gray-500">
                                    No players found
                                </td>
                            </tr>
                        ) : (
                            filteredPlayers.map((player, index) => (
                                <tr key={index} className="hover:bg-gray-50">
                                    <td className="px-6 py-4 whitespace-nowrap">
                                        <input
                                            type="checkbox"
                                            className="rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                                            checked={selectedPlayers.includes(player.mobile)}
                                            onChange={() => handleSelectPlayer(player.mobile)}
                                        />
                                    </td>
                                    <td className="px-6 py-4 whitespace-nowrap font-medium text-gray-900">{player.name}</td>
                                    <td className="px-6 py-4 whitespace-nowrap text-gray-500">{player.mobile}</td>
                                    <td className="px-6 py-4 whitespace-nowrap">
                                        <span className={`px-2 inline-flex text-xs leading-5 font-semibold rounded-full 
                                            ${player.status === 'SELECTED' ? 'bg-green-100 text-green-800' :
                                                player.status === 'REGISTERED' ? 'bg-blue-100 text-blue-800' :
                                                    'bg-gray-100 text-gray-800'}`}>
                                            {player.status === 'REGISTERED' ? 'NO RESULT' : player.status}
                                        </span>
                                    </td>
                                    <td className="px-6 py-4 whitespace-nowrap text-gray-500 capitalize">
                                        {player.city?.toLowerCase() || '-'}
                                    </td>
                                </tr>
                            ))
                        )}
                    </tbody>
                </table>
            </div>

            {/* Hidden Print Content */}
            <div style={{ display: 'none' }}>
                <div ref={printRef}>
                    {enrichedPlayers
                        .filter(p => selectedPlayers.includes(p.mobile))
                        .map((player, index) => (
                            <div key={index} className="page-break">
                                <CertificateTemplate player={player} />
                            </div>
                        ))}
                </div>
            </div>
        </div>
    );
};

export default CertificatesPage;
