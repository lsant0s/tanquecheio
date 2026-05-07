"use client";

import { useTranslations } from "next-intl";
import { useState, useEffect } from "react";

interface FuelStat {
  fuelType: string;
  avgPrice: number;
  minPrice: number;
  maxPrice: number;
  stationCount: number;
}

export default function Home() {
  const t = useTranslations("home");
  const [tankSize, setTankSize] = useState(45);
  const [fuelData, setFuelData] = useState<FuelStat[]>([]);
  const [totalStations, setTotalStations] = useState(0);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch("/api/stats")
      .then((r) => r.json())
      .then((data) => {
        setFuelData(data.nationalAverages || []);
        setTotalStations(data.totalStations || 0);
        setLoading(false);
      })
      .catch(() => setLoading(false));
  }, []);

  const fuelEmoji = (ft: string) => {
    if (ft.includes("Gasolina") || ft.includes("gasolina")) return "⛽";
    if (ft.includes("Gasóleo") || ft.includes("gasóleo")) return "🛢️";
    if (ft.includes("GPL") || ft.includes("gpl")) return "🔥";
    return "⛽";
  };

  if (loading) {
    return <div className="max-w-7xl mx-auto px-4 py-16 text-center text-gray-500">A carregar dados...</div>;
  }

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
      <section className="mb-10 text-center">
        <h1 className="text-3xl md:text-4xl font-bold mb-2">{t("title")}</h1>
        <p className="text-gray-500 dark:text-gray-400">
          {t("lastUpdated")}: {new Date().toLocaleDateString("pt-PT", { weekday: "long", day: "numeric", month: "long", year: "numeric" })}
        </p>
      </section>

      <section className="mb-10">
        <h2 className="text-xl font-semibold mb-4">{t("nationalAvg")}</h2>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          {fuelData.map((f) => (
            <div key={f.fuelType} className="bg-white dark:bg-gray-800 rounded-lg shadow-sm border border-gray-200 dark:border-gray-700 p-5">
              <div className="flex items-baseline justify-between mb-2">
                <h3 className="text-sm font-medium text-gray-500 dark:text-gray-400">{fuelEmoji(f.fuelType)} {f.fuelType}</h3>
                <span className="text-xs text-gray-400">{f.stationCount} postos</span>
              </div>
              <p className="text-3xl font-bold mb-1">
                {f.avgPrice.toFixed(3)} <span className="text-lg text-gray-500">€/L</span>
              </p>
              <div className="flex justify-between text-xs text-gray-400 pt-3 border-t border-gray-100 dark:border-gray-700">
                <span className="text-green-600">Min: {f.minPrice.toFixed(3)} €</span>
                <span className="text-red-600">Max: {f.maxPrice.toFixed(3)} €</span>
              </div>
              <p className="text-xs text-gray-400 mt-2">
                Poupança vs max: {((f.maxPrice - f.minPrice) * tankSize / 100).toFixed(2)}€ (depósito {tankSize}L)
              </p>
            </div>
          ))}
        </div>
      </section>

      <section className="mb-10">
        <h2 className="text-xl font-semibold mb-2">{t("savingsCalculator")}</h2>
        <div className="bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 p-6">
          <div className="flex flex-col sm:flex-row items-start sm:items-center gap-4">
            <div>
              <label htmlFor="tankSize" className="block text-sm font-medium mb-1">{t("tankSize")} (L)</label>
              <input id="tankSize" type="number" min={10} max={100} value={tankSize} onChange={(e) => setTankSize(Number(e.target.value))}
                className="w-24 px-3 py-2 border rounded-md dark:bg-gray-700 dark:border-gray-600" />
            </div>
            {fuelData.length > 0 && (
              <div className="text-sm text-gray-500">
                <p><strong>Gasóleo Simples:</strong> A poupar até {((fuelData.find(f => f.fuelType.includes("Gasóleo"))?.maxPrice || 2) - (fuelData.find(f => f.fuelType.includes("Gasóleo"))?.minPrice || 1)) * tankSize / 100}€ por depósito</p>
                <p><strong>Gasolina 95:</strong> A poupar até {((fuelData.find(f => f.fuelType.includes("Gasolina 95"))?.maxPrice || 2) - (fuelData.find(f => f.fuelType.includes("Gasolina 95"))?.minPrice || 1)) * tankSize / 100}€ por depósito</p>
              </div>
            )}
          </div>
        </div>
      </section>

      <p className="text-xs text-gray-400 text-center mt-8">
        {t("lastUpdated")}: {new Date().toLocaleString("pt-PT")} · {totalStations} postos em todo o país
      </p>
    </div>
  );
}