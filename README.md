# SSPL Admin Panel (Fullstack)

This repository contains the complete fullstack codebase for the SSPL Admin Panel.

## Repository Structure

- `/frontend`: React & Vite Single Page Application (SPA). Built with TypeScript, Tailwind CSS, Supabase Client, and Razorpay Sync.
- `/backend`: Node.js & Express server handling database sync, Razorpay transactions, Excel exports, and webhook processing.

## Running Locally

### Prerequisites
Make sure Node.js (v18+) is installed.

### 1. Start Backend
```bash
cd backend
npm install
npm start
```
The backend server runs on `http://localhost:3003`.

### 2. Start Frontend
```bash
cd frontend
npm install
npm run dev
```
The frontend application will be accessible at `http://localhost:5173`.

## Deployment

### Frontend (Netlify)
- **Base directory**: `frontend`
- **Build command**: `npm run build`
- **Publish directory**: `frontend/dist`

### Backend (Render / Railway / Heroku / VPS)
- **Base directory**: `backend`
- **Start command**: `npm start`
