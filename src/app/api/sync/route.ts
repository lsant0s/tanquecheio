import { NextRequest, NextResponse } from "next/server";
import { db } from "@/db";
import { station, fuelPrice, syncLog } from "@/db/schema";
import { sql, count } from "drizzle-orm";

const API_ABERTA_BASE = "https://api.apiaberta.pt/v1/fuel/stations";

const BRAND_LOGOS: Record<string, string> = {
  "GALP": "/brands/galp.svg", "BP": "/brands/bp.svg",
  "REPSOL": "/brands/repsol.svg", "PRIO": "/brands/prio.svg",
  "CEPSA": "/brands/cepsa.svg", "TOTAL": "/brands/total.svg",
  "TEXACO": "/brands/texaco.svg", "HIPERCOR": "/brands/hipercor.svg",
  "INTERMARCHÉ": "/brands/generic-station.svg",
  "PLENERGY": "/brands/generic-station.svg",
  "TRANSFORPEL": "/brands/generic-station.svg",
};

const FUEL_TYPE_MAP: Record<string, string> = {
  "Gasolina simples 95": "Gasolina 95",
  "Gasolina especial 95": "Gasolina 95",
  "Gasolina 98": "Gasolina 98",
  "Gasolina especial 98": "Gasolina 98",
  "Gasóleo simples": "Gasóleo Simples",
  "Gasóleo especial": "Gasóleo Simples",
  "GPL Auto": "GPL Auto",
};

function normalizeBrand(raw: string): string {
  const b = raw?.trim().toUpperCase() || "OUTRO";
  return b;
}

function getBrandLogo(brand: string): string {
  const upper = brand?.toUpperCase().trim() || "";
  return BRAND_LOGOS[upper] || "/brands/generic-station.svg";
}

function normalizeFuelType(name: string): string {
  return FUEL_TYPE_MAP[name] || name;
}

export async function POST(request: NextRequest) {
  const cronSecret = request.headers.get("x-cron-secret") || request.nextUrl.searchParams.get("cron_secret");
  if (cronSecret !== process.env.CRON_SECRET) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const startedAt = new Date();
  let stationsAttempted = 0;
  let stationsSynced = 0;
  let syncStatus: "success" | "partial" | "failed" = "success";
  let errorMessage: string | null = null;

  try {
    // Step 1: Get first page to discover total pages
    console.log("[sync] Fetching page 1 from API Aberta...");
    const firstResponse = await fetch(`${API_ABERTA_BASE}?page=1&limit=100`, {
      signal: AbortSignal.timeout(30000),
    });
    if (!firstResponse.ok) throw new Error(`API Aberta returned ${firstResponse.status}`);
    const firstJson = await firstResponse.json();
    const totalPages = firstJson.meta?.pages || 162;
    const allRecords = [...(firstJson.data || [])];
    console.log(`[sync] Total pages: ${totalPages}, first page records: ${allRecords.length}`);

    // Step 2: Fetch remaining pages sequentially with delays (rate limiting)
    for (let page = 2; page <= totalPages; page++) {
      await new Promise((r) => setTimeout(r, 200)); // 200ms delay between pages
      const res = await fetch(`${API_ABERTA_BASE}?page=${page}&limit=100`, {
        signal: AbortSignal.timeout(30000),
      });
      if (res.ok) {
        const pageData = await res.json();
        if (pageData?.data) allRecords.push(...pageData.data);
      } else {
        console.warn(`[sync] Page ${page} failed: ${res.status}`);
        if (res.status === 429) break; // stop on rate limit
      }
    }
    stationsAttempted = allRecords.length;
    console.log(`[sync] Total records fetched: ${allRecords.length}`);

    // Step 3: Group by station_id
    const stationMap = new Map<number, {
      name: string; brand: string; address: string; postalCode: string | null;
      district: string | null; municipality: string | null;
      lat: number; lng: number; fuelTypes: Map<string, { price: number; updatedAt: Date }>;
    }>();

    for (const record of allRecords) {
      const id = record.station_id;
      if (!id) continue;

      const existing = stationMap.get(id);
      if (!existing) {
        stationMap.set(id, {
          name: record.name || `Posto ${id}`,
          brand: record.brand || "Outro",
          address: record.address || "",
          postalCode: record.postal_code || null,
          district: record.district || null,
          municipality: record.municipality || null,
          lat: record.location?.lat || 0,
          lng: record.location?.lng || 0,
          fuelTypes: new Map(),
        });
      }

      const entry = stationMap.get(id)!;
      const fuelName = normalizeFuelType(record.fuel_name || "");
      const price = parseFloat(record.price_eur) || 0;
      const updated = record.updated_at ? new Date(record.updated_at) : new Date();

      // Keep the latest price per fuel type (lowest price if multiple records with same type)
      const existingPrice = entry.fuelTypes.get(fuelName);
      if (!existingPrice || price < existingPrice.price) {
        entry.fuelTypes.set(fuelName, { price, updatedAt: updated });
      }
    }

    console.log(`[sync] Grouped into ${stationMap.size} unique stations`);

    // Step 4: Upsert stations and prices
    const now = new Date();
    let processedCount = 0;
    for (const [id, s] of stationMap.entries()) {
      if (s.lat === 0 || s.lng === 0) {
        continue; // skip stations without coordinates
      }

      try {
        const [upserted] = await db.insert(station).values({
          dgegId: id,
          name: s.name,
          brand: normalizeBrand(s.brand),
          brandLogoUrl: getBrandLogo(s.brand),
          address: s.address,
          postalCode: s.postalCode,
          district: s.district,
          concelho: s.municipality,
          lat: s.lat.toFixed(6),
          lng: s.lng.toFixed(6),
          stationType: "urban",
          isOpen24h: false,
          fuelTypes: Array.from(s.fuelTypes.keys()),
          isActive: true,
          lastSyncedAt: now,
        }).onConflictDoUpdate({
          target: station.dgegId,
          set: {
            name: sql`excluded.name`,
            brand: sql`excluded.brand`,
            brandLogoUrl: sql`excluded.brand_logo_url`,
            address: sql`excluded.address`,
            postalCode: sql`excluded.postal_code`,
            district: sql`excluded.district`,
            concelho: sql`excluded.concelho`,
            lat: sql`excluded.lat`,
            lng: sql`excluded.lng`,
            fuelTypes: sql`excluded.fuel_types`,
            isActive: sql`excluded.is_active`,
            lastSyncedAt: now,
          },
        }).returning({ id: station.id });

        if (!upserted) continue;

        // Insert prices
        for (const [fuelType, fp] of s.fuelTypes.entries()) {
          await db.insert(fuelPrice).values({
            stationId: upserted.id,
            fuelType,
            price: fp.price.toFixed(3),
            recordedAt: now,
            dgegLastUpdated: fp.updatedAt,
          }).onConflictDoNothing();
        }

        processedCount++;
      } catch (err) {
        console.error(`[sync] Error processing station ${id}:`, err);
      }
    }

    stationsSynced = processedCount;
    syncStatus = "success";
    console.log(`[sync] Done: ${stationsSynced} stations synced, ${stationMap.size - processedCount} skipped (no coords)`);
  } catch (err) {
    syncStatus = "failed";
    errorMessage = err instanceof Error ? err.message : "Unknown error";
    console.error("[sync] Error:", errorMessage);
  } finally {
    await db.insert(syncLog).values({
      startedAt,
      completedAt: new Date(),
      stationsAttempted,
      stationsSynced,
      syncType: "dgeg_sync",
      status: syncStatus,
      errorMessage,
    });
  }

  return NextResponse.json({
    status: syncStatus,
    stationsAttempted,
    stationsSynced,
    errorMessage,
    duration: `${((Date.now() - startedAt.getTime()) / 1000).toFixed(1)}s`,
  });
}