/**
 * TEST RPC CONNECTION SCRIPT
 * Run this in your browser console to test if the RPC functions are working
 */

// Test the main RPC function that the admin panel uses
async function testRPCConnection() {
    console.log('🧪 Testing RPC Connection...');

    try {
        // Test get_player_registrations RPC function
        console.log('1️⃣ Testing get_player_registrations RPC function...');
        const { data, error } = await supabase.rpc('get_player_registrations');

        if (error) {
            console.error('❌ RPC Error:', error);
            console.error('Error Message:', error.message);
            console.error('Error Code:', error.code);
            return { success: false, error };
        }

        if (!data) {
            console.warn('⚠️ No data returned from RPC');
            return { success: false, error: 'No data returned' };
        }

        console.log('✅ RPC Connection Successful!');
        console.log(`📊 Returned ${data.length} records`);

        // Show first record structure
        if (data.length > 0) {
            console.log('📋 Sample Record Structure:');
            console.table(data[0]);
        }

        return { success: true, data };

    } catch (err) {
        console.error('❌ Connection Error:', err);
        return { success: false, error: err };
    }
}

// Run the test
testRPCConnection();