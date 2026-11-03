# Full-Stack App (React + Express)

Production-style full-stack starter: a **React + Vite** frontend and an **Express** API with **SQLite** storage.

## Structure
- `src/` — React frontend (components, `api.js` fetch client)
- `server/` — Express API (`index.js` app factory, `db.js` SQLite, `routes/`)
- `scripts/dev.mjs` — runs the API and Vite dev server together
- `vite.config.js` — proxies `/api` to the API in dev and preview

## Setup
```bash
npm install
cp .env.example .env   # optional: override PORT / API_PORT
```

## Develop
```bash
npm run dev
```
- Frontend: http://localhost:4200
- API: http://localhost:4301 (`/api/health`, `/api/messages`)

## Build & run (production)
```bash
npm run build
npm start        # serves the API and the built frontend from ./dist
```

## Test
```bash
npm test
```

## API
- `GET  /api/health`
- `GET  /api/messages`
- `POST /api/messages` — `{ name, email, message }`
