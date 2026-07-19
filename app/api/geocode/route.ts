import { NextResponse } from "next/server";
import { geocodingProvider } from "@/lib/providers/config";

export async function GET(request: Request) {
  const query = new URL(request.url).searchParams.get("q")?.trim();
  if (!query) {
    return NextResponse.json({ error: "Query parameter 'q' is required" }, { status: 400 });
  }

  try {
    const results = await geocodingProvider.search(query);
    return NextResponse.json(results);
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Failed to geocode" },
      { status: 502 },
    );
  }
}
