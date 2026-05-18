// ✅ RAZORPAY SYNC SERVICE - Fetch real payment status

import { supabase } from '@lib/supabase'

interface RazorpayOrder {
  id: string
  amount: number
  currency: string
  status: 'created' | 'attempted' | 'paid'
  receipt: string
  notes: any
}

interface RazorpayPayment {
  id: string
  order_id: string
  status: 'created' | 'authorized' | 'captured' | 'refunded' | 'failed'
  amount: number
  currency: string
}

/**
 * Sync Razorpay payment status to Supabase
 * Call this periodically to update payment statuses from Razorpay
 */
export async function syncRazorpayPayments() {
  try {
    // Get all pending payments from database
    const { data: pendingPayments, error: fetchError } = await supabase
      .from('payments')
      .select('id, registration_id, order_id, payment_id')
      .eq('status', 'pending')

    if (fetchError) throw fetchError
    if (!pendingPayments || pendingPayments.length === 0) {
      console.log('No pending payments to sync')
      return { synced: 0, updated: 0 }
    }

    let updated = 0

    // For each pending payment, check Razorpay status
    for (const payment of pendingPayments) {
      if (!payment.order_id && !payment.payment_id) continue

      try {
        // You would call your backend API here to fetch Razorpay status
        // since Razorpay API requires authentication on backend
        const status = await getRazorpayPaymentStatus(payment.order_id, payment.payment_id)

        if (status.completed) {
          // Update payment status in Supabase
          const { error: updateError } = await supabase
            .from('payments')
            .update({
              status: 'completed',
              payment_date: new Date().toISOString(),
            })
            .eq('id', payment.id)

          if (!updateError) updated++
        }
      } catch (err) {
        console.error(`Error syncing payment ${payment.id}:`, err)
      }
    }

    return { synced: pendingPayments.length, updated }
  } catch (error) {
    console.error('Error syncing Razorpay payments:', error)
    throw error
  }
}

/**
 * Get payment status from Razorpay
 * This should be called from your backend API endpoint
 */
async function getRazorpayPaymentStatus(orderId: string | null, paymentId: string | null) {
  // Call your backend API that has Razorpay credentials
  // Example:
  // const response = await fetch('/api/razorpay/check-payment', {
  //   method: 'POST',
  //   headers: { 'Content-Type': 'application/json' },
  //   body: JSON.stringify({ orderId, paymentId })
  // })
  // const data = await response.json()
  // return { completed: data.status === 'captured' || data.status === 'authorized' }

  // For now, return mock response
  return { completed: false }
}

/**
 * Manual update of specific payment status
 * Use this to manually mark payments as completed
 */
export async function updatePaymentStatus(
  paymentId: string,
  status: 'pending' | 'completed' | 'failed',
  razorpayPaymentId?: string,
  razorpayOrderId?: string
) {
  try {
    const { error } = await supabase
      .from('payments')
      .update({
        status,
        payment_date: status === 'completed' ? new Date().toISOString() : null,
        payment_id: razorpayPaymentId || undefined,
        order_id: razorpayOrderId || undefined,
      })
      .eq('id', paymentId)

    if (error) throw error
    return { success: true }
  } catch (error) {
    console.error('Error updating payment status:', error)
    throw error
  }
}

/**
 * Get payment statistics
 */
export async function getPaymentStatistics() {
  try {
    const { data, error } = await supabase
      .from('payments')
      .select('status, amount', { count: 'exact' })

    if (error) throw error

    const stats = {
      total: data?.length || 0,
      completed: data?.filter((p) => p.status === 'completed').length || 0,
      pending: data?.filter((p) => p.status === 'pending').length || 0,
      failed: data?.filter((p) => p.status === 'failed').length || 0,
      totalAmount: data?.reduce((sum, p) => sum + (p.amount || 0), 0) || 0,
      completedAmount:
        data?.filter((p) => p.status === 'completed').reduce((sum, p) => sum + (p.amount || 0), 0) || 0,
    }

    return stats
  } catch (error) {
    console.error('Error getting payment statistics:', error)
    throw error
  }
}
