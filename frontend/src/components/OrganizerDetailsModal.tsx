import { useEffect } from 'react'
import { TournamentOrganizer } from '../types'

interface OrganizerDetailsModalProps {
    isOpen: boolean
    onClose: () => void
    organizer: TournamentOrganizer | null
}

export default function OrganizerDetailsModal({ isOpen, onClose, organizer }: OrganizerDetailsModalProps) {
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

    if (!isOpen || !organizer) return null

    const formatDate = (dateString?: string) => {
        if (!dateString) return 'N/A'
        return new Date(dateString).toLocaleDateString()
    }

    const SectionHeader = ({ title }: { title: string }) => (
        <h4 className="text-lg font-semibold text-gray-900 mb-4 border-b pb-2">{title}</h4>
    )

    const Field = ({ label, value }: { label: string, value?: string | number | null }) => (
        <div className="mb-4">
            <p className="text-sm text-gray-500 mb-1">{label}</p>
            <p className="text-gray-900 font-medium whitespace-pre-wrap">{value || 'N/A'}</p>
        </div>
    )

    return (
        <div className="fixed inset-0 z-50 overflow-y-auto">
            <div className="fixed inset-0 bg-black bg-opacity-50 transition-opacity" onClick={onClose}></div>

            <div className="relative z-10 min-h-screen flex items-center justify-center p-4">
                <div className="bg-white rounded-lg shadow-xl w-full max-w-4xl overflow-hidden flex flex-col max-h-[90vh]">
                    {/* Header */}
                    <div className="bg-blue-600 text-white px-6 py-4 flex items-center justify-between shrink-0">
                        <h3 className="text-xl font-semibold">Organizer Details</h3>
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

                    {/* Content */}
                    <div className="p-6 overflow-y-auto">
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                            {/* Left Column */}
                            <div className="space-y-6">
                                <div>
                                    <SectionHeader title="Status & Info" />
                                    <div className="grid grid-cols-2 gap-4">
                                        <div>
                                            <p className="text-sm text-gray-500 mb-1">Status</p>
                                            <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium capitalize ${organizer.status === 'approved' ? 'bg-green-100 text-green-800' :
                                                    organizer.status === 'rejected' ? 'bg-red-100 text-red-800' :
                                                        'bg-yellow-100 text-yellow-800'
                                                }`}>
                                                {organizer.status}
                                            </span>
                                        </div>
                                        <Field label="Registration Date" value={new Date(organizer.created_at).toLocaleString()} />
                                        <Field label="ID" value={organizer.id} />
                                    </div>
                                </div>

                                <div>
                                    <SectionHeader title="Organizer Information" />
                                    <Field label="Organisation Name" value={organizer.organisation_name} />
                                    <Field label="Organiser Name" value={organizer.organiser_name} />
                                    <Field label="Designation" value={organizer.designation} />
                                    <div className="grid grid-cols-2 gap-4">
                                        <Field label="Primary Mobile" value={organizer.mobile_primary} />
                                        <Field label="Secondary Mobile" value={organizer.mobile_secondary} />
                                    </div>
                                    <Field label="Email" value={organizer.email} />
                                    <div className="grid grid-cols-2 gap-4">
                                        <Field label="State" value={organizer.state} />
                                        <Field label="City / District" value={organizer.city_district} />
                                        <Field label="Pincode" value={organizer.area_pincode} />
                                    </div>
                                </div>

                                <div>
                                    <SectionHeader title="Delivery Details" />
                                    <Field label="Contact Name" value={organizer.delivery_contact_name} />
                                    <Field label="Contact Mobile" value={organizer.delivery_contact_mobile} />
                                    <Field label="Delivery Address" value={organizer.delivery_address} />
                                </div>
                            </div>

                            {/* Right Column */}
                            <div className="space-y-6">
                                <div>
                                    <SectionHeader title="Tournament Details" />
                                    <Field label="Tournament Type" value={organizer.tournament_type} />
                                    <div>
                                        <p className="text-sm text-gray-500 mb-1">Categories</p>
                                        <div className="flex flex-wrap gap-1">
                                            {organizer.tournament_category?.map((cat, idx) => (
                                                <span key={idx} className="bg-gray-100 text-gray-800 text-xs px-2 py-1 rounded">{cat}</span>
                                            ))}
                                            {organizer.category_other && <span className="bg-gray-100 text-gray-800 text-xs px-2 py-1 rounded">Other: {organizer.category_other}</span>}
                                        </div>
                                    </div>
                                    <div className="grid grid-cols-2 gap-4 mt-4">
                                        <Field label="Format" value={organizer.tournament_format} />
                                        <Field label="Expected Teams" value={organizer.expected_teams} />
                                    </div>
                                    <Field label="Other Format" value={organizer.format_other} />

                                    <div className="grid grid-cols-2 gap-4">
                                        <Field label="Start Date" value={formatDate(organizer.start_date)} />
                                        <Field label="End Date" value={formatDate(organizer.end_date)} />
                                    </div>
                                    <Field label="Venue Name" value={organizer.venue_name} />
                                    <Field label="Venue Address" value={organizer.venue_address} />
                                    <Field label="Expected Footfall" value={organizer.expected_footfall} />
                                    <div className="grid grid-cols-2 gap-4">
                                        <Field label="Live Streaming" value={organizer.live_streaming} />
                                        <Field label="Link" value={organizer.live_streaming_link} />
                                    </div>
                                </div>

                                <div>
                                    <SectionHeader title="Additional / Business Info" />
                                    <Field label="GST Number" value={organizer.gst_number} />
                                    <div>
                                        <p className="text-sm text-gray-500 mb-1">Branding Support</p>
                                        <div className="flex flex-wrap gap-1">
                                            {organizer.branding_support?.map((item, idx) => (
                                                <span key={idx} className="bg-blue-50 text-blue-700 text-xs px-2 py-1 rounded">{item}</span>
                                            ))}
                                        </div>
                                    </div>
                                    <div className="grid grid-cols-3 gap-2 mt-4">
                                        <Field label="Instagram" value={organizer.social_instagram} />
                                        <Field label="Facebook" value={organizer.social_facebook} />
                                        <Field label="YouTube" value={organizer.social_youtube} />
                                    </div>
                                    <Field label="Share Media" value={organizer.share_media} />
                                    <div className="grid grid-cols-2 gap-4">
                                        <Field label="Tournaments/Year" value={organizer.tournaments_annually} />
                                        <Field label="Total Tournaments" value={organizer.total_tournaments} />
                                    </div>
                                    <Field label="Current Sponsors" value={organizer.current_sponsors} />
                                    <Field label="Long Term Collab" value={organizer.long_term_collaboration} />
                                    <Field label="How Heard" value={organizer.how_heard} />
                                    <Field label="Preferred Ball" value={organizer.preferred_ball_type} />
                                    <Field label="Remarks" value={organizer.remarks} />
                                </div>
                            </div>
                        </div>
                    </div>

                    {/* Footer */}
                    <div className="bg-gray-50 px-6 py-4 flex justify-end shrink-0 border-t">
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
    )
}
