# Contributing to FoxLaunch

Thank you for your interest in improving FoxLaunch! Contributions of all sizes are welcome, including bug reports, documentation improvements, tests, and code changes.

## Community Guidelines

Help keep collaboration welcoming and productive:

- Be respectful, patient, and constructive in discussions and reviews.
- Focus feedback on the work, explain the reasoning behind suggestions, and welcome different perspectives.
- Report problems clearly and share enough context for others to reproduce them.
- Follow the project’s privacy-first approach: FoxLaunch runs locally and should not add telemetry, analytics, or unnecessary network requests.

There is no separate code-of-conduct file in the repository. If a conversation becomes unproductive, pause and ask a maintainer for help.

## Local Development Setup

### Prerequisites

- Node.js 20 or newer
- pnpm 9 or newer (the project currently specifies pnpm 9.15.4)
- Firefox 142 or newer for loading and testing the extension

### Install and run

From the repository root:

```bash
pnpm install
pnpm run dev
```

The Vite development server listens on `http://127.0.0.1:5173`. To load FoxLaunch as a temporary Firefox add-on, create a production build:

```bash
pnpm run build
```

Then open `about:debugging#/runtime/this-firefox` in Firefox, choose **Load Temporary Add-on...**, and select `dist/manifest.json`. Open a new tab to try FoxLaunch. The temporary add-on is removed when Firefox restarts, so load it again as needed.

## Architecture Overview

FoxLaunch is a TypeScript Firefox WebExtension using Manifest V3 and Vite. Its `chrome_url_overrides.newtab` entry replaces the browser’s new-tab page. The interface uses the browser DOM directly rather than a frontend framework.

- **Container isolation:** `src/services/containers.ts` discovers Firefox Multi-Account Containers with `browser.contextualIdentities` and provides a synthetic default context. `src/services/tabs.ts` opens shortcuts with the selected container’s `cookieStoreId`.
- **Local persistence:** `src/services/storage.ts` stores shortcuts and settings with `browser.storage.local`.
- **Interface:** `src/components/` contains the UI components, while `src/styles/` contains their styles and themes. `src/app.ts` coordinates the application.
- **Validation and types:** Shared TypeScript types live in `src/types/`; reusable validation and other helpers live in `src/utils/`.
- **Extension configuration:** `manifest.json` declares the extension permissions and strict content security policy. Keep permissions minimal and do not weaken the policy.
- **Tests:** `tests/unit/` contains unit tests and `tests/e2e/` contains Playwright end-to-end tests, supported by shared fixtures in `tests/fixtures/`.

The extension is designed for local, offline use. Avoid introducing remote scripts, analytics, telemetry, or external services.

## Quality Gates and Testing

Run checks from the repository root. The extension linter checks the generated production bundle, so build before running it:

```bash
pnpm run typecheck
pnpm run build
pnpm run lint:ext
pnpm exec playwright install firefox
pnpm run test:e2e
```

The Playwright suite runs in Firefox. For the complete local CI sequence, `pnpm test` runs typecheck, build, extension lint, and E2E tests. CI also validates the AMO listing files with `node scripts/sync-amo-listing.mjs --dry-run`.

The brand-guide E2E test rewrites the tracked screenshots in `metadata/amo/screenshots/`. Review and restore generated screenshot changes after testing unless you intend to update the listing.

Before opening a pull request, run the checks relevant to your change and describe the results. If a check cannot be run locally, mention that in the pull request.

## Git and Pull Request Conventions

Use Conventional Commits v1.0.0 for commit messages and pull request titles:

```text
<type>(<optional-scope>): <imperative, lowercase summary>
```

Use one of the project’s accepted types: `feat`, `fix`, `docs`, `style`, `refactor`, `perf`, `test`, `build`, `ci`, `chore`, or `revert`. For example:

```text
docs(contributing): add contributor guide
fix(storage): handle unavailable local storage
```

Keep the summary concise, use imperative wording, and do not end it with a period. A scope is optional. For breaking changes, add `!` before the colon or include a `BREAKING CHANGE:` footer. The PR title is checked automatically by CI.

To propose a change:

1. Open or comment on an issue first for substantial changes, so the approach can be discussed before implementation.
2. Make a focused branch and keep the change limited to its purpose. Add or update tests when behavior changes.
3. Open a pull request against `main`. Complete the repository’s pull request template, including the summary, verification results, and linked issues (for example, `Closes #123`).
4. Respond to review feedback and ensure required CI checks pass before merging.

The CI workflow runs typecheck, build, extension lint, Firefox E2E tests, and AMO metadata validation. The separate semantic PR check validates the pull request title.

## Releases and AMO Listing

The AMO store listing is maintained as code under `metadata/amo/`. Changes there affect the public Firefox Add-ons listing; keep the copy accurate and synchronized with the extension’s features and permissions. Before editing these files, read [`.agents/rules/amo-listing.md`](.agents/rules/amo-listing.md), and include the listing impact in your pull request.

Release preparation is maintainer-led. The coding-agent workflows named `/create-pr` and `/create-release` provide guidance for PR creation and release preparation. Releases use the `release` branch and a version tag; `package.json`, `manifest.json`, and the changelog must agree. The tagged release workflow runs quality checks, packages the extension, and publishes to AMO and GitHub Packages. If listing files changed, a separate workflow syncs the AMO listing. A release may require approval through GitHub’s `production-amo` environment.

For the full release steps and approval gates, see [`.agents/skills/create-release/SKILL.md`](.agents/skills/create-release/SKILL.md). Contributors should not publish a release or change the public listing as part of routine feature work without maintainer coordination.

### Screenshot updates

The **Sync AMO Product Listing** workflow syncs listing metadata only. Promotional screenshots remain in `metadata/amo/screenshots/` and are uploaded manually after the metadata sync finishes. Screenshot generation is handled separately by the release skill.

For a local preview from the repository root:

```bash
node scripts/sync-amo-listing.mjs --dry-run
```

Review the listing diff before committing any `metadata/amo/` changes. The workflow retains the `production-amo` environment approval gate. Dispatch it with `dry_run: true` to validate the listing metadata and print the proposed payload without authenticating or sending any requests to AMO.

After a live metadata sync completes, sign in to the AMO Developer Hub, open FoxLaunch's listing screenshots, and mass-upload all promotional image files in `metadata/amo/screenshots/`. Review the existing previews and remove or replace any that are obsolete. The automated sync neither uploads screenshots nor changes existing previews. When a release sync runs, the release workflow adds this reminder to its run summary.

These network operations are limited to publishing automation; the extension remains local-only.
