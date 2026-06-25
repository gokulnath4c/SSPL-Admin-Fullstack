import { useState, useEffect } from 'react';
import { supabase } from '../lib/supabase';
import { fetchTrialCandidates, markCandidateCalled, markCandidateAttendance, markCandidateResult, TrialFetchOptions } from '../api/trialsV2';

interface Candidate {
    candidate_id: string;
    name: string;
    phone: string;
    city: string;
    [key: string]: any;
}

export default function TrialLevelView({ level, strictMode = false, hideCalled = false }: { level: number, strictMode?: boolean, hideCalled?: boolean }) {
    const [candidates, setCandidates] = useState<Candidate[]>([]);
    const [loading, setLoading] = useState(false);
    const [total, setTotal] = useState(0);
    const [page, setPage] = useState(1);
    
    const [calledFilter, setCalledFilter] = useState<string>(hideCalled ? 'FALSE' : 'ALL');
    const [attendanceFilter, setAttendanceFilter] = useState<string>('ALL');
    const [resultFilter, setResultFilter] = useState<string>('ALL');
    const [cityFilter, setCityFilter] = useState<string>('ALL');

    const loadData = async () => {
        setLoading(true);
        try {
            const options: TrialFetchOptions = {
                page,
                limit: 50,
                level,
                city: cityFilter
            };
            if (calledFilter !== 'ALL') options.called = calledFilter === 'TRUE';
            if (attendanceFilter !== 'ALL') options.attendance = attendanceFilter;
            if (resultFilter !== 'ALL') options.result = resultFilter;

            const res = await fetchTrialCandidates(options);
            setCandidates(res.data);
            setTotal(res.total);
        } catch (error) {
            console.error(error);
            alert("Failed to load candidates");
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        loadData();
    }, [level, page, calledFilter, attendanceFilter, resultFilter, cityFilter]);

    const handleCall = async (id: string) => {
        try {
            await markCandidateCalled(id, level);
            // Clear new registration highlight if it's level 1
            if (level === 1) {
                const { data: current } = await supabase.from('trial_progress').select('metadata').eq('candidate_id', id).single();
                const newMetadata = { ...(current?.metadata || {}), is_new_registration: false };
                await supabase.from('trial_progress').update({ metadata: newMetadata }).eq('candidate_id', id);
            }
            loadData();
        } catch (err: any) { alert("Error: " + err.message); }
    };

    const handleAttendance = async (id: string, status: string) => {
        try {
            await markCandidateAttendance(id, level, status);
            loadData();
        } catch (err: any) { alert("Error: " + err.message); }
    };

    const handleResult = async (id: string, result: string) => {
        if (!confirm(`Are you sure you want to mark this candidate as ${result}?`)) return;
        try {
            await markCandidateResult(id, level, result);
            loadData(); // This will visually remove them from the list if they progressed out of this level!
        } catch (err: any) { alert("Error: " + err.message); }
    };

    return (
        <div className="space-y-4">
            <div className="flex gap-4 bg-gray-50 p-4 rounded-lg">
                <select 
                    value={calledFilter} 
                    onChange={e => setCalledFilter(e.target.value)} 
                    disabled={hideCalled}
                    className="border p-2 rounded focus:ring-blue-500 bg-white"
                >
                    <option value="ALL">All Call Status</option>
                    <option value="TRUE">Called</option>
                    <option value="FALSE">Not Called</option>
                </select>

                <select value={attendanceFilter} onChange={e => setAttendanceFilter(e.target.value)} className="border p-2 rounded bg-white">
                    <option value="ALL">All Attendance</option>
                    <option value="PENDING">Pending</option>
                    <option value="ATTENDED">Attended</option>
                    <option value="ABSENT">Absent</option>
                </select>

                <select value={resultFilter} onChange={e => setResultFilter(e.target.value)} className="border p-2 rounded bg-white">
                    <option value="ALL">All Results</option>
                    <option value="PENDING">Pending</option>
                    <option value="SELECTED">Selected</option>
                    <option value="REJECTED">Rejected</option>
                </select>
                
                <button onClick={loadData} className="ml-auto bg-gray-200 hover:bg-gray-300 px-4 py-2 rounded">
                    Refresh
                </button>
            </div>
            
            <div className="bg-white border rounded shadow-sm overflow-hidden">
                <table className="w-full text-sm text-left">
                    <thead className="bg-gray-100">
                        <tr>
                            <th className="p-4 font-semibold text-gray-700">Candidate Info</th>
                            <th className="p-4 font-semibold text-gray-700">Contact</th>
                            <th className="p-4 font-semibold text-gray-700 text-center">Step 1: Contact</th>
                            <th className="p-4 font-semibold text-gray-700 text-center">Step 2: Attendance</th>
                            <th className="p-4 font-semibold text-gray-700 text-center">Step 3: Result</th>
                        </tr>
                    </thead>
                    <tbody className="divide-y">
                        {loading && <tr><td colSpan={5} className="p-8 text-center text-gray-500">Loading records from database...</td></tr>}
                        {!loading && candidates.length === 0 && <tr><td colSpan={5} className="p-8 text-center text-gray-500">No eligible candidates match internal filters.</td></tr>}
                        {!loading && candidates.map(c => {
                            const isCalled = c[`l${level}_called`];
                            let currentAttendance = c[`l${level}_attendance`];
                            let currentResult = c[`l${level}_result`];

                            // Apply dynamic business logic
                            if (c.l3_result === 'SELECTED') {
                                currentResult = 'SELECTED';
                            } else if (c.l1_result === 'REJECTED' || c.l2_result === 'REJECTED' || c.l3_result === 'REJECTED') {
                                if (currentResult !== 'SELECTED') currentResult = 'REJECTED';
                            } else if (c.l1_attendance === 'ABSENT' || c.l2_attendance === 'ABSENT' || c.l3_attendance === 'ABSENT') {
                                if (!currentResult || currentResult === 'PENDING') currentResult = 'PENDING';
                            }

                            return (
                                <tr key={c.candidate_id} className="hover:bg-blue-50 transition-colors">
                                    <td className="p-4">
                                        <div className="font-bold text-gray-900">{c.name}</div>
                                        <div className="text-xs text-gray-400">ID: {c.candidate_id.substring(0,8)}...</div>
                                    </td>
                                    
                                    <td className="p-4">
                                        <div className="font-mono text-gray-600">{c.phone}</div>
                                        <div className="text-xs text-gray-500 mt-1">{c.city || 'N/A'}</div>
                                    </td>
                                    
                                    <td className="p-4 text-center">
                                        <div className="flex flex-col items-center gap-1">
                                            {c.metadata?.is_new_registration && (
                                                <span className="bg-yellow-400 text-black text-[10px] font-bold px-1.5 py-0.5 rounded-full animate-pulse">
                                                    NEW
                                                </span>
                                            )}
                                            <button 
                                                onClick={() => handleCall(c.candidate_id)}
                                                disabled={isCalled}
                                                className={`px-4 py-1.5 rounded-full text-xs font-bold text-white transition-all ${isCalled ? 'bg-green-500/50 cursor-not-allowed' : 'bg-blue-600 hover:bg-blue-700 shadow shadow-blue-500/30'}`}
                                                title={isCalled ? 'Already contacted' : 'Log call'}
                                            >
                                                {isCalled ? '✓ CALLED' : 'MARK CALLED'}
                                            </button>
                                        </div>
                                    </td>
                                    
                                    <td className="p-4 text-center">
                                        <select 
                                            value={currentAttendance}
                                            onChange={e => handleAttendance(c.candidate_id, e.target.value)}
                                            disabled={!isCalled}
                                            className={`border p-2 text-xs font-semibold rounded outline-none ${!isCalled ? 'bg-gray-100 text-gray-400 cursor-not-allowed' : 'bg-white text-gray-900 hover:border-blue-500'}`}
                                            title={!isCalled ? 'You must mark the player as called first' : ''}
                                        >
                                            <option value="PENDING">Awaiting Visit</option>
                                            <option value="ATTENDED">✓ Attended</option>
                                            <option value="ABSENT">✕ Absent</option>
                                        </select>
                                    </td>
                                    
                                    <td className="p-4 text-center">
                                        <select 
                                            value={currentResult}
                                            onChange={e => handleResult(c.candidate_id, e.target.value)}
                                            disabled={currentAttendance !== 'ATTENDED' || currentResult !== 'PENDING'}
                                            className={`border p-2 text-xs font-semibold rounded outline-none ${currentAttendance !== 'ATTENDED' ? 'bg-gray-100 text-gray-400 cursor-not-allowed' : 'bg-green-50 hover:border-green-500'}`}
                                            title={currentAttendance !== 'ATTENDED' ? 'Player must attend trial before grading' : ''}
                                        >
                                            <option value="PENDING">Pending Grade</option>
                                            <option value="SELECTED">★ Selected (Advance)</option>
                                            <option value="REJECTED">✕ Rejected</option>
                                        </select>
                                    </td>
                                </tr>
                            )
                        })}
                    </tbody>
                </table>
            </div>
            
            <div className="flex justify-between items-center text-sm text-gray-500 px-2">
                <div>
                    Showing {candidates.length} of {total} candidates
                </div>
                <div className="flex gap-2">
                    <button onClick={() => setPage(p => Math.max(1, p-1))} disabled={page === 1} className="px-3 py-1 bg-gray-200 rounded disabled:opacity-50">Prev</button>
                    <button onClick={() => setPage(p => p+1)} disabled={candidates.length < 50} className="px-3 py-1 bg-gray-200 rounded disabled:opacity-50">Next</button>
                </div>
            </div>
        </div>
    );
}
