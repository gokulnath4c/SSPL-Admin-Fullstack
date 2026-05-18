require('dotenv').config({ path: './.env.production' });
const supabase = require('../config/supabase.cjs');

async function findGlobally() {
    const searchTerm = '9087997975';
    console.log(`Searching globally for: ${searchTerm}`);

    // 1. Get all tables that are in public schema
    const { data: tables, error: tableError } = await supabase
        .from('pg_catalog.pg_tables')
        .select('tablename')
        .eq('schemaname', 'public');

    if (tableError || !tables) {
        console.error('Error fetching tables or no permissions.');
        
        // Fallback to a known list if query fails
        const knownTables = ['player_registrations', 'trial_candidates', 'player_workflow', 'assessments', 'leads', 'results', 'members', 'razorpay_ledger'];
        await searchTables(knownTables, searchTerm);
    } else {
        const tableNames = tables.map(t => t.tablename);
        await searchTables(tableNames, searchTerm);
    }
}

async function searchTables(tableNames, term) {
    for (const table of tableNames) {
        try {
            // Get columns for this table
            const { data: columnsData } = await supabase.rpc('get_table_columns', { table_name: table });
            
            // If RPC doesn't exist, we skip or try to fetch first row to see columns
            if (columnsData) {
                // ...
            }
            
            // Simpler approach: Search some common columns if they exist
            // Or just try a generic search on the table
            const { data, error } = await supabase
                .from(table)
                .select('*')
                .or(`phone.ilike.%${term}%,contact.ilike.%${term}%,mobile.ilike.%${term}%,email.ilike.%abdajith%`);

            if (data && data.length > 0) {
                console.log(`\n!!! FOUND in [${table}] !!!`);
                console.log(JSON.stringify(data, null, 2));
            }
        } catch (e) {
            // Table might not have phone/contact/email columns, ignore
        }
    }
}

findGlobally();
