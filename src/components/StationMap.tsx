"use client";

import { MapContainer, TileLayer, Marker, Popup, useMap } from "react-leaflet";
import "leaflet/dist/leaflet.css";
import { Icon } from "leaflet";

// Fix default Leaflet icon issue in Next.js
const defaultIcon = new Icon({
  iconUrl: "https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon.png",
  iconRetinaUrl: "https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon-2x.png",
  shadowUrl: "https://unpkg.com/leaflet@1.9.4/dist/images/marker-shadow.png",
  iconSize: [25, 41],
  iconAnchor: [12, 41],
});

const fuelIcon = new Icon({
  iconUrl: "https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon.png",
  iconSize: [25, 41],
  iconAnchor: [12, 41],
  popupAnchor: [0, -30],
});

const mockStations = [
  { id: 1, name: "Galp - Lisboa", lat: 38.7169, lng: -9.1399, price: 1.599, brand: "Galp" },
  { id: 2, name: "BP - Porto", lat: 38.7469, lng: -9.1699, price: 1.579, brand: "BP" },
  { id: 3, name: "Repsol - Coimbra", lat: 38.7069, lng: -9.1199, price: 1.619, brand: "Repsol" },
  { id: 4, name: "Prio - Setúbal", lat: 38.7369, lng: -9.1899, price: 1.549, brand: "Prio" },
  { id: 5, name: "Cepsa - Faro", lat: 38.6969, lng: -9.1499, price: 1.589, brand: "Cepsa" },
];

const ResetView = ({ center }: { center: [number, number] }) => {
  const map = useMap();
  map.setView(center, map.getZoom());
  return null;
};

export default function StationMap({ center, radius, fuelType }: { center: { lat: number; lng: number }; radius: number; fuelType: string }) {
  const mapCenter: [number, number] = [center.lat, center.lng];

  return (
    <MapContainer center={mapCenter} zoom={12} style={{ width: "100%", height: "100%" }} scrollWheelZoom={true}>
      <ResetView center={mapCenter} />
      <TileLayer
        attribution='© <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>'
        url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
      />
      <Marker position={mapCenter} icon={defaultIcon}>
        <Popup><strong>A tua localização</strong></Popup>
      </Marker>
      {mockStations.map((station) => (
        <Marker key={station.id} position={[station.lat, station.lng]} icon={fuelIcon}>
          <Popup>
            <div className="text-sm">
              <strong className="text-lg">{station.brand}</strong>
              <p>{station.name}</p>
              <p className="font-bold text-green-600">{station.price.toFixed(3)} €/L</p>
              <a href={`https://www.google.com/maps/dir/?api=1&destination=${station.lat},${station.lng}`} target="_blank" rel="noopener noreferrer" className="text-blue-500 hover:underline text-xs">
                📍 Navegar
              </a>
            </div>
          </Popup>
        </Marker>
      ))}
    </MapContainer>
  );
}