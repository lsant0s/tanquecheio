"use client";

import { MapContainer, TileLayer, Marker, Popup, useMap } from "react-leaflet";
import "leaflet/dist/leaflet.css";
import { Icon } from "leaflet";
import { useEffect, useState } from "react";

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

interface MapStation {
  id: number;
  name: string;
  brand: string;
  lat: number;
  lng: number;
}

const ResetView = ({ center }: { center: [number, number] }) => {
  const map = useMap();
  map.setView(center, map.getZoom());
  return null;
};

export default function StationMap({ center, radius }: { center: { lat: number; lng: number }; radius: number; fuelType: string }) {
  const [stations, setStations] = useState<MapStation[]>([]);
  const mapCenter: [number, number] = [center.lat, center.lng];

  useEffect(() => {
    fetch("/api/stations")
      .then((r) => r.json())
      .then((data) => {
        if (data?.stations) setStations(data.stations);
      })
      .catch(() => {});
  }, []);

  return (
    <MapContainer center={mapCenter} zoom={12} style={{ width: "100%", height: "100%" }} scrollWheelZoom={true}>
      <ResetView center={mapCenter} />
      <TileLayer
        attribution='&copy <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>'
        url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
      />
      <Marker position={mapCenter} icon={defaultIcon}>
        <Popup><strong>A tua localização</strong></Popup>
      </Marker>
      {stations.map((station) => (
        <Marker key={station.id} position={[station.lat, station.lng]} icon={fuelIcon}>
          <Popup>
            <div className="text-sm">
              <strong>{station.brand}</strong>
              <p>{station.name}</p>
              <a href={`https://www.google.com/maps/dir/?api=1&destination=${station.lat},${station.lng}`}
                target="_blank" rel="noopener noreferrer"
                className="text-blue-500 hover:underline text-xs">📍 Navegar</a>
            </div>
          </Popup>
        </Marker>
      ))}
    </MapContainer>
  );
}