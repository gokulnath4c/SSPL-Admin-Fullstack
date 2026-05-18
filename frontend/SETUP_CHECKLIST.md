📋 SETUP CHECKLIST - Admin Dashboard

═══════════════════════════════════════════════════════════════════════════

🎯 QUICK START (Do This First!)
─────────────────────────────────────────────────────────────────────────

SECTION 1: VERIFY INSTALLATION
   ☐ npm packages installed (npm install)
   ☐ .env file exists with Supabase credentials
   ☐ Browser at http://localhost:3000
   
SECTION 2: QUICK DEMO
   ☐ Start dev server: npm run dev
   ☐ Visit /login page
   ☐ Login with:
     • Email: demo@example.com
     • Password: password123
   ☐ See Dashboard with yellow "Demo Data" banner
   ☐ Explore: Registrations, Reports, Diagnostics pages

SECTION 3: TEST CONNECTION
   ☐ Visit /diagnostics page
   ☐ Click "Test Supabase Connection"
   ☐ Should show ✅ Connection successful
   ☐ Click "Test RPC Function"
   ☐ Should show ⚠️ or ❌ (normal if not setup yet)

═══════════════════════════════════════════════════════════════════════════

🔧 DATABASE SETUP (One Time Only!)
─────────────────────────────────────────────────────────────────────────

SECTION 4: PREPARE FOR SETUP
   ☐ Open file: MANUAL_RPC_SETUP.md
   ☐ Read the instructions (takes 2 minutes)
   ☐ Have Supabase dashboard open in another tab
   ☐ Know your project name: fazpykekypcktcmniwbj

SECTION 5: CREATE TABLES
   Go to https://app.supabase.com → Select Project → SQL Editor
   
   ☐ Execute SQL Block #1 (CREATE TABLE players)
     • Copy entire SQL from MANUAL_RPC_SETUP.md
     • Paste into SQL Editor
     • Click "RUN"
     • Wait for "Query executed successfully" message
   
   ☐ Execute SQL Block #2 (CREATE TABLE trials)
   ☐ Execute SQL Block #3 (CREATE TABLE registrations)
   ☐ Execute SQL Block #4 (CREATE TABLE payments)

SECTION 6: CREATE RPC FUNCTION
   ☐ Execute SQL Block #5 (CREATE FUNCTION get_player_registrations)
     • This is the most important one!
     • Copy all lines carefully
     • Click RUN
     • Wait for success message

SECTION 7: INSERT SAMPLE DATA (Optional but Recommended)
   ☐ Execute SQL Block #6 (INSERT trials)
   ☐ Execute SQL Block #7 (INSERT players)
   ☐ Execute SQL Block #8 (INSERT registrations)
   ☐ Execute SQL Block #9 (INSERT payments)

SECTION 8: VERIFY SETUP
   ☐ Execute SQL Block #10 (SELECT * FROM get_player_registrations())
     • Should show 8 rows of data
     • Should show columns: name, email, phone, state, trial_name, etc.
   
   ☐ Execute SQL Block #11 (SELECT COUNT(*) FROM registrations)
     • Should show: count = 8

═══════════════════════════════════════════════════════════════════════════

✅ POST-SETUP VERIFICATION
─────────────────────────────────────────────────────────────────────────

SECTION 9: REFRESH APP
   ☐ Go back to React app browser tab
   ☐ Press F5 to refresh
   ☐ Login again if needed (demo@example.com / password123)

SECTION 10: VERIFY DATA
   ☐ Dashboard shows real data (no yellow banner)
   ☐ Dashboard charts populate with real numbers
   ☐ Registrations table shows 8 records
   ☐ Reports page shows real statistics
   ☐ All numbers make sense

SECTION 11: RUN DIAGNOSTICS
   ☐ Visit /diagnostics page
   ☐ Click "Full Diagnostics"
   ☐ Should show all ✅ green checkmarks
   ☐ Should display real data in table

═══════════════════════════════════════════════════════════════════════════

🚀 APP DEPLOYMENT CHECKLIST
─────────────────────────────────────────────────────────────────────────

SECTION 12: BUILD & TEST
   ☐ Stop dev server (Ctrl+C)
   ☐ Run: npm run build
   ☐ Wait for "dist/" folder to be created
   ☐ Run: npm run preview
   ☐ Visit http://localhost:5173
   ☐ Test login and dashboard with production build
   ☐ Verify all data appears correctly
   ☐ Stop preview server (Ctrl+C)

SECTION 13: PRE-DEPLOYMENT
   ☐ Run: npm run lint
   ☐ Fix any reported issues
   ☐ Verify .env has correct Supabase URLs
   ☐ Test on different browsers (Chrome, Firefox, Safari)
   ☐ Test on mobile device (use phone browser)
   ☐ Check all forms work correctly
   ☐ Verify logout redirects to login

SECTION 14: DEPLOY
   Choose one option:
   
   Option A - Vercel (Recommended)
   ☐ Create account on vercel.com
   ☐ Run: npm install -g vercel
   ☐ Run: vercel
   ☐ Follow prompts
   ☐ Set environment variables in Vercel dashboard
   ☐ Deployment complete!
   
   Option B - Netlify
   ☐ Connect GitHub repo to netlify.com
   ☐ Set Build command: npm run build
   ☐ Set Publish directory: dist
   ☐ Set environment variables
   ☐ Deploy
   
   Option C - Docker / Custom Server
   ☐ Build: npm run build
   ☐ Serve dist/ folder
   ☐ Set environment variables
   ☐ Deploy to your server

═══════════════════════════════════════════════════════════════════════════

🆘 TROUBLESHOOTING CHECKLIST
─────────────────────────────────────────────────────────────────────────

IF: "Demo Data" banner still shows after setup
   ☐ Check RPC function was created successfully
   ☐ Verify RPC function name is exactly: get_player_registrations
   ☐ Test RPC in Supabase SQL Editor:
     SELECT * FROM get_player_registrations();
   ☐ Should show 8 rows
   ☐ Check browser console (F12) for error messages

IF: Login doesn't work
   ☐ Verify .env has correct VITE_SUPABASE_URL
   ☐ Verify .env has correct VITE_SUPABASE_ANON_KEY
   ☐ Check user demo@example.com exists in Supabase Auth
   ☐ Try creating a new user in Supabase dashboard
   ☐ Check browser console for error details

IF: Charts show "No data available"
   ☐ Check registrations table has data:
     SELECT COUNT(*) FROM registrations;
   ☐ Verify RPC function returns data:
     SELECT * FROM get_player_registrations();
   ☐ Check browser console for errors
   ☐ Visit /diagnostics and run full diagnostics

IF: Build fails
   ☐ Run: npm install (reinstall all packages)
   ☐ Delete node_modules: rm -r node_modules
   ☐ Clear npm cache: npm cache clean --force
   ☐ Reinstall: npm install
   ☐ Try build again: npm run build

IF: App won't start (npm run dev fails)
   ☐ Check Node version: node --version (should be 18+)
   ☐ Kill any existing processes: npm run dev fails
   ☐ Check port 3000 is available
   ☐ Try different port: npm run dev -- --port 3001
   ☐ Check for error messages in terminal

═══════════════════════════════════════════════════════════════════════════

📚 DOCUMENTATION REFERENCE
─────────────────────────────────────────────────────────────────────────

When you need help, refer to:

File: README.md
   • Complete project overview
   • All features explained
   • Deployment options
   • Troubleshooting guide

File: MANUAL_RPC_SETUP.md ⭐ START HERE
   • Step-by-step SQL instructions
   • 11 copy-paste SQL blocks
   • Verification queries
   • Exactly what to do

File: PROJECT_STATUS.md
   • Current completion status
   • All features listed
   • Quick reference guide
   • Next steps outlined

File: SETUP_GUIDE.md
   • Detailed configuration guide
   • Environment setup
   • Database schema
   • Advanced topics

File: SUPABASE_RPC_SETUP.md
   • Technical reference
   • SQL details
   • Performance tips
   • Best practices

═══════════════════════════════════════════════════════════════════════════

⏱️ TIME ESTIMATES
─────────────────────────────────────────────────────────────────────────

Initial Setup (First Time)
   • Installation: 2 minutes
   • Dev server startup: 2 minutes
   • Demo exploration: 5 minutes
   • Database setup (MANUAL_RPC_SETUP.md): 5 minutes
   • Verification: 3 minutes
   TOTAL: ~17 minutes

Re-running Application (Subsequent Times)
   • Start dev server: 2 minutes
   • Login: 1 minute
   • Work with app: unlimited
   TOTAL: 3 minutes startup

Deployment
   • Build: 1 minute
   • Preview: 2 minutes
   • Deploy to Vercel/Netlify: 5-10 minutes
   TOTAL: 10-15 minutes

═══════════════════════════════════════════════════════════════════════════

📝 NOTES & REMINDERS
─────────────────────────────────────────────────────────────────────────

✓ Keep dev server running while developing (npm run dev)
✓ Browser auto-refreshes when you change code
✓ All SQL in MANUAL_RPC_SETUP.md is ready to copy-paste
✓ Mock data works without database setup for UI testing
✓ Use /diagnostics page to test connections anytime
✓ Save .env file - don't commit to Git!
✓ Logout with button in top right corner
✓ Use Ctrl+Shift+I to open browser DevTools
✓ Check console (F12 → Console tab) for errors
✓ Clear browser cache if page looks wrong (Ctrl+Shift+Delete)

═══════════════════════════════════════════════════════════════════════════

✨ CURRENT STATUS
─────────────────────────────────────────────────────────────────────────

App Status: ✅ READY TO USE
   • All code written and tested
   • All components built
   • Charts working
   • Authentication ready
   • Mock data system active
   
Database Status: ⏳ NEEDS ONE-TIME SETUP
   • Follow MANUAL_RPC_SETUP.md
   • Takes ~5 minutes
   • 11 simple SQL copy-paste commands
   • No complex configuration needed

Deployment: 🚀 READY TO DEPLOY
   • Build works without errors
   • Vercel/Netlify deployment ready
   • Docker-ready
   • Scalable architecture

═══════════════════════════════════════════════════════════════════════════

🎉 YOU'RE ALL SET!

Next Step: Follow MANUAL_RPC_SETUP.md to complete database setup

Questions? Check the documentation or visit /diagnostics for testing tools

═══════════════════════════════════════════════════════════════════════════
