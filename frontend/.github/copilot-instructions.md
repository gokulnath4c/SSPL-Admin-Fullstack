<!-- Use this file to provide workspace-specific custom instructions to Copilot. For more details, visit https://code.visualstudio.com/docs/copilot/copilot-customization#_use-a-githubcopilotinstructionsmd-file -->

## Project Setup Completed: React + Vite + TypeScript + TailwindCSS

### ✅ Setup Summary

- Vite React TypeScript project initialized
- TailwindCSS with PostCSS configured
- React Router for client-side routing
- Complete directory structure created under `src/`
- Path aliases configured for clean imports
- Environment variables setup with Supabase support
- All dependencies installed (253 packages)
- Project successfully builds without errors

### 📁 Directory Structure

```
src/
├── api/              # API client and endpoints
├── components/       # Reusable React components
├── hooks/            # Custom React hooks (useCounter example)
├── layout/           # Layout components (MainLayout)
├── lib/              # Config and shared libraries
├── pages/            # Page components (HomePage)
├── types/            # TypeScript type definitions
└── utils/            # Utility functions (helpers)
```

### 🚀 Available Commands

- `npm run dev` - Start development server (port 3000)
- `npm run build` - Build for production
- `npm run preview` - Preview production build
- `npm run lint` - Run ESLint

### 📝 Path Aliases

Import using `@` prefix:
```typescript
import { HomePage } from '@pages/HomePage'
import { useCounter } from '@hooks'
import { formatDate } from '@utils'
import { apiClient } from '@api'
import { config } from '@lib'
import type { User, Post } from '@types'
```

### 🔧 Configuration Files

- `vite.config.ts` - Vite configuration with path aliases
- `tsconfig.json` - TypeScript configuration
- `tailwind.config.js` - TailwindCSS configuration
- `postcss.config.js` - PostCSS configuration
- `.env.example` - Environment variables template

### 🌐 Environment Variables

Create `.env` file with:
```env
VITE_API_URL=http://localhost:3001/api
VITE_SUPABASE_URL=your-supabase-project-url
VITE_SUPABASE_KEY=your-supabase-anon-key
```

### 📦 Included Packages

- **React 18** - UI library
- **Vite 5** - Build tool and dev server
- **TypeScript** - Type safety
- **React Router 6** - Client-side routing
- **TailwindCSS 3** - Utility-first CSS
- **ESLint** - Code linting
- **Autoprefixer** - CSS vendor prefixes

### ✨ Next Steps

1. Copy `.env.example` to `.env` and add your Supabase credentials
2. Create React components in `src/components/`
3. Add new pages in `src/pages/`
4. Create API endpoints in `src/api/`
5. Add custom hooks in `src/hooks/`
6. Run `npm run dev` to start development

### 📝 Example Features Included

- **MainLayout** - Base layout component with header and outlet
- **HomePage** - Example page with TailwindCSS styling
- **useCounter** - Example custom hook
- **apiClient** - HTTP client for API calls
- **helpers.ts** - Utility functions (formatDate, capitalizeString, debounce)
- **config.ts** - Environment configuration

The project is ready for development!
