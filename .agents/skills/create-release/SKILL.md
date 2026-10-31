---
name: create-release
description: Guide and automate the release lifecycle from main to release, handling version bumping, changelog preparation, pre-flight checks, and tagging for Mozilla Add-ons (AMO). Use when releasing a new version, cutting a release, or publishing to AMO.
---

# Create Release

Safe, automated workflow to prepare and publish a new FoxLaunch version to Mozilla Add-ons (AMO) via the `release` branch and GitHub Actions, then merge the published release back into `main`, driven by Conventional Commits v1.0.0.

---

## Workflow Steps

### Step 1: Pre-requisites & Git Status Check
1. Verify working tree is clean:
   ```powershell
   git status --short
   ```
   *If there are uncommitted changes, stop and ask the user to commit or stash them first.*
2. Fetch latest changes from remote:
   ```powershell
   git fetch origin main release
   ```

---

### Step 2: Switch to `release` Branch & Merge `main`
1. Switch to `release` and ensure it is up-to-date:
   ```powershell
   git checkout release
   git pull origin release
   ```
2. Check new commits available on `origin/main` that are not yet on `release`:
   ```powershell
   git log --oneline release..origin/main
   ```
3. **Decision Point 1: Merge Confirmation**
   Present the list of new commits from `main` and ask the user via `ask_question`:
   - `(Recommended) Merge all latest commits from main`
   - `Cherry-pick specific commits`
4. Execute the chosen strategy (e.g. `git merge origin/main --no-edit`).

---

### Step 3: Version Calculation & Selection
1. Read current version from `package.json`:
   ```powershell
   node -p "require('./package.json').version"
   ```
2. Inspect full commit messages (including bodies and footers) of the new commits adhering to Conventional Commits:
   ```powershell
   git log release..origin/main
   ```
3. Analyze the full commits and the `[Unreleased]` section of `CHANGELOG.md`:
   - If commits or footers contain breaking changes (`BREAKING CHANGE:` or `<type>!:`): recommend **Major** (e.g. `1.0.0` → `2.0.0`).
   - If commits contain `feat:` or `feat(...)`: recommend **Minor** (e.g. `1.0.0` → `1.1.0`).
   - If only `fix:`, `chore:`, `perf:`, `refactor:`, or `docs:`: recommend **Patch** (e.g. `1.0.0` → `1.0.1`).
4. **Decision Point 2: Select Version Bump**
   Prompt the user via `ask_question` with the recommended version and alternatives.

---

### Step 4: Update Version & Prepare Changelog
1. Update `package.json` version:
   ```powershell
   npm version <new-version> --no-git-tag-version
   ```
2. Update `manifest.json` version to match `<new-version>` identically.
3. Update `CHANGELOG.md`:
   - Categorize commit entries according to Keep a Changelog mapped from Conventional Commits:
     - `feat` &rarr; `### Added`
     - `fix` &rarr; `### Fixed`
     - `refactor`, `perf`, breaking changes &rarr; `### Changed`
     - deprecations &rarr; `### Deprecated`
     - removals &rarr; `### Removed`
     - security fixes &rarr; `### Security`
   - Move notes currently under `## [Unreleased]` into a new section:
     ```markdown
     ## [<new-version>] - YYYY-MM-DD
     ```
   - Leave an empty `## [Unreleased]` template above it for future work.
4. Check if store listing files changed relative to the previous release tag:
   ```powershell
   $PREV_TAG = (git describe --tags --abbrev=0 2>$null)
   if ($PREV_TAG) {
     $CHANGED = git diff --name-only "$PREV_TAG" HEAD -- metadata/amo/
   } else {
     # First release: release workflow always syncs store listing
     $CHANGED = "First release baseline"
   }
   ```
5. **Decision Point 3: Review Release Notes & Listing Impact**
   Present the release notes in chat:
   - Display the bullet points that will be submitted to the AMO Version History and GitHub Release.
   - Note whether `metadata/amo/` was modified relative to `$PREV_TAG` (which will trigger a product page listing sync upon approval).
   - Ask user: *"Do these release notes look accurate, or would you like to make any adjustments?"*

---

### Step 5: Run Pre-Flight Quality Gates
Run local quality checks before making any commits:
```powershell
pnpm run typecheck
pnpm run build
pnpm run lint:ext
node scripts/sync-amo-listing.mjs --dry-run
```
*If any check fails, stop immediately, report the failure, and do NOT tag or push.*

---

### Step 6: Final Approval Gate & Live Tagging
1. **Decision Point 4: Final Publish Gate**
   Present the explicit confirmation prompt:
   ```
   ⚠ Ready to commit release and trigger live publication to Mozilla Add-ons (AMO):
     - Target Branch: release
     - New Version:   v<version>
     - Release Tag:   v<version>
     - Commit:        chore(release): prepare v<version>
     - Push command:  git push --atomic origin release "refs/tags/v<version>"
     - After successful publication: merge v<version> into main and push origin/main

   Proceed? (yes/no)
   ```
2. Once the user confirms with "yes":
   ```powershell
   git add package.json manifest.json CHANGELOG.md metadata/
   git commit -m "chore(release): prepare v<version>"
   git tag -a "v<version>" -m "Release v<version>"
   # Push branch and tag atomically so a rejected branch push cannot publish the tag:
   git push --atomic origin release "refs/tags/v<version>"
   ```
3. Report the triggered GitHub Actions workflow run:
   - Provide the run link for `.github/workflows/release.yml`.
   - Remind the user to click **Approve and Deploy** on the `production-amo` deployment gate when prompted by GitHub.

---

### Step 7: Merge the Published Release Back into `main`
1. Wait for the `.github/workflows/release.yml` run for `v<version>` to complete successfully, including any required deployment approvals. Do not merge back after a failed, cancelled, pending, or dry-run publication.
2. Verify the working tree is clean with `git status --short`. If there are uncommitted changes, stop and ask the user to commit or stash them first.
3. Fetch the latest branches and the exact published tag (explicit refspecs also support single-branch clones):
   ```powershell
   git fetch origin "refs/heads/main:refs/remotes/origin/main" "refs/heads/release:refs/remotes/origin/release" "refs/tags/v<version>:refs/tags/v<version>"
   ```
4. Switch to `main` and fast-forward it to the remote state:
   ```powershell
   git checkout main
   git pull --ff-only origin main
   ```
   If no local `main` branch exists, create it without tracking instead (`git checkout -b main origin/main`), as subsequent pull and push commands explicitly specify `origin main`.
5. Check for local-only commits before merging:
   ```powershell
   git log --oneline origin/main..HEAD
   ```
   If local `main` is ahead of `origin/main` (local-only commits exist), stop and ask the user for confirmation before proceeding; do not reset or silently push them.
6. Merge the exact published tag, not the moving `release` branch tip, so later unreleased commits are not included:
   ```powershell
   git merge --no-edit "refs/tags/v<version>" -m "chore(release): merge v<version> back into main"
   ```
7. Verify the published commit is included before pushing:
   ```powershell
   git merge-base --is-ancestor "refs/tags/v<version>^{commit}" HEAD
   git push origin main
   ```
8. Report that `origin/main` now includes the released versions and changelog, and leave the working branch on `main`.

*Check every command's exit status before continuing. If fetching, switching, fast-forwarding, merging, verification, or pushing fails, stop and report the error. Do not force-push or bypass branch protection. For merge conflicts, ask the user for resolution before committing or pushing; do not overwrite newer `main` changes. A failed merge-back does not undo the published release: resume this step after resolving the blocker without recreating the tag or publishing again.*

*These GitHub release operations require network access; they do not add network calls, telemetry, or external data storage to the extension.*
