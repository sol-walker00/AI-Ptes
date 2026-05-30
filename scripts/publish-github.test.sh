#!/usr/bin/env bash
set -euo pipefail

repo_root="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
script="${repo_root}/scripts/publish-github.sh"
tmp_dir="$(mktemp -d)"

cleanup() {
  rm -rf "$tmp_dir"
}
trap cleanup EXIT

assert_contains() {
  local haystack="$1"
  local needle="$2"
  if [[ "$haystack" != *"$needle"* ]]; then
    printf 'Expected output to contain:\n%s\n\nActual output:\n%s\n' "$needle" "$haystack" >&2
    exit 1
  fi
}

(
  cd "$tmp_dir"
  git init -b main >/dev/null
  git config user.name "Test User"
  git config user.email "test@example.com"
  printf 'test\n' > README.md
  git add README.md
  git commit -m "initial" >/dev/null

  output="$("$script" --dry-run git@github.com:example/desktop-ai-pet-adoption.git 2>&1)"

  assert_contains "$output" "git remote add origin git@github.com:example/desktop-ai-pet-adoption.git"
  assert_contains "$output" "git push -u origin main"
  assert_contains "$output" "git tag desktop-ai-pet-v0.1.0"
  assert_contains "$output" "git push origin desktop-ai-pet-v0.1.0"

  output="$("$script" --dry-run --create --repo-name desktop-ai-pet-adoption 2>&1)"

  assert_contains "$output" "gh repo create desktop-ai-pet-adoption --public --source . --remote origin"
  assert_contains "$output" "git push -u origin main"
  assert_contains "$output" "git push origin desktop-ai-pet-v0.1.0"
)
