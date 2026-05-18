const XLSX = require('xlsx');
const fs = require('fs');
const path = require('path');

const workbook = XLSX.readFile('C:/Users/ADMIN/Downloads/Master Data_SSPL as on 13-04-2026.xlsx');
const sheetName = workbook.SheetNames[0];
const worksheet = workbook.Sheets[sheetName];
const data = XLSX.utils.sheet_to_json(worksheet);

// Filter for 'captured' in the Excel data
// Looking at previous sample, status column is 'status'
const capturedInExcel = data.filter(d => d.status === 'captured');

const outputPath = path.join(__dirname, 'master_data_captured.json');
fs.writeFileSync(outputPath, JSON.stringify(capturedInExcel, null, 2));

console.log(`Extracted ${capturedInExcel.length} captured records from Master Data Excel.`);
console.log(`Total records in Excel: ${data.length}`);
if (capturedInExcel.length > 0) {
    console.log('Sample columns:', Object.keys(capturedInExcel[0]));
}
