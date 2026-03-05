# Selfhost Scaffold (Local Mac + Gateway)

This folder is an isolated deployment scaffold for this app on your local machine.

It assumes:
- Supabase stack runs locally via `npx supabase start`.
- Frontend is built locally (`dist/`).
- Frontend is served locally with `vite preview`.
- Cloudflare Tunnel provides remote access (phone, external users).
- Edge functions use Gemini with secrets from `supabase/functions/.env.local`.

## Files

- `.env.example`: Selfhost environment template.
- `docker-compose.yml`: cloudflared tunnel container.
- `cloudflared/config.example.yml`: Optional config-file tunnel pattern.
- `scripts/`: helper scripts.
- `MIGRATION_PLAN.md`: full hosted->local migration runbook.

## Quick Start

1. Copy env template and fill values:

```bash
cp infra/selfhost/.env.example infra/selfhost/.env
```

2. Build frontend with selfhost env values:

```bash
chmod +x infra/selfhost/scripts/*.sh
infra/selfhost/scripts/build_frontend.sh
```

3. Start local Supabase + selfhost edge:

```bash
infra/selfhost/scripts/start_stack.sh
```

4. Stop everything:

```bash
infra/selfhost/scripts/stop_stack.sh
```

5. Run strict diagnostics (recommended after start):

```bash
infra/selfhost/scripts/doctor.sh
```

6. Check strict runtime status/lock state:

```bash
infra/selfhost/scripts/status.sh
```

7. Run full local selfhost gate (build + doctor + status):

```bash
npm run selfhost-check
```

The start script runs `supabase start` (which serves edge functions for this project)
and starts `vite preview` on `WEB_PORT`, with logs written to
`infra/selfhost/state/frontend.log`.

The selfhost scripts now run in strict mode:
- `WEB_PORT` must be `8200`.
- `VITE_SUPABASE_URL` must match `http://127.0.0.1:${SUPABASE_API_PORT}`.
- Frontend start requires a matching build stamp in `infra/selfhost/state/frontend-build.env`.
- `doctor.sh` reports and fails on stack collisions or mismatched build/runtime wiring.
- Stack lifecycle is lock-protected via `infra/selfhost/state/stack.lock`.
- `stop_stack.sh` refuses to stop when lock identity does not match this repo/project.

## Cloudflare Tunnel

This scaffold uses token-based tunnel startup:

- Set `CLOUDFLARE_TUNNEL_TOKEN` in `infra/selfhost/.env`.
- Configure hostnames in Cloudflare dashboard:
  - `app.yourdomain.com` -> `http://host.docker.internal:8200`
  - `api.yourdomain.com` -> `http://host.docker.internal:55321`

If you prefer config-file mode, use `cloudflared/config.example.yml` as a starter.

## MFA Support Policy

- MFA is mandatory and enforced server-side.
- Self-service MFA disable is intentionally not available in the app.
- If a user loses access to their authenticator, recovery/reset must be handled through admin support.

## Integrity Checks

- Pre-migration tenant-integrity report SQL: `infra/selfhost/scripts/cross_tenant_integrity_report.sql`
- Optional quarantine+cleanup SQL: `infra/selfhost/scripts/cross_tenant_integrity_remediate.sql`
- Wrapper script (local Supabase): `infra/selfhost/scripts/run_integrity_checks.sh`
  - Report only: `infra/selfhost/scripts/run_integrity_checks.sh`
  - Remediate + report: `infra/selfhost/scripts/run_integrity_checks.sh --remediate`

## Repo Integration Tasks You Should Do Next

1. Update CORS allowlists in:
   - `supabase/functions/.env.local` (`ALLOWED_ORIGINS`)
2. Set `VITE_SUPABASE_URL` to your API hostname in `infra/selfhost/.env`.
3. Set `GEMINI_API_KEY` in `supabase/functions/.env.local`.
