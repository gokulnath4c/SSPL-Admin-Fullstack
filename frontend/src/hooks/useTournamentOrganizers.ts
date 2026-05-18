import { useEffect, useState } from 'react'
import { supabase } from '@lib/supabase'
import type { TournamentOrganizer } from '../types'

interface UseTournamentOrganizersReturn {
    organizers: TournamentOrganizer[]
    loading: boolean
    error: string | null
    refetch: () => Promise<void>
}

export function useTournamentOrganizers(): UseTournamentOrganizersReturn {
    const [organizers, setOrganizers] = useState<TournamentOrganizer[]>([])
    const [loading, setLoading] = useState(true)
    const [error, setError] = useState<string | null>(null)

    const fetchOrganizers = async () => {
        setLoading(true)
        setError(null)

        try {
            const { data, error: dbError } = await supabase
                .from('tournament_organizers')
                .select('*')
                .order('created_at', { ascending: false })

            if (dbError) {
                throw dbError
            }

            if (data) {
                setOrganizers(data as TournamentOrganizer[])
            }
        } catch (err) {
            const errorMessage = err instanceof Error ? err.message : 'Failed to fetch organizers'
            console.error('Error fetching organizers:', errorMessage)
            setError(errorMessage)
        } finally {
            setLoading(false)
        }
    }

    useEffect(() => {
        fetchOrganizers()
    }, [])

    const refetch = async () => {
        await fetchOrganizers()
    }

    return { organizers, loading, error, refetch }
}
