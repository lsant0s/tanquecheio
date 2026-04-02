import { NextRequest, NextResponse } from "next/server";
import { db } from "@/db";
import { fuelForecast, syncLog } from "@/db/schema";
import { eq } from "drizzle-orm";

/**
 * GET /api/forecast — Returns current week's forecast for the /proxima-semana page
 */
export async function GET() {
  try {
    const forecasts = await db.query.fuelForecast.findMany({
      orderBy: (f, { desc }) => [desc(f.publishedAt)],
      limit: 10,
    });

    if (!forecasts.length) {
      return NextResponse.json({ forecast: null }, { status: 200 });
    }

    return NextResponse.json({ forecast: forecasts });
  } catch {
    // If Drizzle query fails (no DB connected yet), return mock data for V1
    const mockForecast = {
      fuelTypes: [
        {
          fuelType: "Gasolina 95",
          direction: "stable" as const,
          estimatedChangeEur: 0.005,
        },
        {
          fuelType: "Gasóleo Simples",
          direction: "down" as const,
          estimatedChangeEur: -0.008,
        },
      ],
      weekOf: new Date().toISOString(),
    };
    return NextResponse.json({ forecast: mockForecast });
  }
}

/**
 * POST /api/forecast — Vercel Cron job, every Friday at 5pm UTC
 * Computes weekly fuel price forecast using Brent crude + EUR/USD
 */
export async function POST(request: NextRequest) {
  const cronSecret = request.headers.get("x-cron-secret") || request.nextUrl.searchParams.get("cron_secret");
  if (cronSecret !== process.env.CRON_SECRET) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const startedAt = new Date();

  try {
    // Step 1: Fetch Brent weekly average from EIA API
    const eiaApiKey = process.env.EIA_API_KEY;
    if (!eiaApiKey) throw new Error("EIA_API_KEY not configured");

    const brentResponse = await fetch(
      `https://api.eia.gov/v2/seriesid/PET.RBRTE.D/data/?api_key=${eiaApiKey}&sort[0][column]=period&sort[0][direction]=desc&offset=0&length=14`,
      { signal: AbortSignal.timeout(15000) }
    );

    if (!brentResponse.ok) throw new Error("EIA API request failed");
    const brentData = await brentResponse.json();
    const brentValues = brentData.response?.data || [];

    // This week's average (last 7 values)
    const thisWeekBrent =
      brentValues.slice(0, 7).reduce((sum: number, d: any) => sum + parseFloat(d.value || 0), 0) / 7;

    // Previous week's average from DB
    const lastForecast = await db.query.fuelForecast.findFirst({
      orderBy: (f, { desc }) => [desc(f.publishedAt)],
    });
    const prevBrent =
      lastForecast?.brentWeeklyAvg ? parseFloat(lastForecast.brentWeeklyAvg as string) : thisWeekBrent;

    // Step 2: Fetch EUR/USD rate (free, no auth)
    const fxResponse = await fetch("https://api.frankfurter.dev/v2/rates/latest?base=USD&symbols=EUR", {
      signal: AbortSignal.timeout(10000),
    });
    const fxData = await fxResponse.json();
    const eurUsdRate = fxResponse.ok ? fxData.rates?.EUR || 0.92 : 0.92;

    // Step 3: Compute combined signal (Brent % change for V1)
    const brentChangePct = prevBrent > 0 ? ((thisWeekBrent - prevBrent) / prevBrent) * 100 : 0;
    const combinedSignalPct = brentChangePct;

    // Step 4: Determine direction
    let direction: "up" | "down" | "stable" = "stable";
    let estimatedChangeEur = 0.0;

    if (combinedSignalPct > 2) {
      direction = "up";
      estimatedChangeEur = 0.02 + (combinedSignalPct - 2) * 0.005;
    } else if (combinedSignalPct < -2) {
      direction = "down";
      estimatedChangeEur = -(0.02 + Math.abs(combinedSignalPct + 2) * 0.005);
    } else {
      direction = "stable";
      estimatedChangeEur = 0.01;
    }

    // Next Monday
    const now = new Date();
    const nextWeek = new Date();
    const dayOfWeek = now.getDay();
    const daysUntilMonday = dayOfWeek === 0 ? 1 : dayOfWeek === 1 ? 0 : 8 - dayOfWeek;
    nextWeek.setDate(now.getDate() + daysUntilMonday);
    nextWeek.setHours(0, 0, 0, 0);

    // Step 5: Write forecast rows for both V1 fuel types
    const fuelTypesV1 = ["Gasolina 95", "Gasóleo Simples"];
    for (const ft of fuelTypesV1) {
      await db
        .insert(fuelForecast)
        .values({
          publishedAt: now,
          weekOf: nextWeek,
          fuelType: ft,
          direction,
          estimatedChangeEur: Math.abs(estimatedChangeEur).toFixed(4),
          brentWeeklyAvg: thisWeekBrent.toFixed(2),
          brentPrevWeeklyAvg: prevBrent.toFixed(2),
          eurUsdRate: eurUsdRate.toFixed(4),
          combinedSignalPct: combinedSignalPct.toFixed(2),
        })
        .onConflictDoNothing();
    }

    console.log("[forecast] Published:", direction, "signal:", combinedSignalPct.toFixed(2) + "%");

    await db.insert(syncLog).values({
      startedAt,
      completedAt: new Date(),
      syncType: "forecast",
      status: "success",
    });

    return NextResponse.json({
      direction,
      signal: combinedSignalPct,
      weekOf: nextWeek.toISOString(),
    });
  } catch (err) {
    const errorMessage = err instanceof Error ? err.message : "Unknown error";
    console.error("[forecast] Error:", errorMessage);

    await db.insert(syncLog).values({
      startedAt,
      completedAt: new Date(),
      syncType: "forecast",
      status: "failed",
      errorMessage,
    });

    return NextResponse.json({ error: errorMessage }, { status: 500 });
  }
}