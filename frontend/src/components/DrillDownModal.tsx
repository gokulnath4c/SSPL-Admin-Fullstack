import React from 'react';
import * as XLSX from 'xlsx';

interface Player {
    name: string;
    phone: string;
    email?: string;
    city?: string;
    state?: string;
    status?: string;
    payment_status?: string;
}

interface DrillDownModalProps {
    isOpen: boolean;
    onClose: () => void;
    title: string;
    players: Player[];
    loading: boolean;
}

export default function DrillDownModal({ isOpen, onClose, title, players, loading }: DrillDownModalProps) {
    if (!isOpen) return null;

    const handleDownloadExcel = () => {
        const worksheet = XLSX.utils.json_to_sheet(players);
        const workbook = XLSX.utils.book_new();
        XLSX.utils.book_append_sheet(workbook, worksheet, "Players");
        XLSX.writeFile(workbook, `${title.replace(/\s+/g, '_')}_List.xlsx`);
    };

    return (
        <div className="fixed inset-0 z-50 overflow-y-auto">
            <div className="fixed inset-0 bg-black/50 transition-opacity" onClick={onClose}></div>
            <div className="relative z-10 min-h-screen flex items-center justify-center p-4">
                <div className="bg-white rounded-xl shadow-2xl w-full max-w-4xl overflow-hidden animate-in fade-in zoom-in duration-200">
                    <div className="bg-slate-900 text-white px-6 py-4 flex items-center justify-between">
                        <h3 className="text-xl font-bold">{title} - Players List</h3>
                        <div className="flex items-center gap-3">
                            <button
                                onClick={handleDownloadExcel}
                                className="bg-green-600 hover:bg-green-700 text-white text-sm font-semibold py-1.5 px-4 rounded-lg flex items-center gap-2 transition duration-200"
                            >
                                📥 Download Excel
                            </button>
                            <button onClick={onClose} className="text-white hover:text-slate-300">
                                <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 18L18 6M6 6l12 12"></path>
                                </svg>
                            </button>
                        </div>
                    </div>

                    <div className="p-6">
                        {loading ? (
                            <div className="flex flex-col items-center justify-center h-64">
                                <div className="animate-spin rounded-full h-10 w-10 border-b-2 border-slate-900"></div>
                                <p className="mt-4 text-slate-600 font-medium">Fetching players list...</p>
                            </div>
                        ) : (
                            <div className="overflow-x-auto max-h-[60vh]">
                                <table className="w-full text-sm text-left border-collapse">
                                    <thead className="bg-slate-50 sticky top-0 border-b">
                                        <tr>
                                            <th className="px-4 py-3 font-semibold text-slate-700">Name</th>
                                            <th className="px-4 py-3 font-semibold text-slate-700">Phone</th>
                                            <th className="px-4 py-3 font-semibold text-slate-700">Email</th>
                                            <th className="px-4 py-3 font-semibold text-slate-700">City/State</th>
                                            <th className="px-4 py-3 font-semibold text-slate-700 text-right">Count: {players.length}</th>
                                        </tr>
                                    </thead>
                                    <tbody className="divide-y divide-slate-100">
                                        {players.length === 0 ? (
                                            <tr>
                                                <td colSpan={5} className="px-4 py-8 text-center text-slate-500">No players found for this metric.</td>
                                            </tr>
                                        ) : (
                                            players.map((p, i) => (
                                                <tr key={i} className="hover:bg-slate-50 transition-colors">
                                                    <td className="px-4 py-3 font-medium text-slate-900">{p.name}</td>
                                                    <td className="px-4 py-3 text-slate-600 font-mono text-xs">{p.phone}</td>
                                                    <td className="px-4 py-3 text-slate-600">{p.email || '-'}</td>
                                                    <td className="px-4 py-3 text-slate-600 text-xs">
                                                        {p.city}{p.state ? `, ${p.state}` : ''}
                                                    </td>
                                                    <td className="px-4 py-3 text-right">
                                                        {p.payment_status && (
                                                            <span className={`text-[10px] uppercase font-bold px-2 py-0.5 rounded-full ${
                                                                p.payment_status === 'captured' ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-700'
                                                            }`}>
                                                                {p.payment_status}
                                                            </span>
                                                        )}
                                                    </td>
                                                </tr>
                                            ))
                                        )}
                                    </tbody>
                                </table>
                            </div>
                        )}
                    </div>

                    <div className="bg-slate-50 px-6 py-4 flex justify-end">
                        <button
                            onClick={onClose}
                            className="bg-slate-200 hover:bg-slate-300 text-slate-800 font-semibold py-2 px-6 rounded-lg transition duration-200"
                        >
                            Close
                        </button>
                    </div>
                </div>
            </div>
        </div>
    );
}
