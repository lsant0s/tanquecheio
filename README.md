# ⛽ Tanque Cheio — O mais barato, mesmo ao virar da esquina.

**tanquecheio.pt** — Portuguese fuel price comparison web app.

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
│   │   └── mais-barato/       # Cheapest near me + map
│   ├── api/
│   │   ├── sync/route.ts      # DGEG sync endpoint (CRON_SECRET protected)
│   │   └── forecast/route.ts  # Forecast computation (weekly cron)
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

**Materialized view:** `latest_fuel_prices` — current prices for fast homepage/district stats

---

## Cron Jobs (`vercel.json`)

| Schedule | Time (UTC) | Path | Purpose |
|---|---|---|---|
| Daily | `0 3 * * *` | `/api/sync` | Fetch DGEG prices, upsert, refresh view |
| Weekly | `0 17 * * 5` | `/api/forecast` | Compute Brent-based forecast |

---

## Getting Started

```bash
# 1. Copy env vars
cp .env.example .env.local

# 2. Fill in required keys (DB, Clerk, CRON_SECRET)

# 3. Install
npm install --legacy-peer-deps

# 4. Generate migrations
npx drizzle-kit generate

# 5. Push to DB
npx drizzle-kit push

# 6. Run
npm run dev
```

Open [http://localhost:3001](http://localhost:3001) (or 3000 if free).

---

## Routes

| URL | Description |
|---|---|
| `/pt` | Homepage (national prices + savings calculator) |
| `/pt/hoje-em-portugal` | National stats dashboard |
| `/pt/proxima-semana` | Weekly forecast |
| `/pt/mais-barato` | Cheapest near me + interactive map |
| `/en/*` | Same routes in English |

---

## API Endpoints

| Endpoint | Method | Purpose |
|---|---|---|
| `/api/sync` | POST | Sync DGEG data (protected by CRON_SECRET) |
| `/api/forecast` | GET/POST | Get forecast / run forecast cron (protected) |

---

## V1 Scope (Current)

- [x] Project setup with Next.js 15 + Tailwind 4
- [x] Drizzle ORM schema (8 tables + relations)
- [x] i18n locale routing (PT + EN)
- [x] Homepage with fuel prices, biggest drops, savings calculator
- [x] National stats dashboard (`/hoje-em-portugal`)
- [x] Weekly forecast page (`/proxima-semana`)
- [x] Map page with Leaflet (`/mais-barato`)
- [x] DGEG sync endpoint (scaffolded — parsers need API response format)
- [x] Forecast cron endpoint (Brent + EUR/USD)
- [x] vercel.json with cron configuration
- [ ] Station detail pages (`/posto/[district]/[slug]-[id]`)
- [ ] District/concelho SEO pages
- [ ] Admin monitoring (`/api/admin/status`)
- [ ] DGEG SOAP response parsers
- [ ] Auth integration (Clerk)
- [ ] Price alerts (V2)

---

## License

Private — Tanque Cheio © 2026