import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { getCorsHeaders } from "../_shared/cors.ts";
import { GeminiError, generateGeminiText } from "../_shared/gemini.ts";

const MAX_FIELD_LENGTH = 2000;
const MAX_ARRAY_ITEMS = 50;

function truncate(val: unknown, max = MAX_FIELD_LENGTH): string {
  const s = typeof val === "string" ? val : String(val ?? "");
  return s.slice(0, max);
}

const SYSTEM_PROMPTS: Record<string, string> = {
  "1on1": "You generate concise 1:1 meeting agendas in markdown. Sections: ## Status Check, ## Blockers, ## Action Item Review, ## Development & Growth. Keep each section to 2-3 bullet points. Be specific using the context provided.",
  strategy:
    "You generate concise strategy meeting agendas in markdown. Sections: ## Strategic Landscape, ## Initiative Deep-Dive, ## Resource Alignment, ## Decisions Needed. Keep each section to 2-3 bullet points. Be specific using the context provided.",
  checkin:
    "You generate concise human check-in agendas in markdown. Sections: ## How Are You Doing, ## Workload Check, ## Support Needed, ## Recent Wins. Keep each section to 2-3 bullet points. Be warm and specific using the context provided.",
};

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
      p_function_name: "generate-agenda",
      p_max_calls: 20,
      p_window_minutes: 60,
    });

    if (allowed === false) {
      return new Response(
        JSON.stringify({ error: "Rate limit exceeded. Please try again later." }),
        { status: 429, headers: { ...corsHeaders, "Content-Type": "application/json" } },
      );
    }

    const body = await req.json();
    const personName = truncate(body.personName, 200);
    const meetingType = truncate(body.meetingType, 20);
    const lastMeetingNotes = truncate(body.lastMeetingNotes, 5000);
    const openActionItems = Array.isArray(body.openActionItems)
      ? body.openActionItems.slice(0, MAX_ARRAY_ITEMS).map((i: unknown) => truncate(i, 500))
      : [];
    const activeProjects = Array.isArray(body.activeProjects)
      ? body.activeProjects.slice(0, MAX_ARRAY_ITEMS).map((p: unknown) => truncate(p, 500))
      : [];

    const systemPrompt = SYSTEM_PROMPTS[meetingType] || SYSTEM_PROMPTS["1on1"];

    const userPrompt = `Generate an agenda for a ${meetingType} meeting with ${personName}.

${lastMeetingNotes ? `Last meeting notes:\n${lastMeetingNotes}\n` : "No previous meeting notes available."}

${openActionItems.length > 0 ? `Open action items:\n${openActionItems.map((i: string) => `- ${i}`).join("\n")}\n` : "No open action items."}

${activeProjects.length > 0 ? `Active projects:\n${activeProjects.map((p: string) => `- ${p}`).join("\n")}` : "No active projects."}`;

    const ai = await generateGeminiText({
      systemPrompt,
      messages: [{ role: "user", content: userPrompt }],
      temperature: 0.3,
    });

    try {
      await serviceClient.from("token_usage").insert({
        user_id: userId,
        function_name: "generate-agenda",
        prompt_tokens: ai.usage.prompt_tokens,
        completion_tokens: ai.usage.completion_tokens,
        total_tokens: ai.usage.total_tokens,
        model: ai.model,
      });
    } catch (logErr) {
      console.error("Token logging error:", logErr);
    }

    return new Response(JSON.stringify({ agenda: ai.text }), {
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
        JSON.stringify({ error: "Failed to generate agenda" }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } },
      );
    }

    console.error("generate-agenda error:", e);
    return new Response(JSON.stringify({ error: "Internal error" }), {
      status: 500,
      headers: { ...getCorsHeaders(req), "Content-Type": "application/json" },
    });
  }
});
