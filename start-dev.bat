@echo off
echo 🚀 Iniciando Chrono - Backend e Frontend
echo.

REM Verificar se está na pasta raiz
if not exist "server" (
    echo ❌ Erro: Execute este script na pasta raiz do projeto!
    pause
    exit /b 1
)

REM Verificar se node_modules existe
if not exist "node_modules" (
    echo 📦 Instalando dependências do frontend...
    call npm install
)

if not exist "server\node_modules" (
    echo 📦 Instalando dependências do backend...
    cd server
    call npm install
    cd ..
)

echo.
echo ✅ Iniciando servidores...
echo.
echo Backend: http://localhost:3001
echo Frontend: http://localhost:5173
echo.
echo Pressione Ctrl+C para parar ambos os servidores
echo.

REM Iniciar backend em uma janela separada
start "Chrono Backend" cmd /k "cd server && npm run dev"

REM Aguardar um pouco
timeout /t 2 /nobreak >nul

REM Iniciar frontend na janela atual
npm run dev


