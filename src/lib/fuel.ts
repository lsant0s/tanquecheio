import { db } from "@/db";
import { station, fuelPrice } from "@/db/schema";
import { desc, eq, sql, count, avg, min, max } from "drizzle-orm";

// ==========================================
// Homepage Stats (National averages, biggest drops)
// ==========================================

export interface NationalFuelStats {
  fuelType: string;
  avgPrice: number;
  minPrice: number;
  maxPrice: number;
  stationCount: number;
}

export async function getNationalAverages(): Promise<NationalFuelStats[]> {
  const result = await db
    .select({
      fuelType: fuelPrice.fuelType,
      avgPrice: avg(fuelPrice.price),
      minPrice: min(fuelPrice.price),
      maxPrice: max(fuelPrice.price),
      stationCount: count(),
    })
    .from(fuelPrice)
    .groupBy(fuelPrice.fuelType)
    .orderBy(fuelPrice.fuelType);

  return result
    .filter((r) => r.fuelType)
    .map((r) => ({
      fuelType: r.fuelType,
      avgPrice: Number(r.avgPrice) || 0,
      minPrice: Number(r.minPrice) || 0,
      maxPrice: Number(r.maxPrice) || 0,
      stationCount: r.stationCount,
    }));
}

// ==========================================
// Station Detail
// ==========================================

export interface StationDetail {
  id: number;
  name: string;
  brand: string;
  address: string;
  postalCode: string | null;
  district: string | null;
  concelho: string | null;
  lat: number;
  lng: number;
  stationType: string;
  isOpen24h: boolean;
  fuelPrices: { fuelType: string; price: number }[];
}

export async function getStationDetail(stationId: number): Promise<StationDetail | null> {
  const [stmt] = await db
    .select()
    .from(station)
    .where(eq(station.dgegId, stationId))
    .limit(1);

  if (!stmt) return null;

  const prices = await db
    .select({
      fuelType: fuelPrice.fuelType,
      price: fuelPrice.price,
    })
    .from(fuelPrice)
    .where(eq(fuelPrice.stationId, stmt.id))
    .orderBy(fuelPrice.fuelType);

  return {
    id: stmt.dgegId,
    name: stmt.name,
    brand: stmt.brand,
    address: stmt.address,
    postalCode: stmt.postalCode,
    district: stmt.district,
    concelho: stmt.concelho,
    lat: Number(stmt.lat) || 0,
    lng: Number(stmt.lng) || 0,
    stationType: stmt.stationType || "urban",
    isOpen24h: stmt.isOpen24h || false,
    fuelPrices: prices.map((p) => ({ fuelType: p.fuelType, price: Number(p.price) || 0 })),
  };
}

// ==========================================
// District data
// ==========================================

export async function getDistrictStats(districtName: string) {
  const priceRows = await db
    .select()
    .from(fuelPrice)
    .innerJoin(station, eq(fuelPrice.stationId, station.id))
    .where(
      sql`LOWER(${station.district}) = ${districtName.toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "")}`
    )
    .orderBy(fuelPrice.price)
    .limit(100);

  return priceRows.map((row) => ({
    station: row.station,
    fuelPrice: row.fuel_price,
  }));
}

// ==========================================
// Stations for map
// ==========================================

export async function getStationsForMap(limit = 200) {
  const stations = await db
    .select({
      id: station.dgegId,
      name: station.name,
      brand: station.brand,
      lat: station.lat,
      lng: station.lng,
      fuelTypes: station.fuelTypes,
    })
    .from(station)
    .where(eq(station.isActive, true))
    .limit(limit);

  return stations
    .filter((s) => Number(s.lat) !== 0 && Number(s.lng) !== 0)
    .slice(0, limit);
}