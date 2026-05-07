import { db } from "@/db";
import { station, fuelPrice } from "@/db/schema";
import { eq, sql, desc, count } from "drizzle-orm";

const DISTRICTS = ["Aveiro","Beja","Braga","Bragança","Castelo Branco","Coimbra","Évora",
  "Faro","Guarda","Leiria","Lisboa","Portalegre","Porto","Santarém",
  "Setúbal","Viana do Castelo","Vila Real","Viseu"];

export function generateStaticParams() {
  return DISTRICTS.map((d) => ({ district: d.toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "").replace(/ç/g, "c") }));
}

export default async function DistrictPage({ params }: { params: Promise<{ district: string; locale: string }> }) {
  const { district, locale } = await params;
  const displayName = DISTRICTS.find((d) =>
    d.toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "").replace(/ç/g, "c") === district
  ) || district;

  // Fetch stations from this district with prices
  const stationsInDistrict = await db
    .select({
      id: station.id,
      dgegId: station.dgegId,
      name: station.name,
      brand: station.brand,
      address: station.address,
      district: station.district,
      lat: station.lat,
      lng: station.lng,
    })
    .from(station)
    .where(eq(station.district, displayName))
    .limit(50);

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
      <h1 className="text-2xl md:text-3xl font-bold mb-2">Postos em {displayName}</h1>
      <p className="text-gray-500 mb-6">{stationsInDistrict.length} postos encontrados</p>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-3 mb-8">
        {stationsInDistrict.slice(0, 20).map((s) => (
          <a key={s.id} href={`/${locale}/posto/${district}/${s.brand.toLowerCase()}-${s.dgegId}`}
            className="block p-4 rounded border border-gray-200 dark:border-gray-700 hover:border-brand-300 transition-colors">
            <div className="flex justify-between">
              <div>
                <p className="font-medium">{s.name}</p>
                <p className="text-xs text-gray-500">{s.brand} · {s.address}</p>
              </div>
            </div>
          </a>
        ))}
      </div>

      <div className="bg-white dark:bg-gray-800 rounded-lg border p-5">
        <h2 className="font-semibold mb-3">Todos os distritos</h2>
        <div className="flex flex-wrap gap-2 text-sm">
          {DISTRICTS.map((d) => {
            const slug = d.toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "").replace(/ç/g, "c");
            return (
              <a key={d} href={`/${locale}/distrito/${slug}`}
                className={`px-3 py-1 rounded-md ${slug === district ? "bg-brand-500 text-white" : "bg-gray-100 dark:bg-gray-700 hover:bg-gray-200"}`}>{d}</a>
            );
          })}
        </div>
      </div>
    </div>
  );
}