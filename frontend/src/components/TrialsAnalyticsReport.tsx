import React, { useMemo, useState, useEffect } from 'react';
import { 
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer,
  PieChart, Pie, Cell
} from 'recharts';
import { 
  Users, TrendingUp, Activity, CheckCircle, XCircle, AlertTriangle
} from 'lucide-react';
import { getTrialOverallStats } from '../api/trialsV2';

const COLORS = ['#1d4ed8', '#ef4444', '#f59e0b', '#10b981', '#3b82f6'];

const TrialsAnalyticsReport: React.FC = () => {
  const [stats, setStats] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchStats = async () => {
      try {
        const data = await getTrialOverallStats();
        setStats(data);
      } catch (e) {
        console.error(e);
      } finally {
        setLoading(false);
      }
    };
    fetchStats();
  }, []);

  const funnelData = useMemo(() => {
    if (!stats) return [];
    const f = stats.funnel;
    return [
      { name: 'Total Bucket', value: f.l1_pool },
      { name: 'L1 Attended', value: f.l1_attended },
      { name: 'L1 Selected', value: f.l1_selected },
      { name: 'L2 Attended', value: f.l2_attended },
      { name: 'L2 Selected', value: f.l2_selected },
      { name: 'Final Selections', value: f.net_finalists },
    ];
  }, [stats]);

  const attritionData = useMemo(() => {
    if (!stats) return [];
    return [
      { name: 'Pending/Passed', value: (stats.funnel.l1_pool || 0) - (stats.attrition.rejected || 0) - (stats.attrition.absent || 0) },
      { name: 'Rejected', value: stats.attrition.rejected },
      { name: 'Absent', value: stats.attrition.absent },
    ];
  }, [stats]);

  if (loading) return (
    <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
        <span className="ml-3 text-gray-500">Loading Trial Analytics...</span>
    </div>
  );

  if (!stats) return <div className="p-8 text-center text-red-500">Failed to load analytics data.</div>;

  return (
    <div className="space-y-6 animate-in fade-in duration-500">
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        <div className="bg-white p-5 rounded-xl shadow-sm border border-slate-100 flex items-center gap-4">
          <div className="p-3 bg-blue-50 rounded-lg text-blue-600">
            <Users className="w-6 h-6" />
          </div>
          <div>
            <p className="text-sm font-medium text-slate-500">Total Attempts</p>
            <h3 className="text-2xl font-bold text-slate-900">{stats.funnel.l1_pool}</h3>
          </div>
        </div>

        <div className="bg-white p-5 rounded-xl shadow-sm border border-indigo-100 flex items-center gap-4">
          <div className="p-3 bg-indigo-50 rounded-lg text-indigo-600">
            <Users className="w-6 h-6" />
          </div>
          <div>
            <p className="text-sm font-medium text-slate-500">In</p>
            <h3 className="text-2xl font-bold text-slate-900">{(stats.funnel.trial_pool || 0) - (stats.attrition.rejected || 0)}</h3>
          </div>
        </div>

        <div className="bg-white p-5 rounded-xl shadow-sm border border-purple-100 flex items-center gap-4">
          <div className="p-3 bg-purple-50 rounded-lg text-purple-600">
            <TrendingUp className="w-6 h-6" />
          </div>
          <div>
            <p className="text-sm font-medium text-slate-500">Out</p>
            <h3 className="text-2xl font-bold text-slate-900">{stats.attrition.rejected}</h3>
          </div>
        </div>

        <div className="bg-white p-5 rounded-xl shadow-sm border border-red-100 flex items-center gap-4">
          <div className="p-3 bg-red-50 rounded-lg text-red-600">
            <XCircle className="w-6 h-6" />
          </div>
          <div>
            <p className="text-sm font-medium text-slate-500">Total Not Selected</p>
            <h3 className="text-2xl font-bold text-slate-900">{stats.attrition.rejected}</h3>
          </div>
        </div>

        <div className="bg-white p-5 rounded-xl shadow-sm border border-amber-100 flex items-center gap-4">
          <div className="p-3 bg-amber-50 rounded-lg text-amber-600">
            <AlertTriangle className="w-6 h-6" />
          </div>
          <div>
            <p className="text-sm font-medium text-slate-500">Total Absentees</p>
            <h3 className="text-2xl font-bold text-slate-900">{stats.attrition.absent}</h3>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 gap-6">
        {/* Attrition Pie */}
        <div className="bg-white p-6 rounded-xl shadow-sm border border-slate-100">
          <div className="flex items-center gap-2 mb-6">
            <Activity className="w-5 h-5 text-blue-600" />
            <h3 className="font-semibold text-slate-800">Workflow Retention Health</h3>
          </div>
          <div className="h-[300px] w-full">
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie
                  data={attritionData}
                  cx="50%"
                  cy="50%"
                  innerRadius={60}
                  outerRadius={100}
                  paddingAngle={5}
                  dataKey="value"
                  label={({ name, percent }) => (percent ?? 0) > 0 ? `${name} ${((percent || 0) * 100).toFixed(0)}%` : ''}
                >
                  {attritionData.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                  ))}
                </Pie>
                <Tooltip />
                <Legend />
              </PieChart>
            </ResponsiveContainer>
          </div>
        </div>
      </div>
    </div>
  );
};

export default TrialsAnalyticsReport;
