#!/usr/bin/env node

/**
 * 🚀 Chrono Dev Server Starter
 * 
 * Uso: node privilégios_admin.js
 * 
 * Inicia automaticamente:
 * - Backend (Node.js) na porta 3001
 * - Frontend (Vite) na porta 5173
 * - Abre navegador em http://localhost:5173
 */

const { spawn } = require('child_process');
const path = require('path');
const os = require('os');
const fs = require('fs');

// Cores para terminal
const colors = {
  reset: '\x1b[0m',
  bright: '\x1b[1m',
  cyan: '\x1b[36m',
  green: '\x1b[32m',
  yellow: '\x1b[33m',
  red: '\x1b[31m',
};

function log(message, color = 'reset') {
  console.log(`${colors[color]}${message}${colors.reset}`);
}

function logTitle(text) {
  console.log('\n');
  log('═══════════════════════════════════════════════', 'green');
  log(`  ${text}`, 'cyan');
  log('═══════════════════════════════════════════════', 'green');
  console.log('');
}

// Verificar se está na raiz do projeto
const packagePath = path.join(__dirname, 'package.json');
if (!fs.existsSync(packagePath)) {
  log('❌ Erro: Execute este script da raiz do projeto Chrono', 'red');
  process.exit(1);
}

logTitle('🚀 Chrono Dev Server');

// Detectar se é Windows
const isWindows = os.platform() === 'win32';

log('📦 Iniciando Backend na porta 3001...', 'cyan');
log('   Rodando: npm --prefix server run dev', 'cyan');

// Iniciar Backend
const backend = spawn(
  isWindows ? 'npm.cmd' : 'npm',
  ['--prefix', 'server', 'run', 'dev'],
  {
    cwd: __dirname,
    stdio: 'inherit',
    shell: isWindows,
  }
);

backend.on('error', (err) => {
  log(`❌ Erro ao iniciar backend: ${err.message}`, 'red');
});

// Aguardar antes de iniciar frontend
setTimeout(() => {
  log('\n⚛️  Iniciando Frontend na porta 5173...', 'cyan');
  log('   Rodando: npm run dev', 'cyan');

  // Iniciar Frontend
  const frontend = spawn(
    isWindows ? 'npm.cmd' : 'npm',
    ['run', 'dev'],
    {
      cwd: __dirname,
      stdio: 'inherit',
      shell: isWindows,
    }
  );

  frontend.on('error', (err) => {
    log(`❌ Erro ao iniciar frontend: ${err.message}`, 'red');
  });

  // Aguardar antes de abrir navegador
  setTimeout(() => {
    logTitle('✅ Servidores iniciados!');

    log('📍 Aplicação: http://localhost:5173', 'cyan');
    log('🔐 Admin: http://localhost:5173/admin/login', 'cyan');
    log('🔌 Backend: http://localhost:3001', 'cyan');
    log('⚕️  Health: http://localhost:3001/health', 'cyan');
    console.log('');
    log('⚠️  Senha Admin: AdminMaster2026!@#$secure', 'yellow');
    console.log('');

    // Abrir no navegador
    if (isWindows) {
      require('child_process').exec('start http://localhost:5173');
    } else if (process.platform === 'darwin') {
      require('child_process').exec('open http://localhost:5173');
    } else {
      require('child_process').exec('xdg-open http://localhost:5173');
    }

    log('🌐 Navegador abrindo em http://localhost:5173...', 'cyan');
    console.log('');
    log('💡 Logs em tempo real aparecem abaixo:', 'cyan');
    log('   - Backend logs (3001)', 'cyan');
    log('   - Frontend logs (5173)', 'cyan');
    console.log('');
    log('🛑 Para parar: Pressione Ctrl+C', 'yellow');
    console.log('');

  }, 3000);

}, 3000);

// Handler para Ctrl+C gracefully
process.on('SIGINT', () => {
  log('\n\n🛑 Parando servidores...', 'yellow');
  backend.kill();
  setTimeout(() => process.exit(0), 1000);
});

process.on('SIGTERM', () => {
  log('\n\n🛑 Parando servidores...', 'yellow');
  backend.kill();
  setTimeout(() => process.exit(0), 1000);
});
