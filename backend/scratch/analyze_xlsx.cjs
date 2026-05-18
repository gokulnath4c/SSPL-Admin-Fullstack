const XLSX = require('xlsx');
const path = require('path');

const filePath = 'C:/Users/ADMIN/Downloads/State NA.xlsx';

async function analyze() {
    try {
        const workbook = XLSX.readFile(filePath);
        const sheetName = workbook.SheetNames[0];
        const sheet = workbook.Sheets[sheetName];
        const data = XLSX.utils.sheet_to_json(sheet);
        
        console.log(`Total rows: ${data.length}`);
        console.log('Sample Row:', data[0]);
        console.log('Columns:', Object.keys(data[0]));
    } catch (error) {
        console.error('Error reading Excel:', error);
    }
}

analyze();
