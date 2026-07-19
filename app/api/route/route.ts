import { NextResponse } from "next/server";
import { routingProvider } from "@/lib/providers/config";
import type { LatLon } from "@/lib/providers/types";

function isLatLon(value: unknown): value is LatLon {
  if (typeof value !== "object" || value === null) return false;
  const v = value as Record<string, unknown>;
  return typeof v.lat === "number" && typeof v.lon === "number";
}

export async function POST(request: Request) {
  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Request body must be JSON" }, { status: 400 });
  }

  const { origin, destination } = (body ?? {}) as Record<string, unknown>;
  if (!isLatLon(origin) || !isLatLon(destination)) {
    return NextResponse.json(
      { error: "Body must include origin and destination as { lat, lon }" },
      { status: 400 },
    );
  }

  try {
    const route = await routingProvider.getRoute(origin, destination);
    return NextResponse.json(route);
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Failed to compute route" },
      { status: 502 },
    );
  }
}
