import { useEffect, useState } from 'react'
import { Navigate } from 'react-router-dom'
import { supabase } from '../lib/supabase'
import type { AuthChangeEvent, Session } from '@supabase/supabase-js'

interface ProtectedRouteProps {
  children: React.ReactNode
}

export default function ProtectedRoute({ children }: ProtectedRouteProps) {
  const [isAuthenticated, setIsAuthenticated] = useState<boolean | null>(null)

  useEffect(() => {
    const checkAuth = async () => {
      console.log('[DEBUG] ProtectedRoute: Checking auth session...');
      try {
        const { data, error } = await supabase.auth.getSession()
        if (error) {
          console.error('[DEBUG] ProtectedRoute: Session error:', error);
          setIsAuthenticated(false);
          return;
        }
        console.log('[DEBUG] ProtectedRoute: Session found:', !!data.session);
        setIsAuthenticated(!!data.session)
      } catch (err) {
        console.error('[DEBUG] ProtectedRoute: Exception during getSession:', err);
        setIsAuthenticated(false);
      }
    }

    checkAuth()

    const { data: authListener } = supabase.auth.onAuthStateChange((_event: AuthChangeEvent, session: Session | null) => {
      console.log('[DEBUG] ProtectedRoute: Auth state change:', _event, !!session);
      setIsAuthenticated(!!session)
    })

    return () => {
      authListener?.subscription.unsubscribe()
    }
  }, [])

  if (isAuthenticated === null) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto"></div>
          <p className="mt-4 text-gray-600">Loading...</p>
        </div>
      </div>
    )
  }

  return isAuthenticated ? <>{children}</> : <Navigate to="/login" replace />
}
