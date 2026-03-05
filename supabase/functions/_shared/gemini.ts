export interface LlmMessage {
  role: "user" | "assistant";
  content: string;
}

export interface TokenUsage {
  prompt_tokens: number;
  completion_tokens: number;
  total_tokens: number;
}

export class GeminiError extends Error {
  status: number;

  constructor(message: string, status = 500) {
    super(message);
    this.name = "GeminiError";
    this.status = status;
  }
}

interface GeminiGenerateParams {
  systemPrompt?: string;
  messages: LlmMessage[];
  temperature?: number;
}

interface GeminiGenerateResult {
  text: string;
  usage: TokenUsage;
  model: string;
}

const DEFAULT_TIMEOUT_MS = 15000;

function getGeminiConfig() {
  const apiKey = Deno.env.get("GEMINI_API_KEY");
  if (!apiKey) {
    throw new GeminiError("GEMINI_API_KEY not configured", 500);
  }
  return {
    apiKey,
    model: Deno.env.get("GEMINI_MODEL") || "gemini-2.5-pro",
  };
}

function mapRole(role: LlmMessage["role"]): "user" | "model" {
  return role === "assistant" ? "model" : "user";
}

function extractResponseText(data: any): string {
  const candidate = data?.candidates?.[0];
  const parts = candidate?.content?.parts;
  if (!Array.isArray(parts)) return "";
  return parts
    .map((part: any) => (typeof part?.text === "string" ? part.text : ""))
    .join("");
}

function extractUsage(data: any): TokenUsage {
  const usage = data?.usageMetadata ?? {};
  return {
    prompt_tokens: Number(usage.promptTokenCount ?? 0),
    completion_tokens: Number(usage.candidatesTokenCount ?? 0),
    total_tokens: Number(usage.totalTokenCount ?? 0),
  };
}

export async function generateGeminiText(
  params: GeminiGenerateParams,
): Promise<GeminiGenerateResult> {
  const { apiKey, model } = getGeminiConfig();
  const endpoint =
    `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent`;

  const body: any = {
    contents: params.messages.map((message) => ({
      role: mapRole(message.role),
      parts: [{ text: message.content }],
    })),
    generationConfig: {
      temperature: params.temperature ?? 0.4,
    },
  };

  if (params.systemPrompt) {
    body.systemInstruction = {
      parts: [{ text: params.systemPrompt }],
    };
  }

  const controller = new AbortController();
  const timeoutMs = Number(Deno.env.get("GEMINI_TIMEOUT_MS") ?? DEFAULT_TIMEOUT_MS);
  const timeout = setTimeout(() => controller.abort(), timeoutMs);

  let response: Response;
  try {
    response = await fetch(endpoint, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "x-goog-api-key": apiKey,
      },
      body: JSON.stringify(body),
      signal: controller.signal,
    });
  } catch (error) {
    if (error instanceof DOMException && error.name === "AbortError") {
      throw new GeminiError("Gemini request timed out", 504);
    }
    throw error;
  } finally {
    clearTimeout(timeout);
  }

  if (!response.ok) {
    const details = await response.text();
    throw new GeminiError(details || "Gemini request failed", response.status);
  }

  const data = await response.json();
  const text = extractResponseText(data);
  if (!text) {
    throw new GeminiError("Gemini returned an empty response", 502);
  }

  return {
    text,
    usage: extractUsage(data),
    model,
  };
}
