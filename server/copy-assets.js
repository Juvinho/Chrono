import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const srcDir = path.join(__dirname, 'src', 'db');
const destDir = path.join(__dirname, 'dist', 'db');
const frontendDistDir = path.join(__dirname, '..', 'dist');
const backendPublicDir = path.join(__dirname, 'dist', 'public');

function copyDir(src, dest, filter = null) {
  if (!fs.existsSync(src)) {
    console.warn(`Source directory ${src} does not exist. Skipping.`);
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
        fs.copyFileSync(srcPath, destPath);
        // console.log(`Copied ${entry.name} to ${destPath}`);
      }
    }
  }
}

// Copy SQL files
copyDir(srcDir, destDir, (name) => name.endsWith('.sql'));
console.log('SQL assets copied successfully.');

// Copy Frontend Build
console.log(`Checking for frontend build at: ${frontendDistDir}`);
if (fs.existsSync(frontendDistDir)) {
  console.log('Copying frontend build assets...');
  copyDir(frontendDistDir, backendPublicDir);
  console.log('Frontend build assets copied successfully.');
} else {
  console.error(`❌ ERROR: Frontend build directory NOT FOUND at ${frontendDistDir}`);
  console.log('Current directory contents:', fs.readdirSync(__dirname));
  console.log('Parent directory contents:', fs.readdirSync(path.join(__dirname, '..')));
}
