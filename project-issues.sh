#!/usr/bin/env bash
set -euo pipefail

# ==============================================================================
# Kulrs v2 (clean start) - GitHub Project Bootstrap
# Creates Milestones FIRST, then Epics + child Issues using gh CLI.
#
# Usage:
#   ./bootstrap_kulrs_project.sh OWNER/REPO
# Example:
#   ./bootstrap_kulrs_project.sh goblinsan/kulrs-v2
#
# Requirements:
#   - gh authenticated: gh auth status
#   - jq installed
# ==============================================================================

REPO="${1:-OWNER/REPO}"

if [[ "$REPO" == "OWNER/REPO" ]]; then
  echo "ERROR: Please provide a repo, e.g. ./bootstrap_kulrs_project.sh goblinsan/kulrs-v2"
  exit 1
fi

command -v gh >/dev/null 2>&1 || { echo "ERROR: gh not found"; exit 1; }
command -v jq >/dev/null 2>&1 || { echo "ERROR: jq not found"; exit 1; }

echo "Repo: $REPO"
echo "Checking auth..."
gh auth status >/dev/null

# ------------------------------------------------------------------------------
# Helper functions
# ------------------------------------------------------------------------------

create_label_if_missing () {
  local name="$1"
  local color="$2"
  local description="$3"

  if gh label list -R "$REPO" --search "$name" --json name -q '.[] | select(.name=="'"$name"'") | .name' | grep -qx "$name"; then
    return 0
  fi

  gh label create "$name" -R "$REPO" --color "$color" --description "$description" >/dev/null
  echo "Created label: $name"
}

create_milestone () {
  local title="$1"
  local description="$2"

  # If milestone exists, return its title (gh issue create needs the title, not the number)
  local existing
  existing="$(gh api -X GET "repos/$REPO/milestones?state=all&per_page=100" \
    | jq -r '.[] | select(.title=="'"$title"'") | .title' | head -n 1 || true)"

  if [[ -n "${existing:-}" ]]; then
    echo "$existing"
    return 0
  fi

  local result_title
  result_title="$(gh api -X POST "repos/$REPO/milestones" \
    -f title="$title" \
    -f description="$description" \
    | jq -r '.title')"

  echo "$result_title"
}

create_issue () {
  local title="$1"
  local body="$2"
  local labels_csv="$3"
  local milestone_number="${4:-}"

  local args=(issue create -R "$REPO" --title "$title" --body "$body")
  if [[ -n "$labels_csv" ]]; then
    args+=(--label "$labels_csv")
  fi
  if [[ -n "$milestone_number" ]] && [[ "$milestone_number" != "" ]]; then
    args+=(--milestone "$milestone_number")
  fi

  # gh prints the URL on success
  gh "${args[@]}"
}

# ------------------------------------------------------------------------------
# Labels (minimal, but helpful)
# ------------------------------------------------------------------------------

echo "Ensuring labels exist..."
create_label_if_missing "epic" "5319e7" "Tracks a set of related issues"
create_label_if_missing "frontend-web" "1d76db" "React/Vite web app"
create_label_if_missing "mobile" "0e8a16" "Flutter app"
create_label_if_missing "backend" "d93f0b" "API (Google Cloud Functions)"
create_label_if_missing "db" "fbca04" "Neon Postgres schema/migrations"
create_label_if_missing "infra" "b60205" "Hosting, DNS, CI/CD, secrets"
create_label_if_missing "auth" "006b75" "Firebase Auth"
create_label_if_missing "email" "c5def5" "SES email"
create_label_if_missing "palette-engine" "7057ff" "Color/music palette algorithms"
create_label_if_missing "good-first-issue" "a2eeef" "Small, low-risk task"

# ------------------------------------------------------------------------------
# Milestones (CREATED FIRST)
# ------------------------------------------------------------------------------

echo "Creating milestones (first)..."

declare -A MS
MS["M0"]="$(create_milestone \
  "Milestone 0 — Project foundation" \
  "Repos, CI, conventions, and environment/secrets strategy.")"

MS["M1"]="$(create_milestone \
  "Milestone 1 — Core architecture (Auth + API + DB)" \
  "Firebase Auth, Neon schema v1, Google Cloud Functions write API with token verification.")"

MS["M2"]="$(create_milestone \
  "Milestone 2 — Palette engine v1 (color compatibility)" \
  "Shared color library + generators (base color, mood text, image) + generation endpoints.")"

MS["M3"]="$(create_milestone \
  "Milestone 3 — Web MVP (Cloudflare-hosted)" \
  "React/Vite MVP: generate, view, save, share palettes. Cloudflare Pages deploy.")"

MS["M4"]="$(create_milestone \
  "Milestone 4 — Mobile MVP (Flutter)" \
  "Flutter MVP parity: auth, generate, browse, save/like/remix.")"

MS["M5"]="$(create_milestone \
  "Milestone 5 — Email + basic growth loops" \
  "SES setup, templates, and basic onboarding/share flows.")"

MS["M6"]="$(create_milestone \
  "Milestone 6 — Production hardening" \
  "Security, observability, rate limiting, performance, release/rollback readiness.")"

echo "Milestones created/found:"
for k in "${!MS[@]}"; do
  echo "  $k -> ${MS[$k]}"
done

# Give GitHub a moment to process milestone creation
sleep 2

# ------------------------------------------------------------------------------
# Epics + Issues
# We'll create each epic, then create child issues and update the epic body with
# a task list linking to those issues.
# ------------------------------------------------------------------------------

echo "Creating epics and issues..."

# Utility: build and apply epic body from a list of issue URLs
update_epic_body () {
  local epic_number="$1"
  local epic_title="$2"
  shift 2
  local urls=("$@")

  local tmp
  tmp="$(mktemp)"

  {
    echo "## Summary"
    echo "Tracking work for **$epic_title**."
    echo
    echo "## Issues"
    for u in "${urls[@]}"; do
      # Use a markdown task list item with URL
      echo "- [ ] $u"
    done
  } > "$tmp"

  gh issue edit "$epic_number" -R "$REPO" --body-file "$tmp" >/dev/null
  rm -f "$tmp"
}

# -------------------------
# Milestone 0 Epics
# -------------------------

# Epic 0.1
epic_url="$(create_issue \
  "Epic 0.1: Repo scaffolding & standards" \
  "Create repo structure, formatting/linting, and baseline CI so work scales." \
  "epic,infra" \
  "${MS["M0"]}")"
epic_number="$(echo "$epic_url" | awk -F/ '{print $NF}')"

urls=()
urls+=("$(create_issue \
  "Scaffold mono-repo structure (web/app/shared/docs)" \
  "DoD:\n- apps/web (React + Vite)\n- apps/mobile (Flutter)\n- packages/shared (types/util)\n- docs/ present\n" \
  "infra" \
  "${MS["M0"]}")")

urls+=("$(create_issue \
  "Add code standards (lint/format/hooks)" \
  "DoD:\n- ESLint+Prettier configured for web\n- Dart format + lints for Flutter\n- Optional: commitlint + husky\n" \
  "infra" \
  "${MS["M0"]}")")

urls+=("$(create_issue \
  "Add CI workflows (lint/test/build)" \
  "DoD:\n- PR checks run web lint/test/build\n- PR checks run flutter analyze/test\n- Basic cache enabled where reasonable\n" \
  "infra" \
  "${MS["M0"]}")")

update_epic_body "$epic_number" "Epic 0.1: Repo scaffolding & standards" "${urls[@]}"
echo "Created: Epic 0.1 (#$epic_number)"

# Epic 0.2
epic_url="$(create_issue \
  "Epic 0.2: Environments & secrets strategy" \
  "Define env var conventions across Cloudflare, GCF, Flutter; set up secrets securely." \
  "epic,infra" \
  "${MS["M0"]}")"
epic_number="$(echo "$epic_url" | awk -F/ '{print $NF}')"

urls=()
urls+=("$(create_issue \
  "Define env var strategy (Cloudflare / GCF / Flutter)" \
  "DoD:\n- Documented env var names\n- Clear split: public vs secret\n- Local dev strategy documented\n" \
  "infra" \
  "${MS["M0"]}")")

urls+=("$(create_issue \
  "Configure secrets in GitHub + deployment platforms" \
  "DoD:\n- GitHub Actions has needed tokens\n- Cloudflare Pages/Workers have env vars\n- GCF has secrets via Secret Manager\n" \
  "infra" \
  "${MS["M0"]}")")

update_epic_body "$epic_number" "Epic 0.2: Environments & secrets strategy" "${urls[@]}"
echo "Created: Epic 0.2 (#$epic_number)"

# -------------------------
# Milestone 1 Epics
# -------------------------

# Epic 1.1
epic_url="$(create_issue \
  "Epic 1.1: Firebase Auth integration" \
  "Enable auth on web and mobile, using Firebase Auth providers." \
  "epic,auth,frontend-web,mobile" \
  "${MS["M1"]}")"
epic_number="$(echo "$epic_url" | awk -F/ '{print $NF}')"

urls=()
urls+=("$(create_issue \
  "Create Firebase project + register web/mobile apps" \
  "DoD:\n- Firebase project created\n- Web app registered\n- Mobile apps registered\n- Configs wired via env (no secrets committed)\n" \
  "auth" \
  "${MS["M1"]}")")

urls+=("$(create_issue \
  "Web: implement sign up / sign in / sign out" \
  "DoD:\n- Email+password works locally\n- Optional provider: Google\n- Session state stored correctly\n" \
  "auth,frontend-web" \
  "${MS["M1"]}")")

urls+=("$(create_issue \
  "Flutter: implement sign up / sign in / sign out" \
  "DoD:\n- Same providers as web\n- Clean auth state handling\n" \
  "auth,mobile" \
  "${MS["M1"]}")")

update_epic_body "$epic_number" "Epic 1.1: Firebase Auth integration" "${urls[@]}"
echo "Created: Epic 1.1 (#$epic_number)"

# Epic 1.2
epic_url="$(create_issue \
  "Epic 1.2: Neon DB + schema v1" \
  "Create Neon project/branches and implement schema v1 with migrations and seed data." \
  "epic,db,backend" \
  "${MS["M1"]}")"
epic_number="$(echo "$epic_url" | awk -F/ '{print $NF}')"

urls=()
urls+=("$(create_issue \
  "Create Neon project + branching strategy (dev/stage/prod)" \
  "DoD:\n- Neon project created\n- Branch strategy documented\n- Connection strings stored via Secret Manager\n" \
  "db,infra" \
  "${MS["M1"]}")")

urls+=("$(create_issue \
  "Define schema v1 + migrations (palettes/colors/tags/sources/users/likes/saves)" \
  "DoD:\n- Migrations added\n- ERD diagram in docs\n- Basic indexes included\n" \
  "db,backend" \
  "${MS["M1"]}")")

urls+=("$(create_issue \
  "Add seed script for dev demo data" \
  "DoD:\n- Seed script creates predictable demo palettes\n- Can be re-run safely (idempotent)\n" \
  "db" \
  "${MS["M1"]}")")

update_epic_body "$epic_number" "Epic 1.2: Neon DB + schema v1" "${urls[@]}"
echo "Created: Epic 1.2 (#$epic_number)"

# Epic 1.3
epic_url="$(create_issue \
  "Epic 1.3: API write layer (Google Cloud Functions)" \
  "Scaffold GCF TypeScript API, verify Firebase tokens, implement write endpoints." \
  "epic,backend,infra,auth" \
  "${MS["M1"]}")"
epic_number="$(echo "$epic_url" | awk -F/ '{print $NF}')"

urls=()
urls+=("$(create_issue \
  "Scaffold GCF TypeScript project + local emulator workflow" \
  "DoD:\n- Deploy a hello endpoint to dev\n- Local run instructions in docs\n" \
  "backend,infra" \
  "${MS["M1"]}")")

urls+=("$(create_issue \
  "Implement Firebase ID token verification middleware" \
  "DoD:\n- Reject invalid tokens\n- Attach user identity in request context\n- Unit tests for auth verification path\n" \
  "backend,auth" \
  "${MS["M1"]}")")

urls+=("$(create_issue \
  "Implement Write API v1 endpoints (create/save/like/remix palette)" \
  "DoD:\n- POST /palettes\n- POST /palettes/:id/save\n- POST /palettes/:id/like\n- POST /palettes/:id/remix\n- Writes land in Neon\n" \
  "backend" \
  "${MS["M1"]}")")

urls+=("$(create_issue \
  "Decide/readme: Read strategy (direct DB vs read API)" \
  "DoD:\n- Document decision\n- Note caching strategy implications\n" \
  "backend,db" \
  "${MS["M1"]}")")

update_epic_body "$epic_number" "Epic 1.3: API write layer (Google Cloud Functions)" "${urls[@]}"
echo "Created: Epic 1.3 (#$epic_number)"

# -------------------------
# Milestone 2 Epics
# -------------------------

# Epic 2.1
epic_url="$(create_issue \
  "Epic 2.1: Color engine library (shared)" \
  "Implement shared library for OKLCH/HSL conversions, harmony strategies, roles, contrast." \
  "epic,palette-engine,db" \
  "${MS["M2"]}")"
epic_number="$(echo "$epic_url" | awk -F/ '{print $NF}')"

urls=()
urls+=("$(create_issue \
  "Create shared color lib (OKLCH/HSL conversions) + unit tests" \
  "DoD:\n- Conversion utilities implemented\n- Tests cover invariants and edge cases\n" \
  "palette-engine" \
  "${MS["M2"]}")")

urls+=("$(create_issue \
  "Implement harmony strategies (analogous/complement/split/triad) + neutrals" \
  "DoD:\n- Strategy functions return candidate colors\n- Basic quality gates (no duplicates, sane chroma)\n" \
  "palette-engine" \
  "${MS["M2"]}")")

urls+=("$(create_issue \
  "Implement role assignment + contrast checks" \
  "DoD:\n- Assign roles (bg/text/primary/accent/etc)\n- Emit contrast report (WCAG targets)\n" \
  "palette-engine" \
  "${MS["M2"]}")")

update_epic_body "$epic_number" "Epic 2.1: Color engine library (shared)" "${urls[@]}"
echo "Created: Epic 2.1 (#$epic_number)"

# Epic 2.2
epic_url="$(create_issue \
  "Epic 2.2: Palette generators" \
  "Generate palettes from base color, mood text, and images." \
  "epic,palette-engine,backend" \
  "${MS["M2"]}")"
epic_number="$(echo "$epic_url" | awk -F/ '{print $NF}')"

urls=()
urls+=("$(create_issue \
  "Generator: from base color" \
  "DoD:\n- Returns 8–12 colors with roles\n- Includes explanation metadata\n" \
  "palette-engine" \
  "${MS["M2"]}")")

urls+=("$(create_issue \
  "Generator: from mood text (seeded / repeatable)" \
  "DoD:\n- Deterministic-ish via seed\n- Maps mood → palette parameters\n" \
  "palette-engine" \
  "${MS["M2"]}")")

urls+=("$(create_issue \
  "Generator: from image (dominant color extraction)" \
  "DoD:\n- Upload image → palette output\n- Works on typical phone photos\n" \
  "palette-engine" \
  "${MS["M2"]}")")

update_epic_body "$epic_number" "Epic 2.2: Palette generators" "${urls[@]}"
echo "Created: Epic 2.2 (#$epic_number)"

# Epic 2.3
epic_url="$(create_issue \
  "Epic 2.3: Generation API endpoints" \
  "Expose palette generation via API endpoints returning normalized palette objects." \
  "epic,backend,palette-engine" \
  "${MS["M2"]}")"
epic_number="$(echo "$epic_url" | awk -F/ '{print $NF}')"

urls=()
urls+=("$(create_issue \
  "API: POST /generate/color" \
  "DoD:\n- Validates input\n- Returns normalized palette object\n" \
  "backend,palette-engine" \
  "${MS["M2"]}")")

urls+=("$(create_issue \
  "API: POST /generate/mood" \
  "DoD:\n- Validates input\n- Returns normalized palette object\n" \
  "backend,palette-engine" \
  "${MS["M2"]}")")

urls+=("$(create_issue \
  "API: POST /generate/image" \
  "DoD:\n- Handles image upload\n- Returns normalized palette object\n" \
  "backend,palette-engine" \
  "${MS["M2"]}")")

update_epic_body "$epic_number" "Epic 2.3: Generation API endpoints" "${urls[@]}"
echo "Created: Epic 2.3 (#$epic_number)"

# -------------------------
# Milestone 3 Epics
# -------------------------

# Epic 3.1
epic_url="$(create_issue \
  "Epic 3.1: Web app core UX (React/Vite)" \
  "Web MVP: auth, generate palettes, palette detail page, share links." \
  "epic,frontend-web,auth" \
  "${MS["M3"]}")"
epic_number="$(echo "$epic_url" | awk -F/ '{print $NF}')"

urls=()
urls+=("$(create_issue \
  "Web: app shell + routing + layout" \
  "DoD:\n- Routes for /, /login, /palette/:id\n- Basic layout and navigation\n" \
  "frontend-web" \
  "${MS["M3"]}")")

urls+=("$(create_issue \
  "Web: integrate Firebase auth UI" \
  "DoD:\n- Sign in/out pages\n- Auth guard for saved palettes\n" \
  "frontend-web,auth" \
  "${MS["M3"]}")")

urls+=("$(create_issue \
  "Web: palette generator UI (mood/base color/image)" \
  "DoD:\n- Calls generation API\n- Shows results with roles + contrast\n" \
  "frontend-web,palette-engine" \
  "${MS["M3"]}")")

urls+=("$(create_issue \
  "Web: palette detail page (copy hex, contrast indicators, share link)" \
  "DoD:\n- Swatches render with roles\n- Copy-to-clipboard works\n- Share URL stable\n" \
  "frontend-web" \
  "${MS["M3"]}")")

update_epic_body "$epic_number" "Epic 3.1: Web app core UX (React/Vite)" "${urls[@]}"
echo "Created: Epic 3.1 (#$epic_number)"

# Epic 3.2
epic_url="$(create_issue \
  "Epic 3.2: Web save/like/remix flows" \
  "Wire web UI to write API for save/like/remix and persist to Neon." \
  "epic,frontend-web,backend" \
  "${MS["M3"]}")"
epic_number="$(echo "$epic_url" | awk -F/ '{print $NF}')"

urls=()
urls+=("$(create_issue \
  "Web: save palette flow" \
  "DoD:\n- Save action calls API\n- Saved state visible in UI\n" \
  "frontend-web,backend" \
  "${MS["M3"]}")")

urls+=("$(create_issue \
  "Web: like palette flow" \
  "DoD:\n- Like action calls API\n- Like count/state updates\n" \
  "frontend-web,backend" \
  "${MS["M3"]}")")

urls+=("$(create_issue \
  "Web: remix palette flow (fork lineage)" \
  "DoD:\n- Remix creates derived palette\n- Stores derived_from_id\n" \
  "frontend-web,backend" \
  "${MS["M3"]}")")

update_epic_body "$epic_number" "Epic 3.2: Web save/like/remix flows" "${urls[@]}"
echo "Created: Epic 3.2 (#$epic_number)"

# Epic 3.3
epic_url="$(create_issue \
  "Epic 3.3: Deploy web on Cloudflare Pages" \
  "Deploy web MVP to Cloudflare Pages (preview + prod) and wire kulrs.com." \
  "epic,infra,frontend-web" \
  "${MS["M3"]}")"
epic_number="$(echo "$epic_url" | awk -F/ '{print $NF}')"

urls=()
urls+=("$(create_issue \
  "Cloudflare Pages: configure build + preview env" \
  "DoD:\n- Preview deploys on PRs\n- Env vars set for preview\n" \
  "infra" \
  "${MS["M3"]}")")

urls+=("$(create_issue \
  "Cloudflare Pages: production deploy + DNS for kulrs.com" \
  "DoD:\n- kulrs.com + www live\n- SSL active\n- Basic analytics/logs enabled\n" \
  "infra" \
  "${MS["M3"]}")")

update_epic_body "$epic_number" "Epic 3.3: Deploy web on Cloudflare Pages" "${urls[@]}"
echo "Created: Epic 3.3 (#$epic_number)"

# -------------------------
# Milestone 4 Epics
# -------------------------

# Epic 4.1
epic_url="$(create_issue \
  "Epic 4.1: Flutter app foundation" \
  "Set up Flutter app, env config, auth integration, base navigation and components." \
  "epic,mobile,auth" \
  "${MS["M4"]}")"
epic_number="$(echo "$epic_url" | awk -F/ '{print $NF}')"

urls=()
urls+=("$(create_issue \
  "Flutter: project setup + env config" \
  "DoD:\n- Flavors (dev/stage/prod) or equivalent\n- Secrets handled appropriately\n" \
  "mobile,infra" \
  "${MS["M4"]}")")

urls+=("$(create_issue \
  "Flutter: Firebase auth integration" \
  "DoD:\n- Sign in/out flows\n- Auth state management\n" \
  "mobile,auth" \
  "${MS["M4"]}")")

urls+=("$(create_issue \
  "Flutter: navigation + base UI components" \
  "DoD:\n- Routes for generate/detail/saved\n- Shared components in place\n" \
  "mobile" \
  "${MS["M4"]}")")

update_epic_body "$epic_number" "Epic 4.1: Flutter app foundation" "${urls[@]}"
echo "Created: Epic 4.1 (#$epic_number)"

# Epic 4.2
epic_url="$(create_issue \
  "Epic 4.2: Flutter palette flows" \
  "Generate/browse palette flows + save/like/remix and image import." \
  "epic,mobile,backend" \
  "${MS["M4"]}")"
epic_number="$(echo "$epic_url" | awk -F/ '{print $NF}')"

urls=()
urls+=("$(create_issue \
  "Flutter: generate palette screen" \
  "DoD:\n- Mood/base color inputs\n- Calls generation API\n" \
  "mobile,palette-engine" \
  "${MS["M4"]}")")

urls+=("$(create_issue \
  "Flutter: palette detail screen" \
  "DoD:\n- Shows swatches + roles\n- Copy hex supported\n" \
  "mobile" \
  "${MS["M4"]}")")

urls+=("$(create_issue \
  "Flutter: save/like/remix actions via API" \
  "DoD:\n- Calls write API\n- UI updates state\n" \
  "mobile,backend" \
  "${MS["M4"]}")")

urls+=("$(create_issue \
  "Flutter: image import (camera/gallery) for generation" \
  "DoD:\n- Select/take image\n- Upload and generate palette\n" \
  "mobile,palette-engine" \
  "${MS["M4"]}")")

update_epic_body "$epic_number" "Epic 4.2: Flutter palette flows" "${urls[@]}"
echo "Created: Epic 4.2 (#$epic_number)"

# -------------------------
# Milestone 5 Epics
# -------------------------

# Epic 5.1
epic_url="$(create_issue \
  "Epic 5.1: SES setup & templates" \
  "Verify SES identities and create templates for onboarding and share." \
  "epic,email,infra" \
  "${MS["M5"]}")"
epic_number="$(echo "$epic_url" | awk -F/ '{print $NF}')"

urls=()
urls+=("$(create_issue \
  "SES: verify domain identity + DKIM/SPF records" \
  "DoD:\n- Domain verified\n- DKIM + SPF configured\n- Sandbox removed (if needed)\n" \
  "email,infra" \
  "${MS["M5"]}")")

urls+=("$(create_issue \
  "SES: create templates (welcome, basic notifications)" \
  "DoD:\n- Templates created in SES\n- Test send works in staging\n" \
  "email" \
  "${MS["M5"]}")")

update_epic_body "$epic_number" "Epic 5.1: SES setup & templates" "${urls[@]}"
echo "Created: Epic 5.1 (#$epic_number)"

# Epic 5.2
epic_url="$(create_issue \
  "Epic 5.2: Email send service & growth loops" \
  "API module to send emails; optional share-by-email feature." \
  "epic,email,backend" \
  "${MS["M5"]}")"
epic_number="$(echo "$epic_url" | awk -F/ '{print $NF}')"

urls=()
urls+=("$(create_issue \
  "API: add SES email send module" \
  "DoD:\n- sendWelcomeEmail(user) works\n- Logs success/failure\n- Basic rate limiting\n" \
  "email,backend" \
  "${MS["M5"]}")")

urls+=("$(create_issue \
  "Feature: share palette via email (optional MVP+)" \
  "DoD:\n- User can enter email + message\n- Sends link to palette page\n" \
  "email,frontend-web,backend" \
  "${MS["M5"]}")")

update_epic_body "$epic_number" "Epic 5.2: Email send service & growth loops" "${urls[@]}"
echo "Created: Epic 5.2 (#$epic_number)"

# -------------------------
# Milestone 6 Epics
# -------------------------

# Epic 6.1
epic_url="$(create_issue \
  "Epic 6.1: Security & abuse prevention" \
  "Authorization rules, rate limiting, and secrets hardening." \
  "epic,infra,backend,auth" \
  "${MS["M6"]}")"
epic_number="$(echo "$epic_url" | awk -F/ '{print $NF}')"

urls=()
urls+=("$(create_issue \
  "AuthZ: enforce ownership/private palette rules" \
  "DoD:\n- Only owners can edit/delete\n- Private palettes hidden from public\n" \
  "backend,auth" \
  "${MS["M6"]}")")

urls+=("$(create_issue \
  "Abuse prevention: rate limiting on public endpoints" \
  "DoD:\n- Rate limits applied\n- Returns sensible error responses\n" \
  "backend,infra" \
  "${MS["M6"]}")")

urls+=("$(create_issue \
  "Secrets audit + rotation plan" \
  "DoD:\n- Documented list of secrets\n- Rotation steps documented\n" \
  "infra" \
  "${MS["M6"]}")")

update_epic_body "$epic_number" "Epic 6.1: Security & abuse prevention" "${urls[@]}"
echo "Created: Epic 6.1 (#$epic_number)"

# Epic 6.2
epic_url="$(create_issue \
  "Epic 6.2: Observability" \
  "Structured logging, error tracking, and basic dashboards." \
  "epic,infra,backend,frontend-web,mobile" \
  "${MS["M6"]}")"
epic_number="$(echo "$epic_url" | awk -F/ '{print $NF}')"

urls=()
urls+=("$(create_issue \
  "API: structured logging + error tracking" \
  "DoD:\n- Correlation IDs\n- Errors captured with context\n" \
  "backend,infra" \
  "${MS["M6"]}")")

urls+=("$(create_issue \
  "Web: error tracking + basic performance signals" \
  "DoD:\n- Frontend errors captured\n- Basic perf metrics visible\n" \
  "frontend-web,infra" \
  "${MS["M6"]}")")

urls+=("$(create_issue \
  "Mobile: error tracking" \
  "DoD:\n- App errors captured\n- Crash reporting enabled\n" \
  "mobile,infra" \
  "${MS["M6"]}")")

update_epic_body "$epic_number" "Epic 6.2: Observability" "${urls[@]}"
echo "Created: Epic 6.2 (#$epic_number)"

# Epic 6.3
epic_url="$(create_issue \
  "Epic 6.3: Performance & release readiness" \
  "Indexes, caching, release checklist, rollback plan." \
  "epic,infra,db,backend" \
  "${MS["M6"]}")"
epic_number="$(echo "$epic_url" | awk -F/ '{print $NF}')"

urls=()
urls+=("$(create_issue \
  "DB: add indexes + query review for MVP paths" \
  "DoD:\n- Indexes for palette listing/detail\n- Explain plans reviewed\n" \
  "db" \
  "${MS["M6"]}")")

urls+=("$(create_issue \
  "CDN caching rules for read endpoints/pages" \
  "DoD:\n- Reasonable caching in Cloudflare\n- Cache invalidation strategy documented\n" \
  "infra,backend" \
  "${MS["M6"]}")")

urls+=("$(create_issue \
  "Release checklist + rollback plan" \
  "DoD:\n- Release steps documented\n- Rollback steps documented\n" \
  "infra" \
  "${MS["M6"]}")")

update_epic_body "$epic_number" "Epic 6.3: Performance & release readiness" "${urls[@]}"
echo "Created: Epic 6.3 (#$epic_number)"

echo
echo "Done ✅  Milestones, epics, and issues created in $REPO"
echo "Tip: Create a GitHub Project (Projects v2) and add these issues; milestones are already assigned."
