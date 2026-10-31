---
trigger: always_on
description: "Strict Conventional Commits v1.0.0 specification enforcement for all git commits, PR titles, and changelog updates during agentic development."
---

# Conventional Commits Specification (v1.0.0)

All commit messages, pull request titles, and changelog entries produced during agentic or collaborative development in FoxLaunch MUST strictly adhere to the [Conventional Commits v1.0.0](https://www.conventionalcommits.org/en/v1.0.0/) specification.

---

## 1. Structure

```text
<type>[optional scope]: <description>

[optional body]

[optional footer(s)]
```

### Breaking Changes:
- Append `!` immediately before the colon in the header:
  `feat(api)!: remove deprecated container mapping interface`
- Or include `BREAKING CHANGE: <description>` in the commit footer.

---

## 2. Allowed Types

| Type | When to Use | Changelog / SemVer Impact |
|---|---|---|
| `feat` | Introduces a new user-facing or architectural feature | `Added` (Minor version bump) |
| `fix` | Patches a bug or regression | `Fixed` (Patch version bump) |
| `docs` | Documentation-only changes (README, specs, JSDoc) | Internal / docs update |
| `style` | Formatting, missing semi-colons, whitespace (no code logic change) | Internal update |
| `refactor` | Code change that neither fixes a bug nor adds a feature | `Changed` (Patch version bump) |
| `perf` | Code change that improves performance | `Performance` (Patch version bump) |
| `test` | Adding missing tests or correcting existing tests | Internal test update |
| `build` | Changes to build system, bundling (Vite), or external dependencies | Internal build update |
| `ci` | Changes to CI workflows and scripts (`.github/workflows/`) | Internal CI update |
| `chore` | Maintenance tasks, repository housekeeping, template updates | Internal chore |
| `revert` | Reverts a previous commit | `Fixed` / `Changed` |

---

## 3. Formatting Rules

1. **Header Description:**
   - Use the imperative, present tense: "add" instead of "added" or "adds".
   - Start with a lowercase letter (unless referencing a proper noun or code identifier).
   - Do NOT end the subject line with a period.
2. **Scope (Optional but Encouraged):**
   - Provide a noun indicating the subsystem: e.g., `swimlane`, `storage`, `onboarding`, `brand`, `github`, `release`, `ci`.
   - Examples: `feat(swimlane): add drag-and-drop reordering`, `fix(tabs): handle invalid container cookie store`.
3. **Body:**
   - Explain the motivation for the change and contrast it with previous behavior.
   - Use plain language and explain *why* the change was made.
4. **Footers:**
   - Link issues using standard GitHub closing keywords: `Fixes #10`, `Closes #12`.
   - Breaking changes must start with `BREAKING CHANGE: <explanation>`.

---

## 4. Pull Request Titles

- Every PR title MUST match:
  `^(feat|fix|docs|style|refactor|perf|test|build|ci|chore|revert)(\([a-zA-Z0-9_\-]+\))?!?: .+`
- Do not submit PRs with titles like "Update files" or "WIP".
- Automated CI (`.github/workflows/semantic-pr.yml`) validates the title on every PR event.

---

## 5. Changelog Mapping

When updating `CHANGELOG.md` under `## [Unreleased]`:
- Group commits by their Conventional Commit type:
  - `feat` &rarr; `### Added`
  - `fix` &rarr; `### Fixed`
  - `refactor`, `perf`, breaking changes &rarr; `### Changed`
  - Deprecations &rarr; `### Deprecated`
  - Removals &rarr; `### Removed`
  - Security fixes &rarr; `### Security`
