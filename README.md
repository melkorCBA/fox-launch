# FoxLaunch 🦊🚀

> A container-aware, privacy-first Firefox New Tab workspace launchpad (Manifest V3).

FoxLaunch organizes your shortcuts into dedicated **Firefox Multi-Account Container** swimlanes and dispatches tabs directly into their isolated container contexts with a single click. Built with zero external dependencies, zero network requests, and sub-10ms cold render performance.

---

## ✨ Features

- 🗂️ **Container-Aware Swimlanes**: Automatically discovers your Firefox Multi-Account Containers (`browser.contextualIdentities`), rendering collapsible swimlanes styled with native Firefox container color accents and icons.
- ⚡ **1-Click Container Dispatch**: Launches shortcuts directly inside their assigned container profile (`browser.tabs.create({ cookieStoreId })`).
  - **Foreground Launch**: Left-click opens foreground tab (optionally auto-closing the launcher tab).
  - **Background Launch**: Middle-click or `Ctrl`/`Cmd` + Left-Click opens in the background without closing the launcher.
- 🔍 **Instant Search & Filter**: Press `/` from anywhere on the page to focus the search bar and filter shortcuts across all swimlanes in real time.
- ✏️ **In-Page Shortcut CRUD**:
  - Add and edit shortcuts with container assignment and URL validation (`https://`, `http://`, `about:`).
  - Drag-and-drop intra-swimlane reordering.
  - Delete with a 5-second countdown **Undo Toast**.
- 🎨 **100% Offline Procedural Avatars**: Letter avatars are generated locally on-the-fly as SVG data URIs with luminance contrast calculation (WCAG AA). Zero external network requests or CDN calls.
- ⚙️ **Customizable Settings**:
  - Launcher tab behavior: `Keep launcher tab open` or `Close launcher tab on launch`.
  - Theme mode: `System Default`, `Dark`, or `Light`.
  - Card size: `Small`, `Medium` (default), or `Large`, applied instantly across all swimlanes and saved locally.
  - Factory reset with two-stage confirmation.
- 🚶 **First-Run Onboarding**: Guided 4-step walkthrough overlay for new users with keyboard navigation and step indicators.
- 🔒 **Privacy & Strict CSP**: Manifest V3 compliant (`script-src 'self'`), zero telemetry, zero analytics, zero cookies, zero `innerHTML` usage.
- ♿ **Accessible**: WCAG 2.1 AA keyboard navigation with focus trapping in modals and Escape-key dismissal.

---

## 🛠️ Architecture & Tech Stack

- **Language & Runtime**: TypeScript 5.8+ (Strict Mode), Vanilla DOM (no frontend framework runtime)
- **Bundler & Build Tool**: Vite 6
- **Extension Platform**: WebExtensions Manifest V3 (`chrome_url_overrides.newtab`)
- **Testing**: Playwright for Desktop Firefox (140 E2E tests across 9 suites), Node test runner (40 unit tests)
- **Linter**: Mozilla `web-ext lint` (0 errors, 0 warnings, 0 notices)

---

## 🚀 Getting Started

### Prerequisites

- [Node.js](https://nodejs.org/) (v20+)
- [pnpm](https://pnpm.io/) (v9+)
- [Mozilla Firefox](https://www.mozilla.org/firefox/)

### Installation

```bash
# Clone the repository
git clone https://github.com/melkorCBA/fox-launch.git
cd fox-launch

# Install dependencies
pnpm install
```

### Development

```bash
# Start Vite development server
pnpm run dev
```

### Build & Validate

```bash
# Typecheck TypeScript source
pnpm run typecheck

# Build production bundle to dist/
pnpm run build

# Run Mozilla WebExtension linter
pnpm run lint:ext

# Run automated Playwright test suite in Desktop Firefox
pnpm run test:e2e
```

---

## 🧩 Loading into Firefox

1. Build the production extension:
   ```bash
   pnpm run build
   ```
2. Open Firefox and navigate to `about:debugging#/runtime/this-firefox`.
3. Click **"Load Temporary Add-on..."**.
4. Navigate to the project root and select `dist/manifest.json`.
5. Open a new tab (`Ctrl+T` or `Cmd+T`) to use FoxLaunch!

---

## 📦 GitHub Packages

Production extension builds are published to [GitHub Packages](https://github.com/melkorCBA/fox-launch/packages).

### Installing the Package

GitHub Packages requires registry authentication even for public packages:

1. Generate a GitHub [Personal Access Token (classic)](https://github.com/settings/tokens) with the `read:packages` scope.
2. Configure your local or project `.npmrc` (do not commit your token):

```ini
@melkorcba:registry=https://npm.pkg.github.com
//npm.pkg.github.com/:_authToken=${GITHUB_TOKEN}
```

3. Export your token in your environment:
```bash
export GITHUB_TOKEN=ghp_yourTokenHere
```

4. Install the package:
```bash
npm install @melkorcba/fox-launch
# or
pnpm add @melkorcba/fox-launch
```
The package contains the production `dist/` extension bundle, `manifest.json`, and pre-packaged `.zip` archives.

---

## 📄 License

This project is licensed under the [MIT License](LICENSE).
