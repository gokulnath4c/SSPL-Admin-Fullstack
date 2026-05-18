import { useEffect, useState } from 'react'
import { supabase } from '../lib/supabase'
import type { User, AuthChangeEvent, Session } from '@supabase/supabase-js'

interface UseAuthReturn {
  user: User | null
  loading: boolean
  isAuthenticated: boolean
  userRole: string | null
  userPermissions: string[]
  logout: () => Promise<void>
  hasPermission: (permission: string) => boolean
}

export function useAuth(): UseAuthReturn {
  const [user, setUser] = useState<User | null>(null)
  const [loading, setLoading] = useState(true)
  const [isAuthenticated, setIsAuthenticated] = useState(false)
  const [userRole, setUserRole] = useState<string | null>(null)
  const [userPermissions, setUserPermissions] = useState<string[]>([])

  const fetchUserRole = async (userId: string) => {
    try {
      const { data, error } = await supabase
        .from('user_roles')
        .select('role, permissions')
        .eq('user_id', userId)
        .single()

      if (!error && data) {
        setUserRole(data.role)
        setUserPermissions(data.permissions || [])
      } else {
        // Fallback or check for invite (simplified for now)
        setUserRole(null) // or 'user' default
        setUserPermissions([])
      }
    } catch (error) {
      console.error('Error fetching user role:', error)
    }
  }

  useEffect(() => {
    // Check current session
    const checkAuth = async () => {
      const { data } = await supabase.auth.getSession()
      const sessionUser = data.session?.user || null
      setUser(sessionUser)
      setIsAuthenticated(!!data.session)

      if (sessionUser) {
        await fetchUserRole(sessionUser.id)
      }

      setLoading(false)
    }

    checkAuth()

    // Listen for auth state changes
    const { data: authListener } = supabase.auth.onAuthStateChange(async (_event: AuthChangeEvent, session: Session | null) => {
      const sessionUser = session?.user || null
      setUser(sessionUser)
      setIsAuthenticated(!!session)

      if (sessionUser) {
        await fetchUserRole(sessionUser.id)
      } else {
        setUserRole(null)
        setUserPermissions([])
      }
    })

    // Cleanup subscription
    return () => {
      authListener?.subscription.unsubscribe()
    }
  }, [])

  const logout = async () => {
    await supabase.auth.signOut()
    setUser(null)
    setIsAuthenticated(false)
    setUserRole(null)
    setUserPermissions([])
  }

  const hasPermission = (permission: string) => {
    if (userRole === 'admin') return true
    return userPermissions.includes(permission)
  }

  return { user, loading, isAuthenticated, userRole, userPermissions, logout, hasPermission }
}
