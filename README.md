# SysDesign Simulator

Interactive system design simulator (React + Vite) with an optional **Phase 2** Node.js API for saving and sharing designs (MongoDB + Google OAuth + JWT).

## Features

- Drag-and-drop canvas (**React Flow**), 8 component types, templates, simulation engine
- **Accounts (Phase 2):** Google sign-in, save/load designs, public share URLs, fork public designs
- Metrics: health, latency, throughput, error rate, suggestions, latency chart

## Repo layout

```text
.
├── frontend/          # Vite + React SPA
├── backend/           # Express + MongoDB + Passport (Google) + JWT
├── package.json       # npm workspaces + dev scripts
└── README.md
```

## Prerequisites

- Node.js 18+
- npm
- **[MongoDB Atlas](https://www.mongodb.com/atlas)** (or any MongoDB URI) — set `MONGODB_URI` in `backend/.env`. There is no bundled local database.
- Google OAuth client (for sign-in): create credentials in [Google Cloud Console](https://console.cloud.google.com/apis/credentials) with authorized redirect URI  
  `http://localhost:4000/api/auth/google/callback` (match `GOOGLE_CALLBACK_URL` in `backend/.env`)

## Install

```bash
npm install
```

## Development

From the **repository root** (where this `package.json` lives):

**Frontend + backend together** (one command):

```bash
npm run dev
```

This runs Vite and the API in parallel (`concurrently`).  
- **SPA:** `http://localhost:5173` — Vite proxies `/api/*` → `http://localhost:4000`  
- **API:** `http://localhost:4000`

**Frontend only**

```bash
npm run dev:frontend
```

**Backend only**

```bash
npm run dev:backend
```

### Backend environment

Copy `backend/.env.example` to `backend/.env` and fill in `MONGODB_URI`, `JWT_SECRET`, and Google OAuth variables.

## Build & lint

```bash
npm run build          # production build of frontend
npm run lint           # ESLint (frontend workspace)
npm run preview        # preview Vite build
```

## Notes

- Without MongoDB or Google keys, the simulator UI still runs; auth and save return errors until configured (`GET /api/auth/google/status` reports whether OAuth env is set).
- Simulation remains a **browser-side** model for learning, not capacity planning.
