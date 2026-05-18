/**
 * Google Analytics 4 Data Fetching Service
 * Adapted for Admin Panel
 */

import { supabase } from '@/lib/supabase';

export interface GA4Metrics {
    activeUsers: number;
    sessions: number;
    conversions: number;
    totalRevenue: number;
    averageSessionDuration: number;
    bounceRate: number;
}

export interface GA4UTMReport {
    utm_id: string;
    utm_source: string;
    utm_medium: string;
    utm_campaign: string;
    utm_content: string;
    date: string;
    users: number;
    sessions: number;
    conversions: number;
    revenue: number;
    newUsers: number;
    bounceRate: number;
    avgSessionDuration: number;
    pageViews: number;
}

export interface GA4ReportResponse {
    data: GA4UTMReport[];
    totalRows: number;
    fetchedRows: number;
    dateRange: {
        startDate: string;
        endDate: string;
    };
}

export interface GA4QRReport {
    qr_code_id: string;
    scans: number;
    registrations: number;
    conversions: number;
    conversionRate: number;
    revenue: number;
}

class GA4DataFetchService {
    private propertyId = '494303780';
    // private measurementId = 'G-R31DRZTRVF'; // Not needed for fetching API data usually

    /**
     * Fetch real-time metrics from GA4
     */
    async getRealTimeMetrics(): Promise<GA4Metrics | null> {
        try {
            const { data, error } = await supabase.functions.invoke('ga4-realtime-metrics', {
                body: { propertyId: this.propertyId }
            });

            if (error) {
                console.error('Error fetching GA4 real-time metrics:', error);
                return null;
            }

            return data as GA4Metrics;
        } catch (error) {
            console.error('Error in getRealTimeMetrics:', error);
            return null;
        }
    }

    /**
     * Fetch UTM campaign performance from GA4
     */
    async getUTMCampaignReport(startDate: string = '30daysAgo', endDate: string = 'today'): Promise<GA4ReportResponse> {
        try {
            const { data, error } = await supabase.functions.invoke('ga4-utm-report', {
                body: {
                    startDate,
                    endDate
                }
            });

            if (error) {
                console.error('Error fetching GA4 UTM report:', error);

                // Check if it's a CORS or network error which might happen with AdBlockers
                if (error.message && (error.message.includes('Failed to fetch') || error.message.includes('Network request failed'))) {
                    console.warn('Network error detected. This might be due to AdBlocker or CORS issues with the Edge Function.');
                }

                return { data: [], totalRows: 0, fetchedRows: 0, dateRange: { startDate, endDate } };
            }

            if (Array.isArray(data)) {
                return { data: data as GA4UTMReport[], totalRows: data.length, fetchedRows: data.length, dateRange: { startDate, endDate } };
            }

            return data as GA4ReportResponse;
        } catch (error) {
            console.error('Error in getUTMCampaignReport:', error);
            return { data: [], totalRows: 0, fetchedRows: 0, dateRange: { startDate, endDate } };
        }
    }
}

export const ga4DataFetchService = new GA4DataFetchService();
export default ga4DataFetchService;
