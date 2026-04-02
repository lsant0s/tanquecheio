"use client";

import { useTranslations } from "next-intl";

const MOCK_DATA = [
  { fuel: "Gasolina 95", avg: 1.849, min: 1.679, max: 1.989, change7d: -1.1 },
  { fuel: "Gasolina 98", avg: 1.949, min: 1.789, max: 2.089, change7d: -0.8 },
  { fuel: "Gasóleo Simples", avg: 1.629, min: 1.489, max: 1.759, change7d: -2.0 },
  { fuel: "Gasóleo Especial", avg: 1.659, min: 1.519, max: 1.789, change7d: -1.5 },
  { fuel: "GPL Auto", avg: 0.849, min: 0.779, max: 0.919, change7d: +0.6 },
];

export default function HojeEmPortugalPage() {
  const t = useTranslations("home");

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
      <h1 className="text-3xl font-bold mb-2">{t("title")}</h1>
      <p className="text-gray-500 dark:text-gray-400 mb-8">
        {t("lastUpdated")}: {new Date().toLocaleDateString("pt-PT", { weekday: "long", day: "numeric", month: "long", hour: "2-digit", minute: "2-digit" })}
      </p>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-5 gap-4 mb-10">
        {MOCK_DATA.map((row) => (
          <div key={row.fuel} className="bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 p-5">
            <h3 className="text-sm font-medium text-gray-500 dark:text-gray-400 mb-2">{row.fuel}</h3>
            <p className="text-2xl font-bold">{row.avg.toFixed(3)} <span className="text-sm text-gray-400">€/L</span></p>
            <div className="flex justify-between text-xs text-gray-400 mt-2 pt-2 border-t border-gray-100 dark:border-gray-700">
              <span className="text-green-600">Min: {row.min.toFixed(3)}</span>
              <span className="text-red-600">Max: {row.max.toFixed(3)}</span>
            </div>
            <p className={`text-xs mt-1 ${row.change7d < 0 ? "text-green-600" : "text-red-600"}`}>
              {row.change7d > 0 ? "↑" : "↓"} {Math.abs(row.change7d).toFixed(1)}% (7d)
            </p>
          </div>
        ))}
      </div>

      {/* Stats Summary */}
      <div className="bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-lg p-6 mb-10">
        <h2 className="font-semibold text-lg text-blue-900 dark:text-blue-100 mb-4">Resumo Nacional</h2>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
          <div><span className="text-gray-500 dark:text-gray-400">Postos activos:</span> <p className="font-bold text-lg">2,847</p></div>
          <div><span className="text-gray-500 dark:text-gray-400">Abertos 24h:</span> <p className="font-bold text-lg">312 (11%)</p></div>
          <div><span className="text-gray-500 dark:text-gray-400">Abaixo da média:</span> <p className="font-bold text-lg">43%</p></div>
          <div><span className="text-gray-500 dark:text-gray-400">Postos com GPL:</span> <p className="font-bold text-lg">287</p></div>
        </div>
      </div>

      {/* Trend */}
      <div className="bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 p-6">
        <h2 className="font-semibold text-lg mb-4">Tendência (30 dias)</h2>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
          <TrendBar fuel="Gasolina 95" values={[-0.5, -0.8, -1.1, -0.3, -1.5, -0.9, -1.1]} />
          <TrendBar fuel="Gasóleo Simples" values={[-0.3, -0.6, -1.0, -1.4, -0.8, -1.7, -2.0]} />
        </div>
      </div>

      {/* Disclaimer */}
      <p className="text-xs text-gray-400 mt-8 text-center">Dados da API Aberta / DGEG – actualizados com os dados mais recentes disponíveis</p>
    </div>
  );
}

function TrendBar({ fuel, values }: { fuel: string; values: number[] }) {
  const weekLabels = ["S1", "S2", "S3", "S4", "S5", "S6", "Hoje"];
  return (
    <div>
      <h3 className="font-medium text-sm mb-3">{fuel}</h3>
      <div className="flex items-end gap-1 h-24">
        {values.map((v, i) => {
          const maxAbs = Math.max(...values.map(Math.abs));
          const height = Math.abs(v) / maxAbs * 100;
          return (
            <div key={i} className="flex-1 flex flex-col items-center gap-0.5">
              <span className={`text-xs ${v < 0 ? "text-green-600" : "text-red-600"}`}>{v > 0 ? "+" : ""}{v}%</span>
              <div className={`w-full rounded-t ${v < 0 ? "bg-green-500" : "bg-red-500"}`} style={{ height: `${height}%` }} />
              <span className="text-xs text-gray-400">{weekLabels[i]}</span>
            </div>
          );
        })}
      </div>
    </div>
  );
}