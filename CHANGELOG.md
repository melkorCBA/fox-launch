# Changelog

All notable changes to FoxLaunch will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.1.0/),
commit messages adhere to [Conventional Commits](https://www.conventionalcommits.org/en/v1.0.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [Unreleased]

### Added
- Conventional Commits v1.0.0 specification enforcement across agentic and collaborative workflows.
- Automated PR title validation workflow (`.github/workflows/semantic-pr.yml`) using `action-semantic-pull-request`.
- Project agent rule for Conventional Commits (`.agents/rules/conventional-commits.md`).
- GitHub Copilot guidelines (`.github/copilot-instructions.md`) for Conventional Commits format.
- Conventional Commits checklist and format specifications in `.github/pull_request_template.md`.
- Conventional Commits guidance in `/create-pr` and `/create-release` agent skills.

## [1.0.1] - 2026-10-30

### Added
- Automated release workflow to Mozilla Add-ons (AMO) via GitHub Actions.
- Dedicated product listing sync workflow with manual approval protection.
- Listing-as-code files (`metadata/amo/`) for store copy, tags, and categories.
- Antigravity rule for AMO listing copy guidelines (`.agents/rules/amo-listing.md`).
- Project skill `/create-pr` with automated listing impact analysis.
- Pull request CI verification workflow (`.github/workflows/ci.yml`) gating merges on build, lint, test, and metadata validation passes.
- Project skill `/create-release` to guide version selection, changelog updates, and safe AMO release tagging.
- Automated publishing of built add-on to GitHub Packages (`@melkorcba/fox-launch`) during releases.

## [1.0.0] - 2026-10-25

### Added
- Initial public release of FoxLaunch on Mozilla Add-ons (AMO).
- Container-aware swimlanes automatically mapped to Firefox Multi-Account Containers.
- 1-click tab dispatch into isolated container contexts with foreground and background launch support.
- Fast shortcut search with `/` keyboard trigger.
- In-page shortcut CRUD with drag-and-drop reordering and 5-second undo toast.
- Offline procedural letter avatars with WCAG AA contrast.
- Light, dark, and system theme options with launcher auto-close settings.
- 4-step first-run onboarding tour.
- Strict Manifest V3 CSP with zero telemetry and zero external network calls.
