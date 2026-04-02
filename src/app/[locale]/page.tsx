"use client";

import { useTranslations } from "next-intl";
import { useState } from "react";

// Mock data for V1 — will be replaced with real DB queries
const MOCK_FUEL_PRICES = [
  { fuelType: "Gasolina 95", avgPrice: 1.849, minPrice: 1.679, maxPrice: 1.989, change7d: -0.021, changePct7d: -1.12 },
  { fuelType: "Gasolina 98", avgPrice: 1.949, minPrice: 1.789, maxPrice: 2.089, change7d: -0.015, changePct7d: -0.76 },
  { fuelType: "Gasóleo Simples", avgPrice: 1.629, minPrice: 1.489, maxPrice: 1.759, change7d: -0.033, changePct7d: -1.99 },
  { fuelType: "GPL Auto", avgPrice: 0.849, minPrice: 0.779, maxPrice: 0.919, change7d: 0.005, changePct7d: 0.59 },
];

const MOCK_BIGGEST_DROPS = [
  { station: "Galp - Campo Grande", district: "Lisboa", fuelType: "Gasóleo Simples", price: 1.489, drop: 0.050, dropPct: 3.25, brand: "Galp" },
  { station: "BP - Matosinhos", district: "Porto", fuelType: "Gasolina 95", price: 1.679, drop: 0.040, dropPct: 2.33, brand: "BP" },
  { station: "Repsol - Coimbra", district: "Coimbra", fuelType: "Gasóleo Simples", price: 1.499, drop: 0.045, dropPct: 2.92, brand: "Repsol" },
  { station: "Prio - Faro", district: "Faro", fuelType: "Gasolina 95", price: 1.689, drop: 0.038, dropPct: 2.21, brand: "Prio" },
  { station: "Cepsa - Braga", district: "Braga", fuelType: "Gasóleo Simples", price: 1.509, drop: 0.035, dropPct: 2.27, brand: "Cepsa" },
];

export default function Home() {
  const t = useTranslations("home");
  const [tankSize, setTankSize] = useState(45);

  const fuelTypeLabel = (name: string) => {
    const labels: Record<string, string> = {
      "Gasolina 95": "Gasolina 95",
      "Gasolina 98": "Gasolina 98",
      "Gasóleo Simples": "Gasóleo Simples",
      "GPL Auto": "GPL Auto",
    };
    return labels[name] || name;
  };

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
      {/* Hero Section */}
      <section className="mb-10 text-center">
        <h1 className="text-3xl md:text-4xl font-bold text-gray-900 dark:text-gray-100 mb-2">
          {t("title")}
        </h1>
        <p className="text-gray-500 dark:text-gray-400">
          {t("lastUpdated")}: {new Date().toLocaleDateString("pt-PT", { weekday: "long", day: "numeric", month: "long", year: "numeric" })}
        </p>
      </section>

      {/* National Averages */}
      <section className="mb-10">
        <h2 className="text-xl font-semibold mb-4 text-gray-800 dark:text-gray-200">{t("nationalAvg")}</h2>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          {MOCK_FUEL_PRICES.map((fuel) => (
            <FuelPriceCard key={fuel.fuelType} fuel={fuel} tankSize={tankSize} fuelTypeLabel={fuelTypeLabel} />
          ))}
        </div>
      </section>

      {/* Biggest Drops */}
      <section className="mb-10">
        <h2 className="text-xl font-semibold mb-4 text-gray-800 dark:text-gray-200">
          🔥 Maiores Baixas de Hoje
        </h2>
        <div className="bg-white dark:bg-gray-800 rounded-lg shadow-sm border border-gray-200 dark:border-gray-700 overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-sm text-left">
              <thead className="bg-gray-50 dark:bg-gray-750 text-gray-500 dark:text-gray-400 uppercase text-xs">
                <tr>
                  <th className="px-4 py-3">Posto</th>
                  <th className="px-4 py-3">Distrito</th>
                  <th className="px-4 py-3">Combustível</th>
                  <th className="px-4 py-3 text-right">Preço</th>
                  <th className="px-4 py-3 text-right">Baixa</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100 dark:divide-gray-700">
                {MOCK_BIGGEST_DROPS.map((item, i) => (
                  <tr key={i} className="hover:bg-gray-50 dark:hover:bg-gray-750 transition-colors">
                    <td className="px-4 py-3 font-medium">{item.station}</td>
                    <td className="px-4 py-3 text-gray-500 dark:text-gray-400">{item.district}</td>
                    <td className="px-4 py-3">{fuelTypeLabel(item.fuelType)}</td>
                    <td className="px-4 py-3 text-right font-bold">{item.price.toFixed(3)} €</td>
                    <td className="px-4 py-3 text-right text-green-600 dark:text-green-400">
                      ↓ {item.dropPct.toFixed(1)}% ({item.drop.toFixed(2)}€)
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </section>

      {/* Savings Calculator */}
      <section className="mb-10">
        <h2 className="text-xl font-semibold mb-4 text-gray-800 dark:text-gray-200">
          {t("savingsCalculator")}
        </h2>
        <div className="bg-white dark:bg-gray-800 rounded-lg shadow-sm border border-gray-200 dark:border-gray-700 p-6">
          <div className="flex flex-col sm:flex-row items-start sm:items-center gap-4">
            <div>
              <label htmlFor="tankSize" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                {t("tankSize")} (L)
              </label>
              <input
                id="tankSize"
                type="number"
                min={10}
                max={100}
                value={tankSize}
                onChange={(e) => setTankSize(Number(e.target.value))}
                className="w-24 px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100 focus:ring-2 focus:ring-brand-500 focus:border-transparent"
              />
            </div>
            <div className="text-sm text-gray-500 dark:text-gray-400">
              <p><strong>Potencial poupança vs maior preço:</strong></p>
              <p className="text-green-600 dark:text-green-400 font-semibold mt-1">
                Até {((MOCK_FUEL_PRICES[2].maxPrice - MOCK_FUEL_PRICES[2].minPrice) * tankSize / 100).toFixed(2)}€ por depósito (Gasóleo Simples)
              </p>
            </div>
          </div>
        </div>
      </section>
    </div>
  );
}

function FuelPriceCard({ fuel, tankSize, fuelTypeLabel }: { fuel: typeof MOCK_FUEL_PRICES[0]; tankSize: number; fuelTypeLabel: (n: string) => string }) {
  const changeColor = fuel.changePct7d < 0 ? "text-green-600 dark:text-green-400" : "text-red-600 dark:text-red-400";
  const changeArrow = fuel.changePct7d < 0 ? "↓" : "↑";

  return (
    <div className="bg-white dark:bg-gray-800 rounded-lg shadow-sm border border-gray-200 dark:border-gray-700 p-5">
      <div className="flex items-baseline justify-between mb-2">
        <h3 className="text-sm font-medium text-gray-500 dark:text-gray-400">{fuelTypeLabel(fuel.fuelType)}</h3>
      </div>
      <p className="text-3xl font-bold text-gray-900 dark:text-gray-100 mb-1">
        {fuel.avgPrice.toFixed(3)} <span className="text-lg text-gray-500">€/L</span>
      </p>
      <p className={`text-sm ${changeColor} mb-3`}>
        {changeArrow} {fuel.changePct7d.toFixed(1)}% (7 dias)
      </p>
      <div className="flex justify-between text-xs text-gray-400 dark:text-gray-500 pt-3 border-t border-gray-100 dark:border-gray-700">
        <span>Min: {fuel.minPrice.toFixed(3)} €</span>
        <span>Max: {fuel.maxPrice.toFixed(3)} €</span>
      </div>
      <p className="text-xs text-gray-400 dark:text-gray-500 mt-2">
        Poupança vs max: {((fuel.maxPrice - fuel.minPrice) * tankSize / 100).toFixed(2)}€ (depósito {tankSize}L)
      </p>
    </div>
  );
}