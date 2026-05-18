import { supabase } from '@lib/supabase'

/**
 * Test utility to verify RPC function connection
 * Run this in browser console: import { testRPCConnection } from '@api/rpcTest'
 */

export async function testRPCConnection() {
  console.log('🧪 Testing RPC Connection...\n')

  try {
    console.log('1️⃣ Testing get_player_registrations RPC function...')
    const { data, error } = await supabase.rpc('get_player_registrations')

    if (error) {
      console.error('❌ RPC Error:', error)
      console.error('Error Message:', error.message)
      console.error('Error Code:', error.code)
      return { success: false, error }
    }

    if (!data) {
      console.warn('⚠️ No data returned from RPC')
      return { success: false, error: 'No data returned' }
    }

    console.log('✅ RPC Connection Successful!')
    console.log(`📊 Returned ${data.length} records\n`)

    // Show first record structure
    if (data.length > 0) {
      console.log('📋 Sample Record Structure:')
      console.table(data[0])
    }

    // Show statistics
    console.log('\n📈 Data Statistics:')
    const stats = {
      'Total Records': data.length,
      'Completed Payments': data.filter((r: any) => r.payment_status === 'completed').length,
      'Pending Payments': data.filter((r: any) => r.payment_status === 'pending').length,
      'Approved Registrations': data.filter((r: any) => r.status === 'approved').length,
      'Pending Registrations': data.filter((r: any) => r.status === 'pending').length,
      'States Covered': new Set(data.map((r: any) => r.state)).size,
      'Trials': new Set(data.map((r: any) => r.trial_name)).size,
    }
    console.table(stats)

    return { success: true, data, stats }
  } catch (err) {
    console.error('❌ Connection Error:', err)
    return { success: false, error: err }
  }
}

export async function testSupabaseConnection() {
  console.log('🧪 Testing Supabase Connection...\n')

  try {
    const { data, error } = await supabase.auth.getSession()

    if (error) {
      console.error('❌ Auth Error:', error)
      return { success: false, error }
    }

    if (data.session) {
      console.log('✅ Supabase Connected!')
      console.log('👤 User:', data.session.user.email)
      return { success: true, session: data.session }
    } else {
      console.warn('⚠️ No active session')
      return { success: false, error: 'No active session' }
    }
  } catch (err) {
    console.error('❌ Connection Error:', err)
    return { success: false, error: err }
  }
}

export async function runFullDiagnostics() {
  console.clear()
  console.log('🔍 SUPABASE RPC FUNCTION DIAGNOSTICS\n')
  console.log('='.repeat(50))

  const authTest = await testSupabaseConnection()
  console.log('\n' + '='.repeat(50) + '\n')

  const rpcTest = await testRPCConnection()
  console.log('\n' + '='.repeat(50) + '\n')

  console.log('📊 DIAGNOSTIC SUMMARY:')
  console.table({
    'Supabase Connection': authTest.success ? '✅' : '❌',
    'RPC Function': rpcTest.success ? '✅' : '❌',
    'Data Available': rpcTest.success && rpcTest.data?.length ? '✅' : '❌',
  })

  if (!rpcTest.success) {
    console.log('\n⚠️ TROUBLESHOOTING TIPS:')
    console.log('1. Verify RPC function exists in Supabase SQL Editor')
    console.log('2. Check function name: get_player_registrations')
    console.log('3. Ensure tables (players, trials, registrations, payments) exist')
    console.log('4. Insert sample data using provided SQL script')
    console.log('5. Check RLS policies if enabled')
  }

  return { auth: authTest, rpc: rpcTest }
}
