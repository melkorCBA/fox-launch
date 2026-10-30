---
trigger: glob
globs: "metadata/amo/**"
description: "Guidelines, formatting limits, and tone for Mozilla Add-ons (AMO) store listing metadata."
---

# Mozilla Add-ons (AMO) Store Listing Guidelines

These guidelines apply whenever creating, editing, or reviewing files in `metadata/amo/`.

## 1. Context & Public Visibility
* Content in this directory directly feeds the public product page on `addons.mozilla.org`.
* Keep copy clean, accurate, and aligned with features already in production or current pull request.

## 2. Voice, Tone & Language
* **Zero Technical Jargon:** Write for human Firefox users. Focus on daily workflows and privacy benefits rather than technical implementation details.
* **No Hype:** Be honest, direct, and factual. Avoid marketing superlatives.
* **Privacy-First:** Highlight local-only execution, zero tracking, and transparency.

## 3. Formatting & Character Constraints
* **Summary (`summary.txt`):**
  - Hard limit of **250 characters maximum**.
  - Plain text only. No line breaks, no markdown, no leading emojis.
* **Description (`description.md`):**
  - Use standard AMO-supported Markdown only (`##`, `###`, `**`, `*`, `-`, `[]()`).
  - **Do NOT use raw HTML tags** (`<div>`, `<br>`, `<span>`, etc.).
  - Always maintain the core sections: Hook, Key Features, Privacy & Architecture, Keyboard Shortcuts, and Permissions Explained.
* **Tags (`config.json`):**
  - Strictly **at most 5 tags** allowed by AMO.
* **Permissions Accuracy:**
  - The "Permissions Explained" section must strictly match permissions declared in `manifest.json`.

## 4. Review Requirement
* Changes to these files must always be shown to the user as a clear diff for confirmation before being committed.
