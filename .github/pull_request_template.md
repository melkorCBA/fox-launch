<!--
PR TITLE SPECIFICATION:
PR titles MUST strictly follow Conventional Commits v1.0.0:
https://www.conventionalcommits.org/en/v1.0.0/

Format: <type>[optional scope]: <description>
Examples:
  feat(swimlane): add drag-and-drop shortcut reordering
  fix(storage): resolve storage quota overflow handling
  docs(readme): update developer onboarding instructions
  chore(ci): enforce semantic pull request title checks

Allowed Types: feat, fix, docs, style, refactor, perf, test, build, ci, chore, revert
-->

## Summary & Motivation

<!-- What does this PR do and why? -->

## Key Changes

-
-

## Conventional Commits Verification

- [ ] PR title adheres to [Conventional Commits v1.0.0](https://www.conventionalcommits.org/en/v1.0.0/) (`<type>(<scope>): <summary>`)

## AMO Store Listing Impact

- [ ] No listing impact (internal change only)
- [ ] `metadata/amo/description.md` updated
- [ ] `metadata/amo/summary.txt` updated (<= 250 characters)
- [ ] `metadata/amo/config.json` updated
- [ ] Permissions in `manifest.json` changed and "Permissions Explained" updated

## Testing & Verification

- [ ] `pnpm run typecheck` (TypeScript)
- [ ] `pnpm run build` (Vite)
- [ ] `pnpm run lint:ext` (Mozilla WebExtension linter)
- [ ] `pnpm run test:e2e` (Playwright Firefox suite)

## Linked Issues

<!-- Closes #... / Fixes #... -->
