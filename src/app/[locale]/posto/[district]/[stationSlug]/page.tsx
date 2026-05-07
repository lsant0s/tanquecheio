"use client";

import { useParams } from "next/navigation";
import { useTranslations } from "next-intl";
import { useState, useEffect } from "react";

interface StationData {
  id: number;
  name: string;
  brand: string;
  address: string;
  postalCode: string | null;
  district: string | null;
  concelho: string | null;
  lat: number;
  lng: number;
  stationType: string;
  isOpen24h: boolean;
  fuelTypes: string[];
  prices: { fuelType: string; price: number }[];
}

export default function StationDetailPage() {
  const params = useParams();
  const t = useTranslations("station");
  const [selectedFuel, setSelectedFuel] = useState("Gasolina 95");
  const [stationData, setStationData] = useState<StationData | null>(null);
  const [loading, setLoading] = useState(true);

  const slug = params.stationSlug as string;
  const district = params.district as string;
  const stationId = parseInt(slug?.split("-").pop() || "0");

  useEffect(() => {
    if (!stationId) return;
    fetch(`/api/stations/${stationId}`)
      .then((r) => r.json())
      .then((data) => {
        if (data?.error) throw new Error(data.error);
        setStationData(data);
        setLoading(false);
      })
      .catch(() => setLoading(false));
  }, [stationId]);

  if (loading) return <div className="max-w-7xl mx-auto px-4 py-16 text-center">A carregar posto...</div>;
  if (!stationData) return <div className="max-w-7xl mx-auto px-4 py-16 text-center">Posto não encontrado</div>;

  const { prices } = stationData;

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
      <nav className="text-sm text-gray-500 dark:text-gray-400 mb-4">
        <a href="/pt" className="hover:underline">Início</a>
        {" > "}
        <a href={`/pt/distrito/${district}`} className="hover:underline">{stationData.district}</a>
        {" > "}
        <span className="text-gray-900 dark:text-gray-100">{stationData.name}</span>
      </nav>

      <div className="bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 p-6 mb-6">
        <div className="flex flex-col md:flex-row md:justify-between md:items-start gap-4">
          <div>
            <h1 className="text-2xl font-bold">{stationData.name}</h1>
            <p className="text-gray-500 mt-1">📍 {stationData.address}</p>
            <p className="text-gray-500 text-xs">{stationData.district}{stationData.concelho ? ` · ${stationData.concelho}` : ""}</p>
          </div>
          <div className="flex gap-2">
            <a href={`https://www.google.com/maps/dir/?api=1&destination=${stationData.lat},${stationData.lng}`}
              target="_blank" rel="noopener noreferrer"
              className="px-4 py-2 bg-blue-500 text-white rounded-md hover:bg-blue-600 text-sm">📍 Google Maps</a>
            <a href={`https://waze.com/ul?ll=${stationData.lat},${stationData.lng}&navigate=yes`}
              target="_blank" rel="noopener noreferrer"
              className="px-4 py-2 bg-purple-500 text-white rounded-md hover:bg-purple-600 text-sm">🚗 Waze</a>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-6">
        <div className="bg-white dark:bg-gray-800 rounded-lg border p-6">
          <h2 className="text-lg font-semibold mb-4">{t("fuelPrices")}</h2>
          <div className="space-y-3">
            {prices.map((p) => (
              <div key={p.fuelType} className="flex justify-between items-center">
                <span className="text-sm font-medium">{p.fuelType}</span>
                <span className="font-bold text-lg">{p.price.toFixed(3)} €/L</span>
              </div>
            ))}
          </div>
        </div>
        <div className="bg-white dark:bg-gray-800 rounded-lg border p-6">
          <h2 className="text-lg font-semibold mb-4">Informações</h2>
          <dl className="space-y-3 text-sm">
            <div className="flex justify-between">
              <dt className="text-gray-500">Marca</dt>
              <dd className="font-medium">{stationData.brand}</dd>
            </div>
            <div className="flex justify-between">
              <dt className="text-gray-500">Tipo</dt>
              <dd className="font-medium">{stationData.stationType === "urban" ? "Urbano" : stationData.stationType}</dd>
            </div>
            <div className="flex justify-between">
              <dt className="text-gray-500">Distrito</dt>
              <dd className="font-medium">{stationData.district || "—"}</dd>
            </div>
          </dl>
        </div>
      </div>

      {/* Savings Calculator */}
      <SavingsCalculator currentPrices={prices} />
    </div>
  );
}

function SavingsCalculator({ currentPrices }: { currentPrices: { fuelType: string; price: number }[] }) {
  const [fuel, setFuel] = useState("Gasolina 95");
  const [tankSize, setTankSize] = useState(45);
  const [nationalAvg, setNationalAvg] = useState(1.85);

  useEffect(() => {
    fetch("/api/stats").then(r => r.json()).then(data => {
      const entry = data.nationalAverages?.find((f: any) => f.fuelType === fuel);
      if (entry) setNationalAvg(entry.avgPrice);
    }).catch(() => {});
  }, [fuel]);

  const stationPrice = currentPrices.find((p) => p.fuelType === fuel)?.price || 0;
  const savings = ((nationalAvg - stationPrice) * tankSize / 100);

  return (
    <div className="bg-white dark:bg-gray-800 rounded-lg border p-6">
      <h2 className="font-semibold mb-4">Calculadora de Poupança</h2>
      <div className="flex flex-wrap gap-4 items-end">
        <div>
          <label className="text-sm text-gray-500">Combustível</label>
          <select value={fuel} onChange={(e) => setFuel(e.target.value)} className="ml-2 px-3 py-1 border rounded text-sm dark:bg-gray-700">
            {currentPrices.map((p) => <option key={p.fuelType} value={p.fuelType}>{p.fuelType}</option>)}
          </select>
        </div>
        <div>
          <label className="text-sm text-gray-500">Depósito (L)</label>
          <input type="number" value={tankSize} onChange={(e) => setTankSize(Number(e.target.value))} className="ml-2 w-16 px-2 py-1 border rounded text-sm dark:bg-gray-700" min={10} max={120} />
        </div>
      </div>
      <div className={`mt-4 p-3 rounded text-sm ${savings >= 0 ? "bg-green-50 dark:bg-green-900/20 text-green-700" : "bg-red-50 dark:bg-red-900/20 text-red-700"}`}>
        {savings >= 0
          ? `Poupas ${savings.toFixed(2)}€ vs média nacional (${nationalAvg.toFixed(3)} €/L)`
          : `Custa ${Math.abs(savings).toFixed(2)}€ acima da média nacional`}
      </div>
    </div>
  );
}