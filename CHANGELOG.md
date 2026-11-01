# Changelog

All notable changes to FoxLaunch will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.1.0/),
commit messages adhere to [Conventional Commits](https://www.conventionalcommits.org/en/v1.0.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [Unreleased]

### Changed
- AMO listing sync updates metadata only; promotional screenshots are uploaded manually after the sync.

## [1.2.0] - 2026-11-01

### Added
- Automatic site favicon capture on shortcut dispatch and open-tab pre-population with graceful procedural avatar fallback (#15, #27).
- Container swimlane drag-and-drop reordering with keyboard controls and accessible reorder actions (#21).
- Small, medium, and large shortcut card size options in settings (#22).
- Container swimlane visibility toggles in settings to show or hide individual container lanes (#20).
- App version and copyright display in new tab footer (#19).
- Official Mozilla Add-ons (AMO) visual listing assets: 128x128 scalable master icon (`metadata/amo/assets/foxlaunch-icon-128.png`) and 2400x1800 (4:3) promotional screenshots (`metadata/amo/screenshots/`) (#29).
- Automated Playwright screenshot pipeline script (`scripts/capture-amo-screenshots.mjs`) supporting parameterized scene captures, icon downscale verification, and asset pruning (#29).
- Automated screenshot refresh during AMO listing sync (#31).
- Dedicated agent skill `/manage-amo-screenshots` to evaluate feature commit sets for visual impact and maintain the AMO 5-screenshot limit (#29).
- Integration of background screenshot manager agent into `/create-release` workflow (#29).
- Contributor onboarding guide in `CONTRIBUTING.md` (#28).
- Conventional Commits v1.0.0 specification enforcement across agentic and collaborative workflows with automated PR validation (`.github/workflows/semantic-pr.yml`).

### Changed
- Post-release automated merge-back of published releases into main (`.agents/skills/create-release/SKILL.md`) (#25).
- Refreshed store listing description to highlight local favicon caching and avatar fallback (`metadata/amo/description.md`).

### Fixed
- Reconciled merged features across settings, swimlanes, and storage serialization queues (#26).

## [1.1.0] - 2026-10-31

### Added
- Brand guide design tokens integration into light, dark, and system themes with refreshed icons and visual assets.
- Official brand guidelines, interactive design manual, and SVG vector assets (`docs/brand/`).
- Automated PR review feedback resolution skill (`/resolve-pr-comments`).
- Conventional Commits v1.0.0 specification enforcement across agentic and collaborative workflows with automated PR validation (`.github/workflows/semantic-pr.yml`).
- Repository issue and pull request templates for standardized bug reports and feature requests.

### Changed
- Refreshed store listing metadata, promotional hero banners, and showcase screenshots (`metadata/amo/`).

### Fixed
- AMO store listing tags alignment with Mozilla Add-ons whitelist and schema validation rules.
- Theme and brand guide contrast adjustments meeting WCAG AA accessibility standards.

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
- 1-click tab dispatch into container contexts.
- Instant search filter (`/`) with keyboard shortcuts.
- Customizable layout, dark/light themes, and drag-and-drop shortcut organization.
- Privacy-first architecture: 100% local execution, zero tracking, zero telemetry.
