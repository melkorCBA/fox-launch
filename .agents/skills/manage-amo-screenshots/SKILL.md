---
name: manage-amo-screenshots
description: Evaluate feature commits for AMO listing visual impact, manage the 5-screenshot limit, generate 2400x1800 promotional screenshots via Playwright, and prune redundant assets. Use when releasing a new version, updating visual assets, or managing store screenshots.
---

# Manage AMO Screenshots

Automated agent skill to evaluate shipped features against Mozilla Add-ons (AMO) visual listing guidelines, determine whether store screenshots need updating or pruning (strictly respecting the 5-screenshot maximum), and execute high-resolution Playwright captures.

---

## AMO Listing Constraints

1. **Maximum Screenshot Count:** Strictly **at most 5 screenshots** in `metadata/amo/screenshots/`.
2. **Standard Dimensions:** 2400x1800 pixels (4:3 aspect ratio, AMO maximum & recommended size).
3. **Format:** PNG format only.
4. **Master Icon:** Single 128x128 PNG (`metadata/amo/assets/foxlaunch-icon-128.png`) with transparent background, verified for crisp downscaling to 64x64 and 32x32 previews.

---

## Workflow Steps

### Step 1: Analyze Shipped Features & Commit Log

1. Determine the relevant commit range:
   - During release preparation: `release..origin/main` (or the specific commits selected for shipping).
   - During feature branch development: `origin/main...HEAD`.
2. Inspect the commit messages and diffs for UI/visual impact:
   ```powershell
   git log --oneline <base>..<head>
   git diff --stat <base>..<head> -- src/styles/ src/components/ public/
   ```
3. **Evaluation Criteria:**
   - **Visual Feature Added / Changed:** New UI components, updated container swimlane styles, new modal dialogs, search experience changes, or theme improvements.
   - **Non-Visual / Maintenance:** Bug fixes without visual layout changes, CI/build updates, typecheck fixes, test additions, or documentation.
4. **Decision:**
   - If no visual changes are detected, verify existing assets in `metadata/amo/screenshots/` and report:
     *"No visual or UI changes detected in shipped commits. Existing store screenshots remain accurate."*
   - If visual changes are detected, proceed to Step 2.

---

### Step 2: Inventory & Scene Selection

1. Inspect current screenshot inventory in `metadata/amo/screenshots/`:
   ```powershell
   Get-ChildItem -Path metadata\amo\screenshots\*.png
   ```
2. Available Supported Scenes in `scripts/capture-amo-screenshots.mjs`:
   - `dark`: Primary workspace dashboard in Dark theme (Acorn Obsidian palette).
   - `light`: Primary workspace dashboard in Light theme (Crisp Ink palette).
   - `search`: Interactive container search filter (`#search-input`) with matching cards.
   - `settings`: Customization modal showing theme, card sizing, and container visibility options.
   - `add-shortcut`: Container-aware shortcut creation modal.
3. **Selection & Pruning Strategy:**
   - Always retain baseline `dark` and `light` as core product showcases.
   - Select supplemental scenes that best highlight new features in the release.
   - **Pruning Rule:** If total count would exceed 5, prune least relevant supplemental scenes to keep total count $\le 5$.

---

### Step 3: Execute Playwright Screenshot Generator

1. Run the screenshot generator with selected scenes and pruning flag:
   ```powershell
   node scripts/capture-amo-screenshots.mjs --scenes=<comma-separated-scenes> --prune
   ```
   *Example:*
   ```powershell
   node scripts/capture-amo-screenshots.mjs --scenes=dark,light,search --prune
   ```
2. The script will:
   - Regenerate the Hero Banner (`metadata/amo/assets/foxlaunch-hero-1280x640.png`).
   - Regenerate the AMO Master Icon (`metadata/amo/assets/foxlaunch-icon-128.png`) and verify downscaled clarity at 64x64 and 32x32.
   - Launch Playwright in headless Firefox at 2400x1800 and capture the selected scenes.
   - Delete any unselected or obsolete screenshots.

---

### Step 4: Verification & Handoff

1. Verify resulting screenshot files:
   ```powershell
   Get-ChildItem -Path metadata\amo\screenshots\
   ```
2. Confirm:
   - Total screenshot file count is $\le 5$.
   - All files follow the `foxlaunch-<scene>-2400x1800.png` naming convention.
   - `metadata/amo/assets/foxlaunch-icon-128.png` is present.
3. Report results to the parent agent / user:
   - List captured scenes and file sizes.
   - List any pruned screenshots.
   - Note that assets are ready to be included in the release commit.
