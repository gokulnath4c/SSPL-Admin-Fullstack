import { useState } from 'react'
import { testRPCConnection, testSupabaseConnection, runFullDiagnostics } from '@api/rpcTest'

interface TestResult {
  success?: boolean
  data?: any
  error?: any
  stats?: any
  auth?: any
  rpc?: any
}

export default function DiagnosticsPage() {
  const [loading, setLoading] = useState(false)
  const [results, setResults] = useState<TestResult | null>(null)

  const handleTestRPC = async () => {
    setLoading(true)
    const result = await testRPCConnection()
    setResults(result)
    setLoading(false)
  }

  const handleTestSupabase = async () => {
    setLoading(true)
    const result = await testSupabaseConnection()
    setResults(result)
    setLoading(false)
  }

  const handleRunDiagnostics = async () => {
    setLoading(true)
    const result = await runFullDiagnostics()
    setResults(result)
    setLoading(false)
  }

  return (
    <div className="space-y-6 max-w-4xl">
      {/* Header */}
      <div>
        <h1 className="text-3xl font-bold text-gray-900">Diagnostics</h1>
        <p className="text-gray-600 mt-1">Test Supabase connection and RPC function integration</p>
      </div>

      {/* Test Buttons */}
      <div className="bg-white rounded-lg shadow p-6 space-y-4">
        <h2 className="text-lg font-semibold text-gray-900">Connection Tests</h2>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <button
            onClick={handleTestSupabase}
            disabled={loading}
            className="bg-blue-600 hover:bg-blue-700 disabled:bg-gray-400 text-white font-semibold py-3 px-6 rounded-lg transition duration-200 flex items-center justify-center"
          >
            {loading ? (
              <>
                <svg className="animate-spin -ml-1 mr-2 h-4 w-4" fill="none" viewBox="0 0 24 24">
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
                </svg>
                Testing...
              </>
            ) : (
              '🔐 Test Supabase'
            )}
          </button>
          <button
            onClick={handleTestRPC}
            disabled={loading}
            className="bg-green-600 hover:bg-green-700 disabled:bg-gray-400 text-white font-semibold py-3 px-6 rounded-lg transition duration-200 flex items-center justify-center"
          >
            {loading ? (
              <>
                <svg className="animate-spin -ml-1 mr-2 h-4 w-4" fill="none" viewBox="0 0 24 24">
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
                </svg>
                Testing...
              </>
            ) : (
              '🚀 Test RPC'
            )}
          </button>
          <button
            onClick={handleRunDiagnostics}
            disabled={loading}
            className="bg-purple-600 hover:bg-purple-700 disabled:bg-gray-400 text-white font-semibold py-3 px-6 rounded-lg transition duration-200 flex items-center justify-center"
          >
            {loading ? (
              <>
                <svg className="animate-spin -ml-1 mr-2 h-4 w-4" fill="none" viewBox="0 0 24 24">
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
                </svg>
                Running...
              </>
            ) : (
              '🔍 Full Diagnostics'
            )}
          </button>
        </div>
      </div>

      {/* Results */}
      {results && (
        <div className="space-y-4">
          {/* Status Badge */}
          <div
            className={`rounded-lg shadow p-6 flex items-center gap-4 ${
              results.success
                ? 'bg-green-50 border border-green-200'
                : 'bg-red-50 border border-red-200'
            }`}
          >
            <div className="text-4xl">{results.success ? '✅' : '❌'}</div>
            <div>
              <p className={`text-lg font-semibold ${results.success ? 'text-green-900' : 'text-red-900'}`}>
                {results.success ? 'Connection Successful!' : 'Connection Failed'}
              </p>
              {results.error && (
                <p className={`text-sm mt-1 ${results.success ? 'text-green-700' : 'text-red-700'}`}>
                  {typeof results.error === 'string' ? results.error : results.error?.message || 'Unknown error'}
                </p>
              )}
            </div>
          </div>

          {/* Data Display */}
          {results.data && (
            <div className="bg-white rounded-lg shadow p-6">
              <h3 className="text-lg font-semibold text-gray-900 mb-4">📊 Data Returned</h3>
              {Array.isArray(results.data) && results.data.length > 0 ? (
                <div className="overflow-x-auto">
                  <table className="min-w-full text-sm">
                    <thead className="bg-gray-50 border-b">
                      <tr>
                        {Object.keys(results.data[0]).map((key) => (
                          <th key={key} className="px-4 py-2 text-left font-semibold text-gray-900">
                            {key}
                          </th>
                        ))}
                      </tr>
                    </thead>
                    <tbody>
                      {results.data.slice(0, 5).map((row: any, idx: number) => (
                        <tr key={idx} className="border-b hover:bg-gray-50">
                          {Object.values(row).map((val: any, idx2: number) => (
                            <td key={idx2} className="px-4 py-2 text-gray-700">
                              {typeof val === 'object' ? JSON.stringify(val) : String(val)}
                            </td>
                          ))}
                        </tr>
                      ))}
                    </tbody>
                  </table>
                  {results.data.length > 5 && (
                    <p className="text-xs text-gray-600 mt-2">Showing 5 of {results.data.length} records</p>
                  )}
                </div>
              ) : (
                <p className="text-gray-600">No data to display</p>
              )}
            </div>
          )}

          {/* Statistics */}
          {results.stats && (
            <div className="bg-white rounded-lg shadow p-6">
              <h3 className="text-lg font-semibold text-gray-900 mb-4">📈 Statistics</h3>
              <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
                {Object.entries(results.stats).map(([key, value]) => (
                  <div key={key} className="p-4 bg-gray-50 rounded-lg">
                    <p className="text-sm text-gray-600">{key}</p>
                    <p className="text-2xl font-bold text-gray-900 mt-1">{String(value)}</p>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      )}

      {/* Instructions */}
      <div className="bg-blue-50 border border-blue-200 rounded-lg p-6">
        <h3 className="text-lg font-semibold text-blue-900 mb-4">📋 Setup Instructions</h3>
        <ol className="space-y-3 text-blue-800">
          <li className="flex gap-3">
            <span className="font-bold text-blue-900">1.</span>
            <span>
              Create the tables and RPC function in Supabase. See <code className="bg-blue-100 px-2 py-1 rounded">SUPABASE_RPC_SETUP.md</code>
            </span>
          </li>
          <li className="flex gap-3">
            <span className="font-bold text-blue-900">2.</span>
            <span>Click "Test Supabase" to verify connection</span>
          </li>
          <li className="flex gap-3">
            <span className="font-bold text-blue-900">3.</span>
            <span>Click "Test RPC" to verify the function is working</span>
          </li>
          <li className="flex gap-3">
            <span className="font-bold text-blue-900">4.</span>
            <span>Use "Full Diagnostics" to run all checks at once</span>
          </li>
          <li className="flex gap-3">
            <span className="font-bold text-blue-900">5.</span>
            <span>Refresh dashboard to see real data automatically</span>
          </li>
        </ol>
      </div>
    </div>
  )
}
