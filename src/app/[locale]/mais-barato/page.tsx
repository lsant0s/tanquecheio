"use client";

import { useEffect, useState } from "react";
import { useTranslations } from "next-intl";
import dynamic from "next/dynamic";

// Leaflet must be imported client-side only (no SSR)
const MapWithNoSSR = dynamic(
  () => import("@/components/StationMap"),
  { ssr: false, loading: () => <div className="h-96 flex items-center justify-center bg-gray-100 dark:bg-gray-800 rounded-lg">A carregar mapa...</div> }
);

export default function MaisBaratoPage() {
  const t = useTranslations("map");
  const [location, setLocation] = useState<{lat: number; lng: number} | null>(null);
  const [radius, setRadius] = useState(5);
  const [fuelType, setFuelType] = useState("all");

  const handleGeolocate = () => {
    navigator.geolocation.getCurrentPosition(
      (pos) => setLocation({ lat: pos.coords.latitude, lng: pos.coords.longitude }),
      () => setLocation({ lat: 38.7223, lng: -9.1393 }) // fallback: Lisbon
    );
  };

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
      <h1 className="text-2xl md:text-3xl font-bold mb-4">{t("title")}</h1>

      {/* Controls */}
      <div className="bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 p-4 mb-6">
        <div className="flex flex-wrap gap-4 items-end">
          <div>
            <label className="block text-sm font-medium mb-1">{t("useMyLocation")}</label>
            <button onClick={handleGeolocate} className="px-4 py-2 bg-brand-500 text-white rounded-md hover:bg-brand-600 transition-colors">
              📍 {location ? "📍 Repetir" : "Usar localização"}
            </button>
          </div>

          <div>
            <label className="block text-sm font-medium mb-1">{t("radius")}: {radius} km</label>
            <input type="range" min={1} max={20} value={radius} onChange={(e) => setRadius(Number(e.target.value))} className="w-40" />
          </div>

          <div>
            <label className="block text-sm font-medium mb-1">{t("filters.fuelType")}</label>
            <select value={fuelType} onChange={(e) => setFuelType(e.target.value)} className="px-3 py-2 border rounded-md dark:bg-gray-700">
              <option value="all">{t("filters.all")}</option>
              <option value="Gasolina 95">Gasolina 95</option>
              <option value="Gasolina 98">Gasolina 98</option>
              <option value="Gasóleo Simples">Gasóleo Simples</option>
              <option value="GPL Auto">GPL Auto</option>
            </select>
          </div>
        </div>
      </div>

      {/* Stations list */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div className="bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 overflow-hidden" style={{ minWidth: "100%", minHeight: 400, height: "500px" }}>
          <MapWithNoSSR center={location || { lat: 39.5, lng: -8 }} radius={radius} fuelType={fuelType} />
        </div>

        <div className="bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 p-4 overflow-y-auto" style={{ maxHeight: 500 }}>
          <h3 className="font-semibold mb-3">Postos perto de ti</h3>
          {!location && (
            <p className="text-gray-400 text-sm text-center py-8">Usa a tua localização para ver postos</p>
          )}
          {location && MockStations.filter(s => s.fuelType === fuelType || fuelType === "all")
            .slice(0, 10)
            .map((s, i) => (
            <StationCard key={i} station={s} />
          ))}
        </div>
      </div>
    </div>
  );
}

function StationCard({ station }: { station: typeof MockStations[0] }) {
  return (
    <div className="flex justify-between items-start p-3 border-b border-gray-100 dark:border-gray-700 last:border-0 hover:bg-gray-50 dark:hover:bg-gray-750 transition-colors">
      <div>
        <p className="font-medium">{station.brand} — {station.name}</p>
        <p className="text-sm text-gray-500 dark:text-gray-400">{station.address}</p>
      </div>
      <div className="text-right">
        <p className="font-bold text-lg">{station.price.toFixed(3)} €</p>
        {station.trend && <p className={`text-xs ${station.trend < 0 ? "text-green-600" : "text-red-600"}`}>{station.trend > 0 ? "↑" : "↓"} {Math.abs(station.trend).toFixed(1)}%</p>}
      </div>
    </div>
  );
}

const MockStations = [
  { brand: "Galp", name: "Campo Grande", address: "Av. da República, 123, Lisboa", price: 1.599, fuelType: "Gasóleo Simples", trend: -1.2, lat: 38.74, lng: -9.15 },
  { brand: "BP", name: "Matosinhos", address: "Rua do Porto, 456, Porto", price: 1.609, fuelType: "Gasóleo Simples", trend: -0.5, lat: 38.72, lng: -9.16 },
  { brand: "Repsol", name: "Coimbra", address: "Av. dos Estudantes, 789", price: 1.589, fuelType: "Gasóleo Simples", trend: -2.1, lat: 38.73, lng: -9.14 },
  { brand: "Prio", name: "Faro", address: "EN 125, Faro", price: 1.569, fuelType: "Gasóleo Simples", trend: -0.8, lat: 38.71, lng: -9.17 },
  { brand: "Cepsa", name: "Braga", address: "Av. Central, Braga", price: 1.579, fuelType: "Gasóleo Simples", trend: 0.3, lat: 38.76, lng: -9.13 },
  { brand: "Galp", name: "Setúbal", address: "Av. Luísa Todi, Setúbal", price: 1.839, fuelType: "Gasolina 95", trend: -0.4, lat: 38.75, lng: -9.18 },
  { brand: "Total", name: "Aveiro", address: "Rua dos Ovos Moles, Aveiro", price: 1.829, fuelType: "Gasolina 95", trend: -1.0, lat: 38.70, lng: -9.12 },
];