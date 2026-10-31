# GitHub Copilot Instructions for FoxLaunch

## Commit Messages & Pull Request Titles
- **Strict Conventional Commits v1.0.0 Requirement:**
  All commit messages and PR titles created or suggested by Copilot MUST follow the [Conventional Commits v1.0.0 specification](https://www.conventionalcommits.org/en/v1.0.0/):
  `<type>(<optional scope>): <subject>`
- **Allowed Types:** `feat`, `fix`, `docs`, `style`, `refactor`, `perf`, `test`, `build`, `ci`, `chore`, `revert`.
- **Subject rules:**
  - Imperative mood ("add", "fix", "update", not "added" or "fixing").
  - Lowercase first character in subject.
  - No trailing period.
- **Breaking changes:**
  - Use `!` before colon (e.g., `feat(api)!: drop legacy storage keys`) or `BREAKING CHANGE:` footer.
- **Issue references:**
  - Reference issues in footer or PR body using standard GitHub keywords (`Fixes #<number>`, `Closes #<number>`).

## Architectural & Project Constraints
- **Privacy First & Offline Execution:** FoxLaunch is 100% local-first. Zero telemetry, zero external network calls, zero external analytics.
- **Manifest V3:** Strict CSP with no remote script injection or unsafe eval.
- **Store Listing Guidelines:** Never edit `metadata/amo/` without checking constraints in `.agents/rules/amo-listing.md`.
