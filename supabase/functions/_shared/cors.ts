const DEFAULT_ALLOWED_ORIGINS = [
  "https://ops-war-room.hexwitch.info",
  "http://localhost:3000",
  "http://127.0.0.1:3000",
  "http://localhost:8200",
  "http://127.0.0.1:8200",
];

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
  const defaultOrigin = allowedOrigins[0] || "*";
  const allowedOrigin = allowedOrigins.includes(origin) ? origin : defaultOrigin;

  return {
    "Access-Control-Allow-Origin": allowedOrigin,
    "Access-Control-Allow-Headers":
      "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
    "Access-Control-Allow-Methods": "GET,POST,OPTIONS",
  };
}
