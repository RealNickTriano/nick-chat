# Git Workflow Guide

Scope: how commits and history are managed in this repo today.

## Current workflow: commit straight to `main`

While the project is in its early solo-build phase, all work goes directly to `main`. No feature branches, no pull requests, no integration branch. This keeps iteration fast while the surface area is small.

This will change — once the project grows or a second contributor is involved, we'll introduce branches and PRs. Until then, don't invent a branching model on your own. If you think a change warrants a branch (e.g. a risky refactor you want to stash), ask first.

## Commits

- Written in sentence case, present tense, focused on the *why* when non-obvious.
- One logical change per commit. Don't bundle unrelated edits just because they happened in the same session.
- Keep each commit buildable and tests green — the repo's pre-commit hook (`.githooks/pre-commit`) enforces `prettier --check`, `eslint`, and `vitest` for `frontend-nextjs/` on every commit. Don't bypass with `--no-verify`; fix the underlying issue.
- Prefer a new commit over amending once a commit has been pushed.

## When to ask before committing

- Commits touching `specs/` guidelines or `mission.md` — these are intentional decisions, confirm before changing them.
- Commits that delete files or remove functionality.
- Anything involving `git push --force`, `git reset --hard`, or history rewrites on `main`.
