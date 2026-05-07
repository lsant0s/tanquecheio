# ⛽ Tanque Cheio — O mais barato, mesmo ao virar da esquina.

**tanquecheio.pt** — Portuguese fuel price comparison web app.

---

## Data Source

Prices are sourced from **[API Aberta](https://api.apiaberta.pt/v1/fuel/prices)** which aggregates official data from **[DGEG](https://www.dgeg.gov.pt/)** (Direção-Geral de Energia e Geologia).

### Sync Configuration

- **Endpoint:** `https://api.apiaberta.pt/v1/fuel/prices?key=API_KEY`
- **Cron:** Daily at 3am UTC via Vercel Cron
- **Auth:** Protected by `CRON_SECRET` env var
- **API Key:** `API_ABERTA_KEY` in `.env.local`

---

## Stack

| Layer | Choice |
|---|---|
| Framework | Next.js 15 (App Router) |
| Database | PostgreSQL (Neon) via Drizzle ORM |
| Auth | Clerk |
| Map | Leaflet (react-leaflet) |
| i18n | next-intl (PT-PT primary, EN secondary) |
| Cron | Vercel Cron Jobs |
| Email | Resend |
| Analytics | Plausible |
| Error monitoring | Sentry |

---

## Project Structure

```
src/
├── app/
│   ├── [locale]/          # i18n locale routing
│   │   ├── layout.tsx     # Locale-aware root layout (Header + Footer)
│   │   ├── page.tsx        # Homepage (national prices, savings calculator)
│   │   ├── hoje-em-portugal/  # National stats dashboard
│   │   ├── proxima-semana/    # Weekly forecast page
│   │   ├── mais-barato/       # Cheapest near me + map
│   │   ├── posto/[district]/[stationSlug]/  # Station detail
│   │   ├── distrito/[district]/             # District SEO pages
│   │   └── concelho/[concelho]/             # Concelho SEO pages
│   ├── api/
│   │   ├── sync/route.ts      # API Aberta sync (CRON_SECRET protected)
│   │   ├── forecast/route.ts  # Forecast computation (weekly cron)
│   │   └── admin/status/route.ts  # Health monitoring
│   ├── globals.css
│   └── layout.tsx         # Root passthrough layout
├── components/
│   └── StationMap.tsx     # Leaflet map wrapper (client-side only)
├── db/
│   ├── schema.ts          # Full database schema (8 tables + relations)
│   └── index.ts           # Drizzle DB client
├── i18n/
│   └── request.ts         # i18n request config
├── messages/
│   ├── pt.json            # Portuguese translations
│   └── en.json            # English translations
├── middleware.ts           # next-intl locale routing middleware
public/
├── brands/
│   └── generic-station.svg # Fallback brand logo
```

---

## Key Database Tables

| Table | Purpose |
|---|---|
| `station` | Fuel stations from DGEG (location, brand, amenities) |
| `fuel_price` | Historical price records (time-series) |
| `fuel_forecast` | Weekly price forecast (Brent + EUR/USD signals) |
| `price_alert` | User price alerts (V2) |
| `user` | User profile (Clerk-linked) |
| `favourite_station` | Saved stations (V2) |
| `push_subscription` | Web Push (V3) |
| `sync_log` | Sync job monitoring |

---

## Cron Jobs (`vercel.json`)

| Schedule | Time (UTC) | Path | Purpose |
|---|---|---|---|
| Daily | `0 3 * * *` | `/api/sync` | Fetch API Aberta prices, upsert, refresh view |
| Weekly | `0 17 * * 5` | `/api/forecast` | Compute Brent-based forecast |

---

## Getting Started

```bash
# 1. Copy env vars
cp .env.example .env.local

# 2. Fill in required keys (DB, Clerk, CRON_SECRET, API_ABERTA_KEY)

# 3. Install
npm install --legacy-peer-deps

# 4. Generate migrations
npx drizzle-kit generate

# 5. Push to DB
npx drizzle-kit push

# 6. Run sync manually (for testing)
curl -X POST "http://localhost:3000/api/sync?cron_secret=YOUR_SECRET"

# 7. Start dev server
npm run dev
```

Open [http://localhost:3000](http://localhost:3000) (or 3001 if 3000 occupied).

---

## Routes

| URL | Description |
|---|---|
| `/pt` | Homepage (national prices + savings calculator) |
| `/pt/hoje-em-portugal` | National stats dashboard |
| `/pt/proxima-semana` | Weekly forecast |
| `/pt/mais-barato` | Cheapest near me + interactive map |
| `/pt/posto/[district]/[slug]` | Station detail page |
| `/pt/distrito/[district]` | District SEO page |
| `/pt/concelho/[concelho]` | Concelho SEO page |
| `/en/*` | Same routes in English |

---

## API Endpoints

| Endpoint | Method | Purpose |
|---|---|---|
| `/api/sync` | POST | Sync API Aberta data (protected by CRON_SECRET) |
| `/api/forecast` | GET/POST | Get forecast / run forecast cron (protected) |
| `/api/admin/status` | GET | Health check + sync status (protected by CR