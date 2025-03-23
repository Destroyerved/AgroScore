# Stop both frontend and backend servers
Write-Host "Stopping servers..." -ForegroundColor Yellow

# Kill Node.js processes
taskkill /F /IM node.exe

Write-Host "`nServers stopped!" -ForegroundColor Green 