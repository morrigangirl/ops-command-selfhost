# Changelog

All notable changes to this project are documented in this file.

## Unreleased (2026-02-27)

### Added
- Added a context-aware AI Advisor chat panel and launcher wiring in the app shell.
- Added shared edge-function helpers for CORS and Gemini integration.
- Added self-host operations tooling under `infra/selfhost/`, including strict start/stop guardrails, health diagnostics (`doctor.sh`), runtime status checks (`status.sh`), and a full gate script (`selfhost-check.sh`).
- Added migration `20260227031000_restore_strict_mfa_requirement.sql` to restore strict MFA policy enforcement.
- Added route-aware page help infrastructure with detailed fallback content for all primary app screens.
- Added database-backed help content management via migration `20260227120000_page_help_content.sql`, including version history and MFA-aware RLS.
- Added edge function `generate-page-help` for AI-generated help drafts.
- Added `Help Content` admin page for editing and AI generation of help text through the UI.

### Changed
- Switched advisor and AI helper edge functions to shared helper modules.
- Improved MFA challenge handling to work against verified factors and clearer failure handling.
- Updated project scripts with `npm run selfhost-check`.
- Updated app layout to include a persistent page-help launcher and a help modal on each authenticated route.
- Added `Help Content` to navigation and routing.
- Upgraded frontend/tooling dependencies to patched versions, including `vite` (`^7.3.1`) and `@vitejs/plugin-react-swc` (`^4.2.3`), and refreshed lockfile transitive security fixes.

### Security
- Removed temporary single-user MFA bypass logic from frontend auth gates and edge functions.
- Restored `public.meets_mfa_requirement()` to require `aal2` for all authenticated users.
- Enabled JWT verification at the Supabase edge-function layer (`verify_jwt = true`) for `refine-brief`, `generate-agenda`, `ops-advisor`, and `generate-page-help`.
- Removed tracked `.env` from the repository and added ignore rules to prevent future local secret commits.
- Added ignore rule for `infra/selfhost/scripts/database-dump-*.json` to prevent accidental data-dump commits.
- Removed migration `20260226063000_temp_mfa_bypass_aoibh.sql` to eliminate lingering MFA bypass logic from the migration chain.
