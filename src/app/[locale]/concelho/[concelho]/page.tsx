import { db } from "@/db";
import { station, fuelPrice } from "@/db/schema";
import { eq } from "drizzle-orm";

interface ConcData {
  concelho: string | null;
  stations: { id: string; name: string; brand: string; dgegId: number }[];
}

async function getConcelhoStations(concelho: string): Promise<ConcData> {
  const displayName = concelho.replace(/-/g, " ").replace(/\b\w/g, (c) => c.toUpperCase());
  const stationsInConcelho = await db
    .select({ id: station.id, name: station.name, brand: station.brand, dgegId: station.dgegId })
    .from(station)
    .where(eq(station.concelho, displayName))
    .limit(30);

  return { concelho: displayName, stations: stationsInConcelho };
}

export default async function ConcelhoPage({ params }: { params: Promise<{ concelho: string; locale: string }> }) {
  const { concelho, locale } = await params;
  const data = await getConcelhoStations(concelho);

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
      <h1 className="text-2xl md:text-3xl font-bold mb-2">Postos em {data.concelho}</h1>
      <p className="text-gray-500 mb-6">{data.stations.length} postos encontrados</p>

      <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-3">
        {data.stations.map((s) => (
          <a key={s.id} href={`/${locale}/posto/${s.dgegId}`}
            className="block p-4 rounded border border-gray-200 dark:border-gray-700 hover:border-brand-300 transition-colors">
            <p className="font-medium">{s.name}</p>
            <p className="text-xs text-gray-500">{s.brand}</p>
          </a>
        ))}
      </div>

      <p className="text-xs text-gray-400 mt-8 text-center">Dados da API Aberta / DGEG</p>
    </div>
  );
}