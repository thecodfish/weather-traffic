import { NextResponse } from "next/server";
import { weatherProvider } from "@/lib/providers/config";

export async function POST(request: Request) {
  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Request body must be JSON" }, { status: 400 });
  }

  const { lat, lon, targetTime } = (body ?? {}) as Record<string, unknown>;
  if (typeof lat !== "number" || typeof lon !== "number" || typeof targetTime !== "string") {
    return NextResponse.json(
      { error: "Body must include lat (number), lon (number), targetTime (ISO string)" },
      { status: 400 },
    );
  }

  const parsedTime = new Date(targetTime);
  if (Number.isNaN(parsedTime.getTime())) {
    return NextResponse.json({ error: "targetTime is not a valid date" }, { status: 400 });
  }

  try {
    const forecast = await weatherProvider.getForecastAt({ lat, lon }, parsedTime);
    return NextResponse.json(forecast);
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Failed to fetch weather" },
      { status: 502 },
    );
  }
}
