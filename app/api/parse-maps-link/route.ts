import { NextResponse } from "next/server";
import { mapsLinkProvider } from "@/lib/providers/config";

export async function POST(request: Request) {
  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Request body must be JSON" }, { status: 400 });
  }

  const { url } = (body ?? {}) as Record<string, unknown>;
  if (typeof url !== "string" || url.trim().length === 0) {
    return NextResponse.json({ error: "Body must include a 'url' string" }, { status: 400 });
  }

  try {
    const parsed = await mapsLinkProvider.parseRouteLink(url.trim());
    return NextResponse.json(parsed);
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Failed to parse maps link" },
      { status: 502 },
    );
  }
}
