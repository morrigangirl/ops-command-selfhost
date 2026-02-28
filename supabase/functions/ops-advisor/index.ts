import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { getCorsHeaders } from "../_shared/cors.ts";
import { GeminiError, type LlmMessage, generateGeminiText } from "../_shared/gemini.ts";

const MAX_MESSAGE_CONTENT = 10000;
const MAX_MESSAGES = 50;
const SENSITIVE_FIELD_PATTERN =
  /(password|secret|api[_-]?key|private[_-]?key|access[_-]?token|refresh[_-]?token|credential|device_fingerprint)/i;

interface AdvisorInvocationContext {
  sourcePath?: string;
  sourceScreen?: string;
  sourceEntityType?: string;
  sourceEntityId?: string;
}

type RowRecord = Record<string, unknown>;

function toRows(rows: unknown[] | null): RowRecord[] {
  return (rows ?? []).filter((row): row is RowRecord => !!row && typeof row === "object");
}

function splitTextIntoChunks(text: string, targetSize = 180): string[] {
  const words = text.split(/\s+/).filter(Boolean);
  if (words.length === 0) return [];

  const chunks: string[] = [];
  let current = "";

  for (const word of words) {
    if ((`${current} ${word}`).trim().length > targetSize && current.length > 0) {
      chunks.push(current);
      current = word;
    } else {
      current = current ? `${current} ${word}` : word;
    }
  }

  if (current) chunks.push(current);
  return chunks;
}

function toSseChunk(model: string, content: string) {
  return JSON.stringify({
    id: `chatcmpl-${crypto.randomUUID()}`,
    object: "chat.completion.chunk",
    created: Math.floor(Date.now() / 1000),
    model,
    choices: [
      {
        index: 0,
        delta: { content },
      },
    ],
  });
}

function sanitizeValue(value: unknown): unknown {
  if (Array.isArray(value)) {
    return value.map(sanitizeValue);
  }

  if (value && typeof value === "object") {
    const out: Record<string, unknown> = {};
    for (const [key, nested] of Object.entries(value as Record<string, unknown>)) {
      if (SENSITIVE_FIELD_PATTERN.test(key)) continue;
      out[key] = sanitizeValue(nested);
    }
    return out;
  }

  return value;
}

function buildSection(title: string, rows: unknown[] | null) {
  const safeRows = (sanitizeValue(rows ?? []) as unknown[]) ?? [];
  const count = safeRows.length;
  if (count === 0) return `=== ${title} (0) ===\nNone.`;

  const serializedRows = safeRows.map((row) => JSON.stringify(row)).join("\n");
  return `=== ${title} (${count}) ===\n${serializedRows}`;
}

function parseInvocationContext(raw: unknown): AdvisorInvocationContext | null {
  if (!raw || typeof raw !== "object") return null;
  const ctx = raw as Record<string, unknown>;

  const sourcePath = typeof ctx.sourcePath === "string" ? ctx.sourcePath : undefined;
  const sourceScreen = typeof ctx.sourceScreen === "string" ? ctx.sourceScreen : undefined;
  const sourceEntityType = typeof ctx.sourceEntityType === "string"
    ? ctx.sourceEntityType
    : undefined;
  const sourceEntityId = typeof ctx.sourceEntityId === "string"
    ? ctx.sourceEntityId
    : undefined;

  if (!sourcePath && !sourceScreen && !sourceEntityType && !sourceEntityId) return null;
  return { sourcePath, sourceScreen, sourceEntityType, sourceEntityId };
}

function buildInvocationSection(context: AdvisorInvocationContext | null) {
  if (!context) {
    return "=== INVOCATION CONTEXT ===\nNo UI context supplied.";
  }

  return [
    "=== INVOCATION CONTEXT ===",
    `source_screen: ${context.sourceScreen || "unknown"}`,
    `source_path: ${context.sourcePath || "unknown"}`,
    `source_entity_type: ${context.sourceEntityType || "none"}`,
    `source_entity_id: ${context.sourceEntityId || "none"}`,
  ].join("\n");
}

function normalizeMessage(raw: unknown): LlmMessage {
  const value = raw && typeof raw === "object" ? raw as Record<string, unknown> : {};
  const role = value.role === "assistant" ? "assistant" : "user";
  const content = typeof value.content === "string"
    ? value.content.slice(0, MAX_MESSAGE_CONTENT)
    : "";
  return { role, content };
}

function buildFocusedContextSection(
  context: AdvisorInvocationContext | null,
  tables: Record<string, unknown[] | null>,
) {
  if (!context?.sourceEntityId || !context.sourceEntityType) {
    return "=== FOCUSED ENTITY CONTEXT ===\nNone.";
  }

  const id = context.sourceEntityId;
  const type = context.sourceEntityType.toLowerCase();
  const byId = (rows: unknown[] | null) => toRows(rows).filter((row) => row.id === id);
  const byField = (rows: unknown[] | null, field: string) =>
    toRows(rows).filter((row) => row[field] === id);

  if (type === "project") {
    return [
      buildSection("FOCUS PROJECT", byId(tables.projects)),
      buildSection(
        "FOCUS PROJECT MILESTONES",
        byField(tables.milestones, "project_id"),
      ),
      buildSection(
        "FOCUS PROJECT WORK ITEMS",
        byField(tables.workItems, "project_id"),
      ),
      buildSection(
        "FOCUS PROJECT REVIEWS",
        byField(tables.reviewEntries, "project_id"),
      ),
      buildSection(
        "FOCUS PROJECT METRICS",
        byField(tables.metrics, "related_project_id"),
      ),
      buildSection(
        "FOCUS PROJECT ACTION ITEMS",
        byField(tables.actionItems, "project_id"),
      ),
    ].join("\n\n");
  }

  if (type === "person") {
    return [
      buildSection("FOCUS PERSON", byId(tables.people)),
      buildSection(
        "FOCUS PERSON OWNED ACTION ITEMS",
        byField(tables.actionItems, "owner_id"),
      ),
      buildSection(
        "FOCUS PERSON MEETINGS",
        byField(tables.meetings, "person_id"),
      ),
      buildSection(
        "FOCUS PERSON PROJECTS",
        byField(tables.projects, "owner_id"),
      ),
      buildSection(
        "FOCUS PERSON METRICS",
        byField(tables.metrics, "owner_id"),
      ),
    ].join("\n\n");
  }

  if (type === "metric") {
    return [
      buildSection("FOCUS METRIC", byId(tables.metrics)),
      buildSection(
        "FOCUS METRIC ENTRIES",
        byField(tables.metricEntries, "metric_id"),
      ),
      buildSection(
        "FOCUS METRIC TARGETS",
        byField(tables.metricTargets, "metric_id"),
      ),
    ].join("\n\n");
  }

  if (type === "program") {
    const programWorkstreams = byField(tables.workstreams, "program_id");
    const workstreamIds = new Set(programWorkstreams.map((row) => row.id).filter(Boolean));

    return [
      buildSection("FOCUS PROGRAM", byId(tables.programs)),
      buildSection("FOCUS PROGRAM WORKSTREAMS", programWorkstreams),
      buildSection(
        "FOCUS PROGRAM PROJECTS",
        toRows(tables.projects).filter((row) => workstreamIds.has(row.workstream_id)),
      ),
    ].join("\n\n");
  }

  return "=== FOCUSED ENTITY CONTEXT ===\nNo focused entity mapping for this type.";
}

serve(async (req) => {
  const corsHeaders = getCorsHeaders(req);

  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const authHeader = req.headers.get("Authorization");
    if (!authHeader?.startsWith("Bearer ")) {
      return new Response(JSON.stringify({ error: "Missing auth" }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseKey = Deno.env.get("SUPABASE_ANON_KEY")!;
    const supabase = createClient(supabaseUrl, supabaseKey, {
      global: { headers: { Authorization: authHeader } },
    });

    const token = authHeader.replace("Bearer ", "");
    const { data: claimsData, error: claimsError } = await supabase.auth.getClaims(token);

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
      p_function_name: "ops-advisor",
      p_max_calls: 30,
      p_window_minutes: 60,
    });

    if (allowed === false) {
      return new Response(
        JSON.stringify({ error: "Rate limit exceeded. Please try again later." }),
        {
          status: 429,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        },
      );
    }

    const body = await req.json();
    if (!Array.isArray(body.messages)) {
      return new Response(JSON.stringify({ error: "Invalid messages" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const context = parseInvocationContext(body.context);
    const messages = body.messages.slice(0, MAX_MESSAGES).map((m: unknown) => normalizeMessage(m));

    const [
      { data: profiles },
      { data: people },
      { data: programs },
      { data: workstreams },
      { data: projects },
      { data: milestones },
      { data: workItems },
      { data: metrics },
      { data: metricEntries },
      { data: metricTargets },
      { data: meetings },
      { data: actionItems },
      { data: meetingDecisions },
      { data: reviewEntries },
    ] = await Promise.all([
      supabase.from("profiles").select("id, user_id, display_name, avatar_url, created_at, updated_at"),
      supabase.from("people").select("*"),
      supabase.from("programs").select("*"),
      supabase.from("workstreams").select("*"),
      supabase.from("projects").select("*"),
      supabase.from("milestones").select("*"),
      supabase.from("work_items").select("*"),
      supabase.from("metrics").select("*"),
      supabase.from("metric_entries").select("*"),
      supabase.from("metric_targets").select("*"),
      supabase.from("meetings").select("*"),
      supabase.from("meeting_action_items").select("*"),
      supabase.from("meeting_decisions").select("*"),
      supabase.from("review_entries").select("*"),
    ]);

    const tables = {
      profiles,
      people,
      programs,
      workstreams,
      projects,
      milestones,
      workItems,
      metrics,
      metricEntries,
      metricTargets,
      meetings,
      actionItems,
      meetingDecisions,
      reviewEntries,
    };

    const systemPrompt = `You are an AI strategic advisor for a Security Operations leader using "Ops Command."
You have access to the user's operational data below.
Use concrete references from the data whenever possible.
Prioritize recommendations that are specific, executable, and risk-aware.
Respond in concise markdown.
Do not expose or infer hidden credentials. Passwords, API keys, and secret-like fields are intentionally excluded.

${buildInvocationSection(context)}

${buildFocusedContextSection(context, tables)}

${buildSection("PROFILES", profiles)}

${buildSection("PEOPLE", people)}

${buildSection("PROGRAMS", programs)}

${buildSection("WORKSTREAMS", workstreams)}

${buildSection("PROJECTS", projects)}

${buildSection("MILESTONES", milestones)}

${buildSection("WORK ITEMS", workItems)}

${buildSection("METRICS", metrics)}

${buildSection("METRIC ENTRIES", metricEntries)}

${buildSection("METRIC TARGETS", metricTargets)}

${buildSection("MEETINGS", meetings)}

${buildSection("MEETING ACTION ITEMS", actionItems)}

${buildSection("MEETING DECISIONS", meetingDecisions)}

${buildSection("REVIEW ENTRIES", reviewEntries)}`;

    const ai = await generateGeminiText({
      systemPrompt,
      messages,
      temperature: 0.35,
    });

    try {
      await serviceClient.from("token_usage").insert({
        user_id: userId,
        function_name: "ops-advisor",
        prompt_tokens: ai.usage.prompt_tokens,
        completion_tokens: ai.usage.completion_tokens,
        total_tokens: ai.usage.total_tokens,
        model: ai.model,
      });
    } catch (logErr) {
      console.error("Token logging error:", logErr);
    }

    const encoder = new TextEncoder();
    const chunks = splitTextIntoChunks(ai.text);

    const stream = new ReadableStream({
      async start(controller) {
        for (const chunk of chunks) {
          const payload = toSseChunk(ai.model, chunk);
          controller.enqueue(encoder.encode(`data: ${payload}\n\n`));
          await new Promise((resolve) => setTimeout(resolve, 10));
        }
        controller.enqueue(encoder.encode("data: [DONE]\n\n"));
        controller.close();
      },
    });

    return new Response(stream, {
      headers: { ...corsHeaders, "Content-Type": "text/event-stream" },
    });
  } catch (e) {
    if (e instanceof GeminiError) {
      const status = e.status === 429 ? 429 : 500;
      const message = status === 429
        ? "Rate limit exceeded. Please try again shortly."
        : "AI service error";
      return new Response(JSON.stringify({ error: message }), {
        status,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    console.error("ops-advisor error:", e);
    return new Response(JSON.stringify({ error: "Internal error" }), {
      status: 500,
      headers: { ...getCorsHeaders(req), "Content-Type": "application/json" },
    });
  }
});
