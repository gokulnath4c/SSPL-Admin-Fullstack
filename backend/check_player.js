const { createClient } = require('@supabase/supabase-js');
require('dotenv').config({path: './.env.production'});

const supabaseUrl = process.env.VITE_SUPABASE_URL || process.env.SUPABASE_URL;
const supabaseKey = process.env.VITE_SUPABASE_ANON_KEY || process.env.SUPABASE_SERVICE_ROLE_KEY;

const supabase = createClient(supabaseUrl, supabaseKey);

async function check() {
  console.log('Checking players...');
  const { data, error } = await supabase.from('players').select('*').or('phone.ilike.%62728%,name.ilike.%Arivazhagan%');
  console.log(error || data);
}
check();
