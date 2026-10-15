# Trishuli Flood Rescue

A React + TypeScript dashboard prototype for recording and reviewing flood-related incident reports in the Trishuli River Basin.

## Current capabilities

- Interactive OpenStreetMap basemap with markers for the app's current alert records.
- Incident reporting form with coordinate validation.
- Supabase persistence for submitted incidents when environment configuration and database permissions are available.
- Alert table and CSV export.
- Illustrative rescue-team and shelter panels, clearly intended as prototype content.

## Important limitations

This version is **not an operational emergency system**. It does not currently process raw Sentinel-1/Sentinel-2 imagery, calculate flood extent from satellite data, overlay pre-event infrastructure data, calculate road-network disconnections for settlements, or include an AI situation-report copilot. Displayed starter alerts, rescue teams, and shelters are demonstration data and must not be treated as verified live reports. The basemap and incident markers are not flood segmentation.

Do not use this prototype to make real-world dispatch or evacuation decisions. Verify information with authorised local responders and trusted sources.

## Run locally

Requirements: Node.js and npm.

```bash
cd flood-rescue-ui
npm ci
cp .env.example .env
```

Edit `.env` with the Supabase project URL and publishable/anon key. Configure the Supabase `incidents` table and row-level security policies before using persistence. Do not place a Supabase service-role key in this frontend.

Then run:

```bash
npm run dev
```

Build for deployment:

```bash
npm run build
```

## Architecture

- `src/App.tsx` — dashboard, alert state, incident form, persistence calls, and CSV export.
- `src/FloodMap.tsx` — Leaflet/OpenStreetMap display and incident markers.
- `src/lib/supabase.ts` — Supabase client configuration.

## Data attribution

The map tiles are provided by OpenStreetMap contributors. Display attribution is shown in the map interface. Add the required Sentinel/Copernicus, elevation, OpenStreetMap snapshot, and training-data attributions when those data sources are actually integrated. Do not claim use of a dataset or model that is not present in this version.
