import { createClient } from '@supabase/supabase-js'

const supabaseUrl = (import.meta as any).env.VITE_SUPABASE_URL
const supabaseAnonKey = (import.meta as any).env.VITE_SUPABASE_ANON_KEY

// Create a default client - will throw error if credentials are not valid
// For development, you can use placeholder values
let supabase: any

try {
  if (!supabaseUrl || !supabaseAnonKey || 
      supabaseUrl.includes('your-project') || 
      supabaseAnonKey.includes('your-')) {
    console.warn(
      'Supabase credentials not configured. Authentication will not work until you update your .env file.\n' +
      'Please set VITE_SUPABASE_URL and VITE_SUPABASE_ANON_KEY in your .env file.\n\n' +
      'Get these from your Supabase project:\n' +
      '1. Go to https://supabase.com/dashboard\n' +
      '2. Select your project\n' +
      '3. Click Settings → API\n' +
      '4. Copy Project URL and anon key'
    )
  }
  
  supabase = createClient(
    supabaseUrl || 'https://placeholder.supabase.co',
    supabaseAnonKey || 'placeholder-key'
  )
} catch (error) {
  console.error('Failed to initialize Supabase client:', error)
  throw error
}

export { supabase }
