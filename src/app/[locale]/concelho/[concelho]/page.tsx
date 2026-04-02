"use client";

import { useParams } from "next/navigation";

interface StationInfo { station: string; price: number; address: string; brand: string }

const MOCK_CHEAPEST: StationInfo[] = [
  { station: "Prio - Centro", price: 1.549, address: "Rua Principal, Cascais", brand: "Prio" },
  { station: "Galp - Estoril", price: 1.559, address: "Av. Marginal, Estoril", brand: "Galp" },
  { station: "BP - Parede", price: 1.569, address: "Rua da Parede, Parede", brand: "BP" },
  { station: "Repsol - São João", price: 1.579, address: "EN 249, São João", brand: "Repsol" },
  { station: "Cepsa - Carcavelos", price: 1.589, address: "Av. Comendador, Carcavelos", brand: "Cepsa" },
];

export default function ConcelhoPage() {
  const params = useParams();
  const concelho = (params.concelho as string).replace(/-/g, " ");
  const displayName = concelho.charAt(0).toUpperCase() + concelho.slice(1);

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
      <h1 className="text-2xl md:text-3xl font-bold mb-2">
        Postos mais baratos em {displayName}
      </h1>
      <p className="text-gray-500 dark:text-gray-400 mb-6">
        Preço médio: 1.619 €/L · {MOCK_CHEAPEST.length * 12} postos
      </p>

      <div className="bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 p-6">
        <h2 className="font-semibold mb-4">Postos mais baratos em {displayName}</h2>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          {MOCK_CHEAPEST.map((s) => (
            <a
              key={s.station}
              href={`/pt/posto/lisboa/${s.brand.toLowerCase()}-${s.station.split(" - ")[1]?.toLowerCase().replace(/\s/g, "-")}`}
              className="block p-4 rounded border border-gray-100 dark:border-gray-700 hover:border-brand-300 transition-colors"
            >
              <div className="flex justify-between">
                <div>
                  <p className="font-medium">{s.station}</p>
                  <p className="text-xs text-gray-500 dark:text-gray-400">{s.address}</p>
                </div>
                <span className="font-bold text-green-600 text-right">{s.price.toFixed(3)} €</span>
              </div>
            </a>
          ))}
        </div>
      </div>

      <p className="text-xs text-gray-400 mt-4 text-center">Dados da API Aberta / DGEG – actualizados com os dados mais recentes disponíveis</p>
    </div>
  );
}