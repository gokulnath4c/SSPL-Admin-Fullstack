import { LineChart, Line, PieChart, Pie, Cell, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer, BarChart, Bar } from 'recharts'
import { useDashboard } from '@hooks/useDashboard'
import { useAuth } from '@hooks/useAuth'
import { useState } from 'react'
import { supabase } from '../lib/supabase'
import DrillDownModal from '../components/DrillDownModal'

const COLORS = ['#3B82F6', '#10B981', '#F59E0B', '#EF4444', '#8B5CF6', '#EC4899', '#14B8A6', '#F97316']
const PAYMENT_COLORS = ['#10B981', '#F59E0B']

export default function DashboardPage() {
  const { user } = useAuth()
  const { stats, loading, error, isUsingMockData, refetch } = useDashboard()
  const [drillDown, setDrillDown] = useState<{
    isOpen: boolean;
    title: string;
    players: any[];
    loading: boolean;
  }>({
    isOpen: false,
    title: '',
    players: [],
    loading: false
  });

  const handleCardClick = async (title: string, type: string) => {
    setDrillDown(prev => ({ ...prev, isOpen: true, title, loading: true, players: [] }));
    
    let playersList: any[] = [];
    try {
        if (type === 'in' || type === 'out') {
            const data = await import('../data/in_out_players.json');
            playersList = data.default[type.toUpperCase()] || [];
        } else {
            // Live fetching logic
            if (type === 'captured') {
                const { data } = await supabase.from('player_registrations')
                    .select('full_name, phone, email, city, state, payment_status')
                    .in('payment_status', ['captured', 'success', 'completed', 'paid'])
                    .order('created_at', { ascending: false });
                playersList = data?.map(p => ({ name: p.full_name, phone: p.phone, email: p.email, city: p.city, state: p.state, payment_status: p.payment_status })) || [];
            } else if (type === 'registrations') {
                const { data } = await supabase.from('player_registrations')
                    .select('full_name, phone, email, city, state, payment_status')
                    .order('created_at', { ascending: false });
                playersList = data?.map(p => ({ name: p.full_name, phone: p.phone, email: p.email, city: p.city, state: p.state, payment_status: p.payment_status })) || [];
            } else if (type === 'failed') {
                const { data } = await supabase.from('player_registrations')
                    .select('full_name, phone, email, city, state, payment_status')
                    .in('payment_status', ['failed', 'failure'])
                    .order('created_at', { ascending: false });
                playersList = data?.map(p => ({ name: p.full_name, phone: p.phone, email: p.email, city: p.city, state: p.state, payment_status: p.payment_status })) || [];
            } else if (type === 'not_selected') {
                const { data } = await supabase.from('trial_progress')
                    .select('full_name, phone, final_status')
                    .eq('final_status', 'REJECTED');
                playersList = data?.map(p => ({ name: p.full_name, phone: p.phone, status: 'Not Selected' })) || [];
            } else if (type === 'absentees') {
                const { data } = await supabase.from('trial_progress')
                    .select('full_name, phone, l1_attendance, l2_attendance, l3_attendance')
                    .or('l1_attendance.eq.ABSENT,l2_attendance.eq.ABSENT,l3_attendance.eq.ABSENT');
                playersList = data?.map(p => ({ name: p.full_name, phone: p.phone, status: 'Absent' })) || [];
            }
        }
    } catch (e) {
        console.error('Drill down fetch error:', e);
    }
    
    setDrillDown(prev => ({ ...prev, players: playersList, loading: false }));
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto"></div>
          <p className="mt-4 text-gray-600">Loading dashboard...</p>
        </div>
      </div>
    )
  }

  if (error) {
    return (
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold text-gray-900">Dashboard</h1>
            <p className="text-gray-600 mt-1">Welcome back, {user?.email}</p>
          </div>
        </div>
        <div className="bg-red-50 border border-red-200 rounded-lg p-6">
          <p className="text-red-700 font-medium">Error loading dashboard:</p>
          <p className="text-red-600 text-sm mt-1">{error}</p>
          <button
            onClick={refetch}
            className="mt-4 bg-red-600 hover:bg-red-700 text-white font-semibold py-2 px-6 rounded-lg transition duration-200"
          >
            Try Again
          </button>
        </div>
      </div>
    )
  }

  const paymentData = [
    { name: 'Captured', value: stats?.capturedCount || 0, fill: PAYMENT_COLORS[0] },
    { name: 'Pending', value: stats?.pendingCount || 0, fill: PAYMENT_COLORS[1] },
  ]

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">Dashboard</h1>
          <p className="text-gray-600 mt-1">Welcome back, {user?.email}</p>
        </div>
        <button
          onClick={refetch}
          className="bg-blue-600 hover:bg-blue-700 text-white font-semibold py-2 px-6 rounded-lg transition duration-200"
        >
          Refresh
        </button>
      </div>

      {/* Mock Data Banner */}
      {isUsingMockData && (
        <div className="bg-yellow-50 border border-yellow-300 rounded-lg p-4 flex items-start gap-3">
          <div className="text-2xl">⚠️</div>
          <div>
            <p className="text-yellow-900 font-semibold">Demo Data</p>
            <p className="text-yellow-800 text-sm">
              Displaying mock data. Set up the Supabase RPC function <code className="bg-yellow-100 px-2 py-1 rounded text-xs">get_player_registrations</code> to see real data.
            </p>
          </div>
        </div>
      )}

      {/* Key Metrics */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        {/* Total Registrations */}
        <div 
          onClick={() => handleCardClick('Total Registrations', 'registrations')}
          className="bg-white rounded-lg shadow p-6 border border-gray-100 cursor-pointer hover:shadow-md transition-shadow"
        >
          <div className="flex items-center justify-between">
            <div>
              <p className="text-gray-500 text-sm font-medium">Total Registrations</p>
              <p className="text-4xl font-bold text-gray-900 mt-2">{stats?.totalRegistrations || 0}</p>
            </div>
            <div className="text-4xl text-blue-100">📋</div>
          </div>
        </div>

        {/* Total Captured */}
        <div 
          onClick={() => handleCardClick('Total Captured', 'captured')}
          className="bg-linear-to-br from-green-50 to-green-100 rounded-lg shadow p-6 border border-green-200 cursor-pointer hover:shadow-md transition-shadow"
        >
          <div className="flex items-center justify-between">
            <div>
              <p className="text-green-700 text-sm font-medium">Total Captured</p>
              <p className="text-4xl font-bold text-green-900 mt-2">{stats?.capturedCount || 0}</p>
            </div>
            <div className="text-4xl">💰</div>
          </div>
        </div>

        {/* Failed Transactions */}
        <div 
          onClick={() => handleCardClick('Failed Transactions', 'failed')}
          className="bg-linear-to-br from-orange-50 to-orange-100 rounded-lg shadow p-6 border border-orange-200 cursor-pointer hover:shadow-md transition-shadow"
        >
          <div className="flex items-center justify-between">
            <div>
              <p className="text-orange-700 text-sm font-medium">Failed Transactions</p>
              <p className="text-4xl font-bold text-orange-900 mt-2">{stats?.failedTransactionsCount || 0}</p>
            </div>
            <div className="text-4xl">⚠️</div>
          </div>
        </div>

        {/* States Covered */}
        <div className="bg-linear-to-br from-purple-50 to-purple-100 rounded-lg shadow p-6 border border-purple-200">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-purple-700 text-sm font-medium">States Covered</p>
              <p className="text-4xl font-bold text-purple-900 mt-2">{stats?.stateDistribution.length || 0}</p>
            </div>
            <div className="text-5xl">🗺️</div>
          </div>
        </div>
      </div>

      {/* Selection & Attendance Metrics */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        {/* In */}
        <div 
          onClick={() => handleCardClick('In Players', 'in')}
          className="bg-linear-to-br from-indigo-50 to-indigo-100 rounded-lg shadow p-6 border border-indigo-200 cursor-pointer hover:shadow-md transition-shadow"
        >
          <div className="flex items-center justify-between">
            <div>
              <p className="text-indigo-700 text-sm font-medium">In</p>
              <p className="text-4xl font-bold text-indigo-900 mt-2">{stats?.inStationCount || 0}</p>
            </div>
            <div className="text-5xl">🏠</div>
          </div>
        </div>

        {/* Out */}
        <div 
          onClick={() => handleCardClick('Out Players', 'out')}
          className="bg-linear-to-br from-purple-50 to-purple-100 rounded-lg shadow p-6 border border-purple-200 cursor-pointer hover:shadow-md transition-shadow"
        >
          <div className="flex items-center justify-between">
            <div>
              <p className="text-purple-700 text-sm font-medium">Out</p>
              <p className="text-4xl font-bold text-purple-900 mt-2">{stats?.outStationCount || 0}</p>
            </div>
            <div className="text-5xl">✈️</div>
          </div>
        </div>

        {/* Total Not Selected */}
        <div 
          onClick={() => handleCardClick('Total Not Selected', 'not_selected')}
          className="bg-linear-to-br from-red-50 to-red-100 rounded-lg shadow p-6 border border-red-200 cursor-pointer hover:shadow-md transition-shadow"
        >
          <div className="flex items-center justify-between">
            <div>
              <p className="text-red-700 text-sm font-medium">Total Not Selected</p>
              <p className="text-4xl font-bold text-red-900 mt-2">{stats?.notSelectedCount || 0}</p>
            </div>
            <div className="text-5xl">❌</div>
          </div>
        </div>

        {/* Total Absentees */}
        <div 
          onClick={() => handleCardClick('Total Absentees', 'absentees')}
          className="bg-linear-to-br from-gray-50 to-gray-100 rounded-lg shadow p-6 border border-gray-200 cursor-pointer hover:shadow-md transition-shadow"
        >
          <div className="flex items-center justify-between">
            <div>
              <p className="text-gray-700 text-sm font-medium">Total Absentees</p>
              <p className="text-4xl font-bold text-gray-900 mt-2">{stats?.totalAbsentees || 0}</p>
            </div>
            <div className="text-5xl">🏃</div>
          </div>
        </div>
      </div>

      <DrillDownModal
        isOpen={drillDown.isOpen}
        onClose={() => setDrillDown(prev => ({ ...prev, isOpen: false }))}
        title={drillDown.title}
        players={drillDown.players}
        loading={drillDown.loading}
      />

      {/* Charts Section */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Payment Distribution Pie Chart */}
        <div className="bg-white rounded-lg shadow p-6">
          <h2 className="text-lg font-semibold text-gray-900 mb-4">Payment Status Distribution</h2>
          {stats && stats.totalRegistrations > 0 ? (
            <ResponsiveContainer width="100%" height={300}>
              <PieChart>
                <Pie
                  data={paymentData}
                  cx="50%"
                  cy="50%"
                  labelLine={false}
                  label={({ name, value }) => `${name}: ${value}`}
                  outerRadius={80}
                  fill="#8884d8"
                  dataKey="value"
                >
                  {paymentData.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={entry.fill} />
                  ))}
                </Pie>
                <Tooltip />
              </PieChart>
            </ResponsiveContainer>
          ) : (
            <div className="h-80 flex items-center justify-center text-gray-500">No data available</div>
          )}
        </div>

        {/* State-wise Distribution Pie Chart */}
        <div className="bg-white rounded-lg shadow p-6">
          <h2 className="text-lg font-semibold text-gray-900 mb-4">State-wise Distribution</h2>
          {stats && stats.stateDistribution.length > 0 ? (
            <ResponsiveContainer width="100%" height={300}>
              <PieChart>
                <Pie
                  data={stats.stateDistribution}
                  cx="50%"
                  cy="50%"
                  labelLine={false}
                  label={({ value }) => `${value}`}
                  outerRadius={80}
                  fill="#8884d8"
                  dataKey="count"
                  nameKey="state"
                >
                  {stats.stateDistribution.map((_, index) => (
                    <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                  ))}
                </Pie>
                <Tooltip />
              </PieChart>
            </ResponsiveContainer>
          ) : (
            <div className="h-80 flex items-center justify-center text-gray-500">No data available</div>
          )}
        </div>
      </div>

      {/* Registration Trend Line Chart */}
      <div className="bg-white rounded-lg shadow p-6">
        <h2 className="text-lg font-semibold text-gray-900 mb-4">Registration Trend (Last 30 Days)</h2>
        {stats && stats.registrationTrend.length > 0 ? (
          <ResponsiveContainer width="100%" height={400}>
            <LineChart data={stats.registrationTrend} margin={{ top: 5, right: 30, left: 0, bottom: 5 }}>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis
                dataKey="date"
                tick={{ fontSize: 12 }}
                interval={Math.floor(stats.registrationTrend.length / 6) || 0}
              />
              <YAxis tick={{ fontSize: 12 }} />
              <Tooltip
                contentStyle={{ backgroundColor: '#f3f4f6', border: '1px solid #e5e7eb', borderRadius: '8px' }}
                formatter={(value) => [`${value}`, 'Cumulative Registrations']}
              />
              <Legend />
              <Line
                type="monotone"
                dataKey="count"
                stroke="#3B82F6"
                dot={false}
                strokeWidth={2}
                isAnimationActive={true}
                name="Cumulative Registrations"
              />
            </LineChart>
          </ResponsiveContainer>
        ) : (
          <div className="h-96 flex items-center justify-center text-gray-500">No data available</div>
        )}
      </div>

      {/* Trial Distribution Bar Chart */}
      <div className="bg-white rounded-lg shadow p-6">
        <h2 className="text-lg font-semibold text-gray-900 mb-4">Trial-wise Distribution</h2>
        {stats && stats.trialDistribution.length > 0 ? (
          <ResponsiveContainer width="100%" height={300}>
            <BarChart data={stats.trialDistribution} margin={{ top: 5, right: 30, left: 0, bottom: 5 }}>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis dataKey="trial" tick={{ fontSize: 12 }} />
              <YAxis tick={{ fontSize: 12 }} />
              <Tooltip
                contentStyle={{ backgroundColor: '#f3f4f6', border: '1px solid #e5e7eb', borderRadius: '8px' }}
              />
              <Legend />
              <Bar dataKey="count" fill="#3B82F6" name="Registrations" radius={[8, 8, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        ) : (
          <div className="h-80 flex items-center justify-center text-gray-500">No data available</div>
        )}
      </div>

      {/* Summary Info */}
      <div className="bg-linear-to-r from-blue-50 to-indigo-50 rounded-lg shadow p-8 border border-blue-200">
        <h3 className="text-lg font-semibold text-gray-900 mb-4">Dashboard Summary</h3>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 text-sm text-gray-700">
          <div>
            <p className="font-medium mb-2">📊 Registration & Payments</p>
            <ul className="space-y-1 text-gray-600">
              <li>• Total registrations across all states</li>
              <li>• Payment completion and "Net Failed" tracking</li>
              <li>• Cumulative registration trend analysis</li>
            </ul>
          </div>
          <div>
            <p className="font-medium mb-2">🏏 Trial Funnel & Selections</p>
            <ul className="space-y-1 text-gray-600">
              <li>• Trial call-for and attendance metrics</li>
              <li>• Selection breakdown across Level 1, 2, and 3</li>
              <li>• Overall selection and rejection tracking</li>
            </ul>
          </div>
        </div>
      </div>
    </div>
  )
}
