const Razorpay = require('razorpay');

// NEW KEYS provided by user
const KEY_ID = 'rzp_live_RHjfJGQ990QNOI';
const KEY_SECRET = 'Trpzhimwb9TJ6x6V4aghkrZ6';

console.log('Testing Razorpay Auth with NEW Keys...');
console.log('Key ID:', KEY_ID);

const instance = new Razorpay({
    key_id: KEY_ID,
    key_secret: KEY_SECRET,
});

instance.payments.all({ count: 1 })
    .then((response) => {
        console.log('✅ SUCCESS! Auth worked.');
        console.log('Fetched', response.count, 'payments.');
    })
    .catch((error) => {
        console.error('❌ FAILED! Auth failed.');
        console.error('Error Code:', error.statusCode);
        console.error('Description:', error.error ? error.error.description : error.message);
    });
