#!/usr/bin/env node

/**
 * DIAGNOSTIC: Quick Status Check Script
 * Run this to see current app status
 * 
 * Usage: node diagnostic.js
 */

import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));

console.log('\n🔍 DASHBOARD STATUS CHECK\n');
console.log('=' .repeat(60));

// Check 1: Environment variables
console.log('\n✓ Environment Variables');
const envPath = path.join(__dirname, '.env');
if (fs.existsSync(envPath)) {
  const env = fs.readFileSync(envPath, 'utf-8');
  const hasUrl = env.includes('VITE_SUPABASE_URL');
  const hasKey = env.includes('VITE_SUPABASE_ANON_KEY');
  console.log(`  • Supabase URL: ${hasUrl ? '✅ Set' : '❌ Missing'}`);
  console.log(`  • Supabase Key: ${hasKey ? '✅ Set' : '❌ Missing'}`);
} else {
  console.log('  ⚠️  .env file not found');
}

// Check 2: Key files
console.log('\n✓ Project Files');
const keyFiles = [
  'src/hooks/useRegistrations.ts',
  'src/hooks/useDashboard.ts',
  'src/pages/DashboardPage.tsx',
  'src/pages/RegistrationsPage.tsx',
  'src/pages/DiagnosticsPage.tsx',
  'src/layout/AdminLayout.tsx',
];

keyFiles.forEach(file => {
  const exists = fs.existsSync(path.join(__dirname, file));
  console.log(`  • ${file}: ${exists ? '✅' : '❌'}`);
});

// Check 3: Dependencies
console.log('\n✓ Key Dependencies');
const packageJson = JSON.parse(fs.readFileSync(path.join(__dirname, 'package.json'), 'utf-8'));
const deps = {
  'react': 'React UI Library',
  'react-router-dom': 'Routing',
  '@supabase/supabase-js': 'Backend',
  'recharts': 'Charts',
  'tailwindcss': 'Styling',
};

Object.entries(deps).forEach(([pkg, desc]) => {
  const version = packageJson.dependencies[pkg] || packageJson.devDependencies?.[pkg];
  console.log(`  • ${pkg}: ${version ? `✅ ${version}` : '❌ Not installed'} (${desc})`);
});

// Check 4: Documentation
console.log('\n✓ Setup Documentation');
const docs = [
  ['MANUAL_RPC_SETUP.md', 'Quick SQL setup (recommended)'],
  ['SETUP_GUIDE.md', 'Complete setup reference'],
  ['SUPABASE_RPC_SETUP.md', 'Technical RPC details'],
];

docs.forEach(([file, desc]) => {
  const exists = fs.existsSync(path.join(__dirname, file));
  console.log(`  • ${file}: ${exists ? '✅' : '❌'} (${desc})`);
});

// Check 5: App Status
console.log('\n✓ App Status');
console.log('  • Development Server: http://localhost:3000');
console.log('  • Dashboard: http://localhost:3000/dashboard');
console.log('  • Registrations: http://localhost:3000/registrations');
console.log('  • Reports: http://localhost:3000/reports');
console.log('  • Diagnostics: http://localhost:3000/diagnostics');

// Summary
console.log('\n' + '='.repeat(60));
console.log('\n📋 NEXT STEPS:\n');
console.log('1. Start dev server:');
console.log('   npm run dev\n');
console.log('2. Open browser:');
console.log('   http://localhost:3000\n');
console.log('3. Setup RPC (one time):');
console.log('   → Open MANUAL_RPC_SETUP.md');
console.log('   → Copy SQL commands to Supabase SQL Editor');
console.log('   → Refresh browser\n');
console.log('4. Test connection:');
console.log('   → Visit /diagnostics page');
console.log('   → Click "Full Diagnostics"\n');
console.log('5. View dashboard:');
console.log('   → Login with demo@example.com / password123');
console.log('   → Explore Dashboard, Registrations, Reports\n');

console.log('=' .repeat(60));
console.log('\n✨ Ready to build! Follow the steps above.\n');
