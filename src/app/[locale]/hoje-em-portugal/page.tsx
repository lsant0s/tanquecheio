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

export default function HojeEmPortugalPage() {
  const t = useTranslations("home");
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

  if (loading) return <div className="max-w-7xl mx-auto px-4 py-16 text-center text-gray-500">A carregar...</div>;

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
      <h1 className="text-3xl font-bold mb-2">{t("title")}</h1>
      <p className="text-gray-500 dark:text-gray-400 mb-8">
        {t("lastUpdated")}: {new Date().toLocaleDateString("pt-PT", { weekday: "long", day: "numeric", month: "long", hour: "2-digit", minute: "2-digit" })}
      </p>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-5 gap-4 mb-10">
        {fuelData.map((row) => (
          <div key={row.fuelType} className="bg-white dark:bg-gray-800 rounded-lg border p-5">
            <h3 className="text-sm font-medium text-gray-500 dark:text-gray-400 mb-2">{row.fuelType}</h3>
            <p className="text-2xl font-bold">{row.avgPrice.toFixed(3)} <span className="text-sm text-gray-400">€/L</span></p>
            <div className="flex justify-between text-xs text-gray-400 mt-2 pt-2 border-t">
              <span className="text-green-600">Min: {row.minPrice.toFixed(3)}</span>
              <span className="text-red-600">Max: {row.maxPrice.toFixed(3)}</span>
            </div>
            <p className="text-xs text-gray-400 mt-1">{row.stationCount} postos</p>
          </div>
        ))}
      </div>

      <div className="bg-blue-50 dark:bg-blue-900/20 border border-blue-200 rounded-lg p-6 mb-10">
        <h2 className="font-semibold text-lg text-blue-900 dark:text-blue-100 mb-4">Resumo Nacional</h2>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
          <div><span className="text-gray-500">Postos activos:</span> <p className="font-bold text-lg">{totalStations}</p></div>
          <div><span className="text-gray-500">Tipos de combustível:</span> <p className="font-bold text-lg">{fuelData.length}</p></div>
          <div><span className="text-gray-500">Actualizado:</span> <p className="font-bold text-lg">{new Date().toLocaleDateString("pt-PT", { day: "2-digit", month: "short" })}</p></div>
        </div>
      </div>

      <div className="bg-white dark:bg-gray-800 rounded-lg border p-6">
        <h2 className="font-semibold text-lg mb-4">Tendência Nacional</h2>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
          {fuelData.slice(0, 4).map((f) => (
            <div key={f.fuelType}>
              <h3 className="font-medium text-sm mb-1">{f.fuelType}</h3>
              <div className="flex items-center gap-2">
                <div className="flex-1 h-3 bg-gray-200 dark:bg-gray-700 rounded-full overflow-hidden">
                  <div className="h-full bg-brand-500 rounded-full" style={{ width: `${Math.min(100, (f.avgPrice - f.minPrice) / (f.maxPrice - f.minPrice + 0.01) * 100)}%` }} />
                </div>
                <span className="text-xs text-gray-500 w-20 text-right">{f.avgPrice.toFixed(3)} €</span>
              </div>
            </div>
          ))}
        </div>
      </div>

      <p className="text-xs text-gray-400 mt-8 text-center">Dados da API Aberta / DGEG – actualizados com os dados mais recentes disponíveis</p>
    </div>
  );
}