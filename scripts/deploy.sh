#!/usr/bin/env bash
#
# Deploy the Bible Quiz app to biblequiz.games.schaefchens.de.
#
# The SFTP account is jailed to the subdomain's document root, so remote "/" is
# the web root. Two destinations come out of one build:
#
#   /              the built app from client/dist  (public)
#   /api/          the PHP backend from client/public  (htaccess default-deny;
#                  only questions.php + quizzes.php are reachable)
#
# client/public/ holds both halves — it is the PHP source directory AND Vite's
# static-asset directory, so dist/ ends up containing the backend files too.
# Nothing is moved to fix that; the split is enforced here, at upload time.
# That is also what keeps secrets.php (the OpenAI key) out of the web root.
#
# Usage: scripts/deploy.sh [options]
#
#   --frontend      deploy only the web root
#   --backend       deploy only /api
#   --skip-build    upload the existing client/dist as-is
#   --prune         delete files under /assets that this build did not produce
#   --dry-run       print the plan; upload nothing
#   --verify-only   run the post-deploy HTTP checks and exit
#   -h, --help      this text
#
# Default: build, deploy both halves, then verify.

set -euo pipefail

REPO_ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
cd "$REPO_ROOT"

SITE_URL="https://biblequiz.games.schaefchens.de"
API_DIR="/api"
DIST="client/dist"
PUBLIC="client/public"
ENV_FILE="sftp.env"

# Files in dist/ that belong to the backend, not the web root.
BACKEND_ONLY_FILES=(questions.php quizzes.php secrets.php secrets.php.example)
BACKEND_ONLY_DIRS=(published qcache)

# Uploaded last, after the content-hashed assets they reference exist remotely.
ENTRY_FILES=(index.html sw.js registerSW.js)

die()  { printf '\033[31merror:\033[0m %s\n' "$*" >&2; exit 1; }
info() { printf '\033[34m==>\033[0m %s\n' "$*"; }
ok()   { printf '  \033[32m✓\033[0m %s\n' "$*"; }
bad()  { printf '  \033[31m✗\033[0m %s\n' "$*"; }

# shellcheck source=scripts/lib/sftp.sh
. "$REPO_ROOT/scripts/lib/sftp.sh"

DO_FRONTEND=1 DO_BACKEND=1 DO_BUILD=1 DO_PRUNE=0 DRY_RUN=0 VERIFY_ONLY=0

while [ $# -gt 0 ]; do
  case "$1" in
    --frontend)    DO_BACKEND=0 ;;
    --backend)     DO_FRONTEND=0; DO_BUILD=0 ;;
    --skip-build)  DO_BUILD=0 ;;
    --prune)       DO_PRUNE=1 ;;
    --dry-run)     DRY_RUN=1 ;;
    --verify-only) VERIFY_ONLY=1 ;;
    -h|--help)     sed -n '2,28p' "$0" | sed 's/^#\{1,2\} \{0,1\}//'; exit 0 ;;
    *)             die "unknown option: $1 (try --help)" ;;
  esac
  shift
done

# --- helpers -----------------------------------------------------------------

in_list() {
  local needle="$1"; shift
  local item
  for item in "$@"; do [ "$item" = "$needle" ] && return 0; done
  return 1
}

# Is this dist-relative path part of the backend rather than the web root?
is_backend_path() {
  local path="$1"
  in_list "$path" "${BACKEND_ONLY_FILES[@]}" && return 0
  local dir
  for dir in "${BACKEND_ONLY_DIRS[@]}"; do
    case "$path" in "$dir"|"$dir"/*) return 0 ;; esac
  done
  return 1
}

emit()      { printf '%s\n' "$*" >> "$BATCH"; }
emit_mkdir(){ emit "-mkdir $1"; }                    # leading - - ignore "exists"
emit_put()  { emit "put $1 $2"; PLANNED=$((PLANNED + 1)); }

# --- build -------------------------------------------------------------------

build() {
  info "Building client"
  # No VITE_API_BASE here: the web build talks to /api on its own origin.
  # Capacitor builds set it to an absolute URL (see client/.env.example).
  npm run build --prefix client
  [ -f "$DIST/index.html" ] || die "build produced no $DIST/index.html"
}

# --- frontend ----------------------------------------------------------------

plan_frontend() {
  info "Planning web root ← $DIST"

  [ -d "$DIST" ] || die "$DIST not found — run without --skip-build"

  local d f
  # find is pre-order, so parents are always created before their children.
  while IFS= read -r d; do
    d="${d#./}"
    is_backend_path "$d" && continue
    emit_mkdir "/$d"
  done < <(cd "$DIST" && find . -mindepth 1 -type d | sort)

  # Pass 1: everything except the entry points.
  while IFS= read -r f; do
    f="${f#./}"
    is_backend_path "$f" && continue
    in_list "$f" "${ENTRY_FILES[@]}" && continue
    emit_put "$REPO_ROOT/$DIST/$f" "/$f"
  done < <(cd "$DIST" && find . -mindepth 1 -type f | sort)

  emit_put "$REPO_ROOT/deploy/htaccess-root"   "/.htaccess"
  [ -d "$DIST/assets" ] && emit_put "$REPO_ROOT/deploy/htaccess-assets" "/assets/.htaccess"

  # Pass 2: the entry points, once everything they reference is in place.
  for f in "${ENTRY_FILES[@]}"; do
    [ -f "$DIST/$f" ] && emit_put "$REPO_ROOT/$DIST/$f" "/$f"
  done
}

# --- backend -----------------------------------------------------------------

plan_backend() {
  info "Planning $API_DIR ← $PUBLIC"

  [ -f "$PUBLIC/secrets.php" ] || die \
    "$PUBLIC/secrets.php not found — copy secrets.php.example and add the key"

  emit_mkdir "$API_DIR"
  emit_mkdir "$API_DIR/qcache"
  emit_mkdir "$API_DIR/published"

  local f
  for f in questions.php quizzes.php secrets.php; do
    emit_put "$REPO_ROOT/$PUBLIC/$f" "$API_DIR/$f"
  done

  # quizzes.php reads its static banks from __DIR__, so they live here too.
  # Same source files the web root gets, no second copy in the repo.
  for f in questions_de.json questions_en.json; do
    emit_put "$REPO_ROOT/$PUBLIC/$f" "$API_DIR/$f"
  done

  # Seed quizzes only. Anything users published remotely is left untouched —
  # this deploy never deletes from published/.
  for f in "$PUBLIC"/published/*.json; do
    [ -f "$f" ] || continue   # an unmatched glob stays literal
    emit_put "$REPO_ROOT/$f" "$API_DIR/published/$(basename "$f")"
  done

  emit_put "$REPO_ROOT/deploy/htaccess-api"  "$API_DIR/.htaccess"
  emit_put "$REPO_ROOT/deploy/htaccess-deny" "$API_DIR/qcache/.htaccess"
  emit_put "$REPO_ROOT/deploy/htaccess-deny" "$API_DIR/published/.htaccess"
}

# --- prune -------------------------------------------------------------------

prune_assets() {
  info "Pruning stale files in /assets"

  local remote name keep=0 removed=0
  remote=$(remote_file_names /assets)
  [ -n "$remote" ] || { ok "nothing on the server yet"; return; }

  local batch; batch=$(mktemp)
  while IFS= read -r name; do
    [ -z "$name" ] && continue
    if [ -f "$DIST/assets/$name" ]; then
      keep=$((keep + 1))
    else
      printf 'rm /assets/%s\n' "$name" >> "$batch"
      removed=$((removed + 1))
      printf '  - %s\n' "$name"
    fi
  done <<< "$remote"

  if [ "$removed" -eq 0 ]; then
    ok "$keep current, nothing stale"
  elif [ "$DRY_RUN" -eq 1 ]; then
    ok "would remove $removed stale file(s), keep $keep"
  else
    run_sftp "$batch" > /dev/null
    ok "removed $removed stale file(s), kept $keep"
  fi
  rm -f "$batch"
}

# --- upload ------------------------------------------------------------------

upload() {
  local err status=0
  err=$(mktemp)
  run_sftp "$BATCH" > /dev/null 2>"$err" || status=$?
  # `-mkdir` on a directory that already exists reports "Failure" and is
  # ignored by sftp — that is the idempotent path, not a problem. Anything
  # else from stderr is worth seeing.
  grep -v 'remote mkdir .*: Failure' "$err" >&2 || true
  rm -f "$err"
  [ "$status" -eq 0 ] || die "sftp upload failed (exit $status)"
}

# --- verify ------------------------------------------------------------------

# Checks what the deploy is actually supposed to guarantee: the app loads, the
# two endpoints answer, and nothing sensitive is reachable.
verify() {
  info "Verifying $SITE_URL"
  local failed=0

  check_status() {
    local path="$1" want="$2" label="$3" got
    # No -f here: a 403 is a pass for the denied paths, and -f would make curl
    # exit nonzero and report the status twice.
    got=$(curl -sS -o /dev/null -w '%{http_code}' "$SITE_URL$path" 2>/dev/null || echo 000)
    if [ "$got" = "$want" ]; then ok "$label ($path → $got)"
    else bad "$label ($path → $got, expected $want)"; failed=$((failed + 1)); fi
  }

  check_status /            200 "app loads"
  check_status /sw.js       200 "service worker"
  check_status /manifest.json 200 "PWA manifest"

  # Reachable by design.
  check_status "$API_DIR/quizzes.php" 200 "registry endpoint"

  # Must NOT be reachable.
  check_status "$API_DIR/secrets.php"           403 "secrets denied"
  check_status "$API_DIR/questions_de.json"     403 "backend json denied"
  check_status "$API_DIR/published/bibd.json"   403 "published store denied"
  check_status "$API_DIR/"                      403 "directory listing denied"

  # The registry must be valid JSON, not an HTML error page.
  local body
  body=$(curl -fsS "$SITE_URL$API_DIR/quizzes.php" 2>/dev/null || true)
  if printf '%s' "$body" | python3 -c 'import json,sys; d=json.load(sys.stdin); sys.exit(0 if isinstance(d,list) and d else 1)' 2>/dev/null; then
    ok "registry returns a non-empty JSON array"
  else
    bad "registry did not return a usable JSON array"
    printf '      %s\n' "$(printf '%s' "$body" | head -c 200)"
    failed=$((failed + 1))
  fi

  # index.html must reference /assets/... — a stale /quiz/ base would 404 every
  # script on the page and is otherwise invisible until someone loads the site.
  local html
  html=$(curl -fsS "$SITE_URL/" 2>/dev/null || true)
  if printf '%s' "$html" | grep -q 'src="/assets/'; then
    ok "index.html references assets at the root base"
  else
    bad "index.html does not reference /assets/ — wrong build base?"
    failed=$((failed + 1))
  fi

  # The main bundle must arrive gzipped. This broke once because the host sends
  # .js as text/javascript while the deflate filter only listed
  # application/javascript — a 3x payload with no visible symptom.
  local js_path wire
  js_path=$(printf '%s' "$html" | grep -o '/assets/[^"]*\.js' | head -n1)
  if [ -n "$js_path" ]; then
    if curl -sS -H 'Accept-Encoding: gzip' -D - -o /dev/null "$SITE_URL$js_path" 2>/dev/null \
         | grep -qi 'content-encoding: gzip'; then
      wire=$(curl -sS -H 'Accept-Encoding: gzip' --output - "$SITE_URL$js_path" 2>/dev/null | wc -c | tr -d ' ')
      ok "bundle served gzipped (${wire} bytes on the wire)"
    else
      bad "bundle is NOT compressed ($js_path) — check the deflate types"
      failed=$((failed + 1))
    fi
  fi

  [ "$failed" -eq 0 ] || die "$failed check(s) failed"
  info "All checks passed"
}

# --- main --------------------------------------------------------------------

require_tools sshpass sftp curl
load_credentials "$ENV_FILE"

if [ "$VERIFY_ONLY" -eq 1 ]; then verify; exit 0; fi

[ "$DO_BUILD" -eq 1 ] && build

BATCH=$(mktemp); PLANNED=0
trap 'rm -f "$BATCH"' EXIT

[ "$DO_FRONTEND" -eq 1 ] && plan_frontend
[ "$DO_BACKEND"  -eq 1 ] && plan_backend

if [ "$PLANNED" -eq 0 ]; then die "nothing to upload"; fi

if [ "$DRY_RUN" -eq 1 ]; then
  info "Dry run — $PLANNED file(s) would be uploaded to $SFTP_SERVER"
  sed -e 's|'"$REPO_ROOT"'/||' "$BATCH" | sed 's/^/  /'
  [ "$DO_PRUNE" -eq 1 ] && prune_assets
  info "Dry run complete; nothing was uploaded"
  exit 0
fi

info "Uploading $PLANNED file(s) to $SFTP_SERVER"
upload
ok "upload complete"

[ "$DO_PRUNE" -eq 1 ] && prune_assets

verify
