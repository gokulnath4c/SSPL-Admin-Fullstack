// Example API client types
export interface ApiResponse<T> {
  success: boolean
  data?: T
  error?: string
}

export interface User {
  id: string
  name: string
  email: string
}

export interface Post {
  id: string
  title: string
  content: string
  authorId: string
  createdAt: Date
}

export interface PlayerRegistration {
  id: string
  player_name: string
  player_email: string
  phone?: string
  state?: string
  city?: string
  pincode?: string
  registration_date: string
  status: 'pending' | 'approved' | 'rejected'
  payment_status: 'pending' | 'completed' | 'failed' | 'captured'
  payment_amount?: number
  payment_date?: string
  notes?: string
}

export interface TournamentOrganizer {
  id: string
  created_at: string
  organisation_name: string
  organiser_name: string
  designation?: string
  mobile_primary: string
  mobile_secondary?: string
  email?: string
  state: string
  city_district: string
  area_pincode?: string
  tournament_type: string
  tournament_category: string[]
  category_other?: string
  tournament_format: string
  format_other?: string
  expected_teams?: string
  start_date: string
  end_date?: string
  venue_name: string
  venue_address?: string
  expected_footfall?: string
  live_streaming?: string
  live_streaming_link?: string
  delivery_contact_name?: string
  delivery_contact_mobile?: string
  delivery_address?: string
  gst_number?: string
  branding_support?: string[]
  social_instagram?: string
  social_facebook?: string
  social_youtube?: string
  share_media?: string
  tournaments_annually?: string
  total_tournaments?: string
  current_sponsors?: string
  long_term_collaboration?: string
  how_heard?: string
  preferred_ball_type?: string
  remarks?: string
  status: 'pending' | 'approved' | 'rejected'
}
