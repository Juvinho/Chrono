@echo off
REM Script para iniciar o servidor de desenvolvimento (Backend + Frontend)
REM Uso: dev-server.bat

setlocal enabledelayedexpansion

echo.
echo [32m========================================[0m
echo [36m  🚀 Chrono Dev Server[0m
echo [32m========================================[0m
echo.

REM Verificar se está na pasta correta
if not exist "server\" (
    echo [31m❌ Erro: Executar este script da raiz do projeto Chrono[0m
    pause
    exit /b 1
)

REM Cores (Títulos em cyan, mensagens em green)
echo [36m📦 Iniciando Backend na porta 3001...[0m
start "Chrono Backend" cmd /k "cd /d %cd% && npm --prefix server run dev"

timeout /t 3 /nobreak

echo [36m⚛️  Iniciando Frontend na porta 5173...[0m
start "Chrono Frontend" cmd /k "cd /d %cd% && npm run dev"

timeout /t 5 /nobreak

echo.
echo [32m========================================[0m
echo [32m✅ Servidores iniciados! Abrindo navegador...[0m
echo [32m========================================[0m
echo.
echo [36m📍 Aplicação: http://localhost:5173[0m
echo [36m🔐 Admin: http://localhost:5173/admin/login[0m
echo [36m🔌 Backend: http://localhost:3001[0m
echo.
echo [33m⚠️  Senha Admin: AdminMaster2026!@#$secure[0m
echo.
echo [36m💡 Dica: Você tem 2 terminais abertos:[0m
echo    [36m- Terminal 1: Backend logs (porta 3001)[0m
echo    [36m- Terminal 2: Frontend logs (porta 5173)[0m
echo.

REM Abrir no navegador padrão
start http://localhost:5173

echo [32m========================================[0m
echo [32mPressione Ctrl+C em qualquer terminal para parar[0m
echo [32m========================================[0m
echo.

REM Manter este terminal aberto
if "%1"=="debug" (
    pause
)
