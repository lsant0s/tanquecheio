"use client";

import { useParams } from "next/navigation";
import { useTranslations } from "next-intl";
import { useState } from "react";

// Mock station data - will be replaced with DB query
const MOCK_STATION = {
  id: "66647",
  name: "Galp - Campo Grande",
  brand: "Galp",
  address: "Av. de Roma, 123, 1000-000 Lisboa",
  district: "Lisboa",
  concelho: "Lisboa",
  lat: 38.7436,
  lng: -9.1496,
  stationType: "urban",
  isOpen24h: true,
  openingHours: "24 horas",
  phone: "+351 21 123 4567",
  amenities: ["Loja", "Lavagem", "ATM", "AdBlue"],
  paymentMethods: ["Cartão", "Multibanco", "App"],
  fuelTypes: ["Gasolina 95", "Gasolina 98", "Gasóleo Simples", "GPL Auto"],
  prices: [
    { fuelType: "Gasolina 95", price: 1.849, trend7d: -0.021 },
    { fuelType: "Gasolina 98", price: 1.949, trend7d: -0.015 },
    { fuelType: "Gasóleo Simples", price: 1.629, trend7d: -0.033 },
    { fuelType: "GPL Auto", price: 0.849, trend7d: 0.005 },
  ],
  history: [
    // mock 30-day history for Gasolina 95
    { date: "2026-03-03", prices: { "Gasolina 95": 1.870, "Gasóleo Simples": 1.662 } },
    { date: "2026-03-10", prices: { "Gasolina 95": 1.865, "Gasóleo Simples": 1.655 } },
    { date: "2026-03-17", prices: { "Gasolina 95": 1.858, "Gasóleo Simples": 1.645 } },
    { date: "2026-03-24", prices: { "Gasolina 95": 1.852, "Gasóleo Simples": 1.638 } },
    { date: "2026-03-31", prices: { "Gasolina 95": 1.849, "Gasóleo Simples": 1.629 } },
  ],
};

export default function StationDetailPage() {
  const params = useParams();
  const t = useTranslations("station");
  const [selectedFuel, setSelectedFuel] = useState("Gasolina 95");

  const priceHistory = MOCK_STATION.history;
  const currentPrice = MOCK_STATION.prices.find((p) => p.fuelType === selectedFuel);

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
      {/* Breadcrumb */}
      <nav className="text-sm text-gray-500 dark:text-gray-400 mb-4">
        <a href="/pt" className="hover:underline">Início</a>
        {" > "}
        <a href={`/pt/distrito/${MOCK_STATION.district.toLowerCase()}`} className="hover:underline">{MOCK_STATION.district}</a>
        {" > "}
        <span className="text-gray-900 dark:text-gray-100">{MOCK_STATION.name}</span>
      </nav>

      {/* Station Header */}
      <div className="bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 p-6 mb-6">
        <div className="flex flex-col md:flex-row md:justify-between md:items-start gap-4">
          <div>
            <h1 className="text-2xl font-bold text-gray-900 dark:text-gray-100">{MOCK_STATION.name}</h1>
            <p className="text-gray-500 dark:text-gray-400 mt-1">📍 {MOCK_STATION.address}</p>
            <div className="flex gap-2 mt-3">
              {MOCK_STATION.isOpen24h && (
                <span className="px-2 py-1 bg-green-100 dark:bg-green-900/30 text-green-700 dark:text-green-300 text-xs rounded-full font-medium">24h</span>
              )}
              <span className="px-2 py-1 bg-gray-100 dark:bg-gray-700 text-gray-600 dark:text-gray-300 text-xs rounded-full">
                {MOCK_STATION.stationType === "urban" ? "Urbano" : MOCK_STATION.stationType === "highway" ? "Área de Serviço" : "Outro"}
              </span>
            </div>
          </div>
          <div className="flex gap-2">
            <a
              href={`https://www.google.com/maps/dir/?api=1&destination=${MOCK_STATION.lat},${MOCK_STATION.lng}`}
              target="_blank"
              rel="noopener noreferrer"
              className="px-4 py-2 bg-blue-500 text-white rounded-md hover:bg-blue-600 transition-colors text-sm"
            >
              📍 Google Maps
            </a>
            <a
              href={`https://waze.com/ul?ll=${MOCK_STATION.lat},${MOCK_STATION.lng}&navigate=yes`}
              target="_blank"
              rel="noopener noreferrer"
              className="px-4 py-2 bg-purple-500 text-white rounded-md hover:bg-purple-600 transition-colors text-sm"
            >
              🚗 Waze
            </a>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-6">
        {/* Current Prices */}
        <div className="bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 p-6">
          <h2 className="text-lg font-semibold mb-4">{t("fuelPrices")}</h2>
          <div className="space-y-3">
            {MOCK_STATION.prices.map((p) => (
              <div key={p.fuelType} className="flex justify-between items-center">
                <span className="text-sm font-medium">{p.fuelType}</span>
                <div className="text-right">
                  <span className="font-bold text-lg">{p.price.toFixed(3)} €/L</span>
                  <p className={`text-xs ${p.trend7d < 0 ? "text-green-600" : "text-red-600"}`}>
                    {p.trend7d > 0 ? "↑" : "↓"} {(Math.abs(p.trend7d / p.price) * 100).toFixed(1)}%
                  </p>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Station Info */}
        <div className="bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 p-6">
          <h2 className="text-lg font-semibold mb-4">Informações</h2>
          <dl className="space-y-3 text-sm">
            <div className="flex justify-between">
              <dt className="text-gray-500 dark:text-gray-400">Marca</dt>
              <dd className="font-medium">{MOCK_STATION.brand}</dd>
            </div>
            <div className="flex justify-between">
              <dt className="text-gray-500 dark:text-gray-400">Horário</dt>
              <dd className="font-medium">{MOCK_STATION.isOpen24h ? "24 horas" : MOCK_STATION.openingHours}</dd>
            </div>
            {MOCK_STATION.phone && (
              <div className="flex justify-between">
                <dt className="text-gray-500 dark:text-gray-400">Telefone</dt>
                <dd className="font-medium">{MOCK_STATION.phone}</dd>
              </div>
            )}
            {MOCK_STATION.paymentMethods.length > 0 && (
              <div>
                <dt className="text-gray-500 dark:text-gray-400">{t("paymentMethods")}</dt>
                <dd className="flex flex-wrap gap-1 mt-1">
                  {MOCK_STATION.paymentMethods.map((m) => (
                    <span key={m} className="px-2 py-0.5 bg-gray-100 dark:bg-gray-700 rounded text-xs">{m}</span>
                  ))}
                </dd>
              </div>
            )}
            {MOCK_STATION.amenities.length > 0 && (
              <div>
                <dt className="text-gray-500 dark:text-gray-400">{t("amenities")}</dt>
                <dd className="flex flex-wrap gap-1 mt-1">
                  {MOCK_STATION.amenities.map((a) => (
                    <span key={a} className="px-2 py-0.5 bg-gray-100 dark:bg-gray-700 rounded text-xs">{a}</span>
                  ))}
                </dd>
              </div>
            )}
          </dl>
        </div>
      </div>

      {/* Price History Graph */}
      <div className="bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 p-6 mb-6">
        <div className="flex justify-between items-center mb-6">
          <h2 className="text-lg font-semibold">{t("priceHistory")}</h2>
          <select
            value={selectedFuel}
            onChange={(e) => setSelectedFuel(e.target.value)}
            className="px-3 py-1 border rounded-md text-sm dark:bg-gray-700"
          >
            {MOCK_STATION.fuelTypes.map((ft) => (
              <option key={ft} value={ft}>{ft}</option>
            ))}
          </select>
        </div>
        <div className="flex items-end gap-2 h-40">
          {priceHistory.map((entry, i) => {
            const price = entry.prices[selectedFuel as keyof typeof entry.prices];
            if (!price) return null;
            const maxPrice = Math.max(...priceHistory.map((h) => h.prices[selectedFuel as keyof typeof h.prices] || 0));
            const minPrice = Math.min(...priceHistory.map((h) => h.prices[selectedFuel as keyof typeof h.prices] || 999));
            const height = maxPrice > 0 ? ((price - minPrice) / (maxPrice - minPrice + 0.001)) * 100 + 20 : 50;
            return (
              <div key={i} className="flex-1 flex flex-col items-center gap-1">
                <span className="text-xs text-gray-500">{price.toFixed(3)}€</span>
                <div className="w-full bg-brand-500 rounded-t" style={{ height: `${height}%` }} />
                <span className="text-xs text-gray-400">{new Date(entry.date).toLocaleDateString("pt-PT", { day: "2-digit", month: "short" })}</span>
              </div>
            );
          })}
        </div>
        <p className="text-xs text-gray-400 mt-4 text-right">Última actualização: {new Date().toLocaleDateString("pt-PT", { day: "2-digit", month: "long", year: "numeric" })}</p>
      </div>

      {/* Savings Calculator */}
      <SavingsCalculator currentPrices={MOCK_STATION.prices} />
    </div>
  );
}

function SavingsCalculator({ currentPrices }: { currentPrices: { fuelType: string; price: number }[] }) {
  const [fuel, setFuel] = useState("Gasolina 95");
  const [tankSize, setTankSize] = useState(45);
  const [nationalAvg] = useState(1.849);

  const stationPrice = currentPrices.find((p) => p.fuelType === fuel)?.price || 0;
  const savings = ((nationalAvg - stationPrice) * tankSize / 100);

  return (
    <div className="bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 p-6">
      <h2 className="font-semibold mb-4">Calculadora de Poupança</h2>
      <div className="flex flex-wrap gap-4 items-end">
        <div>
          <label className="text-sm text-gray-500 dark:text-gray-400">Combustível</label>
          <select value={fuel} onChange={(e) => setFuel(e.target.value)} className="ml-2 px-3 py-1 border rounded text-sm dark:bg-gray-700">
            {currentPrices.map((p) => <option key={p.fuelType} value={p.fuelType}>{p.fuelType}</option>)}
          </select>
        </div>
        <div>
          <label className="text-sm text-gray-500 dark:text-gray-400">Depósito (L)</label>
          <input type="number" value={tankSize} onChange={(e) => setTankSize(Number(e.target.value))} className="ml-2 w-16 px-2 py-1 border rounded text-sm dark:bg-gray-700" min={10} max={120} />
        </div>
      </div>
      <div className={`mt-4 p-3 rounded text-sm ${savings >= 0 ? "bg-green-50 dark:bg-green-900/20 text-green-700 dark:text-green-300" : "bg-red-50 dark:bg-red-900/20 text-red-700 dark:text-red-300"}`}>
        {savings >= 0 ? `Poupas ${savings.toFixed(2)}€ vs média nacional (${nationalAvg.toFixed(3)} €/L)` : `Custa ${Math.abs(savings).toFixed(2)}€ acima da média nacional (${nationalAvg.toFixed(3)} €/L)`}
      </div>
    </div>
  );
}