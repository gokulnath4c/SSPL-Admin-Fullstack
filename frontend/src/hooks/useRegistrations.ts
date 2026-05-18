import { useEffect, useState } from 'react'
import { supabase } from '@lib/supabase'
import type { PlayerRegistration } from '../types'

interface UseRegistrationsReturn {
  registrations: PlayerRegistration[]
  loading: boolean
  error: string | null
  isUsingMockData: boolean
  refetch: () => Promise<void>
}

// Mock data for demonstration
const MOCK_REGISTRATIONS: PlayerRegistration[] = [
  {
    id: '1',
    player_name: 'John Doe',
    player_email: 'john@example.com',
    phone: '+1-234-567-8900',
    registration_date: new Date(Date.now() - 15 * 24 * 60 * 60 * 1000).toISOString(),
    status: 'approved',
    payment_status: 'completed',
    payment_amount: 500,
    payment_date: new Date(Date.now() - 14 * 24 * 60 * 60 * 1000).toISOString(),
    notes: 'Verified player',
  },
  {
    id: '2',
    player_name: 'Jane Smith',
    player_email: 'jane@example.com',
    phone: '+1-234-567-8901',
    registration_date: new Date(Date.now() - 10 * 24 * 60 * 60 * 1000).toISOString(),
    status: 'pending',
    payment_status: 'pending',
    payment_amount: 500,
    notes: 'Awaiting payment',
  },
  {
    id: '3',
    player_name: 'Bob Johnson',
    player_email: 'bob@example.com',
    phone: '+1-234-567-8902',
    registration_date: new Date(Date.now() - 8 * 24 * 60 * 60 * 1000).toISOString(),
    status: 'approved',
    payment_status: 'completed',
    payment_amount: 500,
    payment_date: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString(),
    notes: 'Gold tier member',
  },
  {
    id: '4',
    player_name: 'Alice Williams',
    player_email: 'alice@example.com',
    phone: '+1-234-567-8903',
    registration_date: new Date(Date.now() - 5 * 24 * 60 * 60 * 1000).toISOString(),
    status: 'approved',
    payment_status: 'completed',
    payment_amount: 500,
    payment_date: new Date(Date.now() - 4 * 24 * 60 * 60 * 1000).toISOString(),
    notes: 'Regular member',
  },
  {
    id: '5',
    player_name: 'Charlie Brown',
    player_email: 'charlie@example.com',
    phone: '+1-234-567-8904',
    registration_date: new Date(Date.now() - 3 * 24 * 60 * 60 * 1000).toISOString(),
    status: 'pending',
    payment_status: 'pending',
    payment_amount: 500,
    notes: 'New registration',
  },
  {
    id: '6',
    player_name: 'Diana Prince',
    player_email: 'diana@example.com',
    phone: '+1-234-567-8905',
    registration_date: new Date(Date.now() - 2 * 24 * 60 * 60 * 1000).toISOString(),
    status: 'approved',
    payment_status: 'completed',
    payment_amount: 500,
    payment_date: new Date(Date.now() - 1 * 24 * 60 * 60 * 1000).toISOString(),
    notes: 'Premium member',
  },
]

export function useRegistrations(): UseRegistrationsReturn {
  const [registrations, setRegistrations] = useState<PlayerRegistration[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [isUsingMockData, setIsUsingMockData] = useState(false)

  const fetchRegistrations = async () => {
    setLoading(true)
    setError(null)
    setIsUsingMockData(false)

    try {
      // NOTE: Temporarily bypassing RPC to ensure we get all fields (City, Pincode) which might be missing in the RPC response

      // Try fetching from the improved view first
      // Try fetching from the improved view first
      const { data: viewData, error: viewError } = await supabase
        .from('v_admin_player_registrations')
        .select('*')
        .order('created_at', { ascending: false })
        .limit(1000)

      if (!viewError && viewData && viewData.length > 0) {
        // Map created_at to registration_date for UI compatibility
        const mappedViewData = viewData.map((reg: any) => ({
          ...reg,
          // Ensure registration_date is always a string or null, prioritizing created_at if view renamed it
          registration_date: reg.created_at || reg.registration_date || new Date().toISOString()
        }));
        setRegistrations(mappedViewData as PlayerRegistration[])
        return
      }

      if (viewError) {
        console.warn('View query failed, falling back to direct table query:', viewError.message)
      }


      // Fallback: Try direct query from player_registrations table
      const { data: directData, error: directError } = await supabase
        .from('player_registrations')
        .select(`
            id,
            player_name:full_name,
            player_email:email,
            phone,
            registration_date:created_at,
            state,
            city,
            pincode,
            position,
            payment_status,
            payment_amount,
            status
          `)
        .order('created_at', { ascending: false })
        .range(0, 999) // Initial request

      let allRegistrations = directData || []

      // If we got a full page, keep fetching
      if (directData && directData.length === 1000) {
        let hasMore = true
        let page = 1
        const pageSize = 1000

        while (hasMore) {
          const from = page * pageSize
          const to = from + pageSize - 1

          const { data: nextPageData, error: nextPageError } = await supabase
            .from('player_registrations')
            .select(`
              id,
              player_name:full_name,
              player_email:email,
              phone,
              registration_date:created_at,
              state,
              city,
              pincode,
              position,
              payment_status,
              payment_amount,
              status
            `)
            .order('created_at', { ascending: false })
            .range(from, to)

          if (nextPageError || !nextPageData || nextPageData.length === 0) {
            hasMore = false
          } else {
            allRegistrations = [...allRegistrations, ...nextPageData]
            page++
            if (nextPageData.length < pageSize) {
              hasMore = false
            }
          }
        }
      }

      const directDataCombined = allRegistrations

      if (directDataCombined && directDataCombined.length > 0) {
        // Map the data to PlayerRegistration format
        const mappedData = directDataCombined.map((reg: any) => ({
          id: reg.id,
          player_name: reg.player_name,
          player_email: reg.player_email,
          phone: reg.phone,
          state: reg.state,
          city: reg.city,
          pincode: reg.pincode,
          registration_date: reg.registration_date,
          status: reg.status || 'pending',
          payment_status: reg.payment_status || 'pending',
          payment_amount: reg.payment_amount || 0,
          payment_date: reg.payment_date,
          notes: `Position: ${reg.position}`,
        }))
        setRegistrations(mappedData)
        return
      }
      if (directError) {
        console.warn('Direct query failed:', directError.message)
        setError(`Fallback: ${directError.message}`)
        return
      }
      console.info('No real data available, using mock data')
      setIsUsingMockData(true)
      setRegistrations(MOCK_REGISTRATIONS)
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to fetch registrations'
      console.warn('Error:', errorMessage)
      setError(errorMessage) // Expose error to UI
      // setIsUsingMockData(true)
      // setRegistrations(MOCK_REGISTRATIONS)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    fetchRegistrations()
  }, [])

  const refetch = async () => {
    await fetchRegistrations()
  }

  return { registrations, loading, error, isUsingMockData, refetch }
}
