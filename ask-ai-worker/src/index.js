// "Ask my AI" backend — a Cloudflare Worker that keeps the Anthropic API key
// secret and streams Claude's answers to the portfolio's chat widget.
//
// Request:  POST /chat  { "messages": [{ "role": "user" | "assistant", "content": "..." }] }
// Response: Server-Sent Events — `data: {"t":"text"}` chunks, then
//           `data: {"done":true}` or `data: {"error":"..."}`.

import Anthropic from "@anthropic-ai/sdk";
import { SYSTEM_PROMPT } from "./knowledge.js";

const MODEL = "claude-opus-5-5";
const MAX_TURNS = 12;          // history sent to the model
const MAX_CHARS = 600;         // per visitor message
const RATE_LIMIT = 20;         // requests per IP per window
const RATE_WINDOW_MS = 10 * 60 * 1000;

// Best-effort limiter: lives in this Worker instance's memory, so it resets when
// the instance is recycled. Pair it with a monthly spend limit in the Anthropic
// Console for a hard cap.
const hits = new Map();

function rateLimited(ip) {
  const now = Date.now();
  const recent = (hits.get(ip) || []).filter((t) => now - t < RATE_WINDOW_MS);
  recent.push(now);
  hits.set(ip, recent);
  if (hits.size > 5000) hits.clear();
  return recent.length > RATE_LIMIT;
}

function corsHeaders(origin, allowed) {
  const ok = allowed.includes(origin);
  return {
    "Access-Control-Allow-Origin": ok ? origin : allowed[0] || "",
    "Access-Control-Allow-Methods": "POST, OPTIONS",
    "Access-Control-Allow-Headers": "Content-Type",
    "Access-Control-Max-Age": "86400",
    Vary: "Origin",
  };
}

function json(body, status, headers) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...headers, "Content-Type": "application/json" },
  });
}

// Keep only well-formed text turns, trimmed and capped, starting with a user turn.
function cleanHistory(raw) {
  if (!Array.isArray(raw)) return null;
  const turns = raw
    .filter(
      (m) =>
        m &&
        (m.role === "user" || m.role === "assistant") &&
        typeof m.content === "string" &&
        m.content.trim(),
    )
    .map((m) => ({
      role: m.role,
      content: m.content.trim().slice(0, m.role === "user" ? MAX_CHARS : 4000),
    }))
    .slice(-MAX_TURNS);
  while (turns.length && turns[0].role !== "user") turns.shift();
  if (!turns.length || turns[turns.length - 1].role !== "user") return null;
  return turns;
}

function errorMessage(err) {
  if (err instanceof Anthropic.RateLimitError) {
    return "The assistant is busy right now. Please try again in a minute.";
  }
  if (err instanceof Anthropic.AuthenticationError) {
    console.error("Anthropic authentication failed — check the ANTHROPIC_API_KEY secret");
    return "The assistant isn't available right now.";
  }
  if (err instanceof Anthropic.APIError) {
    console.error(`Anthropic API error ${err.status}: ${err.message}`);
    return "Something went wrong. Please try again.";
  }
  console.error("Unexpected error:", err);
  return "Something went wrong. Please try again.";
}

export default {
  async fetch(request, env, ctx) {
    const allowed = (env.ALLOWED_ORIGINS || "")
      .split(",")
      .map((s) => s.trim())
      .filter(Boolean);
    const origin = request.headers.get("Origin") || "";
    const cors = corsHeaders(origin, allowed);
    const { pathname } = new URL(request.url);

    if (request.method === "OPTIONS") return new Response(null, { status: 204, headers: cors });
    if (pathname !== "/chat") return json({ error: "Not found" }, 404, cors);
    if (request.method !== "POST") return json({ error: "Method not allowed" }, 405, cors);
    if (!allowed.includes(origin)) return json({ error: "Origin not allowed" }, 403, cors);

    const ip = request.headers.get("CF-Connecting-IP") || "unknown";
    if (rateLimited(ip)) {
      return json({ error: "You're sending messages quickly. Please wait a few minutes." }, 429, cors);
    }

    let body;
    try {
      body = await request.json();
    } catch {
      return json({ error: "Invalid JSON" }, 400, cors);
    }
    const messages = cleanHistory(body && body.messages);
    if (!messages) return json({ error: "Send at least one question." }, 400, cors);

    const client = new Anthropic({
      apiKey: env.ANTHROPIC_API_KEY,
      // Only for local testing against a mock server; leave unset in production.
      baseURL: env.ANTHROPIC_BASE_URL || undefined,
    });

    const { readable, writable } = new TransformStream();
    const writer = writable.getWriter();
    const encoder = new TextEncoder();
    const send = (payload) => writer.write(encoder.encode(`data: ${JSON.stringify(payload)}\n\n`));

    ctx.waitUntil(
      (async () => {
        try {
          const stream = client.beta.messages.stream({
            model: MODEL,
            max_tokens: 4096,
            // Short, conversational answers: low effort keeps replies fast and cheap.
            output_config: { effort: "low" },
            // If a safety classifier declines, retry on Anthropic's recommended model.
            betas: ["server-side-fallback-2026-07-01"],
            fallbacks: "default",
            // The profile never changes between requests, so cache it.
            system: [{ type: "text", text: SYSTEM_PROMPT, cache_control: { type: "ephemeral" } }],
            messages,
          });

          for await (const event of stream) {
            if (event.type === "content_block_delta" && event.delta.type === "text_delta") {
              await send({ t: event.delta.text });
            }
          }

          const final = await stream.finalMessage();
          if (final.stop_reason === "refusal") {
            await send({ error: "I can't help with that one. Try asking about Vivek's experience, skills or projects." });
          } else {
            await send({ done: true });
          }
        } catch (err) {
          await send({ error: errorMessage(err) });
        } finally {
          await writer.close();
        }
      })(),
    );

    return new Response(readable, {
      headers: {
        ...cors,
        "Content-Type": "text/event-stream; charset=utf-8",
        "Cache-Control": "no-cache, no-transform",
      },
    });
  },
};
