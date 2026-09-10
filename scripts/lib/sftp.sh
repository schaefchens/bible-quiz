#!/usr/bin/env bash
# Shared SFTP plumbing for the deploy scripts.
#
# The target (www99.your-server.de) runs ProFTPD mod_sftp with password auth and
# NO shell access — every remote operation has to be expressible as an sftp
# batch command. There is no tar, no unzip, no atomic `mv` of a staging tree.

# --- credentials -------------------------------------------------------------

# Parsed rather than sourced on purpose: the password legitimately contains
# shell metacharacters (`)` among them), so `. sftp.env` is a syntax error.
load_credentials() {
  local env_file="$1"

  [ -f "$env_file" ] || die "missing $env_file (see sftp.env.example)"

  SFTP_SERVER=$(read_env_value "$env_file" SFTP_SERVER)
  SFTP_PASSWD=$(read_env_value "$env_file" SFTP_PASSWD)

  [ -n "$SFTP_SERVER" ] || die "SFTP_SERVER not set in $env_file"
  [ -n "$SFTP_PASSWD" ] || die "SFTP_PASSWD not set in $env_file"
}

read_env_value() {
  local file="$1" key="$2" value
  value=$(sed -n "s/^[[:space:]]*${key}[[:space:]]*=//p" "$file" | head -n1)
  # Tolerate an optionally quoted value.
  value="${value#\"}"; value="${value%\"}"
  value="${value#\'}"; value="${value%\'}"
  printf '%s' "$value"
}

# --- running batches ---------------------------------------------------------

# Two non-obvious requirements, both learned the hard way:
#
#   * The batch must be a FILE, not `-b -`. sftp reading commands from stdin
#     competes with sshpass for the same stream and auth silently fails.
#   * `-o BatchMode=no` is mandatory. `sftp -b` implies BatchMode=yes, which
#     disables password prompts outright, and ssh then reports
#     "Permission denied" without ever having tried the password.
#
# The password goes through the environment (sshpass -e), so it never appears
# in the process list.
run_sftp() {
  local batch="$1"
  SSHPASS="$SFTP_PASSWD" sshpass -e sftp \
      -o StrictHostKeyChecking=accept-new \
      -o PubkeyAuthentication=no \
      -o PreferredAuthentications=password \
      -o BatchMode=no \
      -o ConnectTimeout=20 \
      -b "$batch" "$SFTP_SERVER"
}

# Echo the names (basenames) of the files in a remote directory, one per line.
# Dotfiles are omitted, which is what we want: it keeps .htaccess out of the
# prune candidates for free.
remote_file_names() {
  local dir="$1" batch out
  batch=$(mktemp)
  printf 'ls -1 %s\n' "$dir" > "$batch"
  out=$(run_sftp "$batch" 2>/dev/null) || out=""
  rm -f "$batch"
  printf '%s\n' "$out" \
    | sed -e 's/^sftp> .*//' -e 's|.*/||' \
    | grep -v '^$' || true
}

require_tools() {
  local missing=()
  for t in "$@"; do command -v "$t" >/dev/null 2>&1 || missing+=("$t"); done
  if [ ${#missing[@]} -gt 0 ]; then
    die "missing required tool(s): ${missing[*]}
  install with: brew install ${missing[*]}"
  fi
}
