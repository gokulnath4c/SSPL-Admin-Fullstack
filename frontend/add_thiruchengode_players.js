import fs from 'fs';

const playersPath = 'd:/ssplt10.cloud-prod-sync-20251006/httpdocs/admin/react-app/src/Players_Data.json';

const newPlayers = [
    { mobile: "7871108342", name: "KARTHIKEYAN", proficiency: "AR", status: "NOT SELECTED", state: "" },
    { mobile: "8300186960", name: "Deepakraj.p", proficiency: "BATSMAN", status: "NOT SELECTED", state: "" },
    { mobile: "8248136930", name: "Ramamoorthy", proficiency: "BATSMAN", status: "NOT SELECTED", state: "" },
    { mobile: "7904829060", name: "SUBASH CHANDRA", proficiency: "AR", status: "NOT SELECTED", state: "" },
    { mobile: "8610210636", name: "R.Raghu", proficiency: "AR", status: "NOT SELECTED", state: "" },
    { mobile: "9363694844", name: "Nitheen", proficiency: "AR", status: "SELECTED", state: "" },
    { mobile: "9043489767", name: "Jayasurya", proficiency: "BATSMAN", status: "SELECTED", state: "" },
    { mobile: "8825951169", name: "BHARANIDHARAN", proficiency: "AR", status: "SELECTED", state: "" },
    { mobile: "9940810684", name: "KURALARASAN", proficiency: "AR", status: "SELECTED", state: "" },
    { mobile: "8220808018", name: "Munavardhin", proficiency: "AR", status: "NOT SELECTED", state: "" },
    { mobile: "8508423356", name: "ASWIN", proficiency: "AR", status: "NOT SELECTED", state: "" },
    { mobile: "8124204723", name: "Dharuman", proficiency: "AR", status: "SELECTED", state: "" },
    { mobile: "8667053828", name: "Venkatesan T", proficiency: "AR", status: "SELECTED", state: "" },
    { mobile: "8838630892", name: "KESAVAN", proficiency: "AR", status: "NOT SELECTED", state: "" },
    { mobile: "7094210220", name: "Ramesh T", proficiency: "AR", status: "SELECTED", state: "" },
    { mobile: "9500898207", name: "Yuvaraj.s", proficiency: "BATSMAN", status: "SELECTED", state: "" },
    { mobile: "7598943440", name: "SARAVANA BALAJI", proficiency: "AR", status: "NOT SELECTED", state: "" },
    { mobile: "9361172921", name: "KARTHICK RAJA.P", proficiency: "AR", status: "SELECTED", state: "" },
    { mobile: "9952285020", name: "DARSHAN", proficiency: "BATSMAN", status: "NOT SELECTED", state: "" },
    { mobile: "8220682567", name: "SIVANESAN", proficiency: "AR", status: "NOT SELECTED", state: "" },
    { mobile: "9042911722", name: "BOOBESH", proficiency: "AR", status: "SELECTED", state: "" },
    { mobile: "9994967465", name: "RAGHUPATHI.G", proficiency: "BATSMAN", status: "NOT SELECTED", state: "" },
    { mobile: "9976249398", name: "KARTHICK RAMAN", proficiency: "AR", status: "NOT SELECTED", state: "" },
    { mobile: "8428817773", name: "KARTHIKEYAN R", proficiency: "AR", status: "NOT SELECTED", state: "" },
    { mobile: "9486071812", name: "BHARATH KUMAR", proficiency: "AR", status: "SELECTED", state: "" },
    { mobile: "7548879836", name: "SOUNDARRAJAN", proficiency: "AR", status: "NOT SELECTED", state: "" },
    { mobile: "6369978275", name: "N. KARTHIK", proficiency: "AR", status: "SELECTED", state: "" },
    { mobile: "7845466383", name: "R. GOPIKANNAN", proficiency: "AR", status: "SELECTED", state: "" },
    { mobile: "8667437850", name: "NAGARAJ", proficiency: "BOWLER", status: "NOT SELECTED", state: "" },
    { mobile: "9047443407", name: "ASARUDEEN", proficiency: "AR", status: "NOT SELECTED", state: "" },
    { mobile: "9344484667", name: "JABAR SATHIK", proficiency: "AR", status: "NOT SELECTED", state: "" },
    { mobile: "8760654847", name: "SELVAARASU", proficiency: "AR", status: "NOT SELECTED", state: "" },
    { mobile: "8220815261", name: "RATHISH", proficiency: "AR", status: "NOT SELECTED", state: "" },
    { mobile: "7695955274", name: "MUJEEB", proficiency: "AR", status: "NOT SELECTED", state: "" },
    { mobile: "9384123181", name: "SATHISH", proficiency: "BATSMAN", status: "NOT SELECTED", state: "" },
    { mobile: "9159882400", name: "BALAJI KARUPPIAH", proficiency: "BOWLER", status: "SELECTED", state: "" },
    { mobile: "7708133742", name: "VIMAL .M", proficiency: "AR", status: "SELECTED", state: "" },
    { mobile: "7904077439", name: "SANJAY AADHITHIYAA", proficiency: "AR", status: "NOT SELECTED", state: "" }
];

try {
    console.log('Reading file from:', playersPath);
    const data = fs.readFileSync(playersPath, 'utf8');
    const players = JSON.parse(data);
    console.log('Original player count:', players.length);

    const existingMobiles = new Set(players.map(p => p.mobile));
    let addedCount = 0;
    let updatedCount = 0;

    newPlayers.forEach((np) => {
        if (!existingMobiles.has(np.mobile)) {
            players.push(np);
            addedCount++;
        } else {
            const index = players.findIndex(p => p.mobile === np.mobile);
            if (index > -1) {
                players[index] = { ...players[index], ...np };
                updatedCount++;
            }
        }
    });

    fs.writeFileSync(playersPath, JSON.stringify(players, null, 2), 'utf8');
    console.log(`Successfully processed. Added: ${addedCount}, Updated: ${updatedCount}. Total players: ${players.length}`);

} catch (err) {
    console.error('Error updating players data:', err);
}
