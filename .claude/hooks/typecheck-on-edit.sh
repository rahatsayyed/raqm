#!/usr/bin/env bash
# PostToolUse(Edit|Write): after touching apps/raqm/**/*.ts(x), run tsc --noEmit
# and feed failures back to Claude. CLAUDE.md: "tsc --noEmit after every change"
# is the app's only verification method (no test runner), and it must run from
# apps/raqm (root tsconfig errors with TS6305).
set -uo pipefail

input="$(cat)"
file_path="$(printf '%s' "$input" | jq -r '.tool_input.file_path // empty')"
cwd="$(printf '%s' "$input" | jq -r '.cwd // empty')"

[[ -z "$file_path" ]] && exit 0
case "$file_path" in
  *apps/raqm/*) ;;
  *) exit 0 ;;
esac
case "$file_path" in
  *apps/raqm/android/*) exit 0 ;;
esac
case "$file_path" in
  *.ts|*.tsx) ;;
  *) exit 0 ;;
esac

[[ -z "$cwd" ]] && cwd="$(pwd)"

output="$(cd "$cwd/apps/raqm" 2>/dev/null && npx tsc --noEmit 2>&1)"
status=$?

if [[ $status -ne 0 ]]; then
  echo "tsc --noEmit failed after editing $file_path:" >&2
  echo "$output" >&2
  exit 2
fi

exit 0
