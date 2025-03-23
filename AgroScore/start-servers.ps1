# Start both frontend and backend servers
Write-Host "Starting servers..." -ForegroundColor Green

# Start backend server
Start-Process powershell -ArgumentList "-NoExit", "-Command", "cd server; node server.js"

# Wait a moment to ensure backend starts
Start-Sleep -Seconds 2

# Start frontend server
Start-Process powershell -ArgumentList "-NoExit", "-Command", "npm run dev"

Write-Host "`nServers started!" -ForegroundColor Green
Write-Host "Frontend: http://localhost:5173" -ForegroundColor Cyan
Write-Host "Backend: http://localhost:3001" -ForegroundColor Cyan
Write-Host "`nPress Ctrl+C in each window to stop the servers" -ForegroundColor Yellow 