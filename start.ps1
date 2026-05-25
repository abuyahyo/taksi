# start.ps1 - Safar Taksi: bitta buyruq bilan ishga tushirish (Windows / PowerShell)
#
# Frontend build -> backend (dist'ni same-origin beradi) -> tunnel (port 5000).
# Shu tariqa tunnel URL o'zgarsa ham ilova sinmaydi.
#
# Ishlatish:
#   .\start.ps1
#       -> cloudflared quick tunnel (bepul, kartasiz, lekin URL har safar o'zgaradi)
#
#   $env:NGROK_DOMAIN="sizniki.ngrok-free.app"; .\start.ps1
#       -> ngrok barqaror statik domen (URL o'zgarmaydi, karta kerak emas).
#          Tekin domen: https://dashboard.ngrok.com/domains
#
# Eslatma: ASCII-only - Windows PowerShell .ps1'ni UTF-8 deb o'qimaydi, shuning
# uchun bu faylda kirill harflar ishlatilmaydi. Tunnelni to'xtatish: Ctrl+C.

$ErrorActionPreference = "Stop"
$root = $PSScriptRoot

Write-Host "==> 1/3  Frontend build" -ForegroundColor Cyan
Push-Location "$root\frontend"
if (-not (Test-Path "node_modules")) { npm install }
npm run build
Pop-Location

Write-Host "==> 2/3  Backend (port 5000) - yangi oynada" -ForegroundColor Cyan
if (-not (Test-Path "$root\backend\node_modules")) {
  Push-Location "$root\backend"; npm install; Pop-Location
}
Start-Process powershell -ArgumentList "-NoExit", "-Command", "Set-Location '$root\backend'; npm run dev"
Start-Sleep -Seconds 4

Write-Host "==> 3/3  Tunnel" -ForegroundColor Cyan
if ($env:NGROK_DOMAIN) {
  Write-Host "ngrok barqaror URL: https://$($env:NGROK_DOMAIN)" -ForegroundColor Green
  ngrok http 5000 --domain $env:NGROK_DOMAIN
} else {
  Write-Host "cloudflared quick tunnel (URL har safar o'zgaradi)" -ForegroundColor Yellow
  cloudflared tunnel --url http://localhost:5000
}
