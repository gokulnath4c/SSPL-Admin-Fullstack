import React, { useState, useMemo } from 'react';
import { supabase } from '../lib/supabase';
import { 
  FileText, Download, RefreshCw, Filter, 
  Search, MapPin, ChevronDown 
} from 'lucide-react';

const REPORT_TYPES = [
  { id: 'total_registrations', name: 'Total Registrations (Pool)', category: 'General', rpc: 'get_total_registration_report' },
  { id: 'net_failed', name: 'Net Failed Registrations', category: 'General', rpc: 'get_net_failed_registrations' },
  { id: 'finance', name: 'Captured Details (Finance)', category: 'Finance', rpc: 'get_finance_captured_details' },
  { id: 'call_for_trials', name: 'Call for Trials List', category: 'Trials', rpc: 'get_call_for_trials_report' },
  { id: 'selection_sheet', name: 'Trial Selection Sheet', category: 'Trials', rpc: 'get_trial_selection_sheet' },
  { id: 'trial_assessment', name: 'Trials Assessment Sheet', category: 'Trials', rpc: 'get_trial_assessment_report' },
];

export default function TrialsReportViewer() {
  const [selectedReport, setSelectedReport] = useState<string>('trial_assessment');
  const [level, setLevel] = useState<string>('1');
  const [location, setLocation] = useState<string>('Bangalore');
  const [reportData, setReportData] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);

  const isLevelRequired = selectedReport === 'call_for_trials' || selectedReport === 'selection_sheet';
  const isLocationRequired = selectedReport === 'trial_assessment';

  const loadReport = async () => {
    setLoading(true);
    try {
      const reportType = REPORT_TYPES.find(r => r.id === selectedReport);
      if (!reportType) return;

      const params: any = {};
      if (isLevelRequired) params.target_level = parseInt(level);
      if (isLocationRequired) params.p_location = location;

      const { data, error } = await supabase.rpc(reportType.rpc, params);
      
      if (error) throw error;
      
      setReportData(data || []);
      if (data && data.length > 0) {
        // Automatically trigger export after successful load
        handleExport(data, selectedReport);
      } else {
        alert('No records found for the selected criteria');
      }
    } catch (err: any) {
      console.error('Report Error:', err);
      alert('Failed to generate report: ' + err.message);
    } finally {
      setLoading(false);
    }
  };

  const handleExport = async (data = reportData, reportId = selectedReport) => {
    if (data.length === 0) {
      alert('No data to export');
      return;
    }

    try {
      setLoading(true);
      // Dynamic import to avoid blocking initial load and reduce bundle size
      const XLSX = await import('xlsx');
      
      const reportType = REPORT_TYPES.find(r => r.id === reportId);
      const fileName = `sspl_report_${reportId}_${new Date().toISOString().split('T')[0]}.xlsx`;

      // Create a formatted version of the data for Excel
      const formattedData = data.map(item => {
        const formatted: any = {};
        Object.keys(item).forEach(key => {
          const label = key.replace(/_/g, ' ').toUpperCase();
          let value = item[key];
          
          if (value === true) value = 'YES';
          if (value === false) value = 'NO';
          if (value === null || value === undefined) value = '';
          
          formatted[label] = value;
        });
        return formatted;
      });

      const ws = XLSX.utils.json_to_sheet(formattedData);
      const wb = XLSX.utils.book_new();
      XLSX.utils.book_append_sheet(wb, ws, "Report");
      XLSX.writeFile(wb, fileName);
    } catch (err) {
      console.error('Export Error:', err);
      alert('Export failed');
    } finally {
        setLoading(false);
    }
  };

  return (
    <div className="space-y-6">
      <div className="bg-white border border-slate-200 rounded-xl shadow-sm overflow-hidden text-sm">
        <div className="bg-slate-50 p-4 border-b border-slate-200 grid grid-cols-1 md:grid-cols-4 gap-4 items-end">
          <div>
            <label className="block text-[11px] font-bold text-slate-500 uppercase mb-1">Report Type</label>
            <div className="relative">
              <select 
                value={selectedReport}
                onChange={(e) => setSelectedReport(e.target.value)}
                className="w-full bg-white border border-slate-300 rounded-lg px-3 py-2 appearance-none focus:outline-none focus:ring-2 focus:ring-blue-500"
              >
                {REPORT_TYPES.map(report => (
                  <option key={report.id} value={report.id}>{report.name}</option>
                ))}
              </select>
              <ChevronDown className="absolute right-3 top-2.5 w-4 h-4 text-slate-400 pointer-events-none" />
            </div>
          </div>

          {isLevelRequired && (
            <div>
              <label className="block text-[11px] font-bold text-slate-500 uppercase mb-1">Trial Level</label>
              <div className="relative">
                <select 
                  value={level}
                  onChange={(e) => setLevel(e.target.value)}
                  className="w-full bg-white border border-slate-300 rounded-lg px-3 py-2 appearance-none focus:outline-none focus:ring-2 focus:ring-blue-500"
                >
                  <option value="1">Level 1</option>
                  <option value="2">Level 2</option>
                  <option value="3">Level 3</option>
                </select>
                <ChevronDown className="absolute right-3 top-2.5 w-4 h-4 text-slate-400 pointer-events-none" />
              </div>
            </div>
          )}

          {isLocationRequired && (
            <div>
              <label className="block text-[11px] font-bold text-slate-500 uppercase mb-1">Location / Search</label>
              <div className="relative">
                <input 
                  type="text"
                  value={location}
                  onChange={(e) => setLocation(e.target.value)}
                  placeholder="e.g. Bangalore"
                  className="w-full bg-white border border-slate-300 rounded-lg pl-9 pr-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
                <MapPin className="absolute left-3 top-2.5 w-4 h-4 text-slate-400" />
              </div>
            </div>
          )}

          <div className="flex gap-2">
            <button
              onClick={loadReport}
              disabled={loading}
              className="flex-1 bg-blue-600 hover:bg-blue-700 text-white font-semibold py-2 px-4 rounded-lg flex items-center justify-center gap-2 transition duration-200 disabled:opacity-50"
            >
              {loading ? <RefreshCw className="w-4 h-4 animate-spin" /> : <RefreshCw className="w-4 h-4" />}
              Generate
            </button>
            
            <button
              onClick={handleExport}
              disabled={reportData.length === 0 || loading}
              className="bg-white border border-slate-300 hover:bg-slate-50 text-slate-700 font-semibold py-2 px-4 rounded-lg flex items-center justify-center gap-2 transition duration-200 disabled:opacity-30"
              title="Export to CSV"
            >
              <Download className="w-4 h-4" />
            </button>
          </div>
        </div>

        <div className="overflow-x-auto max-h-[500px]">
          {reportData.length > 0 ? (
            <table className="w-full text-left border-collapse">
              <thead className="bg-slate-50 sticky top-0 z-10">
                <tr>
                  {Object.keys(reportData[0]).map(header => (
                    <th key={header} className="px-4 py-3 border-b border-slate-200 text-[11px] font-bold text-slate-500 uppercase tracking-wider">
                      {header.replace(/_/g, ' ')}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {reportData.map((row, i) => (
                  <tr key={i} className="hover:bg-slate-50/50 transition-colors">
                    {Object.values(row).map((val: any, j: number) => (
                      <td key={j} className="px-4 py-2.5 text-slate-700 whitespace-nowrap">
                        {val === true ? (
                          <span className="text-green-600 font-bold">Yes</span>
                        ) : val === false ? (
                          <span className="text-slate-300 italic">No</span>
                        ) : val === null || val === undefined ? (
                          <span className="text-slate-300 italic">N/A</span>
                        ) : String(val)}
                      </td>
                    ))}
                  </tr>
                ))}
              </tbody>
            </table>
          ) : (
            <div className="p-12 text-center text-slate-400 bg-white">
              <FileText className="w-12 h-12 mx-auto mb-3 opacity-20" />
              <p>No data loaded. Select criteria and click "Generate".</p>
            </div>
          )}
        </div>
        
        {reportData.length > 0 && (
          <div className="bg-slate-50 p-2 border-t border-slate-200 text-right pr-4">
            <span className="text-[10px] text-slate-400 font-medium">
              Total Records: {reportData.length}
            </span>
          </div>
        )}
      </div>
    </div>
  );
}
