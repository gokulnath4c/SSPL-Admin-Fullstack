const { createClient } = require('@supabase/supabase-js');

const supabaseUrl = 'https://fazpykekypcktcmniwbj.supabase.co';
const supabaseKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImZhenB5a2VreXBja3RjbW5pd2JqIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc1NTgyNDIzNywiZXhwIjoyMDcxNDAwMjM3fQ.b9ydyxCtsJBV90DyMnHOcyVEsfJoUSIdqTGJak3ItZU';

const supabase = createClient(supabaseUrl, supabaseKey);

async function diagnose() {
    const { data, error } = await supabase.rpc('exec_sql', {
        sql_query: "SELECT l1_result, l2_result, l3_result, final_status, count(*) FROM trial_progress GROUP BY 1,2,3,4 ORDER BY 5 DESC;"
    });

    if (error) {
        console.error('Error:', error);
        return;
    }

    console.log(JSON.stringify(data, null, 2));
}

diagnose();
