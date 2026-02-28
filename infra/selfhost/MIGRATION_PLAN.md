# Local Stack Migration Plan

This runbook migrates the full project to a local self-hosted stack on your Mac, with remote access through a reverse-proxy gateway.

## Target Architecture

- Frontend (Vite build): served by local `vite preview`
- Supabase: local (`npx supabase start`) for Postgres/Auth/Storage/Realtime/Functions
- AI calls: Gemini 2.5 Pro from Edge Functions (server-side key only)
- Remote access: gateway tunnel to `app.<domain>` and `api.<domain>`

## 1) Prerequisites

- Docker running on Mac
- Node 20+ and npm
- Supabase CLI available via `npx supabase ...`
- Gateway account configured (Cloudflare Tunnel or equivalent)
- Gemini API key ready

## 2) Configure Environment Files

1. Copy selfhost env:

```bash
cp infra/selfhost/.env.example infra/selfhost/.env
```

2. Set frontend/public vars in `infra/selfhost/.env`:
- `APP_DOMAIN`
- `API_DOMAIN`
- `VITE_SUPABASE_URL=https://<api-domain>`
- `VITE_SUPABASE_PUBLISHABLE_KEY=<local anon key>`
- `CLOUDFLARE_TUNNEL_TOKEN` (if using token-based cloudflared)

3. Copy function env template:

```bash
cp supabase/functions/.env.local.example supabase/functions/.env.local
```

4. Set secret/server vars in `supabase/functions/.env.local`:
- `GEMINI_API_KEY=<your key>`
- `GEMINI_MODEL=gemini-2.5-pro`
- `ALLOWED_ORIGINS=https://<app-domain>,http://localhost:8200`

## 3) Start Local Services

```bash
infra/selfhost/scripts/build_frontend.sh
infra/selfhost/scripts/start_stack.sh
```

This starts:
- local Supabase stack
- frontend preview on `WEB_PORT` (default `8200`)
- cloudflared tunnel container (if token set)

## 4) Data Migration (Hosted Supabase -> Local)

1. Dump hosted DB (schema + data) using Supabase CLI.
2. Restore into local Postgres container.
3. Validate row counts for critical tables (`projects`, `people`, `metrics`, `programs`, `workstreams`, `chat_*`).
4. Copy storage buckets/objects from hosted project to local storage endpoint.

## 5) Verify Gemini Functionality

Functions now call Gemini directly:
- `ops-advisor` (SSE stream format preserved for existing chat UI parser)
- `generate-agenda`
- `refine-brief`

Validation checklist:
- Chat streams assistant output end-to-end
- Agenda generation returns `data.agenda`
- Refine brief returns `data.result`
- `token_usage` inserts rows with Gemini model and token counts

## 6) Gateway and Domain Cutover

- Route `app.<domain>` -> `http://host.docker.internal:8200`
- Route `api.<domain>` -> `http://host.docker.internal:55321`
- Confirm phone access via HTTPS
- Confirm auth redirect URLs are updated for the gateway domains

## 7) Operations Baseline (Required for Daily Use)

- Disable host sleep
- Add automatic restart on boot for Docker + stack
- Nightly DB backup + storage backup
- Weekly restore test to confirm backup integrity
- Monitor tunnel status and local disk/memory usage
