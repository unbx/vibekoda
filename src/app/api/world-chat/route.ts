import { NextRequest, NextResponse } from "next/server";

const BASE_URL = "https://otherside.xyz";

// GET: read world chat
export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const world = searchParams.get("world") || "SWAMP";
  const page = searchParams.get("page") || "1";
  const limit = searchParams.get("limit") || "25";

  try {
    const res = await fetch(
      `${BASE_URL}/api/agents/chat?world=${world}&page=${page}&limit=${limit}`,
      {
        headers: { "Accept": "application/json" },
        // No cache so we always get fresh messages
        cache: "no-store",
      }
    );

    if (res.status === 402) {
      return NextResponse.json(
        { error: "API requires payment (x402). Free during developer preview." },
        { status: 402 }
      );
    }

    if (!res.ok) {
      return NextResponse.json(
        { error: `Otherside API error: ${res.status}` },
        { status: res.status }
      );
    }

    const data = await res.json();
    return NextResponse.json(data);
  } catch (err: any) {
    return NextResponse.json(
      { error: err?.message || "Failed to reach Otherside API." },
      { status: 500 }
    );
  }
}

// POST: broadcast a bot message
export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const res = await fetch(`${BASE_URL}/api/agents/chat`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
    });

    if (!res.ok && res.status !== 402) {
      return NextResponse.json(
        { error: `Otherside API error: ${res.status}` },
        { status: res.status }
      );
    }

    const data = await res.json().catch(() => ({ ok: true }));
    return NextResponse.json(data);
  } catch (err: any) {
    return NextResponse.json(
      { error: err?.message || "Broadcast failed." },
      { status: 500 }
    );
  }
}
