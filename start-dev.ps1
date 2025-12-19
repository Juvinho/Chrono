# Script PowerShell para iniciar backend e frontend juntos

Write-Host "🚀 Iniciando Chrono - Backend e Frontend" -ForegroundColor Cyan
Write-Host ""

# Verificar se está na pasta raiz
if (-not (Test-Path "server")) {
    Write-Host "❌ Erro: Execute este script na pasta raiz do projeto!" -ForegroundColor Red
    exit 1
}

# Verificar se node_modules existe
if (-not (Test-Path "node_modules")) {
    Write-Host "📦 Instalando dependências do frontend..." -ForegroundColor Yellow
    npm install
}

if (-not (Test-Path "server/node_modules")) {
    Write-Host "📦 Instalando dependências do backend..." -ForegroundColor Yellow
    cd server
    npm install
    cd ..
}

Write-Host ""
Write-Host "✅ Iniciando servidores..." -ForegroundColor Green
Write-Host ""
Write-Host "Backend: http://localhost:3001" -ForegroundColor Cyan
Write-Host "Frontend: http://localhost:5173" -ForegroundColor Cyan
Write-Host ""
Write-Host "Pressione Ctrl+C para parar ambos os servidores" -ForegroundColor Yellow
Write-Host ""

# Iniciar backend em uma janela separada
Start-Process powershell -ArgumentList "-NoExit", "-Command", "cd '$PSScriptRoot\server'; npm run dev" -WindowStyle Normal

# Aguardar um pouco para o backend iniciar
Start-Sleep -Seconds 2

# Iniciar frontend na janela atual
npm run dev


