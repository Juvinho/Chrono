import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const srcDir = path.join(__dirname, 'src', 'db');
const destDir = path.join(__dirname, 'dist', 'db');
// Ensure we use absolute paths regardless of CWD
const projectRoot = path.resolve(__dirname, '..');
const frontendDistDir = path.join(projectRoot, 'dist');
const backendPublicDir = path.join(__dirname, 'dist', 'public');

function copyDir(src, dest, filter = null) {
  if (!fs.existsSync(src)) {
    console.warn(`⚠️ Source directory ${src} does not exist. Skipping.`);
    return;
  }

  if (!fs.existsSync(dest)) {
    fs.mkdirSync(dest, { recursive: true });
  }

  const entries = fs.readdirSync(src, { withFileTypes: true });

  for (const entry of entries) {
    const srcPath = path.join(src, entry.name);
    const destPath = path.join(dest, entry.name);

    if (entry.isDirectory()) {
      copyDir(srcPath, destPath, filter);
    } else {
      if (!filter || filter(entry.name)) {
        try {
          fs.copyFileSync(srcPath, destPath);
        } catch (err) {
          console.error(`❌ Error copying ${srcPath} to ${destPath}:`, err.message);
        }
      }
    }
  }
}

// Copy SQL files
console.log('Copying SQL assets...');
copyDir(srcDir, destDir, (name) => name.endsWith('.sql'));
console.log('SQL assets copied successfully.');

// Copy Frontend Build
console.log(`Checking for frontend build at: ${frontendDistDir}`);
if (fs.existsSync(frontendDistDir)) {
  console.log(`Found frontend build. Copying to: ${backendPublicDir}`);
  // Clear destination first to avoid stale assets
  if (fs.existsSync(backendPublicDir)) {
    fs.rmSync(backendPublicDir, { recursive: true, force: true });
  }
  copyDir(frontendDistDir, backendPublicDir);
  console.log('✅ Frontend build assets copied successfully.');
} else {
  console.error(`❌ CRITICAL ERROR: Frontend build directory NOT FOUND at ${frontendDistDir}`);
  console.log('Project Root contents:', fs.readdirSync(projectRoot));
  process.exit(1);
}
