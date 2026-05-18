# React Admin Dashboard with Supabase

A modern, feature-rich admin dashboard for managing player registrations with Supabase backend integration.

## ✨ Key Features

- 🔐 **Supabase Authentication** - Email/password login with session management
- 📊 **Interactive Dashboards** - Real-time charts and analytics with Recharts
- 📋 **Registration Management** - Complete CRUD interface for player registrations
- 📈 **Analytics & Reports** - Comprehensive reporting with filters and exports
- 🧪 **Diagnostics** - Built-in connection testing and troubleshooting
- 🎨 **Modern UI** - TailwindCSS with responsive design
- 🛡️ **Protected Routes** - Automatic route protection and redirects
- 📝 **Mock Data** - Built-in demo data for immediate testing
- ⚡ **Type Safe** - Full TypeScript support
- 🚀 **Fast** - Vite dev server with HMR

## 🚀 Quick Start

### Prerequisites
- Node.js 18+
- npm or yarn
- Supabase account

### Installation

```bash
# Install dependencies
npm install

# Start development server
npm run dev
```

App runs at `http://localhost:3000/`

## 📖 Setup Instructions

### Option 1: Quick Setup (Recommended) ⭐

1. Follow [`MANUAL_RPC_SETUP.md`](./MANUAL_RPC_SETUP.md) - Copy & paste SQL commands into Supabase
2. Done! Your dashboard will automatically display real data

### Option 2: Full Documentation

- [`SETUP_GUIDE.md`](./SETUP_GUIDE.md) - Complete setup reference
- [`SUPABASE_RPC_SETUP.md`](./SUPABASE_RPC_SETUP.md) - Technical details
- [`SUPABASE_AUTH_SETUP.md`](./SUPABASE_AUTH_SETUP.md) - Auth configuration

## 📁 Project Structure

```
src/
├── api/              # API clients and utilities
│   ├── client.ts        # Axios HTTP client
│   ├── index.ts         # API exports
│   └── rpcTest.ts       # RPC diagnostic utilities
├── components/       # React components
│   └── ProtectedRoute.tsx   # Route protection wrapper
├── hooks/            # Custom hooks
│   ├── useAuth.ts          # Authentication state
│   ├── useCounter.ts       # Example counter hook
│   ├── useRegistrations.ts # Player registrations data
│   ├── useDashboard.ts     # Dashboard statistics
│   └── index.ts            # Hook exports
├── layout/           # Layout components
│   └── AdminLayout.tsx     # Main admin layout with sidebar
├── lib/              # Config and utilities
│   ├── config.ts       # Environment config
│   ├── supabase.ts     # Supabase client
│   └── index.ts        # Exports
├── pages/            # Page components
│   ├── HomePage.tsx          # Public home page
│   ├── LoginPage.tsx         # Login/authentication
│   ├── DashboardPage.tsx     # Analytics dashboard
│   ├── RegistrationsPage.tsx # Registration management
│   ├── ReportsPage.tsx       # Reports interface
│   └── DiagnosticsPage.tsx   # Connection diagnostics
├── types/            # TypeScript definitions
│   └── index.ts         # Type exports
├── utils/            # Helper functions
│   ├── helpers.ts       # Utility functions
│   └── index.ts         # Exports
├── App.tsx           # Root component with routing
├── App.css           # Global app styles
├── main.tsx          # Entry point
├── index.css         # Global styles
└── vite-env.d.ts     # Vite environment types
```

## 🗺️ Routes

### Public Routes
- `/` - Home page
- `/login` - Login page (email/password)

### Protected Routes (requires login)
- `/dashboard` - Analytics and overview
- `/registrations` - Player registration management
- `/reports` - Reports and analytics
- `/diagnostics` - Connection testing and debugging

All protected routes automatically redirect to `/login` if not authenticated.

## 📊 Pages Overview

### Dashboard (`/dashboard`)
**Real-time analytics with 6 different visualizations:**
- 4 metric cards (Total, Paid, Unpaid, Trial registrations)
- Payment distribution pie chart
- State-wise distribution pie chart
- 30-day registration trend line chart
- Trial-wise distribution bar chart
- Mock data with yellow warning banner (until RPC setup complete)

### Registrations (`/registrations`)
**Complete player registration management:**
- 4 statistic cards (Total, Active, Inactive, Pending)
- Sortable table with all registration details
- Payment status badges (Paid/Unpaid)
- Registration status indicators
- View/Approve/Reject action buttons
- Refresh button to reload data
- Mock data support with fallback

### Reports (`/reports`)
**Analytics and reporting dashboard:**
- Multiple report type cards
- Status indicators (Completed/Processing/Failed)
- Filter dropdowns by date range and status
- Download/export functionality
- Statistics summary
- Expandable report details

### Diagnostics (`/diagnostics`)
**Connection testing and troubleshooting:**
- Test Supabase connection button
- Test RPC function button
- Full diagnostics runner
- Live data display
- Statistics summary
- Detailed test results
- Troubleshooting guide

## 🔐 Authentication

### Login Page
- Email and password fields
- Demo credentials info box
- Password visibility toggle
- Loading state with spinner
- Error messages display
- Auto-redirect to dashboard on success

### Default Demo Credentials
```
Email: demo@example.com
Password: password123
```

## 🎣 Custom Hooks

### useAuth()
Authentication and user session management.

```typescript
const { user, loading, isAuthenticated, logout } = useAuth()

// Returns:
// - user: User object with id, email, created_at
// - loading: boolean - auth check in progress
// - isAuthenticated: boolean - true if user has valid session
// - logout: () => Promise<void> - logout function
```

### useRegistrations()
Fetches player registrations from Supabase RPC.

```typescript
const { registrations, loading, error, isUsingMockData, refetch } = useRegistrations()

// Returns:
// - registrations: PlayerRegistration[] - array of registration objects
// - loading: boolean - fetch in progress
// - error: string | null - error message if any
// - isUsingMockData: boolean - true if using demo data (RPC failed)
// - refetch: () => void - manually refresh data
```

### useDashboard()
Calculates dashboard statistics from registrations.

```typescript
const { stats, loading, error, isUsingMockData, refetch } = useDashboard()

// Returns dashboard statistics:
// - stats: DashboardStats with totals, payment breakdown, state distribution, trends
// - loading: boolean
// - error: string | null
// - isUsingMockData: boolean
// - refetch: () => void
```

## 🔧 Configuration

### Environment Variables

Create `.env` file:

```env
VITE_API_URL=http://localhost:3001/api
VITE_SUPABASE_URL=https://fazpykekypcktcmniwbj.supabase.co
VITE_SUPABASE_ANON_KEY=your-supabase-anon-key
```

### Path Aliases

Import using `@` prefix:

```typescript
import { DashboardPage } from '@pages/DashboardPage'
import { useAuth, useRegistrations } from '@hooks'
import { formatDate, debounce } from '@utils/helpers'
import { supabase } from '@lib/supabase'
import type { PlayerRegistration } from '@types'
```

## 📦 Dependencies

| Package | Version | Purpose |
|---------|---------|---------|
| React | 18.x | UI library |
| Vite | 5.x | Build tool & dev server |
| TypeScript | 5.x | Type safety |
| React Router | 7.x | Client-side routing |
| TailwindCSS | 3.x | Styling framework |
| Supabase JS | 2.86.0 | Backend & auth client |
| Recharts | 2.x | Charts & visualizations |
| ESLint | 9.x | Code linting |

## 💻 Available Commands

```bash
# Development
npm run dev                  # Start dev server (port 3000)
npm run dev -- --port 3001  # Start on custom port

# Production
npm run build               # Build for production
npm run preview             # Preview production build

# Code Quality
npm run lint                # Run ESLint

# Database Setup
npm run setup               # Run RPC setup script (if created)
```

## 📊 Mock Data System

The app includes intelligent mock data fallback:

- **When Active**: If RPC function doesn't exist → Shows demo data
- **Visual Indicator**: Yellow warning banner says "Demo Data - RPC Not Connected"
- **Auto-Switching**: Automatically switches to real data when RPC is ready
- **No Manual Changes**: Banner disappears automatically, no code changes needed

### Mock Data Includes

- 8 sample player registrations
- Mix of paid/unpaid records
- Various US states
- Trial and non-trial registrations
- Payment records with amounts and dates

## 🧪 Testing & Diagnostics

### Using Diagnostics Page

Visit `http://localhost:3000/diagnostics` to:

1. **Test Supabase Connection**
   - Verifies credentials and connectivity
   - Shows response times

2. **Test RPC Function**
   - Tests `get_player_registrations()` function
   - Shows sample data if available
   - Helpful error messages if missing

3. **Full Diagnostics**
   - Runs all tests sequentially
   - Displays comprehensive report
   - Shows data statistics

### Troubleshooting Steps

1. Open Diagnostics page
2. Click "Full Diagnostics"
3. Check results:
   - ✅ Green = Working
   - ⚠️ Yellow = Warning (using mock data)
   - ❌ Red = Error (review message)
4. Review MANUAL_RPC_SETUP.md if RPC function missing

## 🚀 Deployment

### Build for Production

```bash
npm run build
```

Creates optimized `dist/` directory ready for deployment.

### Deploy to Vercel

```bash
npm install -g vercel
vercel
```

### Deploy to Netlify

1. Connect GitHub repository
2. Set build command: `npm run build`
3. Set publish directory: `dist`

## 🛠️ Database Setup

### Initial Setup (One Time)

Follow [`MANUAL_RPC_SETUP.md`](./MANUAL_RPC_SETUP.md) to:
1. Create database tables
2. Create RPC function
3. Insert sample data (optional)
4. Verify connection

Takes ~5 minutes with copy-paste SQL commands.

### Database Schema

**Tables Created:**
- `players` - Player information
- `trials` - Trial types
- `registrations` - Player registrations
- `payments` - Payment records

**RPC Function:**
- `get_player_registrations()` - Returns registration data with joins

See `SUPABASE_RPC_SETUP.md` for detailed schema.

## 🎯 Performance Tips

- Lazy load pages with React Router
- Recharts automatically optimizes large datasets
- Mock data reduces initial load time during setup
- Vite HMR speeds up development
- TypeScript catches errors at compile time

## 🐛 Troubleshooting

### App Shows Yellow "Demo Data" Banner

**Normal during setup!** To switch to real data:
1. Open [`MANUAL_RPC_SETUP.md`](./MANUAL_RPC_SETUP.md)
2. Copy and run SQL commands in Supabase SQL Editor
3. Wait 30 seconds
4. Refresh the app
5. Banner disappears automatically

### Login Not Working

- Verify `.env` has correct Supabase credentials
- Check user exists in Supabase Auth
- Verify email/password are correct
- Create new test user in Supabase dashboard

### Charts Show "No data available"

- Verify registrations table has data
- Check RPC function exists and works
- Use Diagnostics page to test connection
- Review browser console for errors

### CORS or Network Errors

- Verify `VITE_SUPABASE_URL` is correct
- Check Supabase project is active
- Verify API key permissions
- Check browser console for detailed error

### TypeScript Errors

```bash
npm install  # Reinstall dependencies
npm run build  # Check for build errors
```

## 📖 Documentation Files

| File | Purpose |
|------|---------|
| [`README.md`](./README.md) | This file |
| [`MANUAL_RPC_SETUP.md`](./MANUAL_RPC_SETUP.md) | Quick setup (copy-paste SQL) ⭐ |
| [`SETUP_GUIDE.md`](./SETUP_GUIDE.md) | Complete setup documentation |
| [`SUPABASE_RPC_SETUP.md`](./SUPABASE_RPC_SETUP.md) | Technical RPC reference |
| [`SUPABASE_AUTH_SETUP.md`](./SUPABASE_AUTH_SETUP.md) | Authentication setup |
| [`QUICKSTART.md`](./QUICKSTART.md) | Quick reference guide |

## 🔗 Useful Links

- [Supabase Dashboard](https://app.supabase.com)
- [Supabase Docs](https://supabase.com/docs)
- [React Documentation](https://react.dev)
- [Tailwind CSS](https://tailwindcss.com/docs)
- [Recharts](https://recharts.org/en-US)
- [React Router](https://reactrouter.com)

## 💡 Next Steps

1. ✅ Follow `MANUAL_RPC_SETUP.md` to enable real data
2. ✅ Visit Diagnostics page to verify connection
3. ✅ Explore Dashboard with real data
4. ✅ Add more registrations in Supabase
5. ✅ Customize charts and reports as needed
6. ✅ Deploy to production when ready

## 🤝 Support & Help

If you encounter issues:

1. **Check Diagnostics** - `/diagnostics` page has built-in testing
2. **Review Docs** - Check relevant documentation files
3. **Browser Console** - Look for error messages (F12 → Console)
4. **Supabase Logs** - Check Supabase dashboard for API errors
5. **Network Tab** - Verify requests are succeeding (F12 → Network)

## 📝 Tips & Tricks

- Use keyboard shortcut `Ctrl+K` or `Cmd+K` to search in Supabase dashboard
- Dashboard stats auto-update when you change registrations
- Click "Refresh" button to manually reload data
- Export reports to CSV (feature ready)
- Use mock data during development, real data for testing

## 📄 License

MIT

---

**Ready to get started?** Open [`MANUAL_RPC_SETUP.md`](./MANUAL_RPC_SETUP.md) and follow the 11 simple SQL copy-paste steps! 🚀

Last Updated: 2024
