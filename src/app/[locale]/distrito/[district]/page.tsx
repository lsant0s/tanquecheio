import { getTranslations } from "next-intl/server";

interface StationInfo { station: string; price: number; address: string; brand: string }
interface FuelRow { fuelType: string; avg: number; min: number; max: number }

const DISTRICTS = ["Lisboa", "Porto", "Faro", "Braga", "Coimbra", "Aveiro", "Setúbal", "Leiria", "Viseu", "Santarém", "Évora", "Beja", "Castelo Branco", "Guarda", "Viana do Castelo", "Vila Real", "Bragança", "Portalegre"];

export function generateStaticParams() {
  return DISTRICTS.map((d) => ({ district: d.toLowerCase().replace(/\s/g, "-") }));
}

const MOCK_DATA: { avgPrice: number; stationCount: number; open24h: number; cheapest: StationInfo[]; priceByFuel: FuelRow[] } = {
  avgPrice: 1.829, stationCount: 487, open24h: 52,
  cheapest: [
    { station: "Prio - Loures", price: 1.569, address: "EN 10, Loures", brand: "Prio" },
    { station: "Galp - Odivelas", price: 1.579, address: "Av. Combatentes", brand: "Galp" },
    { station: "BP - Amadora", price: 1.589, address: "Rua da Amadora", brand: "BP" },
    { station: "Repsol - Cascais", price: 1.599, address: "A5, Cascais", brand: "Repsol" },
    { station: "Cepsa - Sintra", price: 1.609, address: "IC19, Sintra", brand: "Cepsa" },
  ],
  priceByFuel: [
    { fuelType: "Gasolina 95", avg: 1.849, min: 1.679, max: 1.989 },
    { fuelType: "Gasolina 98", avg: 1.949, min: 1.789, max: 2.089 },
    { fuelType: "Gasóleo Simples", avg: 1.629, min: 1.489, max: 1.759 },
    { fuelType: "GPL Auto", avg: 0.849, min: 0.779, max: 0.919 },
  ],
};

export default async function DistrictPage({ params }: { params: Promise<{ district: string; locale: string }> }) {
  const { district, locale } = await params;
  const displayName = district.replace(/-/g, " ").replace(/\b\w/g, (c) => c.toUpperCase());

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
      <h1 className="text-2xl md:text-3xl font-bold mb-2">Postos mais baratos em {displayName}</h1>
      <p className="text-gray-500 dark:text-gray-400 mb-6">
        Preço médio: {MOCK_DATA.avgPrice.toFixed(3)} €/L · {MOCK_DATA.stationCount} postos · {MOCK_DATA.open24h} abertos 24h
      </p>
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
        <div className="bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 p-5">
          <h2 className="font-semibold mb-3">Preços em {displayName}</h2>
          <div className="space-y-2 text-sm">{MOCK_DATA.priceByFuel.map((row) => (
            <div key={row.fuelType} className="flex justify-between">
              <span>{row.fuelType}</span>
              <div className="text-right">
                <span className="font-bold">{row.avg.toFixed(3)} €</span>
                <span className="text-xs text-gray-400 ml-2">({row.min.toFixed(2)} → {row.max.toFixed(2)})</span>
              </div>
            </div>
          ))}</div>
        </div>
        <div className="md:col-span-2 bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 p-5">
          <h2 className="font-semibold mb-3">5 Postos mais baratos</h2>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">{MOCK_DATA.cheapest.map((s, i) => (
            <a key={i} href={`/${locale}/posto/${district}/${s.brand.toLowerCase()}-${i}`} className="block p-3 rounded border border-gray-100 dark:border-gray-700 hover:border-brand-300 transition-colors">
              <div className="flex justify-between">
                <div><p className="font-medium">{s.station}</p><p className="text-xs text-gray-500">{s.address}</p></div>
                <span className="font-bold text-green-600">{s.price.toFixed(3)} €</span>
              </div>
            </a>
          ))}</div>
        </div>
      </div>
      <div className="bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 p-5">
        <h2 className="font-semibold mb-3">Todos os distritos</h2>
        <div className="flex flex-wrap gap-2 text-sm">{DISTRICTS.map((d) => (
          <a key={d} href={`/${locale}/distrito/${d.toLowerCase().replace(/\s/g, "-")}`} className={`px-3 py-1 rounded-md ${d.toLowerCase().replace(/\s/g, "-") === district ? "bg-brand-500 text-white" : "bg-gray-100 dark:bg-gray-700 hover:bg-gray-200"}`}>{d}</a>
        ))}</div>
      </div>
    </div>
  );
}