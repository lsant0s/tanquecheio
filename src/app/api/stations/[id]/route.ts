import { NextRequest, NextResponse } from "next/server";
import { db } from "@/db";
import { station, fuelPrice } from "@/db/schema";
import { eq } from "drizzle-orm";

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const stationId = parseInt(id);
    if (isNaN(stationId)) {
      return NextResponse.json({ error: "Invalid station ID" }, { status: 400 });
    }

    // Find station by dgeg_id
    const [stmt] = await db
      .select()
      .from(station)
      .where(eq(station.dgegId, stationId))
      .limit(1);

    if (!stmt) {
      return NextResponse.json({ error: "Station not found" }, { status: 404 });
    }

    // Get latest prices
    const prices = await db
      .select({
        fuelType: fuelPrice.fuelType,
        price: fuelPrice.price,
        updatedAt: fuelPrice.recordedAt,
      })
      .from(fuelPrice)
      .where(eq(fuelPrice.stationId, stmt.id));

    return NextResponse.json({
      id: stmt.dgegId,
      name: stmt.name,
      brand: stmt.brand,
      brandLogoUrl: stmt.brandLogoUrl,
      address: stmt.address,
      postalCode: stmt.postalCode,
      district: stmt.district,
      concelho: stmt.concelho,
      lat: Number(stmt.lat),
      lng: Number(stmt.lng),
      stationType: stmt.stationType,
      isOpen24h: stmt.isOpen24h,
      fuelTypes: stmt.fuelTypes,
      prices: prices.map((p) => ({
        fuelType: p.fuelType,
        price: Number(p.price) || 0,
        updatedAt: p.updatedAt,
      })),
    });
  } catch (err) {
    return NextResponse.json(
      { error: err instanceof Error ? err.message : "Unknown error" },
      { status: 500 }
    );
  }
}