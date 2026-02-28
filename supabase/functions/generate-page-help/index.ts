import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { getCorsHeaders } from "../_shared/cors.ts";
import { GeminiError, generateGeminiText } from "../_shared/gemini.ts";

const MAX_FIELD_LENGTH = 1000;
const MAX_TEXT_LENGTH = 6000;

const OUTPUT_FIELDS = [
  "title",
  "summary",
  "what_this_page_does",
  "what_is_expected",
  "required_inputs",
  "primary_actions",
  "common_mistakes",
  "next_steps",
] as const;

type OutputField = (typeof OUTPUT_FIELDS)[number];

type HelpContent = Record<OutputField, string>;

function truncate(value: unknown, max = MAX_FIELD_LENGTH): string {
  const s = typeof value === "string" ? value : String(value ?? "");
  return s.slice(0, max);
}

function truncateLong(value: unknown): string {
  const s = typeof value === "string" ? value : String(value ?? "");
  return s.slice(0, MAX_TEXT_LENGTH);
}

function stripCodeFence(raw: string): string {
  const trimmed = raw.trim();
  const codeFenceMatch = trimmed.match(/^```(?:json)?\s*([\s\S]*?)\s*```$/i);
  if (codeFenceMatch?.[1]) return codeFenceMatch[1].trim();
  return trimmed;
}

function parseHelpJson(raw: string): HelpContent {
  const cleaned = stripCodeFence(raw);

  const direct = tryParse(cleaned);
  if (direct) return sanitizeHelp(direct);

  const start = cleaned.indexOf("{");
  const end = cleaned.lastIndexOf("}");
  if (start >= 0 && end > start) {
    const sliced = cleaned.slice(start, end + 1);
    const parsed = tryParse(sliced);
    if (parsed) return sanitizeHelp(parsed);
  }

  throw new GeminiError("Model returned invalid JSON", 502);
}

function tryParse(raw: string): Record<string, unknown> | null {
  try {
    const parsed = JSON.parse(raw);
    if (!parsed || typeof parsed !== "object" || Array.isArray(parsed)) return null;
    return parsed as Record<string, unknown>;
  } catch {
    return null;
  }
}

function sanitizeHelp(parsed: Record<string, unknown>): HelpContent {
  const out = {} as HelpContent;

  for (const field of OUTPUT_FIELDS) {
    out[field] = truncateLong(parsed[field]);
  }

  if (!out.title.trim()) {
    throw new GeminiError("Model response missing title", 502);
  }

  return out;
}

serve(async (req) => {
  const corsHeaders = getCorsHeaders(req);

  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const authHeader = req.headers.get("Authorization");
    if (!authHeader?.startsWith("Bearer ")) {
      return new Response(JSON.stringify({ error: "Unauthorized" }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const supabaseClient = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_ANON_KEY")!,
      { global: { headers: { Authorization: authHeader } } },
    );

    const token = authHeader.replace("Bearer ", "");
    const { data: claimsData, error: claimsError } =
      await supabaseClient.auth.getClaims(token);

    if (
      claimsError ||
      !claimsData?.claims?.sub ||
      claimsData.claims.role !== "authenticated"
    ) {
      return new Response(JSON.stringify({ error: "Unauthorized" }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    if (claimsData.claims.aal !== "aal2") {
      return new Response(JSON.stringify({ error: "MFA required" }), {
        status: 403,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const userId = claimsData.claims.sub as string;

    const serviceClient = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
    );

    const { data: allowed } = await serviceClient.rpc("check_rate_limit", {
      p_user_id: userId,
      p_function_name: "generate-page-help",
      p_max_calls: 40,
      p_window_minutes: 60,
    });

    if (allowed === false) {
      return new Response(
        JSON.stringify({ error: "Rate limit exceeded. Please try again later." }),
        { status: 429, headers: { ...corsHeaders, "Content-Type": "application/json" } },
      );
    }

    const body = await req.json();
    const routeKey = truncate(body.routeKey, 200);
    const routeTitle = truncate(body.routeTitle, 200);
    const pageDescription = truncateLong(body.pageDescription);
    const expectedOutcome = truncateLong(body.expectedOutcome);
    const primaryEntities = Array.isArray(body.primaryEntities)
      ? body.primaryEntities.slice(0, 20).map((x: unknown) => truncate(x, 120))
      : [];
    const primaryActions = Array.isArray(body.primaryActions)
      ? body.primaryActions.slice(0, 30).map((x: unknown) => truncate(x, 120))
      : [];

    if (!routeKey) {
      return new Response(JSON.stringify({ error: "routeKey is required" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const systemPrompt = `You write clear, operational help docs for app pages.
Return valid JSON only. No markdown code fences.

JSON keys required:
- title
- summary
- what_this_page_does
- what_is_expected
- required_inputs
- primary_actions
- common_mistakes
- next_steps

Writing rules:
- Be specific to the page context and route.
- Use concise bullet-style prose inside each string.
- Assume a single operator user in a security operations app.
- Include concrete expectations and decision criteria.
- Do not mention passwords, secret keys, or hidden implementation internals.
- Keep each section actionable and practical.`;

    const userPrompt = `Generate page help content for this app route.

route_key: ${routeKey}
route_title: ${routeTitle || "Unknown"}
page_description: ${pageDescription || "Not provided"}
expected_outcome: ${expectedOutcome || "Not provided"}
primary_entities: ${primaryEntities.join(", ") || "None provided"}
primary_actions: ${primaryActions.join(", ") || "None provided"}`;

    const ai = await generateGeminiText({
      systemPrompt,
      messages: [{ role: "user", content: userPrompt }],
      temperature: 0.25,
    });

    const content = parseHelpJson(ai.text);

    try {
      await serviceClient.from("token_usage").insert({
        user_id: userId,
        function_name: "generate-page-help",
        prompt_tokens: ai.usage.prompt_tokens,
        completion_tokens: ai.usage.completion_tokens,
        total_tokens: ai.usage.total_tokens,
        model: ai.model,
      });
    } catch (logErr) {
      console.error("Token logging error:", logErr);
    }

    return new Response(JSON.stringify({ content }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (e) {
    if (e instanceof GeminiError) {
      if (e.status === 429) {
        return new Response(
          JSON.stringify({ error: "Rate limited. Please try again shortly." }),
          { status: 429, headers: { ...corsHeaders, "Content-Type": "application/json" } },
        );
      }

      return new Response(
        JSON.stringify({ error: "Failed to generate page help content" }),
        { status: e.status, headers: { ...corsHeaders, "Content-Type": "application/json" } },
      );
    }

    console.error("generate-page-help error:", e);
    return new Response(JSON.stringify({ error: "Internal error" }), {
      status: 500,
      headers: { ...getCorsHeaders(req), "Content-Type": "application/json" },
    });
  }
});
