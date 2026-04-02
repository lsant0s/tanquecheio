import { NextRequest, NextResponse } from "next/server";
import { db } from "@/db";
import { station, fuelPrice, syncLog } from "@/db/schema";
import { sql } from "drizzle-orm";

// API Aberta base URL (https://api.apiaberta.pt/v1/fuel/prices)
const API_ABERTA_URL = "https://api.apiaberta.pt/v1/fuel/prices";

// Brand logo mapping
const BRAND_LOGOS: Record<string, string> = {
  "GALP": "/brands/galp.svg",
  "BP": "/brands/bp.svg",
  "REPSOL": "/brands/repsol.svg",
  "PRIO": "/brands/prio.svg",
  "CEPSA": "/brands/cepsa.svg",
  "TOTAL": "/brands/total.svg",
  "TEXACO": "/brands/texaco.svg",
  "HIPERCOR": "/brands/hipercor.svg",
};

// Station type normalization
function normalizeStationType(rawType: string): "urban" | "highway" | "maritime" | "other" {
  const lower = rawType?.toLowerCase() || "";
  if (lower.includes("servi")) return "highway";
  if (lower.includes("maritim")) return "maritime";
  if (lower.includes("posto") || lower.includes("abastecimento")) return "urban";
  return "other";
}

function getBrandLogo(brand: string): string {
  const upper = brand?.toUpperCase().trim() || "";
  return BRAND_LOGOS[upper] || "/brands/generic-station.svg";
}

// Fuel type canonical names
const FUEL_TYPE_MAP: Record<string, string> = {
  "Gasolina 95 Simples": "Gasolina 95",
  "Gasolina 98 Simples": "Gasolina 98",
  "Gasóleo Simples": "Gasóleo Simples",
  "Gasóleo Especial": "Gasóleo Especial",
  "GPL": "GPL Auto",
  "GPL Auto": "GPL Auto",
};

function normalizeFuelType(name: string): string {
  return FUEL_TYPE_MAP[name] || name;
}

// Parse postcode from address
function parsePostalCode(addr: string): string | null {
  const parts = addr?.split(",") || [];
  for (const part of parts) {
    const trimmed = part.trim();
    if (/^\d{4}-\d{3}$/.test(trimmed)) return trimmed;
    if (/^\d{4}\s?\d{3}$/.test(trimmed)) return trimmed.replace(/\s/, "-");
  }
  const match = addr?.match(/(\d{4}-\d{3})/);
  return match ? match[1] : null;
}

// District extraction (Portuguese standard districts)
const PORTUGAL_DISTRICTS = [
  "Aveiro", "Beja", "Braga", "Bragança", "Castelo Branco", "Coimbra", "Évora",
  "Faro", "Guarda", "Leiria", "Lisboa", "Portalegre", "Porto", "Santarém",
  "Setúbal", "Viana do Castelo", "Vila Real", "Viseu"
];

function extractDistrict(addr: string): string | null {
  // Try to match common Portuguese address patterns
  // e.g. "Rua X, 123, Lisboa", "Av. Y, Porto"
  const parts = addr?.split(",").map(p => p.trim()) || [];
  for (const part of parts) {
    if (PORTUGAL_DISTRICTS.includes(part)) return part;
  }
  // Try fuzzy match from the end of the address
  const lower = addr?.toLowerCase() || "";
  for (const d of PORTUGAL_DISTRICTS) {
    if (lower.includes(d.toLowerCase())) return d;
  }
  return null;
}

/**
 * POST /api/sync — Protected by CRON_SECRET
 * Fetches all fuel prices from API Aberta and upserts into DB
 */
export async function POST(request: NextRequest) {
  const cronSecret = request.headers.get("x-cron-secret") || request.nextUrl.searchParams.get("cron_secret");
  if (cronSecret !== process.env.CRON_SECRET) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const apiKey = process.env.API_ABERTA_KEY;
  if (!apiKey) {
    return NextResponse.json({ error: "API_ABERTA_KEY not configured" }, { status: 500 });
  }

  const startedAt = new Date();
  let stationsAttempted = 0;
  let stationsSynced = 0;
  let syncStatus: "success" | "partial" | "failed" = "success";
  let errorMessage: string | null = null;

  try {
    // Fetch all prices from API Aberta
    console.log("[sync] Fetching from API Aberta...");
    const response = await fetch(`${API_ABERTA_URL}?key=${apiKey}`, {
      signal: AbortSignal.timeout(60000),
    });

    if (!response.ok) {
      throw new Error(`API Aberta returned ${response.status}: ${response.statusText}`);
    }

    const json = await response.json();
    const prices = json?.prices || json?.data || json;

    if (!Array.isArray(prices)) {
      throw new Error("Invalid API response format — expected array in 'prices', 'data', or root array");
    }

    stationsAttempted = prices.length;
    console.log(`[sync] Processing ${prices.length} price records...`);

    const now = new Date();

    // Group by station (dgeg_id) for batch upsert
    const stationMap = new Map<number, {
      name: string;
      brand: string;
      address: string;
      postalCode: string | null;
      district: string | null;
      lat: number;
      lng: number;
      isOpen24h: boolean;
      fuelTypes: Set<string>;
      prices: { fuelType: string; price: number; dgegLastUpdated: Date }[];
    }>();

    for (const record of prices) {
      const dgegId = record.codigo_posto || record.station_id || record.posto?.id || null;
      if (!dgegId) continue;

      const id = typeof dgegId === "string" ? parseInt(dgegId.replace(/\D/g, ""), 10) : dgegId;
      if (isNaN(id)) continue;

      const existing = stationMap.get(id);
      if (!existing) {
        const name = record.nome_posto || record.station_name || record.posto?.nome_dono || "";
        const brand = record.marca_posto || record.brand_name || record.posto?.nome || "";
        const address = record.morada_posto || record.address || record.posto?.morada || "";
        const lat = parseFloat(record.posto?.lat || record.latitude || "0");
        const lng = parseFloat(record.posto?.lon || record.longitude || record.posto?.lng || "0");

        stationMap.set(id, {
          name: name || `Posto ${id}`,
          brand: brand || "Outro",
          address: address || "",
          postalCode: parsePostalCode(address),
          district: extractDistrict(address),
          lat: isNaN(lat) ? 0 : lat,
          lng: isNaN(lng) ? 0 : lng,
          // @ts-ignore - API field name uses numeric prefix
          isOpen24h: record.posto?.["_24_horas"] || record.posto?.["24horas"] || record.isOpen24h || false,
          fuelTypes: new Set(),
          prices: [],
        });
      }

      const entry = stationMap.get(id)!;
      const fuelTypeRaw = record.combustivel || record.fuel_type || "";
      const fuelType = normalizeFuelType(fuelTypeRaw);
      const price = parseFloat(record.preco || record.price || "0");
      const updatedStr = record.updated_at || record.updated || record.hora || "";
      const updated = updatedStr ? new Date(updatedStr) : now;

      entry.fuelTypes.add(fuelType);
      entry.prices.push({ fuelType, price: isNaN(price) ? 0 : price, dgegLastUpdated: updated });
    }

    // Upsert stations and prices
    console.log(`[sync] Upserting ${stationMap.size} stations...`);

    for (const [id, s] of stationMap.entries()) {
      if (s.lat === 0 || s.lng === 0) {
        console.warn(`[sync] Skipping station ${id} (${s.name}) — no coordinates`);
        continue;
      }

      try {
        // Upsert station
        const [upserted] = await db.insert(station).values({
          dgegId: id,
          name: s.name,
          brand: s.brand,
          brandLogoUrl: getBrandLogo(s.brand),
          address: s.address,
          postalCode: s.postalCode,
          district: s.district,
          concelho: null,
          lat: s.lat.toFixed(6),
          lng: s.lng.toFixed(6),
          stationType: "urban",
          isOpen24h: s.isOpen24h,
          fuelTypes: Array.from(s.fuelTypes),
          amenities: [],
          paymentMethods: [],
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
            lat: sql`excluded.lat`,
            lng: sql`excluded.lng`,
            fuelTypes: sql`excluded.fuel_types`,
            isOpen24h: sql`excluded.is_open_24h`,
            isActive: sql`excluded.is_active`,
            lastSyncedAt: now,
          },
        }).returning({ id: station.id });

        if (!upserted) continue;

        // Insert fuel prices
        for (const fp of s.prices) {
          await db.insert(fuelPrice).values({
            stationId: upserted.id,
            fuelType: fp.fuelType,
            price: fp.price.toFixed(3),
            recordedAt: now,
            dgegLastUpdated: fp.dgegLastUpdated,
          }).onConflictDoNothing();
        }

        stationsSynced++;
      } catch (err) {
        console.error(`[sync] Error processing station ${id}:`, err);
      }
    }

    syncStatus = stationsSynced < stationsAttempted ? "partial" : "success";
    console.log(`[sync] Done: ${stationsSynced}/${stationsAttempted} stations synced`);

    const completedAt = new Date();
    await db.insert(syncLog).values({
      startedAt,
      completedAt,
      stationsAttempted: stationsAttempted,
      stationsSynced,
      syncType: "dgeg_sync",
      status: syncStatus,
      errorMessage,
    });
  } catch (err) {
    syncStatus = "failed";
    errorMessage = err instanceof Error ? err.message : "Unknown error";
    console.error("[sync] Error:", errorMessage);

    await db.insert(syncLog).values({
      startedAt,
      completedAt: null,
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