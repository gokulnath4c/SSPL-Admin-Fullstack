import { useState } from 'react'
import { supabase } from '@lib/supabase'
import paidRegistrations from '../Paid_registrations.json'
import playersMasterData from '../Players_Data.json'

export default function UpdatePaymentsPage() {
    const [status, setStatus] = useState('idle')
    const [logs, setLogs] = useState<string[]>([])
    const [progress, setProgress] = useState(0)

    const addLog = (msg: string) => setLogs(prev => [...prev, `${new Date().toLocaleTimeString()} - ${msg}`])

    const startUpdate = async () => {
        try {
            setStatus('loading')
            addLog('Processing embedded JSON data...')

            const data = paidRegistrations
            addLog(`Loaded ${data.length} records from JSON`)

            // Extract identifiers for stats
            const emails = data
                .map((row: any) => row['Mail ID'])
                .filter((email: any) => typeof email === 'string' && email.includes('@'))
                .map((email: string) => email.trim())

            const phones = data
                .map((row: any) => row['Phone Number'])
                .filter((phone: any) => phone)

            addLog(`Found ${emails.length} emails and ${phones.length} phone numbers to process`)

            // Process line by line to accurately track updates vs inserts
            let updatedCount = 0
            let insertedCount = 0
            let errorCount = 0

            for (let i = 0; i < data.length; i++) {
                const row: any = data[i]
                const email = row['Mail ID']?.trim()
                const rawPhone = row['Phone Number']
                const cleanPhone = rawPhone ? String(rawPhone).replace(/\D/g, '').slice(-10) : ''
                const pincode = row['null'] // Based on JSON sample provided earlier, this field seems to hold pincode/zip

                if (!email && !cleanPhone) continue;

                let existing: any = null

                // 1. Try matching by email
                if (email && email.includes('@')) {
                    const { data: byEmail } = await supabase
                        .from('player_registrations')
                        .select('id, full_name, email, phone')
                        .eq('email', email)
                        .maybeSingle()
                    existing = byEmail
                }

                // 2. Try matching by phone if no email match
                if (!existing && cleanPhone) {
                    const { data: byPhone } = await supabase
                        .from('player_registrations')
                        .select('id, full_name, email, phone')
                        .ilike('phone', `%${cleanPhone}`)
                        .maybeSingle()
                    existing = byPhone
                }

                if (existing) {
                    // Update existing
                    const { error: updateError } = await supabase
                        .from('player_registrations')
                        .update({
                            payment_status: 'captured',
                            payment_amount: 825,
                            updated_at: new Date().toISOString()
                        })
                        .eq('id', existing.id)

                    const identifier = email || rawPhone || 'Unknown'
                    if (updateError) {
                        addLog(`Failed update for ${identifier}: ${updateError.message}`)
                        errorCount++
                    } else {
                        updatedCount++
                    }
                } else {
                    // Insert new record
                    // 1. Normalize phone for lookup
                    const cleanPhoneForInsert = rawPhone ? String(rawPhone).replace(/\D/g, '').slice(-10) : ''

                    // 2. Lookup name in master data
                    const masterRecord = (playersMasterData as any[]).find((p: any) => {
                        const pPhone = p['Mobile Number'] ? String(p['Mobile Number']).replace(/\D/g, '').slice(-10) : ''
                        return pPhone === cleanPhoneForInsert
                    })

                    const playerName = masterRecord ? masterRecord['Name'] : 'Unknown (Imported)'

                    // 3. Insert record
                    const { error: insertError } = await supabase
                        .from('player_registrations')
                        .insert({
                            full_name: playerName,
                            email: email || `imported_${Date.now()}_${i}@example.com`,
                            phone: rawPhone || '',
                            pincode: pincode ? String(pincode) : null,
                            payment_status: 'captured',
                            payment_amount: 825,
                            status: 'pending' // Default status
                        })

                    const identifier = email || rawPhone || 'New Record'
                    if (insertError) {
                        // Some might fail due to other constraints (like unique phone if enforced)
                        addLog(`Failed insert for ${identifier}: ${insertError.message}`)
                        errorCount++
                    } else {
                        insertedCount++
                    }
                }

                // Update progress every 50 items
                if (i % 50 === 0) {
                    setProgress(Math.round(((i + 1) / data.length) * 100))
                    // Small delay to allow UI updates and prevent hammering database too hard
                    await new Promise(r => setTimeout(r, 10))
                }
            }

            addLog(`Completed! Updated: ${updatedCount}, Created: ${insertedCount}, Errors: ${errorCount}`)

            addLog(`Update complete! Processed matched emails. roughly ${updatedCount} attempts.`)
            setStatus('completed')

        } catch (err: any) {
            console.error(err)
            addLog(`Error: ${err.message}`)
            setStatus('error')
        }
    }

    return (
        <div className="p-8 max-w-4xl mx-auto">
            <h1 className="text-2xl font-bold mb-4">Update Payment Status</h1>

            <div className="mb-6">
                <p className="mb-2">This tool will:</p>
                <ul className="list-disc ml-5 mb-4">
                    <li>Load "Paid_registrations.json" from public folder</li>
                    <li>Extract all "Mail ID" fields</li>
                    <li>Update matching records in 'player_registrations' (matching by Email first, then Phone fallback)</li>
                </ul>

                {status === 'idle' && (
                    <button
                        onClick={startUpdate}
                        className="bg-blue-600 text-white px-4 py-2 rounded hover:bg-blue-700"
                    >
                        Start Update
                    </button>
                )}

                {status === 'loading' && (
                    <div className="w-full bg-gray-200 rounded-full h-2.5 mb-4">
                        <div className="bg-blue-600 h-2.5 rounded-full" style={{ width: `${progress}%` }}></div>
                    </div>
                )}
            </div>

            <div className="bg-gray-100 p-4 rounded h-96 overflow-y-auto font-mono text-sm border border-gray-300">
                {logs.map((log, i) => (
                    <div key={i}>{log}</div>
                ))}
            </div>
        </div>
    )
}
