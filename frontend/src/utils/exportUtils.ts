import { utils, writeFileXLSX } from 'xlsx';
import { PlayerRegistration } from '../types';

/**
 * Export registrations data to Excel file
 * @param registrations Array of player registrations
 * @param fileName Name of the export file
 */
export const exportToExcel = (registrations: PlayerRegistration[], fileName: string = 'registrations') => {
    try {
        // Prepare data for Excel export
        const exportData = registrations.map(reg => ({
            'ID': reg.id,
            'Player Name': reg.player_name,
            'Email': reg.player_email,
            'Phone': reg.phone || '',
            'Registration Date': new Date(reg.registration_date).toLocaleString(),
            'Status': reg.status,
            'Payment Status': reg.payment_status,
            'Payment Amount': reg.payment_amount ? `₹${reg.payment_amount.toFixed(2)}` : '',
            'Payment Date': reg.payment_date ? new Date(reg.payment_date).toLocaleString() : '',
            'Notes': reg.notes || ''
        }));

        // Create worksheet
        const worksheet = utils.json_to_sheet(exportData);

        // Create workbook
        const workbook = utils.book_new();
        utils.book_append_sheet(workbook, worksheet, 'Registrations');

        // Generate Excel file
        writeFileXLSX(workbook, `${fileName}_${new Date().toISOString().slice(0, 10)}.xlsx`);

        return { success: true, message: 'Export successful' };
    } catch (error) {
        console.error('Error exporting to Excel:', error);
        return { success: false, message: 'Failed to export data' };
    }
};

/**
 * Export data to CSV file
 * @param data Array of data objects
 * @param fileName Name of the export file
 * @param columnMapping Optional mapping of field names to column headers
 */
export const exportToCSV = <T extends Record<string, any>>(data: T[], fileName: string = 'export', columnMapping?: Record<string, string>) => {
    try {
        // Prepare data for CSV export
        const exportData = data.map(item => {
            const row: Record<string, any> = {};

            // If mapping provided, use it to select and rename fields
            if (columnMapping) {
                Object.entries(columnMapping).forEach(([key, header]) => {
                    row[header] = item[key];
                });
            } else {
                // Otherwise use all fields
                Object.assign(row, item);
            }
            return row;
        });

        // Create worksheet
        const worksheet = utils.json_to_sheet(exportData);

        // Convert to CSV
        const csvData = utils.sheet_to_csv(worksheet);

        // Create download link
        const blob = new Blob([csvData], { type: 'text/csv;charset=utf-8;' });
        const url = URL.createObjectURL(blob);
        const link = document.createElement('a');
        link.href = url;
        link.download = `${fileName}_${new Date().toISOString().slice(0, 10)}.csv`;
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
        URL.revokeObjectURL(url);

        return { success: true, message: 'Export successful' };
    } catch (error) {
        console.error('Error exporting to CSV:', error);
        return { success: false, message: 'Failed to export data' };
    }
};