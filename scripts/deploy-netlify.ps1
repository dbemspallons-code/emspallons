Param(
  [string]$DeployMessage = "Prod deploy"
)

$ErrorActionPreference = "Stop"

if (-not $env:NETLIFY_SITE_ID) {
  Write-Error "NETLIFY_SITE_ID manquant"
  exit 1
}
if (-not $env:NETLIFY_AUTH_TOKEN) {
  Write-Error "NETLIFY_AUTH_TOKEN manquant"
  exit 1
}

Write-Host "==> Build web-pwa" -ForegroundColor Yellow
Push-Location web-pwa
npm ci
npm run build
Pop-Location

Write-Host "==> Deploiement Netlify" -ForegroundColor Yellow
npx netlify deploy --prod --dir="web-pwa/dist" --site="$env:NETLIFY_SITE_ID" --auth="$env:NETLIFY_AUTH_TOKEN" --message "$DeployMessage"

Write-Host "Deploiement termine." -ForegroundColor Green
