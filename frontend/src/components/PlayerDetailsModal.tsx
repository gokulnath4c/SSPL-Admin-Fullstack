import { useState, useEffect } from 'react'
import { PlayerRegistration } from '../types'

interface PlayerDetailsModalProps {
    isOpen: boolean
    onClose: () => void
    registration: PlayerRegistration | null
}

export default function PlayerDetailsModal({ isOpen, onClose, registration }: PlayerDetailsModalProps) {
    const [isDownloading, setIsDownloading] = useState(false)

    useEffect(() => {
        if (isOpen) {
            document.body.style.overflow = 'hidden'
        } else {
            document.body.style.overflow = 'auto'
        }

        return () => {
            document.body.style.overflow = 'auto'
        }
    }, [isOpen])

    if (!isOpen || !registration) return null

    const handleDownloadReceipt = async () => {
        setIsDownloading(true)
        try {
            // Create receipt content
            const receiptContent = `
        RECEIPT FOR PLAYER REGISTRATION
        ==============================

        Player Name: ${registration.player_name}
        Email: ${registration.player_email}
        Phone: ${registration.phone || 'N/A'}
        Registration Date: ${new Date(registration.registration_date).toLocaleString()}
        Registration ID: ${registration.id}

        Payment Status: ${registration.payment_status?.toUpperCase() || 'N/A'}
        Payment Amount: ₹${registration.payment_amount?.toFixed(2) || '0.00'}
        ${registration.payment_date ? `Payment Date: ${new Date(registration.payment_date).toLocaleString()}` : ''}

        Notes: ${registration.notes || 'No additional notes'}

        Thank you for your registration!

        Generated on: ${new Date().toLocaleString()}
      `

            // Create a blob with the receipt content
            const blob = new Blob([receiptContent], { type: 'text/plain' })
            const url = URL.createObjectURL(blob)

            // Create a temporary anchor element to trigger download
            const a = document.createElement('a')
            a.href = url
            a.download = `receipt_${registration.id}_${registration.player_name.replace(/\s+/g, '_')}.txt`
            document.body.appendChild(a)
            a.click()

            // Clean up
            document.body.removeChild(a)
            URL.revokeObjectURL(url)

        } catch (error) {
            console.error('Error generating receipt:', error)
            alert('Failed to generate receipt. Please try again.')
        } finally {
            setIsDownloading(false)
        }
    }

    return (
        <div className="fixed inset-0 z-50 overflow-y-auto">
            <div className="fixed inset-0 bg-black bg-opacity-50 transition-opacity" onClick={onClose}></div>

            <div className="relative z-10 min-h-screen flex items-center justify-center p-4">
                <div className="bg-white rounded-lg shadow-xl w-full max-w-2xl overflow-hidden">
                    <div className="bg-blue-600 text-white px-6 py-4 flex items-center justify-between">
                        <h3 className="text-xl font-semibold">Player Details</h3>
                        <button
                            onClick={onClose}
                            className="text-white hover:text-gray-200 focus:outline-none"
                            aria-label="Close modal"
                        >
                            <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 18L18 6M6 6l12 12"></path>
                            </svg>
                        </button>
                    </div>

                    <div className="p-6 space-y-6">
                        {/* Player Information Section */}
                        <div className="border-b border-gray-200 pb-4">
                            <h4 className="text-lg font-semibold text-gray-900 mb-4">Player Information</h4>
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                <div className="space-y-2">
                                    <div>
                                        <p className="text-sm text-gray-600">Full Name</p>
                                        <p className="text-gray-900 font-medium">{registration.player_name}</p>
                                    </div>
                                    <div>
                                        <p className="text-sm text-gray-600">Email Address</p>
                                        <p className="text-gray-900 font-medium">{registration.player_email}</p>
                                    </div>
                                    <div>
                                        <p className="text-sm text-gray-600">Phone Number</p>
                                        <p className="text-gray-900 font-medium">{registration.phone || 'N/A'}</p>
                                    </div>
                                </div>
                                <div className="space-y-2">
                                    <div>
                                        <p className="text-sm text-gray-600">Registration ID</p>
                                        <p className="text-gray-900 font-medium">{registration.id}</p>
                                    </div>
                                    <div>
                                        <p className="text-sm text-gray-600">Registration Date</p>
                                        <p className="text-gray-900 font-medium">
                                            {new Date(registration.registration_date).toLocaleString()}
                                        </p>
                                    </div>
                                    <div>
                                        <p className="text-sm text-gray-600">Status</p>
                                        <p className="text-gray-900 font-medium capitalize">{registration.status}</p>
                                    </div>
                                </div>
                            </div>
                        </div>

                        {/* Payment Information Section */}
                        <div className="border-b border-gray-200 pb-4">
                            <h4 className="text-lg font-semibold text-gray-900 mb-4">Payment Information</h4>
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                <div className="space-y-2">
                                    <div>
                                        <p className="text-sm text-gray-600">Payment Status</p>
                                        <span className={`inline-flex items-center px-3 py-1 rounded-full text-sm font-medium ${registration.payment_status === 'completed' || registration.payment_status === 'captured'
                                                ? 'bg-green-100 text-green-800'
                                                : registration.payment_status === 'failed'
                                                    ? 'bg-red-100 text-red-800'
                                                    : 'bg-yellow-100 text-yellow-800'
                                            }`}>
                                            {registration.payment_status?.toUpperCase() || 'N/A'}
                                        </span>
                                    </div>
                                    <div>
                                        <p className="text-sm text-gray-600">Payment Amount</p>
                                        <p className="text-gray-900 font-medium">
                                            ₹{registration.payment_amount?.toFixed(2) || '0.00'}
                                        </p>
                                    </div>
                                </div>
                                <div className="space-y-2">
                                    {registration.payment_date && (
                                        <div>
                                            <p className="text-sm text-gray-600">Payment Date</p>
                                            <p className="text-gray-900 font-medium">
                                                {new Date(registration.payment_date).toLocaleString()}
                                            </p>
                                        </div>
                                    )}
                                </div>
                            </div>
                        </div>

                        {/* Additional Notes Section */}
                        {registration.notes && (
                            <div className="border-b border-gray-200 pb-4">
                                <h4 className="text-lg font-semibold text-gray-900 mb-2">Additional Notes</h4>
                                <p className="text-gray-700 whitespace-pre-wrap">{registration.notes}</p>
                            </div>
                        )}

                        {/* Action Buttons */}
                        <div className="flex items-center justify-end gap-4 pt-4">
                            <button
                                onClick={handleDownloadReceipt}
                                disabled={isDownloading}
                                className="flex items-center gap-2 bg-green-600 hover:bg-green-700 text-white font-semibold py-2 px-6 rounded-lg transition duration-200 disabled:opacity-50 disabled:cursor-not-allowed"
                            >
                                {isDownloading ? (
                                    <>
                                        <svg className="animate-spin -ml-1 mr-2 h-4 w-4 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                                            <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                                            <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                                        </svg>
                                        Generating...
                                    </>
                                ) : (
                                    <>
                                        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4"></path>
                                        </svg>
                                        Download Receipt
                                    </>
                                )}
                            </button>
                            <button
                                onClick={onClose}
                                className="bg-gray-200 hover:bg-gray-300 text-gray-800 font-semibold py-2 px-6 rounded-lg transition duration-200"
                            >
                                Close
                            </button>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    )
}