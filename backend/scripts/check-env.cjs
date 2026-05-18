const path = require('path');
require('dotenv').config({ path: path.join(__dirname, '../.env.production') });

console.log('--- Env Diagnostic ---');
console.log('Current Dir:', __dirname);
console.log('Env Path:', path.join(__dirname, '../.env.production'));
console.log('RAZORPAY_KEY_ID:', process.env.RAZORPAY_KEY_ID ? 'Exists (' + process.env.RAZORPAY_KEY_ID.substring(0, 5) + '...)' : 'MISSING');
console.log('RAZORPAY_KEY_SECRET:', process.env.RAZORPAY_KEY_SECRET ? 'Exists' : 'MISSING');
console.log('VITE_RAZORPAY_KEY_ID:', process.env.VITE_RAZORPAY_KEY_ID);
console.log('----------------------');
