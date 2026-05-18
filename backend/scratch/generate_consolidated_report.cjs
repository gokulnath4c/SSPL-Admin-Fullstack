const XLSX = require('../../httpdocs/admin/react-app/node_modules/xlsx');
require('dotenv').config({ path: './.env.production' });
const supabase = require('../config/supabase.cjs');
const fs = require('fs');

const outputFile = 'C:/Users/ADMIN/Downloads/Consolidated_Trial_Report.xlsx';

async function generateReport() {
    try {
        console.log('--- Loading Data Sources ---');
        
        // 1. Load Level 1 Data
        const l1Raw = JSON.parse(fs.readFileSync('../httpdocs/public/Players_Data.json', 'utf8'));
        const l1Map = new Map();
        l1Raw.forEach(p => {
            const phone = String(p.mobile || '').replace(/\D/g, '').slice(-10);
            l1Map.set(phone, p);
        });
        console.log(`L1 Records loaded: ${l1Raw.length}`);

        // 2. Load Level 2 Data
        const l2Raw = fs.readFileSync('../httpdocs/src/data/level2Data.ts', 'utf8');
        const eq2 = l2Raw.indexOf('=');
        const l2JsonStr = l2Raw.substring(l2Raw.indexOf('[', eq2), l2Raw.lastIndexOf(']') + 1);
        const l2Data = JSON.parse(l2JsonStr);
        const l2Map = new Map();
        l2Data.forEach(p => {
            const phone = String(p.mobile || '').replace(/\D/g, '').slice(-10);
            l2Map.set(phone, p);
        });
        console.log(`L2 Records loaded: ${l2Data.length}`);

        // 3. Load Level 3 Data
        const l3RawFile = fs.readFileSync('../httpdocs/src/data/level3Data.ts', 'utf8');
        const eq3 = l3RawFile.indexOf('=');
        const l3JsonStr = l3RawFile.substring(l3RawFile.indexOf('[', eq3), l3RawFile.lastIndexOf(']') + 1);
        const l3Data = JSON.parse(l3JsonStr);
        const l3Map = new Map();
        l3Data.forEach(p => {
            const phone = String(p.mobile || '').replace(/\D/g, '').slice(-10);
            l3Map.set(phone, p);
        });
        console.log(`L3 Records loaded: ${l3Data.length}`);

        // 4. Fetch Database Players (All captured)
        console.log('Fetching paid registrations from database...');
        let allRegistrations = [];
        let page = 0;
        const PAGE_SIZE = 1000;
        let hasMore = true;

        while (hasMore) {
            const { data, error } = await supabase
                .from('player_registrations')
                .select('full_name, phone, email, state, city, payment_status, status')
                .or('payment_status.eq.captured,status.eq.paid')
                .range(page * PAGE_SIZE, (page * PAGE_SIZE) + PAGE_SIZE - 1);
            
            if (error) throw error;
            if (!data || data.length === 0) {
                hasMore = false;
            } else {
                allRegistrations = [...allRegistrations, ...data];
                page++;
            }
        }
        console.log(`Database Records loaded: ${allRegistrations.length}`);

        console.log('\n--- Building Consolidated Report ---');
        const consolidatedData = [];

        // Helper to determine status
        const getL2L3Status = (match) => match ? (match.status || (match.remarks?.toUpperCase().includes('GOOD') ? 'SELECTED' : 'NOT SELECTED')) : 'Not Called';

        allRegistrations.forEach(reg => {
            const phone = String(reg.phone || '').replace(/\D/g, '').slice(-10);
            
            const l1Match = l1Map.get(phone);
            const l2Match = l2Map.get(phone);
            const l3Match = l3Map.get(phone);

            let l1Result = 'Not Called';
            if (l1Match) l1Result = l1Match.status || 'ATTENDED';

            let l2Result = getL2L3Status(l2Match);
            let l3Result = getL2L3Status(l3Match);

            let overallStatus = 'Not Called For Trials';
            if (l1Result === 'ABSENT') {
                overallStatus = 'Absent - Level 1';
            } else if (l1Result === 'SELECTED' || l1Result === 'ATTENDED') {
                if (l3Match && l3Result === 'SELECTED') overallStatus = 'Selected - Level 3';
                else if (l3Match && l3Result !== 'SELECTED') overallStatus = 'Not Selected - Level 3';
                else if (l2Match && l2Result === 'SELECTED') overallStatus = 'Selected - Level 2 (Pending L3)';
                else if (l2Match && l2Result !== 'SELECTED') overallStatus = 'Not Selected - Level 2';
                else if (l1Result === 'SELECTED') overallStatus = 'Selected - Level 1 (Pending L2)';
                else overallStatus = 'Attended - Level 1 (Not Selected)';
            }

            consolidatedData.push({
                "Player Name": reg.full_name,
                "Mobile Number": reg.phone,
                "Email ID": reg.email,
                "State": reg.state,
                "City": reg.city,
                "Level 1 Status": l1Result,
                "Level 2 Status": l2Match ? l2Result : '--',
                "Level 3 Status": l3Match ? l3Result : '--',
                "Overall Progress": overallStatus,
                "L2 Score (if any)": l2Match ? l2Match.score : '',
                "L3 Score (if any)": l3Match ? l3Match.score : ''
            });

            // Mark as processed in our maps so we can catch unlinked static data if needed
            l1Map.delete(phone);
            l2Map.delete(phone);
            l3Map.delete(phone);
        });

        console.log('\n--- Adding Orphaned Static Records ---');
        // Add any players in static files that weren't linked to a DB registration
        const addOrphan = (phone, match, level) => {
            consolidatedData.push({
                "Player Name": match.name + ' [NO DB LINK]',
                "Mobile Number": phone,
                "Email ID": "Unknown",
                "State": match.state || "Unknown",
                "City": "Unknown",
                "Level 1 Status": level === 1 ? (match.status || 'ATTENDED') : 'Not Called',
                "Level 2 Status": level === 2 ? getL2L3Status(match) : '--',
                "Level 3 Status": level === 3 ? getL2L3Status(match) : '--',
                "Overall Progress": `Orphaned Record (Found in L${level})`,
                "L2 Score (if any)": level === 2 ? match.score : '',
                "L3 Score (if any)": level === 3 ? match.score : ''
            });
        };

        for (const [phone, match] of l1Map.entries()) addOrphan(phone, match, 1);
        for (const [phone, match] of l2Map.entries()) {
            if (!l1Map.has(phone)) addOrphan(phone, match, 2); // Avoid duplicates if already logged in L1 loop
        }
        for (const [phone, match] of l3Map.entries()) {
            if (!l1Map.has(phone) && !l2Map.has(phone)) addOrphan(phone, match, 3);
        }

        console.log(`Final Consolidated Count: ${consolidatedData.length}`);

        console.log('\n--- Generating Export ---');
        const newSheet = XLSX.utils.json_to_sheet(consolidatedData);
        
        // Auto-size columns slightly
        const wscols = Object.keys(consolidatedData[0]).map(w => ({wch: 20}));
        newSheet['!cols'] = wscols;

        const newWorkbook = XLSX.utils.book_new();
        XLSX.utils.book_append_sheet(newWorkbook, newSheet, 'Consolidated Trials');
        XLSX.writeFile(newWorkbook, outputFile);
        
        console.log(`Execution complete. Saved to: ${outputFile}`);

    } catch (error) {
        console.error('Generating report failed:', error);
    }
}

generateReport();
