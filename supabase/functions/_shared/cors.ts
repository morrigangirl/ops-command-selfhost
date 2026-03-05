const DEFAULT_ALLOWED_ORIGINS = [
  "https://ops-war-room.hexwitch.info",
  "http://localhost:3000",
  "http://127.0.0.1:3000",
  "http://localhost:8200",
  "http://127.0.0.1:8200",
];

const SECURITY_HEADERS = {
  "Cache-Control": "no-store",
  "X-Content-Type-Options": "nosniff",
  "Vary": "Origin",
} as const;

export function getAllowedOrigins(): string[] {
  const envValue = Deno.env.get("ALLOWED_ORIGINS");
  if (!envValue) return DEFAULT_ALLOWED_ORIGINS;

  const parsed = envValue
    .split(",")
    .map((origin) => origin.trim())
    .filter(Boolean);

  return parsed.length > 0 ? parsed : DEFAULT_ALLOWED_ORIGINS;
}

export function getCorsHeaders(req: Request) {
  const origin = req.headers.get("Origin") || "";
  const allowedOrigins = getAllowedOrigins();
  const allowOrigin = origin && allowedOrigins.includes(origin);
  const corsHeaders: Record<string, string> = {
    "Access-Control-Allow-Headers":
      "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
    "Access-Control-Allow-Methods": "GET,POST,OPTIONS",
    ...SECURITY_HEADERS,
  };

  if (allowOrigin) {
    corsHeaders["Access-Control-Allow-Origin"] = origin;
  }

  return corsHeaders;
}

export function isOriginAllowed(req: Request): boolean {
  const origin = req.headers.get("Origin");
  if (!origin) return true;
  return getAllowedOrigins().includes(origin);
}

export function getResponseHeaders(req: Request, contentType?: string) {
  const headers: Record<string, string> = {
    ...getCorsHeaders(req),
  };
  if (contentType) headers["Content-Type"] = contentType;
  return headers;
}
