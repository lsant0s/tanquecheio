import { NextRequest, NextResponse } from "next/server";
import { db } from "@/db";
import { syncLog, station, fuelPrice, fuelForecast } from "@/db/schema";
import { desc, sql, count } from "drizzle-orm";

/**
 * GET /api/admin/status
 * Protected by CRON_SECRET
 * Returns sync status, station count, last sync timestamp
 */
export async function GET(request: NextRequest) {
  // Auth check
  const authHeader = request.headers.get("authorization");
  const cronSecret = request.nextUrl.searchParams.get("cron_secret");

  if (authHeader !== `Bearer ${process.env.CRON_SECRET}` && cronSecret !== process.env.CRON_SECRET) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    // Get latest sync log per sync_type
    const latestSyncs = await db.select().from(syncLog).orderBy(desc(syncLog.startedAt)).limit(5);

    // Get station count
    const stationCount = await db.select({ count: count() }).from(station);

    // Get latest fuel price timestamp
    const latestPrice = await db.select().from(fuelPrice).orderBy(desc(fuelPrice.recordedAt)).limit(1);

    // Get latest forecast
    const latestForecast = await db.select().from(fuelForecast).orderBy(desc(fuelForecast.publishedAt)).limit(1);

    // Determine overall health
    const latestDgegSync = latestSyncs.find((s) => s.syncType === "dgeg_sync");
    const isHealthy = !!(
      latestDgegSync &&
      latestDgegSync.status === "success" &&
      latestDgegSync.completedAt
    );

    // Check if sync is stale (> 25 hours old)
    const lastSyncTime = latestDgegSync?.completedAt;
    const isStale = lastSyncTime ? (Date.now() - lastSyncTime.getTime()) > 25 * 60 * 60 * 1000 : true;

    return NextResponse.json({
      status: isStale ? "stale" : isHealthy ? "healthy" : "unhealthy",
      lastDgegSync: latestDgegSync
        ? {
            startedAt: latestDgegSync.startedAt,
            completedAt: latestDgegSync.completedAt,
            stationsAttempted: latestDgegSync.stationsAttempted,
            stationsSynced: latestDgegSync.stationsSynced,
            status: latestDgegSync.status,
            errorMessage: latestDgegSync.errorMessage,
            duration: latestDgegSync.completedAt
              ? `${((latestDgegSync.completedAt.getTime() - latestDgegSync.startedAt.getTime()) / 1000).toFixed(1)}s`
              : null,
          }
        : null,
      latestForecast: latestForecast[0]
        ? {
            publishedAt: latestForecast[0].publishedAt,
            weekOf: latestForecast[0].weekOf,
            direction: latestForecast[0].direction,
            fuelTypes: latestForecast.map((f) => f.fuelType),
          }
        : null,
      stationCount: stationCount[0]?.count || 0,
      latestPriceAt: latestPrice[0]?.recordedAt || null,
      uptime: process.uptime(),
    });
  } catch (err) {
    return NextResponse.json(
      {
        status: "unhealthy",
        error: err instanceof Error ? err.message : "Unknown error",
      },
      { status: 500 }
    );
  }
}