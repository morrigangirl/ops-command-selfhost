import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { getCorsHeaders, getResponseHeaders, isOriginAllowed } from "../_shared/cors.ts";
import { GeminiError, type LlmMessage, generateGeminiText } from "../_shared/gemini.ts";

const MAX_MESSAGE_CONTENT = 4000;
const MAX_MESSAGES = 20;
const MAX_REQUEST_BYTES = 120_000;
const MAX_PROMPT_CHARS = 120_000;
const DEFAULT_ROW_LIMIT = 25;
const FOCUSED_ROW_LIMIT = 80;
const DAILY_TOKEN_LIMIT = 400_000;
const ESTIMATED_COMPLETION_TOKENS = 1500;

interface AdvisorInvocationContext {
  sourcePath?: string;
  sourceScreen?: string;
  sourceEntityType?: string;
  sourceEntityId?: string;
}

type RowRecord = Record<string, unknown>;

type TableData = {
  profiles: RowRecord[] | null;
  people: RowRecord[] | null;
  programs: RowRecord[] | null;
  workstreams: RowRecord[] | null;
  projects: RowRecord[] | null;
  milestones: RowRecord[] | null;
  workItems: RowRecord[] | null;
  metrics: RowRecord[] | null;
  metricEntries: RowRecord[] | null;
  metricTargets: RowRecord[] | null;
  meetings: RowRecord[] | null;
  actionItems: RowRecord[] | null;
  meetingDecisions: RowRecord[] | null;
  reviewEntries: RowRecord[] | null;
};

function toRows(rows: unknown[] | null): RowRecord[] {
  return (rows ?? []).filter((row): row is RowRecord => !!row && typeof row === "object");
}

function estimateTokens(text: string): number {
  return Math.ceil(text.length / 4);
}

function splitTextIntoChunks(text: string, targetSize = 220): string[] {
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

function buildSection(title: string, rows: unknown[] | null, maxRows = DEFAULT_ROW_LIMIT) {
  const safeRows = toRows(rows).slice(0, maxRows);
  const count = safeRows.length;
  if (count === 0) return `=== ${title} (0) ===\nNone.`;

  const serializedRows = safeRows.map((row) => JSON.stringify(row).slice(0, 1200)).join("\n");
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

function mergeRows(base: unknown[] | null, focused: unknown[] | null): RowRecord[] {
  const merged = [...toRows(base), ...toRows(focused)];
  const out = new Map<string, RowRecord>();

  for (const row of merged) {
    const key = row.id ? String(row.id) : JSON.stringify(row);
    out.set(key, row);
  }

  return [...out.values()];
}

function buildFocusedContextSection(
  context: AdvisorInvocationContext | null,
  tables: TableData,
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
      buildSection("FOCUS PROJECT", byId(tables.projects), FOCUSED_ROW_LIMIT),
      buildSection("FOCUS PROJECT MILESTONES", byField(tables.milestones, "project_id"), FOCUSED_ROW_LIMIT),
      buildSection("FOCUS PROJECT WORK ITEMS", byField(tables.workItems, "project_id"), FOCUSED_ROW_LIMIT),
      buildSection("FOCUS PROJECT REVIEWS", byField(tables.reviewEntries, "project_id"), FOCUSED_ROW_LIMIT),
      buildSection("FOCUS PROJECT METRICS", byField(tables.metrics, "related_project_id"), FOCUSED_ROW_LIMIT),
      buildSection("FOCUS PROJECT ACTION ITEMS", byField(tables.actionItems, "project_id"), FOCUSED_ROW_LIMIT),
    ].join("\n\n");
  }

  if (type === "person") {
    return [
      buildSection("FOCUS PERSON", byId(tables.people), FOCUSED_ROW_LIMIT),
      buildSection("FOCUS PERSON OWNED ACTION ITEMS", byField(tables.actionItems, "owner_id"), FOCUSED_ROW_LIMIT),
      buildSection("FOCUS PERSON MEETINGS", byField(tables.meetings, "person_id"), FOCUSED_ROW_LIMIT),
      buildSection("FOCUS PERSON PROJECTS", byField(tables.projects, "owner_id"), FOCUSED_ROW_LIMIT),
      buildSection("FOCUS PERSON METRICS", byField(tables.metrics, "owner_id"), FOCUSED_ROW_LIMIT),
    ].join("\n\n");
  }

  if (type === "metric") {
    return [
      buildSection("FOCUS METRIC", byId(tables.metrics), FOCUSED_ROW_LIMIT),
      buildSection("FOCUS METRIC ENTRIES", byField(tables.metricEntries, "metric_id"), FOCUSED_ROW_LIMIT),
      buildSection("FOCUS METRIC TARGETS", byField(tables.metricTargets, "metric_id"), FOCUSED_ROW_LIMIT),
    ].join("\n\n");
  }

  if (type === "program") {
    const programWorkstreams = byField(tables.workstreams, "program_id");
    const workstreamIds = new Set(programWorkstreams.map((row) => row.id).filter(Boolean));

    return [
      buildSection("FOCUS PROGRAM", byId(tables.programs), FOCUSED_ROW_LIMIT),
      buildSection("FOCUS PROGRAM WORKSTREAMS", programWorkstreams, FOCUSED_ROW_LIMIT),
      buildSection(
        "FOCUS PROGRAM PROJECTS",
        toRows(tables.projects).filter((row) => workstreamIds.has(row.workstream_id)),
        FOCUSED_ROW_LIMIT,
      ),
    ].join("\n\n");
  }

  return "=== FOCUSED ENTITY CONTEXT ===\nNo focused entity mapping for this type.";
}

function buildPromptWithinBudget(parts: string[], maxChars: number): string {
  let result = "";
  for (const part of parts) {
    const addition = result ? `\n\n${part}` : part;
    const remaining = maxChars - result.length;
    if (remaining <= 0) break;

    if (addition.length <= remaining) {
      result += addition;
      continue;
    }

    result += `${addition.slice(0, Math.max(remaining - 16, 0))}\n...[truncated]`;
    break;
  }

  return result;
}

async function fetchRecentTables(supabase: ReturnType<typeof createClient>): Promise<TableData> {
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
    supabase.from("profiles").select("id, display_name, created_at, updated_at").order("updated_at", { ascending: false }).limit(DEFAULT_ROW_LIMIT),
    supabase.from("people").select("id, name, role, active, manager_id, last_1on1, last_strategic_deep_dive, last_human_checkin, created_at").order("created_at", { ascending: false }).limit(DEFAULT_ROW_LIMIT),
    supabase.from("programs").select("id, name, status, start_date, target_end_date, created_at, deleted_at").order("created_at", { ascending: false }).limit(DEFAULT_ROW_LIMIT),
    supabase.from("workstreams").select("id, program_id, name, description, sort_order, lead_id, created_at, deleted_at").order("created_at", { ascending: false }).limit(DEFAULT_ROW_LIMIT),
    supabase.from("projects").select("id, name, status, risk, review_cadence, owner_id, workstream_id, target_date, last_reviewed, created_date, created_at, deleted_at").order("created_at", { ascending: false }).limit(DEFAULT_ROW_LIMIT),
    supabase.from("milestones").select("id, project_id, name, target_date, completed, completed_date, sort_order, created_at").order("created_at", { ascending: false }).limit(DEFAULT_ROW_LIMIT),
    supabase.from("work_items").select("id, project_id, milestone_id, parent_id, type, title, status, assignee_id, due_date, sort_order, created_at").order("created_at", { ascending: false }).limit(DEFAULT_ROW_LIMIT),
    supabase.from("metrics").select("id, name, category, unit, current_value, confidence, status, owner_id, related_project_id, last_updated_at, created_at").order("created_at", { ascending: false }).limit(DEFAULT_ROW_LIMIT),
    supabase.from("metric_entries").select("id, metric_id, entry_date, value, confidence_override, created_at").order("created_at", { ascending: false }).limit(DEFAULT_ROW_LIMIT),
    supabase.from("metric_targets").select("id, metric_id, period, target_value, created_at").order("created_at", { ascending: false }).limit(DEFAULT_ROW_LIMIT),
    supabase.from("meetings").select("id, person_id, type, scheduled_date, status, completed_at, created_at").order("created_at", { ascending: false }).limit(DEFAULT_ROW_LIMIT),
    supabase.from("meeting_action_items").select("id, meeting_id, title, owner_id, due_date, project_id, status, created_at").order("created_at", { ascending: false }).limit(DEFAULT_ROW_LIMIT),
    supabase.from("meeting_decisions").select("id, meeting_id, summary, created_at").order("created_at", { ascending: false }).limit(DEFAULT_ROW_LIMIT),
    supabase.from("review_entries").select("id, project_id, date, notes, created_at").order("created_at", { ascending: false }).limit(DEFAULT_ROW_LIMIT),
  ]);

  return {
    profiles: profiles as RowRecord[] | null,
    people: people as RowRecord[] | null,
    programs: programs as RowRecord[] | null,
    workstreams: workstreams as RowRecord[] | null,
    projects: projects as RowRecord[] | null,
    milestones: milestones as RowRecord[] | null,
    workItems: workItems as RowRecord[] | null,
    metrics: metrics as RowRecord[] | null,
    metricEntries: metricEntries as RowRecord[] | null,
    metricTargets: metricTargets as RowRecord[] | null,
    meetings: meetings as RowRecord[] | null,
    actionItems: actionItems as RowRecord[] | null,
    meetingDecisions: meetingDecisions as RowRecord[] | null,
    reviewEntries: reviewEntries as RowRecord[] | null,
  };
}

async function fetchFocusedTables(
  supabase: ReturnType<typeof createClient>,
  context: AdvisorInvocationContext | null,
): Promise<Partial<TableData>> {
  if (!context?.sourceEntityId || !context.sourceEntityType) return {};

  const id = context.sourceEntityId;
  const type = context.sourceEntityType.toLowerCase();

  if (type === "project") {
    const [
      { data: projectRows },
      { data: milestones },
      { data: workItems },
      { data: reviewEntries },
      { data: metrics },
      { data: actionItems },
    ] = await Promise.all([
      supabase.from("projects").select("id, name, status, risk, review_cadence, owner_id, workstream_id, target_date, last_reviewed, created_date, created_at, deleted_at").eq("id", id).limit(1),
      supabase.from("milestones").select("id, project_id, name, target_date, completed, completed_date, sort_order, created_at").eq("project_id", id).order("created_at", { ascending: false }).limit(FOCUSED_ROW_LIMIT),
      supabase.from("work_items").select("id, project_id, milestone_id, parent_id, type, title, status, assignee_id, due_date, sort_order, created_at").eq("project_id", id).order("created_at", { ascending: false }).limit(FOCUSED_ROW_LIMIT),
      supabase.from("review_entries").select("id, project_id, date, notes, created_at").eq("project_id", id).order("created_at", { ascending: false }).limit(FOCUSED_ROW_LIMIT),
      supabase.from("metrics").select("id, name, category, unit, current_value, confidence, status, owner_id, related_project_id, last_updated_at, created_at").eq("related_project_id", id).order("created_at", { ascending: false }).limit(FOCUSED_ROW_LIMIT),
      supabase.from("meeting_action_items").select("id, meeting_id, title, owner_id, due_date, project_id, status, created_at").eq("project_id", id).order("created_at", { ascending: false }).limit(FOCUSED_ROW_LIMIT),
    ]);

    return {
      projects: projectRows as RowRecord[] | null,
      milestones: milestones as RowRecord[] | null,
      workItems: workItems as RowRecord[] | null,
      reviewEntries: reviewEntries as RowRecord[] | null,
      metrics: metrics as RowRecord[] | null,
      actionItems: actionItems as RowRecord[] | null,
    };
  }

  if (type === "person") {
    const [
      { data: personRows },
      { data: meetings },
      { data: actionItems },
      { data: projects },
      { data: metrics },
    ] = await Promise.all([
      supabase.from("people").select("id, name, role, active, manager_id, last_1on1, last_strategic_deep_dive, last_human_checkin, created_at").eq("id", id).limit(1),
      supabase.from("meetings").select("id, person_id, type, scheduled_date, status, completed_at, created_at").eq("person_id", id).order("created_at", { ascending: false }).limit(FOCUSED_ROW_LIMIT),
      supabase.from("meeting_action_items").select("id, meeting_id, title, owner_id, due_date, project_id, status, created_at").eq("owner_id", id).order("created_at", { ascending: false }).limit(FOCUSED_ROW_LIMIT),
      supabase.from("projects").select("id, name, status, risk, review_cadence, owner_id, workstream_id, target_date, last_reviewed, created_date, created_at, deleted_at").eq("owner_id", id).order("created_at", { ascending: false }).limit(FOCUSED_ROW_LIMIT),
      supabase.from("metrics").select("id, name, category, unit, current_value, confidence, status, owner_id, related_project_id, last_updated_at, created_at").eq("owner_id", id).order("created_at", { ascending: false }).limit(FOCUSED_ROW_LIMIT),
    ]);

    return {
      people: personRows as RowRecord[] | null,
      meetings: meetings as RowRecord[] | null,
      actionItems: actionItems as RowRecord[] | null,
      projects: projects as RowRecord[] | null,
      metrics: metrics as RowRecord[] | null,
    };
  }

  if (type === "metric") {
    const [
      { data: metricRows },
      { data: metricEntries },
      { data: metricTargets },
    ] = await Promise.all([
      supabase.from("metrics").select("id, name, category, unit, current_value, confidence, status, owner_id, related_project_id, last_updated_at, created_at").eq("id", id).limit(1),
      supabase.from("metric_entries").select("id, metric_id, entry_date, value, confidence_override, created_at").eq("metric_id", id).order("created_at", { ascending: false }).limit(FOCUSED_ROW_LIMIT),
      supabase.from("metric_targets").select("id, metric_id, period, target_value, created_at").eq("metric_id", id).order("created_at", { ascending: false }).limit(FOCUSED_ROW_LIMIT),
    ]);

    return {
      metrics: metricRows as RowRecord[] | null,
      metricEntries: metricEntries as RowRecord[] | null,
      metricTargets: metricTargets as RowRecord[] | null,
    };
  }

  if (type === "program") {
    const { data: programRows } = await supabase
      .from("programs")
      .select("id, name, status, start_date, target_end_date, created_at, deleted_at")
      .eq("id", id)
      .limit(1);

    const { data: workstreamRows } = await supabase
      .from("workstreams")
      .select("id, program_id, name, description, sort_order, lead_id, created_at, deleted_at")
      .eq("program_id", id)
      .order("created_at", { ascending: false })
      .limit(FOCUSED_ROW_LIMIT);

    const workstreamIds = [...new Set(toRows(workstreamRows).map((row) => row.id).filter(Boolean))] as string[];
    let projectRows: RowRecord[] | null = [];
    if (workstreamIds.length > 0) {
      const { data } = await supabase
        .from("projects")
        .select("id, name, status, risk, review_cadence, owner_id, workstream_id, target_date, last_reviewed, created_date, created_at, deleted_at")
        .in("workstream_id", workstreamIds)
        .order("created_at", { ascending: false })
        .limit(FOCUSED_ROW_LIMIT);
      projectRows = data as RowRecord[] | null;
    }

    return {
      programs: programRows as RowRecord[] | null,
      workstreams: workstreamRows as RowRecord[] | null,
      projects: projectRows as RowRecord[] | null,
    };
  }

  return {};
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
      return new Response(JSON.stringify({ error: "Missing auth" }), {
        status: 401,
        headers: getResponseHeaders(req, "application/json"),
      });
    }

    const contentLength = Number(req.headers.get("content-length") ?? "0");
    if (contentLength > MAX_REQUEST_BYTES) {
      return new Response(JSON.stringify({ error: "Request payload too large" }), {
        status: 413,
        headers: getResponseHeaders(req, "application/json"),
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
      p_function_name: "ops-advisor",
      p_max_calls: 30,
      p_window_minutes: 60,
    });

    if (allowed === false) {
      return new Response(
        JSON.stringify({ error: "Rate limit exceeded. Please try again later." }),
        {
          status: 429,
          headers: getResponseHeaders(req, "application/json"),
        },
      );
    }

    const body = await req.json();
    const serializedBodySize = JSON.stringify(body).length;
    if (serializedBodySize > MAX_REQUEST_BYTES) {
      return new Response(JSON.stringify({ error: "Request payload too large" }), {
        status: 413,
        headers: getResponseHeaders(req, "application/json"),
      });
    }

    if (!Array.isArray(body.messages)) {
      return new Response(JSON.stringify({ error: "Invalid messages" }), {
        status: 400,
        headers: getResponseHeaders(req, "application/json"),
      });
    }

    const context = parseInvocationContext(body.context);
    const messages = body.messages.slice(0, MAX_MESSAGES).map((m: unknown) => normalizeMessage(m));

    const baseTables = await fetchRecentTables(supabase);
    const focusedTables = await fetchFocusedTables(supabase, context);

    const tables: TableData = {
      profiles: mergeRows(baseTables.profiles, focusedTables.profiles ?? null),
      people: mergeRows(baseTables.people, focusedTables.people ?? null),
      programs: mergeRows(baseTables.programs, focusedTables.programs ?? null),
      workstreams: mergeRows(baseTables.workstreams, focusedTables.workstreams ?? null),
      projects: mergeRows(baseTables.projects, focusedTables.projects ?? null),
      milestones: mergeRows(baseTables.milestones, focusedTables.milestones ?? null),
      workItems: mergeRows(baseTables.workItems, focusedTables.workItems ?? null),
      metrics: mergeRows(baseTables.metrics, focusedTables.metrics ?? null),
      metricEntries: mergeRows(baseTables.metricEntries, focusedTables.metricEntries ?? null),
      metricTargets: mergeRows(baseTables.metricTargets, focusedTables.metricTargets ?? null),
      meetings: mergeRows(baseTables.meetings, focusedTables.meetings ?? null),
      actionItems: mergeRows(baseTables.actionItems, focusedTables.actionItems ?? null),
      meetingDecisions: mergeRows(baseTables.meetingDecisions, focusedTables.meetingDecisions ?? null),
      reviewEntries: mergeRows(baseTables.reviewEntries, focusedTables.reviewEntries ?? null),
    };

    const sections = [
      `You are an AI strategic advisor for a Security Operations leader using "Ops Command."
Use only the provided operational context.
Prioritize recommendations that are specific, executable, and risk-aware.
Respond in concise markdown.
If context is insufficient, say so and ask for only the minimum extra data needed.`,
      buildInvocationSection(context),
      buildFocusedContextSection(context, tables),
      buildSection("PROFILES", tables.profiles),
      buildSection("PEOPLE", tables.people),
      buildSection("PROGRAMS", tables.programs),
      buildSection("WORKSTREAMS", tables.workstreams),
      buildSection("PROJECTS", tables.projects),
      buildSection("MILESTONES", tables.milestones),
      buildSection("WORK ITEMS", tables.workItems),
      buildSection("METRICS", tables.metrics),
      buildSection("METRIC ENTRIES", tables.metricEntries),
      buildSection("METRIC TARGETS", tables.metricTargets),
      buildSection("MEETINGS", tables.meetings),
      buildSection("MEETING ACTION ITEMS", tables.actionItems),
      buildSection("MEETING DECISIONS", tables.meetingDecisions),
      buildSection("REVIEW ENTRIES", tables.reviewEntries),
    ];

    const systemPrompt = buildPromptWithinBudget(sections, MAX_PROMPT_CHARS);
    const userMessagesText = messages.map((m) => m.content).join("\n");
    const estimatedTokens = estimateTokens(`${systemPrompt}\n${userMessagesText}`) + ESTIMATED_COMPLETION_TOKENS;

    const { data: withinDailyQuota } = await serviceClient.rpc("check_daily_token_quota", {
      p_user_id: userId,
      p_function_name: "ops-advisor",
      p_max_tokens: DAILY_TOKEN_LIMIT,
      p_requested_tokens: estimatedTokens,
    });

    if (withinDailyQuota === false) {
      return new Response(
        JSON.stringify({ error: "Daily token quota exceeded. Please try again tomorrow." }),
        {
          status: 429,
          headers: getResponseHeaders(req, "application/json"),
        },
      );
    }

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
      headers: getResponseHeaders(req, "text/event-stream"),
    });
  } catch (e) {
    if (e instanceof GeminiError) {
      const status = e.status === 429 ? 429 : 500;
      const message = status === 429
        ? "Rate limit exceeded. Please try again shortly."
        : "AI service error";
      return new Response(JSON.stringify({ error: message }), {
        status,
        headers: getResponseHeaders(req, "application/json"),
      });
    }

    console.error("ops-advisor error:", e);
    return new Response(JSON.stringify({ error: "Internal error" }), {
      status: 500,
      headers: getResponseHeaders(req, "application/json"),
    });
  }
});
