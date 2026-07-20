"use client";

import { useEffect, useState } from "react";
import { MapContainer, TileLayer, Marker, Popup, Polyline, useMapEvents, useMap } from "react-leaflet";
import L from "leaflet";
import type { LatLon } from "@/lib/providers/types";
import type { StopWithWeather } from "./types";
import { describeWeatherCode, type WeatherCategory } from "@/lib/weatherCodes";
import { formatTemperature, type TemperatureUnit } from "@/lib/units";

// Leaflet's default marker icon references image paths that bundlers rewrite
// unreliably, so every marker here uses an inline divIcon instead of L.icon.
function dotIcon(color: string, size = 16) {
  return L.divIcon({
    className: "",
    html: `<div style="background:${color};width:${size}px;height:${size}px;border-radius:50%;border:2px solid white;box-shadow:0 0 2px rgba(0,0,0,0.5)"></div>`,
    iconSize: [size, size],
    iconAnchor: [size / 2, size / 2],
  });
}

const originIcon = dotIcon("#16a34a");
const destinationIcon = dotIcon("#dc2626");
const loadingStopIcon = dotIcon("#94a3b8", 12);

const CATEGORY_COLORS: Record<WeatherCategory, string> = {
  clear: "#f59e0b",
  cloudy: "#64748b",
  fog: "#71717a",
  drizzle: "#0ea5e9",
  rain: "#2563eb",
  snow: "#6366f1",
  thunderstorm: "#9333ea",
};

interface MapViewProps {
  origin: LatLon | null;
  destination: LatLon | null;
  routeGeometry: LatLon[];
  stops: StopWithWeather[];
  onMapClick: (location: LatLon) => void;
  unit: TemperatureUnit;
}

function ClickHandler({ onMapClick }: { onMapClick: (location: LatLon) => void }) {
  useMapEvents({
    click(e) {
      onMapClick({ lat: e.latlng.lat, lon: e.latlng.lng });
    },
  });
  return null;
}

interface RainviewerFrame {
  path: string;
}

interface RainviewerResponse {
  host: string;
  radar: { past: RainviewerFrame[] };
}

/** Current precipitation radar, composited from RainViewer's free public tile API. */
function RadarLayer() {
  const [tileUrl, setTileUrl] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    fetch("https://api.rainviewer.com/public/weather-maps.json")
      .then((res) => res.json())
      .then((data: RainviewerResponse) => {
        const latest = data.radar.past.at(-1);
        if (!cancelled && latest) {
          setTileUrl(`${data.host}${latest.path}/256/{z}/{x}/{y}/2/1_1.png`);
        }
      })
      .catch(() => {
        // Radar is a non-essential overlay; silently skip it on failure.
      });
    return () => {
      cancelled = true;
    };
  }, []);

  if (!tileUrl) return null;

  return (
    <TileLayer
      attribution='Radar &copy; <a href="https://www.rainviewer.com/">RainViewer</a>'
      url={tileUrl}
      opacity={0.5}
    />
  );
}

/**
 * Leaflet reads its container's size once at mount and caches it. If the
 * container's flex/grid parent hasn't resolved a real height yet at that
 * moment (a timing race that's more common on desktop, where nothing like an
 * address-bar collapse triggers a follow-up window resize), the map is stuck
 * rendered at 0 height. Re-checking on any container resize keeps it in sync.
 */
function InvalidateSizeOnResize() {
  const map = useMap();
  useEffect(() => {
    const container = map.getContainer();
    map.invalidateSize();
    const observer = new ResizeObserver(() => map.invalidateSize());
    observer.observe(container);
    return () => observer.disconnect();
  }, [map]);
  return null;
}

function FitBounds({ points }: { points: LatLon[] }) {
  const map = useMap();
  useEffect(() => {
    if (points.length === 0) return;
    const bounds = L.latLngBounds(points.map((p) => [p.lat, p.lon] as [number, number]));
    map.fitBounds(bounds, { padding: [40, 40] });
  }, [map, points]);
  return null;
}

const DEFAULT_CENTER: [number, number] = [39.8283, -98.5795]; // roughly center of the contiguous US

export function MapView({ origin, destination, routeGeometry, stops, onMapClick, unit }: MapViewProps) {
  const boundsPoints = routeGeometry.length > 0 ? routeGeometry : [origin, destination].filter(Boolean) as LatLon[];

  return (
    <MapContainer center={DEFAULT_CENTER} zoom={4} className="h-full w-full" scrollWheelZoom>
      <TileLayer
        attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
        url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
      />
      <RadarLayer />
      <InvalidateSizeOnResize />
      <ClickHandler onMapClick={onMapClick} />
      {boundsPoints.length > 1 && <FitBounds points={boundsPoints} />}

      {routeGeometry.length > 1 && (
        <Polyline positions={routeGeometry.map((p) => [p.lat, p.lon])} pathOptions={{ color: "#2563eb", weight: 4 }} />
      )}

      {origin && (
        <Marker position={[origin.lat, origin.lon]} icon={originIcon}>
          <Popup>Origin</Popup>
        </Marker>
      )}
      {destination && (
        <Marker position={[destination.lat, destination.lon]} icon={destinationIcon}>
          <Popup>Destination</Popup>
        </Marker>
      )}

      {stops.map((stop, i) => (
        <Marker
          key={i}
          position={[stop.location.lat, stop.location.lon]}
          icon={
            stop.weather
              ? dotIcon(CATEGORY_COLORS[describeWeatherCode(stop.weather.weatherCode).category], 14)
              : loadingStopIcon
          }
        >
          <Popup>
            <div className="text-sm text-slate-900">
              <div className="font-semibold">ETA {stop.eta.toLocaleString()}</div>
              {stop.weather ? (
                <>
                  <div>{describeWeatherCode(stop.weather.weatherCode).label}</div>
                  <div>{formatTemperature(stop.weather.temperatureC, unit)}</div>
                  <div>{stop.weather.precipitationMm} mm precip</div>
                  <div>{Math.round(stop.weather.windSpeedKmh)} km/h wind</div>
                </>
              ) : stop.weatherError ? (
                <div className="text-red-600">Weather unavailable</div>
              ) : (
                <div>Loading weather…</div>
              )}
            </div>
          </Popup>
        </Marker>
      ))}
    </MapContainer>
  );
}
