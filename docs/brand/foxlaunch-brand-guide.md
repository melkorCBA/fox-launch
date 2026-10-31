# FoxLaunch Core — Official Brand Guidelines & Design System

> **Version:** 1.0.0  
> **Status:** Official Master Specification  
> **Brand Stance:** FoxLaunch Core (The Official-Tier Firefox Purist)  
> **Primary Mark:** Curled Ensō Flame Fox

---

## Table of Contents
1. [Strategic Foundation](#1-strategic-foundation)
2. [Verbal Identity & Editorial Rules](#2-verbal-identity--editorial-rules)
3. [Logo & Symbol System](#3-logo--symbol-system)
4. [Color System & Design Tokens](#4-color-system--design-tokens)
5. [Typography Hierarchy](#5-typography-hierarchy)
6. [UI Components & Digital Touchpoints](#6-ui-components--digital-touchpoints)
7. [Marketplace & Store Listing Guidelines](#7-marketplace--store-listing-guidelines)

---

## 1. Strategic Foundation

### 1.1 Purpose & Mission
* **Purpose:** To fulfill the latent promise of Firefox’s greatest privacy technology—Multi-Account Containers—by giving it an intuitive, native-feeling workspace on the New Tab page.
* **Mission:** Eliminate the cognitive friction between opening a new browser tab and entering a secure container profile, delivering an experience so seamlessly integrated it feels like an official Mozilla creation.

### 1.2 The Four Core Values
1. **Ecosystem Integrity:** Honor and extend Mozilla’s open-web standards and design language. Do not reinvent conventions when native Firefox patterns exist.
2. **Zero-Compromise Privacy:** 100% local execution. Zero network telemetry, zero analytics tracking, zero cookies, zero `innerHTML` attack vectors.
3. **Effortless Belonging:** Provide an interface that feels instantly familiar to Firefox users from the very first click—fast, unbloated, and respectful.
4. **Accessible Craft:** Strict adherence to WCAG 2.1 AA accessibility, keyboard-first navigation, and focus trapping.

### 1.3 Positioning Statement
> For Firefox power users and multi-account professionals who love container isolation, **FoxLaunch Core** is the native-feeling New Tab launchpad that dynamically organizes your shortcuts into container swimlanes—delivering sub-10ms dispatch with zero telemetry.

### 1.4 Brand Personality Traits
* **Trusted & Principled:** Grounded in Mozilla’s civic, user-first open-web philosophy.
* **Vibrant & Energetic:** Warm, approachable, optimistic, celebrating the playful warmth of Firefox.
* **Polished & Native:** Crisp, unobtrusive, engineered to look like factory Firefox software.

---

## 2. Verbal Identity & Editorial Rules

### 2.1 Master Nomenclature
* **Master Brand Name:** `FoxLaunch`
* **Sub-Brand / Stance Descriptor:** `FoxLaunch Core`
* **Package / Repository:** `@melkorcba/fox-launch`

### 2.2 Feature Nomenclature
Always use official nomenclature across documentation, UI, and release notes:

| Concept | Official Term | Deprecated / Avoid |
| :--- | :--- | :--- |
| Container grouping rows | **Container Swimlanes** | Categories, Folders, Decks, Groups |
| Fast dispatch action | **1-Click Launch** | Click-to-open, Redirector, Shortcut jumper |
| Keyboard search overlay | **Instant Filter (`/`)** | Quick find, Command palette, Fuzzy bar |
| Procedural SVG icons | **Procedural Identity Badges** | Favicon generator, Letter tiles |
| Identity partition | **Firefox Multi-Account Containers** | Browser tabs, Profiles, Workspaces |

### 2.3 Taglines & Micro-Copy
* **Primary Tagline:** *"The missing home for your Firefox Multi-Account Containers."*
* **Secondary Slogan:** *"Containers compartmentalize your web. FoxLaunch organizes your start."*
* **Micro-Copy Stamp:** *"Sub-10ms cold render. 100% offline. Truly native."*

### 2.4 Tone of Voice Spectrum
* **Tone:** Clear, welcoming, authoritative yet community-minded, transparent.
* **Cadence:** Concise, direct sentences with Firefox-native warmth. Avoid tech-jargon pretension.

#### The Vocabulary Matrix: Do Say vs. Don't Say
* **Do Say:** *"Organize your shortcuts into native container swimlanes. Launch tabs directly into isolated profiles in one click."*
* **Don't Say:** *"Disrupt legacy browser silos with decentralized container multiplexing infrastructure."*
* **Do Say:** *"Your shortcuts and container preferences stay 100% on your device."*
* **Don't Say:** *"We leverage local-first zero-knowledge client cryptographic caching protocols."*

---

## 3. Logo & Symbol System

### 3.1 The Curled Ensō Flame Fox
The primary mark combines two resonant metaphors:
1. **The Ensō Zen Circle:** A Japanese symbol of enlightenment, effortless elegance, and completeness—representing the self-contained harmony of Firefox Containers.
2. **The Fox Silhouette & Flame Gradient:** A dynamic, warm, energetic tribute to Mozilla's iconic fox, transitioning into an upward launch path.

### 3.2 Primary Mark Specifications
* **Vector Master:** `docs/brand/foxlaunch-enso-flame.svg`
* **Color Gradient:** `linear-gradient(135deg, #FFB800 0%, #FF7139 45%, #C6007A 100%)`
* **Stroke Weight:** 5.5px on a 100x100 viewbox (proportional ratio 5.5%).
* **Minimum Clear Space:** Equal to 25% of the mark width on all sides.
* **Minimum Render Size:**
  * Screen (SVG/Vector): 16px × 16px (simplified geometry).
  * Print / Display: 24mm × 24mm.

### 3.3 Mark Variations
* **Primary Lockup:** Curled Fox mark + `FoxLaunch CORE` typography (`docs/brand/foxlaunch-lockup-horizontal.svg`).
* **Extension App Icon:** 128px/64px squircle on `#2B2A33` with container orbital color rings (`docs/brand/foxlaunch-app-icon.svg`).
* **Monoline Stroke:** Single-stroke vector mark in `#FF7139` or `#FFFFFF` (`docs/brand/foxlaunch-enso-monoline.svg`).

### 3.4 Unacceptable Logo Uses
* ❌ Do not apply heavy drop shadows, outer glows, or bevel/emboss effects.
* ❌ Do not rotate the fox mark beyond its native 0° orientation.
* ❌ Do not alter the order or angle of the three-color flame gradient.
* ❌ Do not place the full flame mark over low-contrast colored backgrounds without a neutral backing squircle.

---

## 4. Color System & Design Tokens

Derived from Mozilla's **Metropolis / Acorn Design Tokens** to ensure 100% visual coherence with native Firefox:

### 4.1 Primary Brand Accents
| Token | Name | HEX Code | RGB | Purpose |
| :--- | :--- | :--- | :--- | :--- |
| `--fx-orange` | Firefox Flame Orange | `#FF7139` | `255, 113, 57` | Primary brand accent, primary buttons, active state |
| `--fx-orange-hover`| Flame Orange Dark | `#E05620` | `224, 86, 32` | Button hover and pressed states |
| `--fx-violet` | Mozilla Violet | `#8000FF` | `128, 0, 255` | Secondary depth accent, hero badges |
| `--fx-magenta` | Firefox Magenta | `#FF2A85` | `255, 42, 133` | Active focus rings, search indicator |
| `--fx-yellow` | Firefox Amber Yellow | `#FFD43B` | `255, 212, 59` | Keyboard shortcut chips, tips |

### 4.2 Neutral Chrome Surfaces
| Token | Name | HEX Code | Dark Mode Role | Light Mode Role |
| :--- | :--- | :--- | :--- | :--- |
| `--bg-base` | Obsidian Chrome | `#1C1B22` | Default background | N/A |
| `--bg-surface` | Elevated Surface | `#2B2A33` | Swimlane card base | `#F0F0F4` |
| `--bg-surface-hover`| Hover Surface | `#383742` | Shortcut tile hover | `#E0E0E6` |
| `--text-primary` | Pure White / Ink | `#FBFBFE` | Primary text | `#15141A` |
| `--text-muted` | Slate Lavender | `#A6A4B6` | Secondary text (WCAG AA compliant) | `#5B5B66` |
| `--border-subtle` | Boundary Line | `rgba(255, 255, 255, 0.10)` | Card borders | `rgba(0, 0, 0, 0.12)` |

### 4.3 Firefox Native Container Identity Colors
Colors dynamically mapped from `browser.contextualIdentities`:
* `--container-blue`: `#37adff`
* `--container-turquoise`: `#00c79a`
* `--container-green`: `#51cf66`
* `--container-yellow`: `#ffd43b`
* `--container-orange`: `#ff922b`
* `--container-red`: `#ff6b6b`
* `--container-pink`: `#f06595`
* `--container-purple`: `#cc5de8`
* `--container-toolbar`: `#808080`

### 4.4 Accessibility Compliance
All text and interactive element pairings strictly comply with **WCAG 2.1 AA** standards:
* `--text-primary` on `--bg-base`: Contrast ratio **14.8:1** (Exceeds AAA).
* `--text-muted` (`#A6A4B6`) on `--bg-surface` (`#2B2A33`): Contrast ratio **5.7:1** (Comfortably exceeds WCAG AA 4.5:1 requirement for normal text).
* `--fx-orange` on `--bg-surface`: Contrast ratio **4.9:1** (Passes AA for large text & UI controls).
* Procedural SVG avatars dynamically calculate luminance to ensure avatar text achieves AA contrast against all container background hues.

---

## 5. Typography Hierarchy

To maintain sub-10ms cold boot latency and strict CSP compliance, FoxLaunch uses a zero-network system typography stack:

### 5.1 Font Stacks
* **UI & Body Stack:** `-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Helvetica, Arial, sans-serif`
* **Display / Brand Showcase:** `Metropolis`, `Inter`, or System Sans (Weight: 700/800)
* **Code & Hotkeys:** `ui-monospace, SFMono-Regular, "SF Mono", Menlo, Consolas, monospace`

### 5.2 Typographic Hierarchy Table
| Level | Font Size | Weight | Line Height | Usage |
| :--- | :--- | :--- | :--- | :--- |
| **Display H1** | 28px (`1.75rem`) | 800 Bold | 1.25 | Brand headers, onboarding titles |
| **Section H2** | 18px (`1.125rem`) | 700 Bold | 1.30 | Modal titles, settings headers |
| **Swimlane Title**| 15px (`0.9375rem`)| 600 SemiBold| 1.40 | Container lane headers |
| **Body Text** | 13px (`0.8125rem`)| 400 Regular | 1.50 | Settings descriptions, modal copy |
| **Shortcut Label**| 13px (`0.8125rem`)| 500 Medium | 1.20 | Shortcut tile title |
| **Keycap Badge** | 11px (`0.6875rem`)| 700 Bold | 1.00 | `[/]`, `[Enter]`, modifier hints |

---

## 6. UI Components & Digital Touchpoints

### 6.1 Container Swimlanes
* **Container Header:** 10px container accent dot + container name + shortcut count.
* **Border:** 1px solid `rgba(255, 255, 255, 0.08)` with 8px border-radius.
* **Collapsible State:** Smooth CSS height animation; saved to `browser.storage.local`.

### 6.2 Shortcut Tiles
* **Padding:** 8px horizontal, 14px vertical.
* **Hover State:** 120ms transition to `--bg-surface-hover` with `--fx-orange` border highlight.
* **Left-Click:** Dispatches tab into target container `cookieStoreId`.
* **Middle-Click / Ctrl-Click:** Dispatches in background tab without closing launcher.

### 6.3 Instant Filter (`/`)
* Centered search bar with instant substring filtering across all swimlanes.
* Automatically traps keyboard focus on `/` keypress.

---

## 7. Marketplace & Store Listing Guidelines

### 7.1 Mozilla Add-ons (AMO) Presence
* **Listing Title:** `FoxLaunch — Multi-Account Container New Tab`
* **Summary (Max 250 chars):**  
  `Container-aware New Tab launchpad for Firefox Multi-Account Containers. Organize shortcuts into isolated container swimlanes with 1-click dispatch, sub-10ms render, and zero network tracking.`
* **Icon Set:**
  * 16px × 16px: `public/icons/foxlaunch-16.png`
  * 48px × 48px: `public/icons/foxlaunch-48.png`
  * 128px × 128px: `public/icons/foxlaunch-128.png`
* **Listing Screenshots:** Clean 1280×800 mockups showing the dark mode swimlanes with native container color tabs.
