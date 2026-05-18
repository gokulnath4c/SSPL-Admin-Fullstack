const fs = require('fs');

async function analyzeTransitions() {
    try {
        console.log('--- Loading Data Sources ---');
        const norm = (p) => String(p || '').replace(/\D/g, '').slice(-10);
        
        // 1. Load Level 1
        const l1Raw = JSON.parse(fs.readFileSync('../httpdocs/public/Players_Data.json', 'utf8'));
        const l1Map = new Map();
        l1Raw.forEach(p => {
            const phone = norm(p.mobile);
            if (phone) {
                if(l1Map.has(phone)) {
                    // console.log(`Duplicate in L1: ${phone}`);
                }
                const status = p.status || 'ATTENDED';
                l1Map.set(phone, { name: p.name, status: status, original: p });
            }
        });

        // 2. Load Level 2
        const l2Raw = fs.readFileSync('../httpdocs/src/data/level2Data.ts', 'utf8');
        const eq2 = l2Raw.indexOf('=');
        const l2JsonStr = l2Raw.substring(l2Raw.indexOf('[', eq2), l2Raw.lastIndexOf(']') + 1);
        const l2Data = JSON.parse(l2JsonStr);
        const l2Map = new Map();
        l2Data.forEach(p => {
            const phone = norm(p.mobile);
            if (phone) {
                const status = p.status || (p.remarks?.toUpperCase().includes('GOOD') ? 'SELECTED' : 'NOT SELECTED');
                l2Map.set(phone, { name: p.name, status: status, original: p });
            }
        });

        // 3. Load Level 3
        const l3RawFile = fs.readFileSync('../httpdocs/src/data/level3Data.ts', 'utf8');
        const eq3 = l3RawFile.indexOf('=');
        const l3JsonStr = l3RawFile.substring(l3RawFile.indexOf('[', eq3), l3RawFile.lastIndexOf(']') + 1);
        const l3Data = JSON.parse(l3JsonStr);
        const l3Map = new Map();
        l3Data.forEach(p => {
            const phone = norm(p.mobile);
            if (phone) {
                const status = p.status || (p.remarks?.toUpperCase().includes('GOOD') ? 'SELECTED' : 'NOT SELECTED');
                l3Map.set(phone, { name: p.name, status: status, original: p });
            }
        });

        console.log('\n--- Overall Counts ---');
        console.log(`L1 Unique Valid Phones: ${l1Map.size}`);
        console.log(`L2 Unique Valid Phones: ${l2Map.size}`);
        console.log(`L3 Unique Valid Phones: ${l3Map.size}`);

        console.log('\n--- Transition Analysis ---');

        // Check L1 to L2
        let l1Selected = 0;
        let l1SelectedInL2 = 0;
        l1Map.forEach((data, phone) => {
            if (data.status === 'SELECTED') {
                l1Selected++;
                if (l2Map.has(phone)) {
                    l1SelectedInL2++;
                }
            }
        });
        console.log(`In L1, ${l1Selected} players were SELECTED.`);
        console.log(`Of those, ${l1SelectedInL2} show up in L2.`);
        console.log(`Missing from L2: ${l1Selected - l1SelectedInL2} players.`);

        // Check L2 orphans (In L2 but not in L1)
        let l2Orphans = 0;
        l2Map.forEach((data, phone) => {
            if (!l1Map.has(phone)) {
                l2Orphans++;
            }
        });
        console.log(`Players in L2 who completely bypassed L1: ${l2Orphans}`);

        // Check L2 to L3
        let l2Selected = 0;
        let l2SelectedInL3 = 0;
        l2Map.forEach((data, phone) => {
            if (data.status === 'SELECTED') {
                l2Selected++;
                if (l3Map.has(phone)) {
                    l2SelectedInL3++;
                }
            }
        });
        console.log(`\nIn L2, ${l2Selected} players were SELECTED.`);
        console.log(`Of those, ${l2SelectedInL3} show up in L3.`);
        console.log(`Missing from L3: ${l2Selected - l2SelectedInL3} players.`);

        // Check L3 orphans (In L3 but not in L2)
        let l3Orphans = 0;
        let l3TotalOrphans = 0; // Not in L2 AND not in L1
        l3Map.forEach((data, phone) => {
            if (!l2Map.has(phone)) {
                l3Orphans++;
            }
            if (!l2Map.has(phone) && !l1Map.has(phone)) {
                l3TotalOrphans++;
            }
        });
        console.log(`Players in L3 who bypassed L2: ${l3Orphans} (of which ${l3TotalOrphans} also bypassed L1)`);

    } catch (e) {
        console.error('Error during transition analysis:', e);
    }
}

analyzeTransitions();
