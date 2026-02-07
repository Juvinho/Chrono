import fs from 'fs';
import path from 'path';

/**
 * Copy SQL files from src/db to dist/db
 * This ensures migrations have access to schema.sql and other SQL files in production
 */
export async function copySqlFiles() {
  const srcDir = path.join(process.cwd(), 'server', 'src', 'db');
  const distDir = path.join(process.cwd(), 'server', 'dist', 'db');

  try {
    // Create dist/db directory if it doesn't exist
    if (!fs.existsSync(distDir)) {
      fs.mkdirSync(distDir, { recursive: true });
    }

    // Copy all .sql files
    const files = fs.readdirSync(srcDir);
    files.forEach(file => {
      if (file.endsWith('.sql')) {
        const srcFile = path.join(srcDir, file);
        const destFile = path.join(distDir, file);
        fs.copyFileSync(srcFile, destFile);
        console.log(`✓ Copied ${file}`);
      }
    });

    console.log('✓ All SQL files copied successfully!');
  } catch (error: any) {
    console.error('✗ Error copying SQL files:', error.message);
    process.exit(1);
  }
}

// Run if executed directly
if (import.meta.url === `file://${process.argv[1]}`) {
  copySqlFiles();
}
