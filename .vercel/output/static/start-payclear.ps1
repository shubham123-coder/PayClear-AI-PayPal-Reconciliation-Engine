# start-payclear.ps1
# Starts the PayClear backend (detached) and the frontend dev server.
# It refuses to start a second backend on the same port.

$root = Split-Path -Parent $MyInvocation.MyCommand.Path
$backendDir = Join-Path $root "backend"
$frontendDir = Join-Path $root "frontend"

function Test-PortInUse([int]$Port) {
  return [bool](Get-NetTCPConnection -LocalPort $Port -State Listen -ErrorAction SilentlyContinue)
}

# --- Backend ---------------------------------------------------------------
if (Test-PortInUse 5000) {
  $pid5000 = (Get-NetTCPConnection -LocalPort 5000 -State Listen | Select-Object -First 1).OwningProcess
  Write-Host "Backend already running on port 5000 (PID $pid5000) - skipping start." -ForegroundColor Yellow
} else {
  Write-Host "Starting PayClear backend..." -ForegroundColor Cyan
  Start-Process -FilePath "npm.cmd" `
    -ArgumentList "start" `
    -WorkingDirectory $backendDir `
    -WindowStyle Hidden `
    -RedirectStandardOutput (Join-Path $root "backend.out.log") `
    -RedirectStandardError (Join-Path $root "backend.err.log")
  Start-Sleep -Seconds 2
}

# --- Frontend --------------------------------------------------------------
if (Test-PortInUse 5173) {
  Write-Host "Frontend already running on port 5173 - skipping start." -ForegroundColor Yellow
} else {
  Write-Host "Starting PayClear frontend..." -ForegroundColor Cyan
  Start-Process -FilePath "npm.cmd" -ArgumentList "run", "dev" -WorkingDirectory $frontendDir
}

Write-Host ""
Write-Host "PayClear is ready:" -ForegroundColor Green
Write-Host "  Frontend : http://localhost:5173"
Write-Host "  Backend  : http://localhost:5000"
Write-Host "  Demo user: demo@payclear.app / demo1234"
Write-Host ""
Write-Host "Backend logs: backend.out.log / backend.err.log" -ForegroundColor DarkGray
