const fs = require('fs');

const fileNames = [
    'D:/ssplt10.cloud-prod-sync-20251006/httpdocs/public/Players_Data.json',
    'D:/ssplt10.cloud-prod-sync-20251006/httpdocs/dist/Players_Data.json',
    'D:/ssplt10.cloud-prod-sync-20251006/httpdocs/admin/react-app/src/Players_Data.json'
];

for (const fileName of fileNames) {
    if (fs.existsSync(fileName)) {
        const data = JSON.parse(fs.readFileSync(fileName, 'utf8'));
        const playerIndex = data.findIndex(p => p.mobile && p.mobile.includes('9019129268'));
        if (playerIndex >= 0) {
            console.log(`Found in ${fileName}:`, data[playerIndex]);
            
            // We want to update it to show as selected, attended and in Bangalore.
            // Wait, what does the JSON schema look like? It has "name", "email", "mobile", "marks", "attendance"?
            // We will do that once we see it.
        } else {
            console.log(`Not found in ${fileName}`);
        }
    }
}
