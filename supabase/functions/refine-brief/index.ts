import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { getCorsHeaders, getResponseHeaders, isOriginAllowed } from "../_shared/cors.ts";
import { GeminiError, generateGeminiText } from "../_shared/gemini.ts";

const MAX_FIELD_LENGTH = 2000;
const MAX_REQUEST_BYTES = 50_000;
const DAILY_TOKEN_LIMIT = 120_000;

function truncate(val: unknown, max = MAX_FIELD_LENGTH): string {
  const s = typeof val === "string" ? val : String(val ?? "");
  return s.slice(0, max);
}

function estimateTokens(text: string): number {
  return Math.ceil(text.length / 4);
}

serve(async (req) => {
  const corsHeaders = getCorsHeaders(req);

  if (!isOriginAllowed(req)) {
    return new Response(JSON.stringify({ error: "Origin not allowed" }), {
      status: 403,
      headers: getResponseHeaders(req, "application/json"),
    });
  }

  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const authHeader = req.headers.get("Authorization");
    if (!authHeader?.startsWith("Bearer ")) {
      return new Response(JSON.stringify({ error: "Unauthorized" }), {
        status: 401,
        headers: getResponseHeaders(req, "application/json"),
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
        headers: getResponseHeaders(req, "application/json"),
      });
    }

    if (claimsData.claims.aal !== "aal2") {
      return new Response(JSON.stringify({ error: "MFA required" }), {
        status: 403,
        headers: getResponseHeaders(req, "application/json"),
      });
    }

    const userId = claimsData.claims.sub as string;
    const serviceClient = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
    );

    const { data: allowed } = await serviceClient.rpc("check_rate_limit", {
      p_user_id: userId,
      p_function_name: "refine-brief",
      p_max_calls: 20,
      p_window_minutes: 60,
    });

    if (allowed === false) {
      return new Response(
        JSON.stringify({ error: "Rate limit exceeded. Please try again later." }),
        { status: 429, headers: getResponseHeaders(req, "application/json") },
      );
    }

    const contentLength = Number(req.headers.get("content-length") ?? "0");
    if (contentLength > MAX_REQUEST_BYTES) {
      return new Response(
        JSON.stringify({ error: "Request payload too large" }),
        { status: 413, headers: getResponseHeaders(req, "application/json") },
      );
    }

    const body = await req.json();
    const projectName = truncate(body.projectName, 200);
    const problemStatement = truncate(body.problemStatement);
    const strategicGoal = truncate(body.strategicGoal);
    const successMetric = truncate(body.successMetric);
    const risk = truncate(body.risk, 50);
    const reviewCadence = truncate(body.reviewCadence, 50);

    const systemPrompt = `You are a strategic advisor for a Security Operations leader. You help refine project briefs to be clear, actionable, and strategically aligned.

When given a project brief, you should:
1. Rewrite the problem statement, strategic goal, and success metric to be crisp and specific
2. Suggest 3-5 concrete milestones with approximate timelines
3. Recommend a review cadence based on the risk level and project nature

Format your response clearly with sections:
**Refined Brief**
- Problem: ...
- Strategic Goal: ...
- Success Metric: ...

**Suggested Milestones**
1. ...
2. ...

**Recommended Cadence**
...`;

    const userPrompt = `Project: ${projectName}
Problem Statement: ${problemStatement}
Strategic Goal: ${strategicGoal}
Success Metric: ${successMetric}
Current Risk: ${risk}
Current Cadence: ${reviewCadence}

Please refine this brief, suggest milestones, and recommend a review cadence.`;

    const estimatedPromptTokens = estimateTokens(`${systemPrompt}\n${userPrompt}`);
    const { data: withinDailyQuota } = await serviceClient.rpc("check_daily_token_quota", {
      p_user_id: userId,
      p_function_name: "refine-brief",
      p_max_tokens: DAILY_TOKEN_LIMIT,
      p_requested_tokens: estimatedPromptTokens,
    });
    if (withinDailyQuota === false) {
      return new Response(
        JSON.stringify({ error: "Daily token quota exceeded. Please try again tomorrow." }),
        { status: 429, headers: getResponseHeaders(req, "application/json") },
      );
    }

    const ai = await generateGeminiText({
      systemPrompt,
      messages: [{ role: "user", content: userPrompt }],
      temperature: 0.3,
    });

    try {
      await serviceClient.from("token_usage").insert({
        user_id: userId,
        function_name: "refine-brief",
        prompt_tokens: ai.usage.prompt_tokens,
        completion_tokens: ai.usage.completion_tokens,
        total_tokens: ai.usage.total_tokens,
        model: ai.model,
      });
    } catch (logErr) {
      console.error("Token logging error:", logErr);
    }

    return new Response(JSON.stringify({ result: ai.text }), {
      headers: getResponseHeaders(req, "application/json"),
    });
  } catch (e) {
    if (e instanceof GeminiError) {
      if (e.status === 429) {
        return new Response(
          JSON.stringify({ error: "Rate limit exceeded. Please try again in a moment." }),
          { status: 429, headers: getResponseHeaders(req, "application/json") },
        );
      }

      return new Response(
        JSON.stringify({ error: "AI service error" }),
        { status: 500, headers: getResponseHeaders(req, "application/json") },
      );
    }

    console.error("refine-brief error:", e);
    return new Response(JSON.stringify({ error: "Internal error" }), {
      status: 500,
      headers: getResponseHeaders(req, "application/json"),
    });
  }
});
