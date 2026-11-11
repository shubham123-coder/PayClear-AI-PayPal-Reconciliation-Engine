# stop-payclear.ps1
# Stops the PayClear backend (port 5000) and frontend dev server (port 5173).

foreach ($port in @(5000, 5173)) {
  $connections = Get-NetTCPConnection -LocalPort $port -State Listen -ErrorAction SilentlyContinue
  if ($connections) {
    foreach ($conn in $connections) {
      try {
        Stop-Process -Id $conn.OwningProcess -Force -ErrorAction Stop
        Write-Host "Stopped process $($conn.OwningProcess) on port $port" -ForegroundColor Yellow
      } catch {
        Write-Host "Could not stop process $($conn.OwningProcess) on port ${port}: $($_.Exception.Message)" -ForegroundColor Red
      }
    }
  } else {
    Write-Host "Nothing listening on port $port" -ForegroundColor DarkGray
  }
}
