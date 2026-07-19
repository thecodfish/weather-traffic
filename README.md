# Route Weather Arrival

A proof of concept: plot a driving route between two points and see the forecast
weather for the moment you're actually expected to reach each point along the
way — not just the weather right now at the origin and destination.

## How it works

1. Enter an origin and destination (address search or click the map), and a
   departure time.
2. The route is fetched from [OSRM](https://project-osrm.org/)'s public demo
   server, which returns the path plus fine-grained duration data.
3. [`sampleRoute`](lib/sampleRoute.ts) picks evenly time-spaced points along
   the route (default: every 15 minutes of drive time, capped at 10 points)
   and computes each one's ETA from the departure time.
4. Each point's forecast is fetched from [Open-Meteo](https://open-meteo.com/)
   for the hour closest to its ETA.
5. The map and the stop list show the route with each point's expected
   weather at arrival.

Geocoding uses [Nominatim](https://nominatim.openstreetmap.org/) (OpenStreetMap).
All three providers are free and require no API key for this POC's usage
level.

## Architecture

External providers sit behind small interfaces in `lib/providers/`
(`RoutingProvider`, `WeatherProvider`, `GeocodingProvider`), called only from
this app's own API routes (`app/api/route`, `app/api/weather`,
`app/api/geocode`) — never directly from the browser. `lib/providers/config.ts`
is the single swap point: to switch providers (e.g. OSRM → OpenRouteService),
implement the interface in a new file and change one line there.

## Getting started

```bash
npm install
npm run dev
```

Open [http://localhost:3000](http://localhost:3000). No environment variables
are required — see `.env.example` for optional provider overrides.

```bash
npm test    # unit tests for the route-sampling logic
npm run build
```

## Deploying

This is a standard Next.js app — deploy it on Vercel with no configuration
required.

## Out of scope for this POC

Push notifications, a mobile app, multi-stop routes, traffic-aware ETAs, and
user accounts are deliberately not built here. The provider/API layer is
structured so a future Expo/React Native client could reuse the same backend
API routes.
