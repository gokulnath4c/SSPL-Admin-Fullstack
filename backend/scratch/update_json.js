const fs = require('fs');

const fileNames = [
    'D:/ssplt10.cloud-prod-sync-20251006/httpdocs/public/Players_Data.json',
    'D:/ssplt10.cloud-prod-sync-20251006/httpdocs/dist/Players_Data.json',
    'D:/ssplt10.cloud-prod-sync-20251006/httpdocs/admin/react-app/src/Players_Data.json'
];

for (const fileName of fileNames) {
    if (fs.existsSync(fileName)) {
        let content = fs.readFileSync(fileName, 'utf8');
        let data = JSON.parse(content);
        
        let updated = false;
        for (let player of data) {
            if (player.mobile && player.mobile.includes('9019129268')) {
                player.status = 'SELECTED';
                player.city = 'Bangalore';
                if (!player.marks || player.marks < 40) {
                    player.marks = 45; // Enough to be SELECTED
                }
                updated = true;
            }
        }
        
        if (updated) {
            console.log(`Writing changes to ${fileName}`);
            fs.writeFileSync(fileName, JSON.stringify(data, null, 2), 'utf8');
        } else {
            console.log(`No match found to update in ${fileName}`);
        }
    }
}
