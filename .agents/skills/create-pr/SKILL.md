---
name: create-pr
description: Prepare and submit standard GitHub Pull Requests with automated AMO product listing impact analysis, listing update reviews, and clean, jargon-free PR descriptions. Use when creating a PR, opening a pull request, or submitting changes for review.
---

# Create PR

Automated, safe workflow to inspect branch changes, determine whether public AMO product listing files need updating, review proposed listing diffs with the user, and publish clean GitHub Pull Requests.

---

## Workflow Steps

### Step 1: Detect Context & Analyze Branch Diffs
1. Verify the current git branch:
   ```powershell
   git branch --show-current
   git status --short
   ```
   *If on `main`, stop and ask the user to switch to a feature branch before opening a PR.*
2. Fetch the target upstream branch (`origin/main`):
   ```powershell
   git diff --stat origin/main...HEAD
   git log --oneline origin/main...HEAD
   ```
3. Inspect the diff for user-facing, permission, or architectural changes:
   ```powershell
   git diff -U2 origin/main...HEAD -- src/ manifest.json package.json CHANGELOG.md
   ```

---

### Step 2: Dig & Assess Product Listing Impact
Analyze the diff against public store listing criteria:
* **User-Facing Features:** Did we add new UI components, shortcuts, themes, or launch behaviors?
* **Permissions (`manifest.json`):** Were any WebExtensions permissions added, removed, or altered? (Requires updating "Permissions Explained" in `description.md`).
* **Internal Changes:** Are changes purely internal (e.g., test fixtures, linting, CI workflow configs, refactoring without behavioral change)?

**Synthesize an Insight:**
Formulate a concise assessment:
* Why a listing change is or is not recommended.
* Specific sections in `metadata/amo/description.md` or `metadata/amo/summary.txt` that would be affected.

---

### Step 3: Interactive Decision Prompt
Present the insight clearly and prompt the user via `ask_question`:

```
Insight & Assessment:
<1-2 simple sentences highlighting the user-facing changes and recommendation>

Question: Does this PR require updating the AMO Product Listing files?
Options:
- (Recommended) <Yes/No based on analysis>
- <Alternative option>
```

---

### Step 4: Update & Review Listing Files (If User Chose "Yes")
1. **Apply Guidelines in `.agents/rules/amo-listing.md`**:
   - Check character limits (`summary.txt` <= 250 characters).
   - Use AMO-compatible Markdown only (no raw HTML tags).
   - Keep tone plain, user-friendly, privacy-first, and free of technical jargon.
   - Keep permissions explanations synchronized with `manifest.json`.
2. **Apply Changes**: Edit `metadata/amo/description.md`, `metadata/amo/summary.txt`, or `metadata/amo/config.json`.
3. **Present Diff for Review**:
   Display the exact diff or preview of changes made to the user.
4. **Obtain User Approval**:
   Ask if the user approves the listing copy or wants specific tweaks.
5. **Commit Listing Changes**:
   ```powershell
   git add metadata/amo/
   git commit -m "docs(amo): update store listing metadata"
   ```

---

### Step 5: Push Branch & Create PR
1. Ensure the remote tracking branch is up-to-date:
   ```powershell
   git push -u origin <current-branch>
   ```
2. Formulate **Title** adhering to Conventional Commits:
   - Format: `<type>(<scope>): <concise summary>` (e.g., `feat(swimlane): add drag-and-drop reordering`)
3. Formulate **Body** in plain language (simple, short, minimum technical jargon):
   ```markdown
   ## Summary
   <1-2 sentences in simple English explaining what this PR accomplishes>

   ## Key Changes
   - <Simple bullet points of changes>

   ## AMO Store Listing Impact
   - [x] Updated `metadata/amo/` (or [ ] No listing update needed - internal changes only)

   ## Testing & Verification
   - [x] Typecheck and build passed
   - [x] Linter passed
   - [x] Automated tests passed
   ```
4. **Approval Gate Before Execution**:
   Present the proposed title, body, and exact `gh pr create` command, and request confirmation before execution:
   ```
   ⚠ About to run:
     gh pr create --title "..." --body "..." --base main
   Proceed? (yes/no)
   ```
5. Once confirmed, execute the command and return the generated PR URL.
