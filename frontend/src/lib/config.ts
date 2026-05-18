// Environment configuration

// Force local backend in development mode to avoid CORS issues with cloud API
const isDev = (import.meta as any).env.DEV;
const VITE_API_URL = (import.meta as any).env.VITE_API_URL;

// In dev, use localhost. In prod, use .env value or fallback.
const API_URL = isDev 
  ? 'http://localhost:3003/api' 
  : (VITE_API_URL || 'http://localhost:3003/api');

console.log('App Config:', { 
  mode: isDev ? 'Development' : 'Production', 
  apiUrl: API_URL,
  envApiUrl: VITE_API_URL
});

const SUPABASE_URL = (import.meta as any).env.VITE_SUPABASE_URL || ''
const SUPABASE_ANON_KEY = (import.meta as any).env.VITE_SUPABASE_ANON_KEY || ''



export const config = {
  api: {
    url: API_URL,
  },
  supabase: {
    url: SUPABASE_URL,
    anonKey: SUPABASE_ANON_KEY,
  },
}
