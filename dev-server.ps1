# Script para iniciar o servidor de desenvolvimento (Backend + Frontend)
# Uso: PowerShell -NoProfile -ExecutionPolicy Bypass -File dev-server.ps1

Write-Host "🚀 Iniciando Chrono Dev Server..." -ForegroundColor Cyan
Write-Host ""

# Cores para output
$success = 'Green'
$info = 'Cyan'
$warning = 'Yellow'
$error_color = 'Red'

# Verificar se está na pasta correta
if (-not (Test-Path ".\server")) {
    Write-Host "❌ Erro: Executar este script da raiz do projeto Chrono" -ForegroundColor $error_color
    exit 1
}

# Terminal 1: Backend (Node.js server)
Write-Host "📦 Iniciando Backend na porta 3001..." -ForegroundColor $info
Start-Process powershell -ArgumentList "-NoExit", "-Command", "cd '$PWD'; npm --prefix server run dev" -WindowStyle Normal

# Aguardar um pouco para o backend iniciar
Start-Sleep -Seconds 3

# Terminal 2: Frontend (Vite dev server)
Write-Host "⚛️  Iniciando Frontend na porta 5173..." -ForegroundColor $info
Start-Process powershell -ArgumentList "-NoExit", "-Command", "cd '$PWD'; npm run dev" -WindowStyle Normal

# Aguardar o frontend também iniciar
Start-Sleep -Seconds 5

Write-Host ""
Write-Host "✅ Servidores iniciados! Abrindo navegador..." -ForegroundColor $success
Write-Host ""
Write-Host "📍 Aplicação: http://localhost:5173" -ForegroundColor $info
Write-Host "🔐 Admin: http://localhost:5173/admin/login" -ForegroundColor $info
Write-Host "🔌 Backend: http://localhost:3001" -ForegroundColor $info
Write-Host ""
Write-Host "Senha Admin: AdminMaster2026!@#$secure" -ForegroundColor $warning
Write-Host ""

# Abrir no navegador padrão
Start-Process "http://localhost:5173"

Write-Host "💡 Dica: Abra 2 terminais para ver os logs de ambos os servidores" -ForegroundColor $info
Write-Host "   - Terminal 1: Backend logs" -ForegroundColor $info
Write-Host "   - Terminal 2: Frontend logs" -ForegroundColor $info
