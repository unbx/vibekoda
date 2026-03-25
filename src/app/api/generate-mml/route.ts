import { NextRequest, NextResponse } from "next/server";

/**
 * /api/generate-mml — Server-side proxy for DEMO mode.
 *
 * Uses the server-side ANTHROPIC_API_KEY to call Claude on behalf of
 * the user.  Tracks per-user usage via a simple in-memory map (resets
 * on redeploy — swap with Vercel KV / DynamoDB for persistence).
 *
 * Limits:
 *   - DEMO_MAX_GENERATIONS  = 5  (fresh "New" conversations)
 *   - DEMO_MAX_REFINEMENTS  = 5  (follow-up messages in same convo)
 */

const DEMO_MAX_GENERATIONS = 5;
const DEMO_MAX_REFINEMENTS = 5;
const DEMO_MODEL = "claude-sonnet-4-6"; // fast + cheap for demo

// ─── In-memory usage store ──────────────────────────────────────────
// Key: `userId`, Value: { generations, refinementsMap }
interface Usage {
  generations: number; // number of "first" messages (new conversations)
  refinements: Record<string, number>; // conversationId → count
}
const usageStore = new Map<string, Usage>();

function getUsage(userId: string): Usage {
  if (!usageStore.has(userId)) {
    usageStore.set(userId, { generations: 0, refinements: {} });
  }
  return usageStore.get(userId)!;
}

// ─── Route handler ──────────────────────────────────────────────────
export async function POST(req: NextRequest) {
  const apiKey = process.env.ANTHROPIC_API_KEY;
  if (!apiKey) {
    return NextResponse.json(
      { error: "Demo mode is not configured on this server." },
      { status: 503 }
    );
  }

  let body: {
    userId: string;
    messages: { role: string; content: string }[];
    system: string;
    conversationId?: string;
    isNewGeneration?: boolean;
  };

  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON body." }, { status: 400 });
  }

  const { userId, messages, system, conversationId, isNewGeneration } = body;
  if (!userId || !messages || !system) {
    return NextResponse.json(
      { error: "Missing required fields: userId, messages, system." },
      { status: 400 }
    );
  }

  // ── Usage checks ────────────────────────────────────────────────
  const usage = getUsage(userId);

  if (isNewGeneration) {
    if (usage.generations >= DEMO_MAX_GENERATIONS) {
      return NextResponse.json(
        {
          error: "demo_exhausted",
          message: `You've used all ${DEMO_MAX_GENERATIONS} demo generations. Configure your own API key to keep building!`,
          usage: { generations: usage.generations, maxGenerations: DEMO_MAX_GENERATIONS },
        },
        { status: 429 }
      );
    }
    usage.generations += 1;
    // Initialize refinement counter for this conversation
    if (conversationId) {
      usage.refinements[conversationId] = 0;
    }
  } else if (conversationId) {
    const refinements = usage.refinements[conversationId] ?? 0;
    if (refinements >= DEMO_MAX_REFINEMENTS) {
      return NextResponse.json(
        {
          error: "refinements_exhausted",
          message: `You've used all ${DEMO_MAX_REFINEMENTS} refinements for this object. Start a new object or configure your own API key!`,
          usage: {
            refinements,
            maxRefinements: DEMO_MAX_REFINEMENTS,
            generations: usage.generations,
            maxGenerations: DEMO_MAX_GENERATIONS,
          },
        },
        { status: 429 }
      );
    }
    usage.refinements[conversationId] = refinements + 1;
  }

  // ── Proxy to Anthropic ──────────────────────────────────────────
  try {
    const res = await fetch("https://api.anthropic.com/v1/messages", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "x-api-key": apiKey,
        "anthropic-version": "2023-06-01",
      },
      body: JSON.stringify({
        model: DEMO_MODEL,
        max_tokens: 8192,
        system,
        messages,
        temperature: 0.2,
      }),
    });

    if (!res.ok) {
      const errText = await res.text();
      console.error("[generate-mml] Anthropic error:", res.status, errText);
      return NextResponse.json(
        { error: `Upstream API error: ${res.status}` },
        { status: 502 }
      );
    }

    const data = await res.json();

    // Return the response along with remaining usage info
    return NextResponse.json({
      ...data,
      _demo: {
        generationsUsed: usage.generations,
        generationsMax: DEMO_MAX_GENERATIONS,
        refinementsUsed: conversationId
          ? usage.refinements[conversationId] ?? 0
          : 0,
        refinementsMax: DEMO_MAX_REFINEMENTS,
      },
    });
  } catch (err: any) {
    console.error("[generate-mml] Fetch error:", err);
    return NextResponse.json(
      { error: err?.message || "Failed to reach Anthropic API." },
      { status: 500 }
    );
  }
}

// GET: return usage for a user (for UI display)
export async function GET(req: NextRequest) {
  const userId = new URL(req.url).searchParams.get("userId");
  if (!userId) {
    return NextResponse.json({ error: "Missing userId" }, { status: 400 });
  }

  const usage = getUsage(userId);
  return NextResponse.json({
    generationsUsed: usage.generations,
    generationsMax: DEMO_MAX_GENERATIONS,
    refinementsUsed: usage.refinements,
    refinementsMax: DEMO_MAX_REFINEMENTS,
  });
}
