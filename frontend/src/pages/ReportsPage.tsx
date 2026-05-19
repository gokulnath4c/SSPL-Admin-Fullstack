import { useState } from 'react';
import { supabase } from '../lib/supabase';

interface ReportConfig {
  id: string;
  title: string;
  description: string;
  rpcName: string;
  params?: Record<string, any>;
  icon: string;
}

export default function ReportsPage() {
  const [isGenerating, setIsGenerating] = useState<string | null>(null);
  
  // Level dropdown states for reports that require Level params
  const [callForTrialsLevel, setCallForTrialsLevel] = useState('1');
  const [selectionSheetLevel, setSelectionSheetLevel] = useState('1');

  const reports: ReportConfig[] = [
    {
      id: 'total_reg',
      title: 'Total Registration (Captured & Failed)',
      description: 'Overview of all registrations and their payment statuses.',
      rpcName: 'get_total_registration_report',
      icon: '👥'
    },
    {
      id: 'net_failed',
      title: 'Net Failed for Call to Register',
      description: 'Registrations that failed payment and need to be called.',
      rpcName: 'get_net_failed_registrations',
      icon: '📞'
    },
    {
      id: 'finance_captured',
      title: 'Captured details for Finance',
      description: 'Successful payments strictly for financial tracking.',
      rpcName: 'get_finance_captured_details',
      icon: '💰'
    },
    {
      id: 'call_for_trials',
      title: 'Trials - Call for Trials',
      description: 'List of players allocated to a specific trial level.',
      rpcName: 'get_call_for_trials_report',
      params: { target_level: parseInt(callForTrialsLevel) },
      icon: '🏟️'
    },
    {
      id: 'selection_sheet',
      title: 'Trials - Selection Sheet',
      description: 'Selection results and absentees for a specific trial level.',
      rpcName: 'get_trial_selection_sheet',
      params: { target_level: parseInt(selectionSheetLevel) },
      icon: '📋'
    }
  ];

  const exportToCSV = (data: any[], filename: string) => {
    if (!data || !data.length) {
      alert("No data found for this report.");
      return;
    }

    const headers = Object.keys(data[0]);
    const csvContent = [
      headers.join(','),
      ...data.map(row => 
        headers.map(header => {
          let val = row[header];
          if (val === null || val === undefined) val = '';
          val = val.toString().replace(/"/g, '""');
          if (val.search(/("|,|\n)/g) >= 0) val = `"${val}"`;
          return val;
        }).join(',')
      )
    ].join('\n');

    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement("a");
    if (link.download !== undefined) {
      const url = URL.createObjectURL(blob);
      link.setAttribute("href", url);
      link.setAttribute("download", filename);
      link.style.visibility = 'hidden';
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
    }
  };

  const generateReport = async (report: ReportConfig) => {
    setIsGenerating(report.id);
    try {
      const { data, error } = await supabase.rpc(report.rpcName, report.params || {});
      
      if (error) {
        throw error;
      }

      exportToCSV(data, `${report.id}_${new Date().toISOString().split('T')[0]}.csv`);
    } catch (err: any) {
      console.error("Error generating report", err);
      alert(`Failed to generate report: ${err.message}`);
    } finally {
      setIsGenerating(null);
    }
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-3xl font-bold text-gray-900">Reports</h2>
          <p className="text-gray-600 mt-1">Generate and download operational reports</p>
        </div>
      </div>

      {/* Reports Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {reports.map((report) => (
          <div
            key={report.id}
            className="rounded-lg shadow p-6 border-l-4 border-blue-500 bg-white transition-all hover:shadow-lg"
          >
            <div className="flex items-start mb-4 space-x-3">
              <span className="text-3xl">{report.icon}</span>
              <div>
                <h3 className="text-lg font-semibold text-gray-900">{report.title}</h3>
                <p className="text-sm text-gray-600 mt-1">{report.description}</p>
              </div>
            </div>

            {/* Params options if applicable */}
            <div className="mb-4 h-8">
              {report.id === 'call_for_trials' && (
                <select 
                  className="px-3 py-1 border border-gray-300 rounded text-sm outline-none"
                  value={callForTrialsLevel}
                  onChange={(e) => setCallForTrialsLevel(e.target.value)}
                >
                  <option value="1">Level 1</option>
                  <option value="2">Level 2</option>
                  <option value="3">Level 3</option>
                </select>
              )}
              {report.id === 'selection_sheet' && (
                <select 
                  className="px-3 py-1 border border-gray-300 rounded text-sm outline-none"
                  value={selectionSheetLevel}
                  onChange={(e) => setSelectionSheetLevel(e.target.value)}
                >
                  <option value="1">Level 1</option>
                  <option value="2">Level 2</option>
                  <option value="3">Level 3</option>
                </select>
              )}
            </div>

            <div className="flex items-center justify-between pt-4 border-t border-gray-200">
              <p className="text-xs text-gray-500">Auto-generated via Database</p>
              <button 
                onClick={() => generateReport(report)}
                disabled={isGenerating === report.id}
                className="bg-blue-600 hover:bg-blue-700 text-white text-sm font-medium py-1.5 px-4 rounded transition disabled:opacity-50"
              >
                {isGenerating === report.id ? 'Generating...' : 'Download CSV'}
              </button>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
