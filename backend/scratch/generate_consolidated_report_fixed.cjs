const XLSX = require('../../httpdocs/admin/react-app/node_modules/xlsx');
require('dotenv').config({ path: './.env.production' });
const supabase = require('../config/supabase.cjs');
const fs = require('fs');

const outputFile = 'C:/Users/ADMIN/Downloads/Consolidated_Trial_Report_Fixed.xlsx';

async function generateReport() {
    try {
        console.log('--- Loading Data Sources ---');
        const norm = (p) => String(p || '').replace(/\D/g, '').slice(-10);
        
        // 1. Load Level 1 Data
        const l1Raw = JSON.parse(fs.readFileSync('../httpdocs/public/Players_Data.json', 'utf8'));
        const l1Map = new Map();
        l1Raw.forEach(p => {
            const phone = norm(p.mobile);
            if (phone) l1Map.set(phone, p);
        });

        // 2. Load Level 2 Data
        const l2Raw = fs.readFileSync('../httpdocs/src/data/level2Data.ts', 'utf8');
        const eq2 = l2Raw.indexOf('=');
        const l2JsonStr = l2Raw.substring(l2Raw.indexOf('[', eq2), l2Raw.lastIndexOf(']') + 1);
        const l2Data = JSON.parse(l2JsonStr);
        const l2Map = new Map();
        l2Data.forEach(p => {
            const phone = norm(p.mobile);
            if (phone) l2Map.set(phone, p);
        });

        // 3. Load Level 3 Data
        const l3RawFile = fs.readFileSync('../httpdocs/src/data/level3Data.ts', 'utf8');
        const eq3 = l3RawFile.indexOf('=');
        const l3JsonStr = l3RawFile.substring(l3RawFile.indexOf('[', eq3), l3RawFile.lastIndexOf(']') + 1);
        const l3Data = JSON.parse(l3JsonStr);
        const l3Map = new Map();
        l3Data.forEach(p => {
            const phone = norm(p.mobile);
            if (phone) l3Map.set(phone, p);
        });

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
                .order('created_at', { ascending: false }) // Get newest first
                .range(page * PAGE_SIZE, (page * PAGE_SIZE) + PAGE_SIZE - 1);
            
            if (error) throw error;
            if (!data || data.length === 0) {
                hasMore = false;
            } else {
                allRegistrations = [...allRegistrations, ...data];
                page++;
            }
        }

        console.log(`Database Raw Records: ${allRegistrations.length}`);

        // Deduplicate database records by phone
        const uniqueRegistrations = new Map();
        allRegistrations.forEach(reg => {
            const phone = norm(reg.phone);
            if (phone && !uniqueRegistrations.has(phone)) {
                uniqueRegistrations.set(phone, reg);
            }
        });
        
        console.log(`Database Unique Records: ${uniqueRegistrations.size}`);

        console.log('\n--- Building Consolidated Report ---');
        const consolidatedData = [];

        // Helper to determine status
        const getL2L3Status = (match) => match ? (match.status || (match.remarks?.toUpperCase().includes('GOOD') ? 'SELECTED' : 'NOT SELECTED')) : 'Not Called';

        uniqueRegistrations.forEach((reg, phone) => {
            const l1Match = l1Map.get(phone);
            const l2Match = l2Map.get(phone);
            const l3Match = l3Map.get(phone);

            let l1Result = 'Not Called';
            if (l1Match) l1Result = l1Match.status || 'ATTENDED';
            if (l1Result === 'ABSENT' || (l1Match && l1Match.remarks === 'ABSENT')) l1Result = 'ABSENT';

            let l2Result = getL2L3Status(l2Match);
            let l3Result = getL2L3Status(l3Match);

            // --- Backfill Logic ---
            // If they are in Level 3, they definitively attended and were selected in L2 and L1.
            if (l3Match) {
                if (l2Result === 'Not Called' || l2Result === 'NOT SELECTED') l2Result = 'SELECTED (Auto-filled)';
                if (l1Result === 'Not Called' || l1Result === 'ABSENT') l1Result = 'SELECTED (Auto-filled)';
            } 
            // If they are in Level 2, they definitively attended and were selected in L1.
            else if (l2Match) {
                if (l1Result === 'Not Called' || l1Result === 'ABSENT') l1Result = 'SELECTED (Auto-filled)';
            }

            let overallStatus = 'Not Called For Trials';
            if (l1Result === 'ABSENT') {
                overallStatus = 'Absent - Level 1';
            } else if (l1Result.includes('SELECTED') || l1Result === 'ATTENDED') {
                if (l3Match && l3Result === 'SELECTED') overallStatus = 'Selected - Level 3';
                else if (l3Match && l3Result !== 'SELECTED') overallStatus = 'Not Selected - Level 3';
                else if (l2Match && l2Result.includes('SELECTED')) overallStatus = 'Selected - Level 2 (Pending L3)';
                else if (l2Match && !l2Result.includes('SELECTED')) overallStatus = 'Not Selected - Level 2';
                else if (l1Result.includes('SELECTED')) overallStatus = 'Selected - Level 1 (Pending L2)';
                else overallStatus = 'Attended - Level 1 (Not Selected)';
            }

            consolidatedData.push({
                "Player Name": reg.full_name,
                "Mobile Number": "'" + phone, // Prevent Excel from removing leading zeros
                "Email ID": reg.email,
                "State": reg.state,
                "City": reg.city,
                "Level 1 Status": l1Result,
                "Level 2 Status": l2Match ? l2Result : '--',
                "Level 3 Status": l3Match ? l3Result : '--',
                "Overall Progress": overallStatus,
                "L2 Score": l2Match ? l2Match.score : '',
                "L3 Score": l3Match ? l3Match.score : ''
            });

            // Mark as processed
            l1Map.delete(phone);
            l2Map.delete(phone);
            l3Map.delete(phone);
        });

        console.log('\n--- Adding Orphaned Static Records ---');
        // Add any players in static files that weren't linked to a DB registration
        const addOrphan = (phone, match, level) => {
            let l1Result = 'Not Called';
            if (level === 1) l1Result = match.status || 'ATTENDED';
            if (match.status === 'ABSENT' || match.remarks === 'ABSENT') l1Result = 'ABSENT';

            const l2Match = level === 2 ? match : l2Map.get(phone);
            const l3Match = level === 3 ? match : l3Map.get(phone);
            
            let l2Result = getL2L3Status(l2Match);
            let l3Result = getL2L3Status(l3Match);

            // --- Backfill Logic ---
            if (l3Match) {
                if (l2Result === 'Not Called' || l2Result === 'NOT SELECTED') l2Result = 'SELECTED (Auto-filled)';
                if (l1Result === 'Not Called' || l1Result === 'ABSENT') l1Result = 'SELECTED (Auto-filled)';
            } 
            else if (l2Match) {
                if (l1Result === 'Not Called' || l1Result === 'ABSENT') l1Result = 'SELECTED (Auto-filled)';
            }

            let overallStatus = `Orphaned Record (Found in L${level})`;
            if (l1Result === 'ABSENT') overallStatus = 'Absent - Level 1 (No DB Link)';
            else if (l1Result.includes('SELECTED') || l1Result === 'ATTENDED') {
                if (l3Match && l3Result === 'SELECTED') overallStatus = 'Selected - Level 3 (No DB Link)';
                else if (l3Match && l3Result !== 'SELECTED') overallStatus = 'Not Selected - Level 3 (No DB Link)';
                else if (l2Match && l2Result.includes('SELECTED')) overallStatus = 'Selected - Level 2 (Pending L3) (No DB Link)';
                else if (l2Match && !l2Result.includes('SELECTED')) overallStatus = 'Not Selected - Level 2 (No DB Link)';
                else if (l1Result.includes('SELECTED')) overallStatus = 'Selected - Level 1 (Pending L2) (No DB Link)';
            }

            consolidatedData.push({
                "Player Name": match.name,
                "Mobile Number": "'" + phone,
                "Email ID": "--",
                "State": match.state || "--",
                "City": "--",
                "Level 1 Status": l1Result,
                "Level 2 Status": l2Match ? l2Result : '--',
                "Level 3 Status": l3Match ? l3Result : '--',
                "Overall Progress": overallStatus,
                "L2 Score": l2Match ? l2Match.score : '',
                "L3 Score": l3Match ? l3Match.score : ''
            });
        };

        for (const [phone, match] of l1Map.entries()) addOrphan(phone, match, 1);
        for (const [phone, match] of l2Map.entries()) {
            if (!l1Map.has(phone)) addOrphan(phone, match, 2);
        }
        for (const [phone, match] of l3Map.entries()) {
            if (!l1Map.has(phone) && !l2Map.has(phone)) addOrphan(phone, match, 3);
        }

        console.log(`Final Consolidated Count: ${consolidatedData.length}`);
        console.log(`Not Called for Trials: ${consolidatedData.filter(d => d['Overall Progress'] === 'Not Called For Trials').length}`);

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
