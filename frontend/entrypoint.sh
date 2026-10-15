#!/bin/sh
# Next.js bakes NEXT_PUBLIC_* values into the built files. The image is built with
# placeholders instead (see the Dockerfile), and this script swaps in the values from
# the pod's environment before the server starts, so one image works in every
# environment. Only use it for values that are safe to show in the browser.
set -e

replace() {
  placeholder=$1
  value=$2
  # Escape the characters that have a meaning in the sed replacement text.
  escaped=$(printf '%s' "$value" | sed -e 's/[\\|&]/\\&/g')
  files=$(grep -rlF "$placeholder" /app/.next 2>/dev/null || true)
  if [ -n "$files" ]; then
    printf '%s\n' "$files" | xargs sed -i "s|$placeholder|$escaped|g"
  fi
  count=$(printf '%s\n' "$files" | grep -c . || true)
  echo "${placeholder%_PLACEHOLDER}=${value} (${count} files)"
}

replace NEXT_PUBLIC_API_URL_PLACEHOLDER "${NEXT_PUBLIC_API_URL:-/api}"
replace NEXT_PUBLIC_APP_NAME_PLACEHOLDER "${NEXT_PUBLIC_APP_NAME:-Sundsvallsminnen}"

exec "$@"
