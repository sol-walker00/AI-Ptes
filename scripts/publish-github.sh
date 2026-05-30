#!/usr/bin/env bash
set -euo pipefail

release_tag="desktop-ai-pet-v0.1.0"
repo_name="desktop-ai-pet-adoption"
remote_url=""
dry_run=0
create_repo=0

usage() {
  cat <<'USAGE'
Usage:
  scripts/publish-github.sh [--dry-run] <remote-url>
  scripts/publish-github.sh [--dry-run] --create [--repo-name NAME]

Examples:
  scripts/publish-github.sh git@github.com:YOUR_NAME/desktop-ai-pet-adoption.git
  scripts/publish-github.sh --create --repo-name desktop-ai-pet-adoption

The --create mode requires either:
  - gh CLI authenticated with GitHub, or
  - GH_TOKEN, GITHUB_TOKEN, or GITHUB_PAT with repository creation permission.
USAGE
}

die() {
  printf 'Error: %s\n' "$1" >&2
  exit 1
}

run() {
  if [[ "$dry_run" -eq 1 ]]; then
    printf '%s\n' "$*"
  else
    "$@"
  fi
}

github_token() {
  if [[ -n "${GH_TOKEN:-}" ]]; then
    printf '%s' "$GH_TOKEN"
  elif [[ -n "${GITHUB_TOKEN:-}" ]]; then
    printf '%s' "$GITHUB_TOKEN"
  elif [[ -n "${GITHUB_PAT:-}" ]]; then
    printf '%s' "$GITHUB_PAT"
  fi
}

github_login() {
  local token="$1"
  curl -fsS \
    -H "Authorization: Bearer ${token}" \
    -H "Accept: application/vnd.github+json" \
    -H "X-GitHub-Api-Version: 2022-11-28" \
    https://api.github.com/user \
    | sed -n 's/.*"login"[[:space:]]*:[[:space:]]*"\([^"]*\)".*/\1/p' \
    | head -n 1
}

create_repo_with_token() {
  local token="$1"
  local login
  login="$(github_login "$token")"
  [[ -n "$login" ]] || die "could not read the authenticated GitHub username from the token"

  curl -fsS \
    -X POST \
    -H "Authorization: Bearer ${token}" \
    -H "Accept: application/vnd.github+json" \
    -H "X-GitHub-Api-Version: 2022-11-28" \
    https://api.github.com/user/repos \
    -d "{\"name\":\"${repo_name}\",\"private\":false,\"auto_init\":false}" >/dev/null

  remote_url="git@github.com:${login}/${repo_name}.git"
  run git remote add origin "$remote_url"
}

create_github_repo() {
  [[ "$repo_name" =~ ^[A-Za-z0-9._-]+$ ]] || die "repo name can only contain letters, numbers, '.', '_', and '-'"

  if [[ "$dry_run" -eq 1 ]]; then
    run gh repo create "$repo_name" --public --source . --remote origin
    return
  fi

  if command -v gh >/dev/null 2>&1; then
    gh repo create "$repo_name" --public --source . --remote origin
    return
  fi

  local token
  token="$(github_token)"
  if [[ -n "$token" ]]; then
    create_repo_with_token "$token"
    return
  fi

  die "cannot create a GitHub repo here: install and authenticate gh, or set GH_TOKEN/GITHUB_TOKEN/GITHUB_PAT"
}

while [[ "$#" -gt 0 ]]; do
  case "$1" in
    --dry-run)
      dry_run=1
      shift
      ;;
    --create)
      create_repo=1
      shift
      ;;
    --repo-name)
      [[ "$#" -ge 2 ]] || die "--repo-name requires a value"
      repo_name="$2"
      shift 2
      ;;
    --tag)
      [[ "$#" -ge 2 ]] || die "--tag requires a value"
      release_tag="$2"
      shift 2
      ;;
    -h|--help)
      usage
      exit 0
      ;;
    -*)
      die "unknown option: $1"
      ;;
    *)
      [[ -z "$remote_url" ]] || die "only one remote URL can be provided"
      remote_url="$1"
      shift
      ;;
  esac
done

git rev-parse --is-inside-work-tree >/dev/null 2>&1 || die "run this script inside a git repository"

if [[ "$dry_run" -eq 0 && -n "$(git status --porcelain)" ]]; then
  die "working tree is not clean; commit or stash changes before publishing"
fi

branch="$(git branch --show-current)"
[[ -n "$branch" ]] || die "could not determine the current branch"

if git remote get-url origin >/dev/null 2>&1; then
  existing_origin="$(git remote get-url origin)"
  if [[ -n "$remote_url" && "$existing_origin" != "$remote_url" ]]; then
    die "origin already points to ${existing_origin}; refusing to replace it"
  fi
elif [[ "$create_repo" -eq 1 ]]; then
  create_github_repo
elif [[ -n "$remote_url" ]]; then
  run git remote add origin "$remote_url"
else
  die "provide a GitHub remote URL, or use --create with GitHub authentication"
fi

run git push -u origin "$branch"

if git rev-parse -q --verify "refs/tags/${release_tag}" >/dev/null; then
  printf 'Tag %s already exists locally.\n' "$release_tag"
else
  run git tag "$release_tag"
fi

run git push origin "$release_tag"
