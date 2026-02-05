#!/usr/bin/env bash
set -euo pipefail

# Usage: ./scripts/create-pr-gh.sh [branch-name]
BRANCH=${1:-ci/gha-whatsapp-scheduler}
TITLE="ci: add GitHub Actions CI & scheduled WhatsApp job, tests, and secure send-whatsapp-twilio"

PR_BODY="""This PR adds:

- GitHub Actions CI workflow (`.github/workflows/ci-deploy.yml`) that runs:
  - `npm ci` and `npm audit` (non-blocking)
  - Playwright E2E tests
  - smoke test of `send-whatsapp-twilio` (TEST_MODE)
  - applies Supabase migration script and deploys to Netlify

- A scheduled workflow (`.github/workflows/scheduled-whatsapp.yml`) that POSTs to
  `/.netlify/functions/send-whatsapp-twilio` with header `X-SCHEDULED-SECRET`.

- Netlify function hardened: `netlify/functions/send-whatsapp-twilio.js` now
  validates `X-SCHEDULED-SECRET` if `SCHEDULED_JOB_SECRET` is set and supports
  `TEST_MODE` to bypass external Twilio calls for CI/local testing.

- Local test script: `scripts/test-send-whatsapp-twilio.js` to invoke the function
  handler in test mode or with a provided secret.

- Migration helper and docs: `supabase/migrations/001_init.sql`, `scripts/apply-supabase-init.*`,
  and `DEPLOYMENT_NETLIFY_SUPABASE.md` with CI instructions.

---

Checklist to verify before merging:
- [ ] Add repository secrets: `SUPABASE_DB_URL`, `NETLIFY_AUTH_TOKEN`, `NETLIFY_SITE_ID`, `NETLIFY_SITE_URL`, `SCHEDULED_JOB_SECRET`, `TWILIO_*`.
- [ ] Add `SCHEDULED_JOB_SECRET` to Netlify env vars (if you want function-side validation).
- [ ] Configure Twilio sender (sandbox or approved WhatsApp sender) and test manually.
- [ ] Run Playwright tests locally or in CI and confirm `scripts/test-send-whatsapp-twilio.js --test` passes.
"""

# Create branch
git checkout -b "$BRANCH"

# Stage all changes (ensure you want to include all uncommitted changes)
git add -A

# Commit
if git diff --staged --quiet; then
  echo "No changes to commit. Exiting."
  exit 0
fi

git commit -m "$TITLE"

# Push
git push -u origin "$BRANCH"

# Create PR via gh if available
if command -v gh >/dev/null 2>&1; then
  echo "$PR_BODY" > /tmp/pr_body.txt
  gh pr create --title "$TITLE" --body-file /tmp/pr_body.txt --base main
  rm /tmp/pr_body.txt
  echo "PR created via gh."
else
  echo "Branch pushed to origin/$BRANCH."
  echo "Create a PR using GitHub web UI or 'gh pr create' locally with the following title and body:";
  echo "---";
  echo "$TITLE";
  echo "";
  echo "$PR_BODY";
  echo "---";
fi
