import { NextResponse } from "next/server";
import { db } from "@/db";
import { station } from "@/db/schema";
import { eq, sql } from "drizzle-orm";

export async function GET() {
  try {
    const stations = await db
      .select({
        id: station.id,
        dgegId: station.dgegId,
        name: station.name,
        brand: station.brand,
        lat: station.lat,
        lng: station.lng,
        district: station.district,
        fuelTypes: station.fuelTypes,
      })
      .from(station)
      .where(eq(station.isActive, true))
      .limit(500);

    return NextResponse.json({
      stations: stations
        .filter((s) => Number(s.lat) !== 0 && Number(s.lng) !== 0)
        .slice(0, 500),
    });
  } catch (err) {
    return NextResponse.json(
      { error: err instanceof Error ? err.message : "Unknown error" },
      { status: 500 }
    );
  }
}