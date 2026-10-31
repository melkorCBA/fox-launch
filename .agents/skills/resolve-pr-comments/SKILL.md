---
name: resolve-pr-comments
description: Inspect, analyze, address, reply to, and resolve GitHub Pull Request review comments and discussion threads. Use when user asks to check PR comments, address PR review feedback, or resolve PR comments.
---

# Resolve PR Comments

Standard, safe workflow to inspect GitHub Pull Request review comments, categorize feedback, implement and verify code fixes, reply to reviewers with commit citations, and programmatically resolve review threads.

---

## Workflow Steps

### Step 1: Detect Active PR & Query Review Threads
1. Identify the current pull request number and repository details:
   ```powershell
   gh pr view --json number,title,headRefName,baseRefName
   ```
2. Query all review threads and inline comments via GitHub GraphQL API:
   ```powershell
   gh api graphql -f query='
   query($owner: String!, $repo: String!, $pr: Int!) {
     repository(owner: $owner, name: $repo) {
       pullRequest(number: $pr) {
         reviewThreads(first: 50) {
           nodes {
             id
             isResolved
             path
             line
             comments(first: 10) {
               nodes {
                 id
                 author { login }
                 body
                 createdAt
               }
             }
           }
         }
       }
     }
   }' -F owner=':owner' -F repo=':repo' -F pr=<pr_number>
   ```

---

### Step 2: Categorize & Triage Feedback
Group unresolved review threads (`isResolved: false`) into distinct action categories:
* **Accessibility & Usability:** Contrast ratios (WCAG AA), screen-reader semantics, keyboard focus trapping.
* **Responsiveness & Layout:** Viewport edge cases, overflow prevention, layout shifts.
* **Logic & Error Handling:** Asynchronous rejections, missing fallbacks, edge-case validation.
* **Style & Documentation:** Nomenclature accuracy, grammar, dead code cleanup.

Formulate an actionable plan for each unresolved comment thread.

---

### Step 3: Implement Code Fixes & Verify Locally
1. Edit target files to address reviewer feedback.
2. Run standard pre-flight verification:
   ```powershell
   # Validate TypeScript types
   pnpm run typecheck

   # Test production build
   pnpm run build

   # Validate WebExtension manifest & security policy
   pnpm run lint:ext

   # Run automated Playwright tests (if UI/logic changed)
   pnpm run test:e2e
   ```

---

### Step 4: Commit & Push Changes
1. Stage modified files:
   ```powershell
   git add <modified_files>
   ```
2. Create a conventional commit referencing the fixes:
   ```powershell
   git commit -m "fix(<scope>): address PR review feedback for <summary>"
   ```
3. Push to the PR branch:
   ```powershell
   git push origin <current-branch>
   ```

---

### Step 5: Reply to Comments & Resolve Review Threads
For each resolved comment thread, execute a GraphQL mutation to add an explanatory reply and mark the thread as resolved:

```powershell
gh api graphql -f query='
mutation($threadId: ID!, $body: String!) {
  addPullRequestReviewThreadReply(input: {
    pullRequestReviewThreadId: $threadId,
    body: $body
  }) {
    comment { id }
  }
  resolveReviewThread(input: {
    threadId: $threadId
  }) {
    thread { id isResolved }
  }
}' -F threadId='<thread_id>' -F body='Resolved in <commit_sha>. <Concise explanation of the fix>'
```

---

### Step 6: Verify Final PR Status
1. Confirm all review threads are resolved:
   ```powershell
   gh api graphql -f query='
   query($owner: String!, $repo: String!, $pr: Int!) {
     repository(owner: $owner, name: $repo) {
       pullRequest(number: $pr) {
         reviewThreads(first: 50) {
           nodes {
             id
             isResolved
           }
         }
       }
     }
   }' -F owner=':owner' -F repo=':repo' -F pr=<pr_number>
   ```
2. Report the resolution summary to the user with commit links and thread verification status.
