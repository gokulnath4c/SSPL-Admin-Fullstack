import { useState, useRef } from 'react';
import { exportToExcel, exportToCSV } from '../utils/exportUtils';
import { parseRegistrationFile, importRegistrations } from '../utils/importUtils';
import { PlayerRegistration } from '../types';

interface ImportExportButtonsProps {
    registrations: PlayerRegistration[];
    onImportSuccess: () => void;
}

export default function ImportExportButtons({ registrations, onImportSuccess }: ImportExportButtonsProps) {
    const [isImporting, setIsImporting] = useState(false);
    const [importProgress, setImportProgress] = useState('');
    const [importError, setImportError] = useState('');
    const [showImportModal, setShowImportModal] = useState(false);
    const fileInputRef = useRef<HTMLInputElement>(null);

    const handleExportExcel = () => {
        const result = exportToExcel(registrations, 'registrations');
        if (!result.success) {
            alert('Failed to export: ' + result.message);
        }
    };

    const handleExportCSV = () => {
        const formattedData = registrations.map(reg => ({
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

        const result = exportToCSV(formattedData, 'registrations');
        if (!result.success) {
            alert('Failed to export: ' + result.message);
        }
    };

    const handleImportClick = () => {
        setShowImportModal(true);
        setImportError('');
        setImportProgress('');
    };

    const handleFileChange = async (event: React.ChangeEvent<HTMLInputElement>) => {
        const file = event.target.files?.[0];
        if (!file) return;

        setIsImporting(true);
        setImportProgress('Parsing file...');
        setImportError('');

        try {
            // Parse the file
            const parseResult = await parseRegistrationFile(file);

            if (!parseResult.success) {
                throw new Error(parseResult.message);
            }

            if (!parseResult.data || parseResult.data.length === 0) {
                throw new Error('No valid registration data found in the file');
            }

            setImportProgress(`File parsed successfully. Found ${parseResult.data.length} records. Starting import...`);

            // Import the data
            const importResult = await importRegistrations(parseResult.data);

            if (importResult.success && importResult.importedCount && importResult.importedCount > 0) {
                setImportProgress(`Import successful! ${importResult.importedCount} records imported.`);
                onImportSuccess();
            } else {
                const errorMessage = importResult.errors?.length
                    ? `Import completed with errors:\n${importResult.errors.join('\n')}`
                    : 'Import completed but no records were imported.';
                setImportError(errorMessage);
                setImportProgress('');
            }
        } catch (error) {
            setImportError('Import failed: ' + (error instanceof Error ? error.message : 'Unknown error'));
            setImportProgress('');
        } finally {
            setIsImporting(false);
            // Reset file input
            if (fileInputRef.current) {
                fileInputRef.current.value = '';
            }
        }
    };

    const closeImportModal = () => {
        setShowImportModal(false);
        setImportError('');
        setImportProgress('');
    };

    return (
        <div className="flex items-center space-x-4">
            {/* Export Buttons */}
            <button
                onClick={handleExportExcel}
                className="bg-green-600 hover:bg-green-700 text-white font-semibold py-2 px-4 rounded-lg transition duration-200 flex items-center"
                disabled={registrations.length === 0}
                title="Export to Excel"
            >
                📊 Export Excel
            </button>

            <button
                onClick={handleExportCSV}
                className="bg-blue-600 hover:bg-blue-700 text-white font-semibold py-2 px-4 rounded-lg transition duration-200 flex items-center"
                disabled={registrations.length === 0}
                title="Export to CSV"
            >
                📋 Export CSV
            </button>

            {/* Import Button */}
            <button
                onClick={handleImportClick}
                className="bg-purple-600 hover:bg-purple-700 text-white font-semibold py-2 px-4 rounded-lg transition duration-200 flex items-center"
                title="Import from Excel/CSV"
            >
                📥 Import
            </button>

            {/* Import Modal */}
            {showImportModal && (
                <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
                    <div className="bg-white rounded-lg shadow-xl p-6 w-full max-w-md">
                        <h3 className="text-xl font-bold text-gray-900 mb-4">Import Registrations</h3>
                        <p className="text-gray-600 mb-4">Upload an Excel or CSV file with registration data.</p>

                        <div className="border-2 border-dashed border-gray-300 rounded-lg p-6 text-center mb-4">
                            <input
                                type="file"
                                ref={fileInputRef}
                                onChange={handleFileChange}
                                accept=".xlsx,.xls,.csv"
                                className="hidden"
                                id="file-upload"
                                disabled={isImporting}
                            />
                            <label htmlFor="file-upload" className="cursor-pointer">
                                <div className="text-blue-600 font-medium mb-2">📁 Choose File</div>
                                <div className="text-sm text-gray-500">Excel (.xlsx, .xls) or CSV (.csv) files</div>
                            </label>
                        </div>

                        {importProgress && (
                            <div className="bg-blue-50 border border-blue-200 rounded-lg p-3 mb-4">
                                <p className="text-blue-700 text-sm">{importProgress}</p>
                                {isImporting && (
                                    <div className="mt-2">
                                        <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-blue-600 inline-block"></div>
                                        <span className="ml-2 text-blue-600 text-sm">Processing...</span>
                                    </div>
                                )}
                            </div>
                        )}

                        {importError && (
                            <div className="bg-red-50 border border-red-200 rounded-lg p-3 mb-4">
                                <p className="text-red-700 text-sm">{importError}</p>
                            </div>
                        )}

                        <div className="flex justify-end space-x-3">
                            <button
                                onClick={closeImportModal}
                                className="px-4 py-2 bg-gray-200 hover:bg-gray-300 text-gray-800 rounded-lg transition duration-200"
                                disabled={isImporting}
                            >
                                Cancel
                            </button>
                            <button
                                onClick={() => fileInputRef.current?.click()}
                                className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg transition duration-200"
                                disabled={isImporting}
                            >
                                Browse Files
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}