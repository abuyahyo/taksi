# start.ps1 — Safar Taksi'ни битта буйруқ билан ишга тушириш (Windows / PowerShell)
#
# Frontend'ни build қилади → backend'ни ишга туширади (у dist'ни same-origin беради)
# → тоннелни 5000-портга қаратади. Шу тариқа тоннел URL ўзгарса ҳам илова синмайди.
#
# Ишлатиш:
#   .\start.ps1
#       → cloudflared quick tunnel (бепул, картасиз, лекин URL ҳар сафар ўзгаради)
#
#   $env:NGROK_DOMAIN="sizniki.ngrok-free.app"; .\start.ps1
#       → ngrok барқарор статик домен (URL ўзгармайди, карта керак эмас).
#         Текин домен: https://dashboard.ngrok.com/domains
#
# Эслатма: тоннелни тўхтатиш — Ctrl+C. Backend алоҳида ойнада ишлайверади.

$ErrorActionPreference = "Stop"
$root = $PSScriptRoot

Write-Host "==> 1/3  Frontend build" -ForegroundColor Cyan
Push-Location "$root\frontend"
if (-not (Test-Path "node_modules")) { npm install }
npm run build
Pop-Location

Write-Host "==> 2/3  Backend (port 5000) — янги ойнада" -ForegroundColor Cyan
if (-not (Test-Path "$root\backend\node_modules")) {
  Push-Location "$root\backend"; npm install; Pop-Location
}
Start-Process powershell -ArgumentList "-NoExit", "-Command", "Set-Location '$root\backend'; npm run dev"
Start-Sleep -Seconds 4

Write-Host "==> 3/3  Tunnel" -ForegroundColor Cyan
if ($env:NGROK_DOMAIN) {
  Write-Host "ngrok барқарор URL: https://$($env:NGROK_DOMAIN)" -ForegroundColor Green
  ngrok http 5000 --domain $env:NGROK_DOMAIN
} else {
  Write-Host "cloudflared quick tunnel (URL ҳар сафар ўзгаради)" -ForegroundColor Yellow
  cloudflared tunnel --url http://localhost:5000
}
