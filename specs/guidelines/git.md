# Git Workflow Guide

Scope: branch naming, where to branch from, and how PRs flow through this repo.

## Branches

This repo uses a three-level branch structure:

| Branch | Purpose |
|---|---|
| `main` | Release / stable line. Only updated when `spec-driven-development` is promoted. |
| `spec-driven-development` | Integration branch. Feature branches merge here. Contains in-flight spec and feature work. |
| `feature/<name>` | Short-lived branch for one feature or spec slice. |

## Starting new work

**Always branch off `spec-driven-development`, not `main`.**

```sh
git checkout spec-driven-development
git pull
git checkout -b feature/<name>
```

Why: feature branches that base off `main` miss recent spec decisions, convention additions, and prior feature-spec context that later work may depend on.

## Branch naming

- `feature/<short-kebab-case-name>` for new work (`feature/nextjs-scaffold`, `feature/weekly-budget`)
- `fix/<name>` for isolated bug fixes that don't pair with a feature spec
- Keep names short and specific — the PR title carries the full description

## Pull requests

- **Target `spec-driven-development`** unless the user explicitly says otherwise. Passing `--base spec-driven-development` to `gh pr create` is the default.
- One feature spec per PR when practical. If a PR spans multiple specs, call that out in the description.
- PR descriptions should link or reference the relevant spec file(s) under `specs/features/`.

## Commits

- Written in sentence case, present tense, focused on the *why* when non-obvious.
- Keep commits buildable, and keep tests green — before committing, both `./mvnw test` (backend) and `npm test` (frontend) must pass, `npm run lint` must be clean, and `npm run build` must succeed. CI runs the same checks on every PR.
- Prefer a new commit over amending once a commit has been pushed.