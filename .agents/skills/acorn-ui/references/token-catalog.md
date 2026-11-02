# Acorn & Brand Token Catalog Reference

Quick reference table for FoxLaunch UI development.

---

## 1. Surfaces & Backgrounds

| Semantic Variable | Source Token (Dark) | Source Token (Light) | Usage |
|---|---|---|---|
| `--bg-primary` | `#1C1B22` | `#F9F9FB` | Main New Tab page canvas |
| `--bg-secondary` | `#2B2A33` | `#FFFFFF` | Swimlane container base |
| `--bg-tertiary` | `#201F27` | `#F0F0F4` | Recessed chips, secondary buttons |
| `--bg-surface` | `#2B2A33` | `#FFFFFF` | Shortcut cards, modal bodies |
| `--bg-surface-hover` | `#383742` | `#F0F0F4` | Hovered card state |
| `--bg-overlay` | `rgba(28, 27, 34, 0.85)` | `rgba(0, 0, 0, 0.45)` | Backdrop with `blur(8px)` |

---

## 2. Corner Radii

| Semantic Variable | Acorn Value | Target Elements |
|---|---|---|
| `--radius-sm` | `6px` | Favicons, keycaps, small tags |
| `--radius-card` | `10px` | Shortcut cards, dropdown menus, toast notifications |
| `--radius-swimlane` | `14px` | Swimlane section borders |
| `--radius-dialog` | `18px` | Modal dialogs (Settings, Add Shortcut, Onboarding) |
| `--radius-button` | `10px` | Primary, secondary, danger, and icon buttons |
| `--radius-pill` | `9999px` | Instant filter search bar, container badges, pills |

---

## 3. Brand Accents & Colors

| Token | Hex / Gradient | Purpose |
|---|---|---|
| `--brand-flame-gradient` | `linear-gradient(135deg, #FFB800 0%, #FF7139 45%, #C6007A 100%)` | Curled Ensō Flame Fox mark |
| `--fx-orange` | `#FF7139` | Primary action button fill |
| `--fx-orange-hover` | `#E05620` | Primary action button hover fill |
| `--fx-violet` | `#8000FF` | Brand depth highlight |
| `--fx-magenta` | `#FF2A85` | Accent indicator |
| `--fx-yellow` | `#FFD43B` | Keyboard shortcut highlight |

---

## 4. Firefox Container Colors

- `--container-blue`: `#37adff`
- `--container-turquoise`: `#00c79a`
- `--container-green`: `#51cf66`
- `--container-yellow`: `#ffd43b`
- `--container-orange`: `#ff922b`
- `--container-red`: `#ff6b6b`
- `--container-pink`: `#f06595`
- `--container-purple`: `#cc5de8`
- `--container-toolbar`: `#808080`
