# Ops Command Center (Selfhost)

Security operations command center built with React + Supabase, designed for self-hosted operation.

## Local development

```sh
npm install
npm run dev
```

## Build and test

```sh
npm run build
npm test
```

## Selfhost stack

Selfhost tooling and deployment notes live under `infra/selfhost/`.

Common commands:

```sh
npm run selfhost-check
infra/selfhost/scripts/start_stack.sh
infra/selfhost/scripts/doctor.sh
infra/selfhost/scripts/status.sh
infra/selfhost/scripts/stop_stack.sh
```

## Configuration

- Frontend env vars: `.env` (local) and `infra/selfhost/.env` (selfhost flow)
- Supabase edge-function env vars: `supabase/functions/.env.local`
- CORS allowlist: `ALLOWED_ORIGINS` in `supabase/functions/.env.local`
