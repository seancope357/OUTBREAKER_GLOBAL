# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Commands

```bash
npm run dev      # Runs `tsx server.ts` — Express + WebSocket + Vite middleware on :3000 (single process serves both API and frontend)
npm run build    # Vite build for client, then esbuild bundles server.ts → dist/server.cjs
npm run start    # Production: `node dist/server.cjs` (serves built client from dist/)
npm run lint     # Type-check only: `tsc --noEmit` (no ESLint configured)
npm run preview  # Vite static preview (won't include the Express/WS backend)
```

There is no test runner configured.

### Environment

- `GEMINI_API_KEY` — used server-side by `/api/assess-risk` (Gemini 2.5 Flash). When unset, the endpoint returns a CRITICAL fallback assessment and the app still functions.
- `VITE_GEMINI_API_KEY` — used **client-side** by `src/utils/tts.ts` for Gemini TTS. When unset, falls back to browser `speechSynthesis`. Note the deliberate split: server reads `GEMINI_API_KEY`, client reads `VITE_GEMINI_API_KEY`.
- `DISABLE_HMR=true` — disables Vite HMR and file watching (used in AI Studio to prevent flicker during agent edits). See `vite.config.ts`.
- `NODE_ENV=production` — switches `server.ts` from Vite middleware mode to serving `dist/` statically.

## Architecture

This is a single-process React + Express + WebSockets app that visualizes a Hantavirus outbreak scenario on a globe. The same Node process serves the API, the WebSocket feed, and (in dev) the Vite-transformed client.

### Backend (`server.ts`)

One file, intentionally. Holds:

- **Hardcoded scenario data**: `realHistoricalCases`, `knownHumanCases`, `ratClusters`, `cruiseShipCases`, `cruiseShipTrajectories`, `curatedNews`, `LOCAL_OSINT_REPORTS`. These are the always-on baseline shown to clients even when external feeds fail.
- **`DATA_SOURCES`**: RSS feeds (CDC Travel, CIDRAP, ProMED, HealthMap, Outbreak News Today) tagged with `type` (`authoritative` | `osint`), `category` (`MAINSTREAM` | `RAW_DATA`), and `confidence` (`HIGH` | `MEDIUM` | `LOW`). These tags propagate end-to-end into the UI.
- **`fetchLiveNews()`**: pulls every 5 minutes, filters non-authoritative feeds for outbreak keywords, updates `feedHealth` (`healthy` / `degraded` / `offline`).
- **`updateFeeds()`**: synthesizes `activeLiveCases` from live news by pattern-matching titles (e.g. `anomalous` → OSINT alert, `flight|passenger|port` → movement signal), then broadcasts the full state to every WS client.
- **Endpoints**:
  - `GET /api/health` — basic up check
  - `GET /api/data-status` — feed health + active source list
  - `POST /api/assess-risk` — proxies `{cases, news}` to Gemini, expects JSON `{level, reason, score}`
  - `WS /ws` — pushes `{type: "SYNC_STATE", payload: {cases, trajectories, news, feedHealth}}` on connect and every 5 min

### Frontend

- **Entry**: `src/main.tsx` → `src/App.tsx` (FluentProvider dark theme + Tailwind v4). Lazy-loads `GlobeView` via `Suspense`.
- **State**: `src/store/useStore.ts` — Zustand store + `connectWebSocket()` which auto-reconnects on close with 5s backoff. All server state arrives via a single `SYNC_STATE` WS message; there are no REST GETs for cases/news.
- **Globe**: `src/components/GlobeView.tsx` — `react-map-gl/maplibre` with `setProjection({type:'globe'})`, wrapped in `DeckGL` for the camera controller. Trajectories are rendered as `turf.greatCircle` GeoJSON LineStrings. Cases are partitioned by `type` (`historic` / `current` / `passenger` / `osint` / `rat`) into separate Marker layers with different visual treatments.
- **Panels**: `Sidebar.tsx` (filter chips + summaries), `RightPanel.tsx`, `CaseModal.tsx`, `ThreatListPanel.tsx`. Filtering is client-side over the Zustand store.

### Key conventions

- `CaseData.type` ∈ `'historic' | 'current' | 'passenger' | 'osint' | 'rat'` — used everywhere for filtering and rendering branches. When adding a new case kind, add it to `src/types.ts`, the case-type filter object in `Sidebar.tsx`, the `useMemo` partitions in `GlobeView.tsx`, and the labels map.
- `NewsFeedItem.category` ∈ `'MAINSTREAM' | 'RAW_DATA' | 'INDEPENDENT'` — drives news filtering and is also how `updateFeeds()` decides which live items get promoted to map markers.
- The path alias `@/*` resolves to repo root (see `vite.config.ts` and `tsconfig.json`), not `src/`.
- React 19 + `react-map-gl` v8 + maplibre-gl v5 are deduped explicitly in `vite.config.ts` (`dedupe: ['react', 'react-dom']`) — keep this if adding new mapping libs that may bundle their own React.

### Resilience model

The system is designed to never fail open: if all RSS sources are unreachable, the WebSocket still delivers `realHistoricalCases + ratClusters + knownHumanCases + cruiseShipCases + curatedNews` with `feedHealth.status = 'degraded'`. The frontend never assumes feeds are live — always render from whatever the store currently holds.

## Custom agents

`.agent.frontend.md` and `.agent.backend.md` are project-specific agent definitions (see `AGENTS.md`). Frontend agent owns React/Tailwind/accessibility; backend agent owns Express/WS/API design. Hand off across the boundary explicitly.
