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

import { spawn, exec } from 'child_process';
import path from 'path';
import { fileURLToPath } from 'url';
import os from 'os';
import fs from 'fs';
import { createConnection } from 'net';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

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

// Função para verificar se porta está aberta
function isPortOpen(port) {
  return new Promise((resolve) => {
    const socket = createConnection(port, 'localhost');
    socket.setTimeout(1000);
    
    socket.on('connect', () => {
      socket.destroy();
      resolve(true);
    });
    
    socket.on('timeout', () => {
      socket.destroy();
      resolve(false);
    });
    
    socket.on('error', () => {
      resolve(false);
    });
  });
}

// Função para matar processo na porta (Windows)
function killPortWindows(port) {
  return new Promise((resolve) => {
    exec(`netstat -ano | findstr :${port}`, (error, stdout) => {
      if (error || !stdout) {
        resolve();
        return;
      }
      
      const lines = stdout.split('\n');
      lines.forEach((line) => {
        const parts = line.trim().split(/\s+/);
        if (parts.length > 0) {
          const pid = parts[parts.length - 1];
          if (pid && /^\d+$/.test(pid)) {
            try {
              exec(`taskkill /PID ${pid} /F`, () => {});
            } catch (e) {
              // ignore
            }
          }
        }
      });
      
      setTimeout(() => resolve(), 500);
    });
  });
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

// Limpar portas se necessário
(async () => {
  if (isWindows) {
    log('🔍 Verificando portas...', 'cyan');
    
    const port3001Open = await isPortOpen(3001);
    const port5173Open = await isPortOpen(5173);
    
    if (port3001Open) {
      log('⚠️  Porta 3001 já em uso, tentando liberar...', 'yellow');
      await killPortWindows(3001);
    }
    
    if (port5173Open) {
      log('⚠️  Porta 5173 já em uso, tentando liberar...', 'yellow');
      await killPortWindows(5173);
    }
    
    log('✅ Portas verificadas', 'green');
    console.log('');
  }
  
  startServers();
})();

function startServers() {
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
    console.log('');

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

    // Aguardar Vite iniciar completamente (8 segundos)
    setTimeout(async () => {
      // Verificar se porta está aberta
      const portOpen = await isPortOpen(5173);
      
      if (portOpen) {
        logTitle('✅ Servidores iniciados com sucesso!');

        log('📍 Aplicação: http://localhost:5173', 'cyan');
        log('🔐 Admin: http://localhost:5173/admin/login', 'cyan');
        log('🔌 Backend: http://localhost:3001', 'cyan');
        log('⚕️  Health: http://localhost:3001/health', 'cyan');
        console.log('');
        log('⚠️  Senha Admin: AdminMaster2026!@#$secure', 'yellow');
        console.log('');

        // Abrir no navegador
        if (isWindows) {
          exec('start http://localhost:5173');
        } else if (process.platform === 'darwin') {
          exec('open http://localhost:5173');
        } else {
          exec('xdg-open http://localhost:5173');
        }

        log('🌐 Navegador abrindo em http://localhost:5173...', 'cyan');
        console.log('');
        log('💡 Logs em tempo real aparecem abaixo:', 'cyan');
        log('   - Backend logs (3001)', 'cyan');
        log('   - Frontend logs (5173)', 'cyan');
        console.log('');
        log('🛑 Para parar: Pressione Ctrl+C', 'yellow');
        console.log('');
      } else {
        log('⚠️  Porta 5173 não abriu. Verifique os logs acima.', 'yellow');
        log('💡 Tente novamente em alguns segundos...', 'yellow');
      }

    }, 8000);

  }, 4000);

  // Handler para Ctrl+C gracefully
  process.on('SIGINT', () => {
    log('\n\n🛑 Parando servidores...', 'yellow');
    backend.kill('SIGTERM');
    setTimeout(() => process.exit(0), 2000);
  });

  process.on('SIGTERM', () => {
    log('\n\n🛑 Parando servidores...', 'yellow');
    backend.kill('SIGTERM');
    setTimeout(() => process.exit(0), 2000);
  });
}
