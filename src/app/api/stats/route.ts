import { NextResponse } from "next/server";
import { db } from "@/db";
import { station, fuelPrice } from "@/db/schema";
import { count, avg, min, max, sql } from "drizzle-orm";

export async function GET() {
  try {
    // National averages per fuel type
    const prices = await db
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

    // Total station count
    const [stationCountResult] = await db
      .select({ count: count() })
      .from(station)
      .where(sql`${station.isActive} = true`);

    return NextResponse.json({
      nationalAverages: prices.map((p) => ({
        fuelType: p.fuelType,
        avgPrice: Number(p.avgPrice) || 0,
        minPrice: Number(p.minPrice) || 0,
        maxPrice: Number(p.maxPrice) || 0,
        stationCount: p.stationCount,
      })),
      totalStations: stationCountResult?.count || 0,
      syncedAt: new Date().toISOString(),
    });
  } catch (err) {
    return NextResponse.json(
      { error: err instanceof Error ? err.message : "Unknown error" },
      { status: 500 }
    );
  }
}