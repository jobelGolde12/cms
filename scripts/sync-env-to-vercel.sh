#!/usr/bin/env bash
# One-off: sync credential env vars to Vercel without exposing secret values.
# - Adds DEFAULT_{SCHOOL_ADMIN,TEACHER,RECORDS,GUIDANCE}_{EMAIL,PASSWORD_HASH,FIRST_NAME,LAST_NAME,ROLE}
#   to production + preview, taking values from .env.local (piped, never printed).
# - Removes obsolete old-role vars (DEFAULT_LGU_*, DEFAULT_SCHOOL_* [not SCHOOL_ADMIN],
#   DEFAULT_BARANGAY_*, DEFAULT_ADMIN_{SCHOOL_ID,BARANGAY_ID}).
set -euo pipefail

cd "$(dirname "$0")/.."

declare -A VALUES
while IFS='=' read -r key value; do
  # Trim CR and surrounding quotes defensively; never echo the value.
  value="${value%$'\r'}"
  value="${value%\"}"; value="${value#\"}"
  value="${value%\'}"; value="${value#\'}"
  VALUES["$key"]="$value"
done < <(grep -E '^DEFAULT_[A-Z_]+=' .env.local)

echo "== Adding new-prefixed credential vars (values piped, never displayed) =="
ADDED=0
for prefix in DEFAULT_SCHOOL_ADMIN DEFAULT_TEACHER DEFAULT_RECORDS DEFAULT_GUIDANCE; do
  for field in EMAIL PASSWORD_HASH FIRST_NAME LAST_NAME ROLE; do
    name="${prefix}_${field}"
    value="${VALUES[$name]:-}"
    if [[ -z "$value" ]]; then
      echo "SKIP  $name (not set in .env.local)"
      continue
    fi
    for env in production preview; do
      if printf '%s' "$value" | npx vercel env add "$name" "$env" >/dev/null 2>&1; then
        ADDED=$((ADDED + 1))
      else
        echo "WARN  failed to add $name ($env)"
      fi
    done
    echo "OK    $name -> production, preview"
  done
done
echo "Added $ADDED var-environment pairs."

echo ""
echo "== Removing obsolete old-role vars =="
OBSOLETE=(DEFAULT_ADMIN_SCHOOL_ID DEFAULT_ADMIN_BARANGAY_ID)
for prefix in DEFAULT_LGU DEFAULT_SCHOOL DEFAULT_BARANGAY; do
  for field in EMAIL PASSWORD_HASH FIRST_NAME LAST_NAME ROLE SCHOOL_ID BARANGAY_ID; do
    OBSOLETE+=("${prefix}_${field}")
  done
done

REMOVED=0
for name in "${OBSOLETE[@]}"; do
  for env in production preview; do
    if npx vercel env rm "$name" "$env" --yes >/dev/null 2>&1; then
      REMOVED=$((REMOVED + 1))
      echo "RM    $name ($env)"
    else
      echo "WARN  could not remove $name ($env) (may not exist)"
    fi
  done
done
echo "Removed $REMOVED vars."

echo ""
echo "== Final env var list (names only) =="
npx vercel env ls production 2>&1 | grep -E '^ DEFAULT_' | awk '{print $1}' | sort -u
