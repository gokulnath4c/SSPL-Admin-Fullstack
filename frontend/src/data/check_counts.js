
const fs = require('fs');
const path = require('path');
const { chennaiData } = require('./locations_chennai');
const { hyderabadData } = require('./locations_hyderabad');
const { otherCitiesData } = require('./locations_others');
const playersData = require('../Players_Data.json');

const manualLocations = {
    ...chennaiData,
    ...hyderabadData,
    ...otherCitiesData
};

const manualKeys = Object.keys(manualLocations);
console.log(`Manual Location Keys: ${manualKeys.length}`);

const jsonMobiles = new Set(playersData.map(p => {
    const s = String(p.mobile).replace(/[^0-9]/g, '');
    return s.length > 10 ? s.slice(-10) : s;
}));
console.log(`JSON Player Count: ${playersData.length}`);
console.log(`JSON Unique Mobiles: ${jsonMobiles.size}`);

const missing = manualKeys.filter(k => {
    const s = String(k).replace(/[^0-9]/g, '');
    const cleanKey = s.length > 10 ? s.slice(-10) : s;
    return !jsonMobiles.has(cleanKey);
});

console.log(`Manual Keys NOT in JSON: ${missing.length}`);
if (missing.length > 0) {
    console.log('Sample missing:', missing.slice(0, 5));
}
