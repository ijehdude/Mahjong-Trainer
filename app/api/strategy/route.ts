import Anthropic from "@anthropic-ai/sdk";
import { NextRequest } from "next/server";
import {
  buildUserPrompt,
  SYSTEM_PROMPT,
  type StrategyRequest,
} from "./prompt";

/* ===========================================================================
   POST /api/strategy — streamed Singapore Mahjong strategy feedback.
   The ANTHROPIC_API_KEY never leaves the server.
   =========================================================================== */

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const MODEL = process.env.ANTHROPIC_MODEL ?? "claude-sonnet-4-6";

export async function POST(req: NextRequest) {
  if (!process.env.ANTHROPIC_API_KEY) {
    return new Response(
      "GOOD\nStrategy coaching is offline (no API key configured). Discarding isolated tiles and tiles already seen on the table is generally safe.",
      { status: 200, headers: { "Content-Type": "text/plain; charset=utf-8" } }
    );
  }

  let body: StrategyRequest;
  try {
    body = (await req.json()) as StrategyRequest;
  } catch {
    return new Response("Invalid request body", { status: 400 });
  }

  const client = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });
  const userPrompt = buildUserPrompt(body);

  const encoder = new TextEncoder();
  const stream = new ReadableStream<Uint8Array>({
    async start(controller) {
      try {
        const messageStream = client.messages.stream({
          model: MODEL,
          max_tokens: body.feedbackDetail === "detailed" ? 320 : 160,
          system: [
            {
              type: "text",
              text: SYSTEM_PROMPT,
              // Cache the static system prompt — it's identical on every call.
              cache_control: { type: "ephemeral" },
            },
          ],
          messages: [{ role: "user", content: userPrompt }],
        });

        messageStream.on("text", (text) => {
          controller.enqueue(encoder.encode(text));
        });

        await messageStream.finalMessage();
        controller.close();
      } catch (err) {
        const msg =
          err instanceof Error ? err.message : "Strategy request failed.";
        controller.enqueue(
          encoder.encode(`OKAY\nCoaching unavailable right now (${msg}).`)
        );
        controller.close();
      }
    },
  });

  return new Response(stream, {
    headers: {
      "Content-Type": "text/plain; charset=utf-8",
      "Cache-Control": "no-store",
    },
  });
}
