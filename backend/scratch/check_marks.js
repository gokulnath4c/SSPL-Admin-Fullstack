const fs = require('fs');

const fileName = 'D:/ssplt10.cloud-prod-sync-20251006/httpdocs/public/Players_Data.json';
const data = JSON.parse(fs.readFileSync(fileName, 'utf8'));

const player = data.find(p => p.mobile && p.mobile.includes('9019129268'));
console.log(player);
