<#
PowerShell helper to create branch, commit and open a PR (requires 'gh' for automatic PR creation)
Usage: ./scripts/create-pr-gh.ps1 [-BranchName <string>]
#>
param(
  [string]
  $BranchName = 'ci/gha-whatsapp-scheduler'
)

$Title = 'ci: add GitHub Actions CI & scheduled WhatsApp job, tests, and secure send-whatsapp-twilio'

$PRBody = @'
This PR adds:

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
'@

# Create branch
Write-Host "Creating branch $BranchName..."
git checkout -b $BranchName

# Stage all changes
git add -A

if (-not (git diff --staged --quiet)) {
  git commit -m $Title
  git push -u origin $BranchName
  if (Get-Command gh -ErrorAction SilentlyContinue) {
    $tmp = Join-Path $env:TEMP 'pr_body.txt'
    $PRBody | Out-File -FilePath $tmp -Encoding utf8
    gh pr create --title $Title --body-file $tmp --base main
    Remove-Item $tmp -ErrorAction SilentlyContinue
    Write-Host "PR created via gh."
  } else {
    Write-Host "Branch pushed to origin/$BranchName. Create a PR via the GitHub web UI or 'gh pr create'."
  }
} else {
  Write-Host "No staged changes to commit. Nothing to do."
}
