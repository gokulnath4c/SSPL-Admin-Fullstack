const evolutionService = require('../services/evolutionService.cjs');
const dotenv = require('dotenv');
dotenv.config({ path: '.env.production' });

async function checkInstance() {
    try {
        const instances = await evolutionService.fetchInstances();
        console.log('--- Evolution Instances ---');
        console.log(JSON.stringify(instances, null, 2));

        const state = await evolutionService.getConnectionState('sspl_admin');
        console.log('\n--- sspl_admin State ---');
        console.log(JSON.stringify(state, null, 2));
    } catch (error) {
        console.error('Error checking instances:', error.message);
    }
}

checkInstance();
