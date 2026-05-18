import { utils, read } from 'xlsx';
import { PlayerRegistration } from '../types';
import { supabase } from '../lib/supabase';

/**
 * Validate registration data
 * @param data Registration data to validate
 * @returns Validation result with success status and message
 */
export const validateRegistrationData = (data: any): { success: boolean, message: string, validatedData?: Partial<PlayerRegistration> } => {
    // Required fields
    const requiredFields = ['player_name', 'player_email'];
    const missingFields = requiredFields.filter(field => !data[field] || String(data[field]).trim() === '');

    if (missingFields.length > 0) {
        return {
            success: false,
            message: `Missing required fields: ${missingFields.join(', ')}`
        };
    }

    // Email validation
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(data.player_email)) {
        return {
            success: false,
            message: 'Invalid email format'
        };
    }

    // Validate payment status
    const validPaymentStatuses = ['pending', 'completed', 'failed', 'captured'];
    if (data.payment_status && !validPaymentStatuses.includes(data.payment_status)) {
        return {
            success: false,
            message: `Invalid payment status. Must be one of: ${validPaymentStatuses.join(', ')}`
        };
    }

    // Validate status
    const validStatuses = ['pending', 'approved', 'rejected'];
    if (data.status && !validStatuses.includes(data.status)) {
        return {
            success: false,
            message: `Invalid status. Must be one of: ${validStatuses.join(', ')}`
        };
    }

    // Validate payment amount
    if (data.payment_amount !== undefined && (isNaN(data.payment_amount) || data.payment_amount < 0)) {
        return {
            success: false,
            message: 'Payment amount must be a positive number'
        };
    }

    // Create validated data object
    const validatedData: Partial<PlayerRegistration> = {
        player_name: String(data.player_name).trim(),
        player_email: String(data.player_email).trim(),
        phone: data.phone ? String(data.phone).trim() : undefined,
        status: data.status || 'pending',
        payment_status: data.payment_status || 'pending',
        payment_amount: data.payment_amount !== undefined ? Number(data.payment_amount) : undefined,
        notes: data.notes ? String(data.notes).trim() : undefined
    };

    return {
        success: true,
        message: 'Data validation successful',
        validatedData
    };
};

/**
 * Parse Excel/CSV file and extract registration data
 * @param file File object to parse
 * @returns Parsed registration data or error
 */
export const parseRegistrationFile = async (file: File): Promise<{
    success: boolean;
    message: string;
    data?: any[];
}> => {
    try {
        // Read file data
        const fileData = await file.arrayBuffer();
        const workbook = read(fileData, { type: 'array' });

        // Get first sheet
        const sheetName = workbook.SheetNames[0];
        const worksheet = workbook.Sheets[sheetName];

        // Convert to JSON
        const jsonData = utils.sheet_to_json(worksheet);

        if (!jsonData || jsonData.length === 0) {
            return {
                success: false,
                message: 'No data found in the file'
            };
        }

        return {
            success: true,
            message: 'File parsed successfully',
            data: jsonData
        };
    } catch (error) {
        console.error('Error parsing file:', error);
        return {
            success: false,
            message: 'Failed to parse file: ' + (error instanceof Error ? error.message : 'Unknown error')
        };
    }
};

/**
 * Import registrations from parsed data
 * @param registrationsData Array of registration data to import
 * @returns Import result with success status and message
 */
export const importRegistrations = async (registrationsData: any[]): Promise<{
    success: boolean;
    message: string;
    importedCount?: number;
    failedCount?: number;
    errors?: string[];
}> => {
    const results = {
        success: true,
        message: 'Import completed',
        importedCount: 0,
        failedCount: 0,
        errors: [] as string[]
    };

    for (let i = 0; i < registrationsData.length; i++) {
        const item = registrationsData[i];

        // Validate the data
        const validation = validateRegistrationData(item);

        if (!validation.success) {
            results.failedCount++;
            results.errors.push(`Row ${i + 1}: ${validation.message}`);
            results.success = false;
            continue;
        }

        try {
            // Prepare data for Supabase
            const registrationData: Partial<PlayerRegistration> = {
                ...validation.validatedData,
                registration_date: new Date().toISOString(),
                payment_date: validation.validatedData?.payment_status === 'completed' || validation.validatedData?.payment_status === 'captured'
                    ? new Date().toISOString()
                    : undefined
            };

            // Insert into Supabase
            const { data, error } = await supabase
                .from('player_registrations')
                .insert([registrationData])
                .select();

            if (error) {
                throw error;
            }

            if (data && data.length > 0) {
                results.importedCount++;
            }
        } catch (error) {
            results.failedCount++;
            results.errors.push(`Row ${i + 1}: Failed to import - ${error instanceof Error ? error.message : 'Unknown error'}`);
            results.success = false;
        }
    }

    results.message = `Import completed: ${results.importedCount} successful, ${results.failedCount} failed`;

    return results;
};