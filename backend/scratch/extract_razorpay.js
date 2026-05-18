const XLSX = require('xlsx');
const fs = require('fs');
const path = require('path');

const workbook = XLSX.readFile('C:/Users/ADMIN/Downloads/RAZORPAY DATA.xlsx');
const sheetName = workbook.SheetNames[0];
const worksheet = workbook.Sheets[sheetName];
const data = XLSX.utils.sheet_to_json(worksheet);

const outputPath = path.join(__dirname, 'razorpay_data_full.json');
fs.writeFileSync(outputPath, JSON.stringify(data, null, 2));
console.log(`Extracted all records to ${outputPath}`);
console.log(`Total records in Excel: ${data.length}`);
const columns = Object.keys(data[0] || {});
console.log(`Columns: ${columns.join(', ')}`);
