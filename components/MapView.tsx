"use client";

import { useEffect, useState } from "react";
import { MapContainer, TileLayer, Marker, Popup, Polyline, useMapEvents, useMap } from "react-leaflet";
import L from "leaflet";
import type { LatLon } from "@/lib/providers/types";
import type { WeatherLeg } from "@/lib/groupIntoLegs";
import type { LegPolylineSegment } from "@/lib/legPolylineSegments";
import { WEATHER_CATEGORY_HEX_COLORS } from "@/lib/weatherCodes";
import { formatTemperatureRange, type TemperatureUnit } from "@/lib/units";
import { formatEtaTime, formatMiles } from "@/lib/format";

// Leaflet's default marker icon references image paths that bundlers rewrite
// unreliably, so every marker here uses an inline divIcon instead of L.icon.
function dotIcon(color: string, size = 16, options: { pulsing?: boolean; selected?: boolean } = {}) {
  const { pulsing = false, selected = false } = options;
  const finalSize = selected ? size + 6 : size;
  const border = selected ? "3px solid #1d4ed8" : "2px solid white";
  const className = pulsing ? "leg-marker-pulse" : "";
  return L.divIcon({
    className: "",
    html: `<div class="${className}" style="background:${color};width:${finalSize}px;height:${finalSize}px;border-radius:50%;border:${border};box-shadow:0 0 4px rgba(0,0,0,0.6)"></div>`,
    iconSize: [finalSize, finalSize],
    iconAnchor: [finalSize / 2, finalSize / 2],
  });
}

const originIcon = dotIcon("#16a34a");
const destinationIcon = dotIcon("#dc2626");

interface MapViewProps {
  origin: LatLon | null;
  destination: LatLon | null;
  routeGeometry: LatLon[];
  legs: WeatherLeg[];
  legSegments: LegPolylineSegment[];
  onMapClick: (location: LatLon) => void;
  unit: TemperatureUnit;
  selectedLegIndex: number | null;
  hoveredLegIndex: number | null;
  onSelectLeg: (index: number | null) => void;
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
      maxNativeZoom={7}
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

/** Middle stop of a leg, used to place its marker away from the leg boundaries. */
function midpointStop(leg: WeatherLeg) {
  return leg.stops[Math.floor((leg.stops.length - 1) / 2)];
}

const DEFAULT_CENTER: [number, number] = [39.8283, -98.5795]; // roughly center of the contiguous US

export function MapView({
  origin,
  destination,
  routeGeometry,
  legs,
  legSegments,
  onMapClick,
  unit,
  selectedLegIndex,
  hoveredLegIndex,
  onSelectLeg,
}: MapViewProps) {
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

      {legSegments.length > 0 ? (
        legSegments.map((segment, i) => {
          const isPulsing = hoveredLegIndex === i;
          return segment.positions.length > 1 ? (
            // Leaflet only applies pathOptions.className when the path element
            // is first created, not on later style updates — keying on the
            // pulse state forces a remount so the class actually takes effect.
            <Polyline
              key={`${i}-${isPulsing}`}
              positions={segment.positions.map((p) => [p.lat, p.lon])}
              eventHandlers={{ click: () => onSelectLeg(selectedLegIndex === i ? null : i) }}
              pathOptions={{
                color: segment.color,
                weight: selectedLegIndex === i || isPulsing ? 9 : 5,
                className: isPulsing ? "leg-line-pulse" : undefined,
              }}
            />
          ) : null;
        })
      ) : routeGeometry.length > 1 ? (
        <Polyline positions={routeGeometry.map((p) => [p.lat, p.lon])} pathOptions={{ color: "#2563eb", weight: 4 }} />
      ) : null}

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

      {legs.map((leg, i) => {
        const stop = midpointStop(leg);
        const isSelected = selectedLegIndex === i;
        const isHovered = hoveredLegIndex === i;
        return (
          <Marker
            key={i}
            position={[stop.location.lat, stop.location.lon]}
            icon={dotIcon(WEATHER_CATEGORY_HEX_COLORS[leg.category], 14, { pulsing: isHovered, selected: isSelected })}
            eventHandlers={{ click: () => onSelectLeg(isSelected ? null : i) }}
          >
            <Popup>
              <div className="text-sm text-slate-900">
                <div className="font-semibold">{leg.label}</div>
                <div>
                  Mi {formatMiles(leg.startStop.cumulativeDistanceMeters)}–{formatMiles(leg.endStop.cumulativeDistanceMeters)}
                </div>
                <div>
                  {formatEtaTime(leg.startStop.eta)}–{formatEtaTime(leg.endStop.eta)}
                </div>
                <div>{formatTemperatureRange(leg.minTemperatureC, leg.maxTemperatureC, unit)}</div>
                {leg.maxPrecipitationMm > 0 && <div>up to {leg.maxPrecipitationMm.toFixed(1)} mm precip</div>}
              </div>
            </Popup>
          </Marker>
        );
      })}
    </MapContainer>
  );
}
