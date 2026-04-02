import { NextRequest, NextResponse } from "next/server";
import { db } from "@/db";
import { station, fuelPrice, syncLog } from "@/db/schema";
import { sql } from "drizzle-orm";

// Types matching DB enums
type SyncLogStatus = "success" | "partial" | "failed";
type SyncLogType = "dgeg_sync" | "forecast" | "accuracy_update";

// Parsed station detail shape
interface ParsedStation {
  codigo: string | null;
  name: string;
  brand: string;
  address: string;
  postalCode: string | null;
  district: string | null;
  concelho: string | null;
  lat: number;
  lng: number;
  stationType: string | null;
  isOpen24h: boolean;
  openingHours: unknown;
  fuelTypes: string[];
  amenities: string[];
  paymentMethods: string[];
  isActive: boolean;
  fuelPrices: { fuelType: string; price: number; dgegLastUpdated: Date | null }[];
}

// DGEG API Aberta base URLs (per spec)
const DGEG_BASE_URL = "https://revenda.dgeg.gov.pt/WSServer/WSRevendaPublic.asmx";

// Brand logo mapping — falls back to generic-station.svg
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

// Station type normalization (PT → standardised values per spec)
function normalizeStationType(rawType: string): "urban" | "highway" | "maritime" | "other" {
  const lower = rawType.toLowerCase();
  if (lower.includes("serviço") || lower.includes("servico")) return "highway";
  if (lower.includes("marítimo") || lower.includes("maritimo")) return "maritime";
  if (lower.includes("abastecimento")) return "urban";
  return "other";
}

// Normalize brand name
function normalizeBrand(raw: string): string {
  return raw?.toUpperCase().trim() || "OUTRO";
}

function getBrandLogo(brand: string): string {
  return BRAND_LOGOS[brand] || "/brands/generic-station.svg";
}

// Check 24h operation from HorarioPosto
function isOpen24h(hoursStr: string | null): boolean {
  if (!hoursStr) return false;
  const lower = hoursStr.toLowerCase();
  if (lower.includes("24")) return true;
  if (lower.includes("00:00") && lower.includes("00:00")) return true;
  return false;
}

/**
 * POST /api/sync — Protected by CRON_SECRET
 * Syncs all stations from DGEG API Aberta
 * 
 * This endpoint:
 * 1. Lists all stations (ListarDadosPostos)
 * 2. Batches detail requests (GetDadosPostoSearch) with delays
 * 3. Upserts Station + FuelPrice records
 * 4. Refreshes the `latest_fuel_prices` materialized view
 * 5. Logs results to SyncLog
 */
export async function POST(request: NextRequest) {
  const cronSecret = request.headers.get("x-cron-secret") || request.nextUrl.searchParams.get("cron_secret");
  
  // Auth check
  if (cronSecret !== process.env.CRON_SECRET) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const startedAt = new Date();
  let stationsAttempted = 0;
  let stationsSynced = 0;
  let syncStatus: SyncLogStatus = "success";
  let errorMessage: string | null = null;

  try {
    // Step 1: Get station list
    const stationListResponse = await fetch(DGEG_BASE_URL + "?op=ListarDadosPostos", {
      method: "POST",
      headers: { "Content-Type": "text/xml; charset=utf-8", "SOAPAction": "http://tempuri.org/ListarDadosPostos" },
      body: `<soap:Envelope xmlns:xsi="http://www.w3.org/2001/XMLSchema-instance" xmlns:xsd="http://www.w3.org/2001/XMLSchema" xmlns:soap="http://schemas.xmlsoap.org/soap/envelope/">
        <soap:Body>
          <ListarDadosPostos xmlns="http://tempuri.org/" />
        </soap:Body>
      </soap:Envelope>`,
      signal: AbortSignal.timeout(30000),
    });

    if (!stationListResponse.ok) {
      throw new Error(`Failed to fetch station list: ${stationListResponse.status}`);
    }

    const stationListText = await stationListResponse.text();
    // Parse XML response — DGEG returns station IDs
    const stationIds = parseStationIdsFromSoap(stationListText);
    stationsAttempted = stationIds.length;

    console.log(`[sync] Found ${stationIds.length} stations to process`);

    // Step 2: Batch process stations (50 per batch with 1s delay between batches)
    const BATCH_SIZE = 50;
    const BATCH_DELAY_MS = 1000;

    for (let i = 0; i < stationIds.length; i += BATCH_SIZE) {
      const batch = stationIds.slice(i, i + BATCH_SIZE);
      
      // Process batch in parallel
      const results = await Promise.allSettled(
        batch.map((dgegId) => syncStation(dgegId))
      );

      // Count successful syncs and upsert data
      for (const result of results) {
        if (result.status === "fulfilled" && result.value) {
          stationsSynced++;
        }
      }

      // Delay between batches
      if (i + BATCH_SIZE < stationIds.length) {
        await new Promise((resolve) => setTimeout(resolve, BATCH_DELAY_MS));
      }
    }

    // Step 3: Refresh materialized view
    await sql`REFRESH MATERIALIZED VIEW CONCURRENTLY latest_fuel_prices`;

    // Step 4: Check if any districts outside mainland Portugal got synced
    // (Azores/Madeira should be excluded from latest_fuel_prices via WHERE clause)
    
    syncStatus = stationsSynced < stationsAttempted ? "partial" : "success";

    console.log(`[sync] Completed: ${stationsSynced}/${stationsAttempted} stations synced`);

  } catch (err) {
    syncStatus = "failed";
    errorMessage = err instanceof Error ? err.message : "Unknown error";
    console.error("[sync] Error:", errorMessage);
  } finally {
    // Log the sync result
    const completedAt = new Date();
    await db.insert(syncLog).values({
      startedAt,
      completedAt,
      stationsAttempted,
      stationsSynced,
      syncType: "dgeg_sync" as SyncLogType,
      status: syncStatus,
      errorMessage,
    });
  }

  return NextResponse.json({
    status: syncStatus,
    stationsAttempted,
    stationsSynced,
    errorMessage,
    duration: `${((new Date().getTime() - startedAt.getTime()) / 1000).toFixed(1)}s`,
  });
}

/**
 * Fetch and upsert a single station's detail data
 */
async function syncStation(dgegId: number) {
  try {
    const response = await fetch(`${DGEG_BASE_URL}?op=GetDadosPostoSearch&id=${dgegId}`, {
      method: "POST",
      headers: { "Content-Type": "text/xml; charset=utf-8", "SOAPAction": "http://tempuri.org/GetDadosPostoSearch" },
      body: `<soap:Envelope xmlns:xsi="http://www.w3.org/2001/XMLSchema-instance" xmlns:xsd="http://www.w3.org/2001/XMLSchema" xmlns:soap="http://schemas.xmlsoap.org/soap/envelope/">
        <soap:Body>
          <GetDadosPostoSearch xmlns="http://tempuri.org/">
            <id>${dgegId}</id>
          </GetDadosPostoSearch>
        </soap:Body>
      </soap:Envelope>`,
      signal: AbortSignal.timeout(15000),
    });

    if (!response.ok) return null;

    const data = await response.json() || await response.text();
    // Parse the SOAP/XML response — extract station details
    const parsed = parseStationDetail(data);
    if (!parsed) return null;
    const parsedStation = parsed as ParsedStation;

    // Upsert Station
    const [upsertedStation] = await db.insert(station).values({
      dgegId,
      codigo: parsedStation.codigo,
      name: parsedStation.name,
      brand: parsedStation.brand,
      brandLogoUrl: getBrandLogo(parsedStation.brand),
      address: parsedStation.address,
      postalCode: parsedStation.postalCode,
      district: parsedStation.district,
      concelho: parsedStation.concelho,
      lat: parsedStation.lat.toString(),
      lng: parsedStation.lng.toString(),
      stationType: normalizeStationType(parsedStation.stationType || "other"),
      isOpen24h: parsedStation.isOpen24h,
      openingHours: parsedStation.openingHours,
      fuelTypes: parsedStation.fuelTypes,
      amenities: parsedStation.amenities,
      paymentMethods: parsedStation.paymentMethods,
      isActive: parsedStation.isActive,
      lastSyncedAt: new Date(),
    }).onConflictDoUpdate({
      target: station.dgegId,
      set: {
        name: sql`excluded.name`,
        brand: sql`excluded.brand`,
        brandLogoUrl: sql`excluded.brand_logo_url`,
        address: sql`excluded.address`,
        lat: sql`excluded.lat`,
        lng: sql`excluded.lng`,
        district: sql`excluded.district`,
        concelho: sql`excluded.concelho`,
        fuelTypes: sql`excluded.fuel_types`,
        amenities: sql`excluded.amenities`,
        paymentMethods: sql`excluded.payment_methods`,
        isOpen24h: sql`excluded.is_open_24h`,
        isActive: sql`excluded.is_active`,
        stationType: sql`excluded.station_type`,
        lastSyncedAt: new Date(),
        updatedAt: new Date(),
      },
    }).returning({ id: station.id });

    if (!upsertedStation) return null;

    // Insert fuel prices
    const now = new Date();
    for (const fp of parsedStation.fuelPrices) {
      await db.insert(fuelPrice).values({
        stationId: upsertedStation.id,
        fuelType: fp.fuelType,
        price: fp.price.toString(),
        recordedAt: now,
        dgegLastUpdated: fp.dgegLastUpdated || now,
      }).onConflictDoNothing();
    }

    return true;
  } catch (err) {
    console.error(`[sync] Error syncing station ${dgegId}:`, err);
    return null;
  }
}

// Placeholder XML/SOAP parsers — to be completed based on actual DGEG API responses
function parseStationIdsFromSoap(xml: string): number[] {
  // DGEG returns XML or JSON with station IDs
  // Parse and return array of dgegId integers
  // TODO: implement proper XML parsing once API response format is confirmed
  return [];
}

function parseStationDetail(data: any): ParsedStation | null {
  // Parse DGEG SOAP/XML response for station details
  // Returns structured station object for upsert
  // TODO: implement proper parsing once API response format is confirmed
  return null;
}
