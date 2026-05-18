import React, { useState, useMemo } from 'react';
import { 
  CheckCircle2, AlertCircle, RefreshCw, Upload, Download, 
  Search, Filter, ChevronRight, UserPlus, ShieldCheck, X
} from 'lucide-react';
import { supabase } from '../lib/supabase';
import stagingData from '../data/registration_import_staging.json';

interface StagingRecord {
  full_name: string;
  phone: string;
  email: string;
  city: string;
  state: string;
  position: string;
  payment_status: string;
  status: string;
  import_batch: string;
  import_date: string;
}

interface DBStatus {
  exists: boolean;
  registration_id?: string;
  match_type?: 'perfect' | 'phone_only' | 'name_only' | 'none';
  current_status?: string;
}

const ImportVerificationTab: React.FC = () => {
  const [dbResults, setDbResults] = useState<Record<string, DBStatus>>({});
  const [checking, setChecking] = useState(false);
  const [syncing, setSyncing] = useState(false);
  const [filter, setFilter] = useState<'all' | 'new' | 'duplicate' | 'conflict'>('all');
  const [search, setSearch] = useState('');
  const [selectedPhones, setSelectedPhones] = useState<Set<string>>(new Set());

  // Comparison logic
  const checkDatabaseStatus = async () => {
    setChecking(true);
    const results: Record<string, DBStatus> = {};
    
    // Normalization helper
    const normalizePhone = (p: any) => {
      if (!p) return '';
      const s = String(p).replace(/[^0-9]/g, '');
      return s.length > 10 ? s.slice(-10) : s;
    };

    try {
      // Fetch registrations WITH workflow and trials info
      const { data: existingPlayers, error } = await supabase
        .from('player_registrations')
        .select(`
          id, 
          full_name, 
          phone, 
          status,
          player_workflow (
            workflow_id,
            trials_allocations (
              attendance_status,
              selection_status
            )
          )
        `);

      if (error) throw error;

      const phoneMap = new Map();
      const nameMap = new Map();
      
      existingPlayers?.forEach((p: any) => {
        const normPhone = normalizePhone(p.phone);
        if (normPhone) phoneMap.set(normPhone, p);
        
        const normName = p.full_name?.toLowerCase().trim();
        if (normName) nameMap.set(normName, p);
      });

      stagingData.forEach((record: any) => {
        const phone = normalizePhone(record.phone);
        const name = record.full_name?.toLowerCase().trim();
        
        const byPhone = phoneMap.get(phone);
        const byName = nameMap.get(name);

        const matched = byPhone || byName;

        if (matched) {
          const wf = matched.player_workflow?.[0];
          const tr = wf?.trials_allocations?.[0];
          
          let statusText = matched.status || 'Registered';
          if (tr?.selection_status && tr.selection_status !== 'pending') {
            statusText = `Trial: ${tr.selection_status.toUpperCase()}`;
          } else if (tr?.attendance_status && tr.attendance_status !== 'pending') {
            statusText = `Trial: ${tr.attendance_status.toUpperCase()}`;
          } else if (wf) {
            statusText = 'In Workflow';
          }

          results[record.phone] = { 
            exists: true, 
            registration_id: matched.id, 
            match_type: (byPhone && byName && byPhone.id === byName.id) ? 'perfect' : (byPhone ? 'phone_only' : 'name_only'), 
            current_status: statusText 
          };
        } else {
          results[record.phone] = { exists: false, match_type: 'none' };
        }
      });

      setDbResults(results);
    } catch (err) {
      console.error('Check failed:', err);
      alert('Failed to check database status');
    } finally {
      setChecking(false);
    }
  };

  const filteredData = useMemo(() => {
    return (stagingData as StagingRecord[]).filter(record => {
      const status = dbResults[record.phone];
      const matchesSearch = record.full_name.toLowerCase().includes(search.toLowerCase()) || 
                            record.phone.includes(search);
      
      if (!matchesSearch) return false;
      if (filter === 'all') return true;
      if (filter === 'new') return status?.exists === false;
      if (filter === 'duplicate') return status?.match_type === 'perfect';
      if (filter === 'conflict') return status?.match_type === 'phone_only' || status?.match_type === 'name_only';
      return true;
    });
  }, [dbResults, filter, search]);

  const handleSyncSelected = async () => {
    if (selectedPhones.size === 0) return;
    
    const toSync = stagingData.filter((r: any) => selectedPhones.has(r.phone.toString()));
    const confirmSync = window.confirm(`Ready to sync ${toSync.length} NEW players to the live database. No existing records will be modified. Proceed?`);
    
    if (!confirmSync) return;

    setSyncing(true);
    try {
      let successCount = 0;
      let errorCount = 0;

      // Sync one by one for safety and progress
      for (const record of toSync) {
        // Double check no-overwrite
        const { data: check } = await supabase
          .from('player_registrations')
          .select('id')
          .eq('phone', record.phone)
          .single();

        if (check) {
          console.warn(`Skipping duplicate: ${record.phone}`);
          continue;
        }

        // 1. Insert into registrations
        const { data: newReg, error: regError } = await supabase
          .from('player_registrations')
          .insert({
            full_name: record.full_name,
            phone: record.phone,
            email: record.email,
            city: record.city,
            state: record.state,
            position: record.position,
            payment_status: record.payment_status,
            status: record.status,
            date_of_birth: record.date_of_birth
          })
          .select()
          .single();

        if (regError) {
          errorCount++;
          continue;
        }

        // 2. Insert into workflow stage
        const { error: wfError } = await supabase
          .from('player_workflow')
          .insert({
            registration_id: newReg.id,
            workflow_stage: 'registration',
            updated_by: 'system_import'
          });

        if (wfError) {
          console.error('Workflow insert failed for', newReg.id);
        }

        successCount++;
      }

      alert(`Sync Complete!\nSuccessfully Imported: ${successCount}\nSkipped/Errors: ${errorCount}`);
      setSelectedPhones(new Set());
      checkDatabaseStatus(); // Refresh status
    } catch (err) {
      console.error('Sync failed:', err);
      alert('An error occurred during sync');
    } finally {
      setSyncing(false);
    }
  };

  const toggleSelect = (phone: string) => {
    const newSet = new Set(selectedPhones);
    if (newSet.has(phone)) newSet.delete(phone);
    else newSet.add(phone);
    setSelectedPhones(newSet);
  };

  const selectAllNew = () => {
    const newPhones = filteredData
      .filter(r => dbResults[r.phone]?.exists === false)
      .map(r => r.phone);
    setSelectedPhones(new Set(newPhones));
  };

  return (
    <div className="space-y-6">
      {/* Action Header */}
      <div className="bg-white p-6 rounded-xl shadow-sm border border-slate-100 flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
        <div>
          <h2 className="text-xl font-bold text-slate-900">Registration Import Hall</h2>
          <p className="text-sm text-slate-500 mt-1">
            Comparing **{stagingData.length}** staged Excel records with live database.
          </p>
        </div>
        
        <div className="flex gap-2">
          <button 
            onClick={checkDatabaseStatus}
            disabled={checking}
            className="flex items-center gap-2 px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-lg font-medium transition-colors disabled:opacity-50"
          >
            <RefreshCw className={`w-4 h-4 ${checking ? 'animate-spin' : ''}`} />
            Check DB Status
          </button>
          
          <button 
            onClick={handleSyncSelected}
            disabled={syncing || selectedPhones.size === 0}
            className="flex items-center gap-2 px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg font-medium shadow-sm transition-all disabled:opacity-50 disabled:bg-slate-300"
          >
            <ShieldCheck className="w-4 h-4" />
            Sync Selected ({selectedPhones.size})
          </button>
        </div>
      </div>

      <div className="bg-white rounded-xl shadow-sm border border-slate-100 overflow-hidden">
        {/* Filters */}
        <div className="p-4 border-b border-slate-100 bg-slate-50/50 flex flex-wrap items-center justify-between gap-4">
          <div className="flex items-center gap-2">
            <div className="relative">
              <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
              <input 
                type="text" 
                placeholder="Search phone or name..." 
                className="pl-9 pr-4 py-2 border border-slate-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500/20"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
              />
            </div>
            
            <div className="flex bg-white border border-slate-200 rounded-lg p-1">
              {(['all', 'new', 'duplicate', 'conflict'] as const).map(f => (
                <button
                  key={f}
                  onClick={() => setFilter(f)}
                  className={`px-3 py-1 text-xs font-medium rounded-md capitalize transition-colors ${
                    filter === f ? 'bg-blue-50 text-blue-600' : 'text-slate-500 hover:text-slate-700'
                  }`}
                >
                  {f}
                </button>
              ))}
            </div>
          </div>
          
          <button 
            onClick={selectAllNew}
            className="text-xs font-semibold text-blue-600 hover:text-blue-700"
          >
            Select All New
          </button>
        </div>

        {/* Table */}
        <div className="overflow-x-auto max-h-[600px]">
          <table className="w-full text-left text-sm">
            <thead className="bg-slate-50 text-slate-500 font-medium sticky top-0 z-10">
              <tr>
                <th className="px-6 py-3 w-10"></th>
                <th className="px-6 py-3">Player Details</th>
                <th className="px-6 py-3">Staged Data</th>
                <th className="px-6 py-3">DB Status</th>
                <th className="px-6 py-3">Source</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {filteredData.length > 0 ? filteredData.map((record, idx) => {
                const status = dbResults[record.phone];
                const isNew = status?.exists === false;
                const isDuplicate = status?.match_type === 'perfect';
                const isConflict = status?.match_type === 'phone_only' || status?.match_type === 'name_only';

                return (
                  <tr key={`${record.phone}-${idx}`} className="hover:bg-slate-50/50 transition-colors">
                    <td className="px-6 py-4">
                      {isNew ? (
                        <input 
                          type="checkbox" 
                          className="w-4 h-4 rounded border-slate-300 text-blue-600 focus:ring-blue-500"
                          checked={selectedPhones.has(record.phone)}
                          onChange={() => toggleSelect(record.phone)}
                        />
                      ) : (
                        <X className="w-4 h-4 text-slate-300" />
                      )}
                    </td>
                    <td className="px-6 py-4">
                      <div className="font-semibold text-slate-900">{record.full_name}</div>
                      <div className="text-slate-500 text-xs">{record.phone}</div>
                    </td>
                    <td className="px-6 py-4">
                      <div className="text-slate-600">{record.city}, {record.state}</div>
                      <div className="text-slate-400 text-xs">{record.position}</div>
                    </td>
                    <td className="px-6 py-4">
                      {Object.keys(dbResults).length === 0 ? (
                        <span className="text-slate-400 text-xs italic">Not checked yet</span>
                      ) : (
                        <div className="flex flex-col gap-1">
                          {isNew && (
                            <span className="inline-flex items-center gap-1 text-green-600 bg-green-50 px-2 py-0.5 rounded text-[10px] font-bold uppercase tracking-wider w-fit">
                              <UserPlus className="w-3 h-3" /> New
                            </span>
                          )}
                          {isDuplicate && (
                            <span className="inline-flex items-center gap-1 text-slate-500 bg-slate-100 px-2 py-0.5 rounded text-[10px] font-bold uppercase tracking-wider w-fit">
                              <CheckCircle2 className="w-3 h-3" /> Duplicate
                            </span>
                          )}
                          {isConflict && (
                            <span className="inline-flex items-center gap-1 text-amber-600 bg-amber-50 px-2 py-0.5 rounded text-[10px] font-bold uppercase tracking-wider w-fit">
                              <AlertCircle className="w-3 h-3" /> Conflict
                            </span>
                          )}
                          {status?.current_status && (
                            <div className="text-[10px] text-slate-400">Current Status: {status.current_status}</div>
                          )}
                        </div>
                      )}
                    </td>
                    <td className="px-6 py-4">
                      <div className="text-[10px] bg-slate-100 px-2 py-1 rounded max-w-[150px] truncate text-slate-500" title={record.import_batch}>
                        {record.import_batch}
                      </div>
                    </td>
                  </tr>
                );
              }) : (
                <tr>
                  <td colSpan={5} className="px-6 py-12 text-center text-slate-400">
                    No records matching your search/filters
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Logic Note */}
      <div className="p-4 bg-blue-50 border border-blue-100 rounded-xl flex gap-3 items-start">
        <AlertCircle className="w-5 h-5 text-blue-600 shrink-0 mt-0.5" />
        <div className="text-sm text-blue-800">
          <p className="font-semibold">Safe Sync Policy</p>
          <p className="mt-1 opacity-90">
            The sync system will **never** overwrite existing data. It only processes players who are verified as "New" (no phone match in DB). Existing records and their selection statuses remain 100% protected.
          </p>
        </div>
      </div>
    </div>
  );
};

export default ImportVerificationTab;
