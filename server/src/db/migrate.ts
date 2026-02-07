import { readFileSync, readdirSync } from 'fs';
import { join } from 'path';
import { fileURLToPath } from 'url';
import { dirname } from 'path';
import { pool } from './connection.js';
import bcrypt from 'bcryptjs';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

// Proper SQL parser that respects dollar-quoted strings
function parseSqlStatements(sql: string): string[] {
  const statements: string[] = [];
  let current = '';
  let i = 0;

  while (i < sql.length) {
    // Check for dollar-quoted string
    if (sql[i] === '$') {
      // Extract the tag (e.g., $function$, $$, etc.)
      let j = i + 1;
      while (j < sql.length && sql[j] !== '$') {
        j++;
      }
      if (j < sql.length) {
        j++; // Include the closing $
        const tag = sql.substring(i, j);
        current += tag;
        i = j;

        // Find the matching closing tag
        while (i < sql.length) {
          if (sql.substring(i, i + tag.length) === tag) {
            current += tag;
            i += tag.length;
            break;
          }
          current += sql[i];
          i++;
        }
        continue;
      }
    }

    // Check for single-line comment
    if (sql[i] === '-' && sql[i + 1] === '-') {
      while (i < sql.length && sql[i] !== '\n') {
        current += sql[i];
        i++;
      }
      if (i < sql.length) {
        current += sql[i];
        i++;
      }
      continue;
    }

    // Check for multi-line comment
    if (sql[i] === '/' && sql[i + 1] === '*') {
      current += sql[i];
      i++;
      current += sql[i];
      i++;
      while (i < sql.length) {
        if (sql[i] === '*' && sql[i + 1] === '/') {
          current += sql[i];
          i++;
          current += sql[i];
          i++;
          break;
        }
        current += sql[i];
        i++;
      }
      continue;
    }

    // Check for statement terminator
    if (sql[i] === ';') {
      current += sql[i];
      i++;
      const trimmed = current.trim();
      if (trimmed.length > 0) {
        statements.push(trimmed);
      }
      current = '';
      continue;
    }

    current += sql[i];
    i++;
  }

  // Don't forget the last statement if it doesn't end with ;
  const trimmed = current.trim();
  if (trimmed.length > 0) {
    statements.push(trimmed + ';');
  }

  return statements;
}

export async function migrate(retries = 3) {
  if (!process.env.DATABASE_URL) {
    console.warn('⚠️ DATABASE_URL não definido. Migrações de banco foram puladas no pre-deploy.');
    return;
  }
  while (retries > 0) {
    try {
      console.log(`Running database migrations (Attempts left: ${retries})...`);
      
      // 1. Run base schema
      const schemaPath = join(__dirname, 'schema.sql');
      const schema = readFileSync(schemaPath, 'utf-8');
      
      // Parse SQL statements respecting dollar-quoted strings
      const statements = parseSqlStatements(schema);
      
      console.log(`📄 Found ${statements.length} SQL statements in schema.sql`);
      
      for (let i = 0; i < statements.length; i++) {
        const statement = statements[i];
        try {
          await pool.query(statement);
        } catch (err: any) {
          // Ignore errors for IF NOT EXISTS statements
          if (!err.message?.includes('already exists') && !err.message?.includes('does not exist')) {
            console.warn(`⚠️  Query ${i + 1} warning:`, err.message?.substring(0, 100));
          }
        }
      }
      console.log('✅ Base schema applied.');

      // 2. Run additional migrations
      const migrationsDir = join(__dirname, 'migrations');
      try {
          const migrationFiles = readdirSync(migrationsDir).filter(f => f.endsWith('.sql')).sort();
          
          for (const file of migrationFiles) {
              const migrationContent = readFileSync(join(migrationsDir, file), 'utf-8');
              console.log(`Applying migration: ${file}`);
              await pool.query(migrationContent);
          }
      } catch (e) {
          console.log('No additional migrations folder found or empty.');
      }

      // 3. Ensure System Users (@Juvinho and @Chrono)
      console.log('Ensuring system creator accounts...');
      
      // @Juvinho: The Creator
      console.log('👤 Garantindo conta: @Juvinho');
      const juvinhoPassword = await bcrypt.hash('27Set@2004', 10);
      await pool.query(`
          INSERT INTO users (
              username, email, password_hash, is_verified, 
              verification_badge_label, verification_badge_color, 
              bio, avatar, cover_image
          )
          VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)
          ON CONFLICT (username) DO UPDATE SET 
              is_verified = EXCLUDED.is_verified,
              verification_badge_label = EXCLUDED.verification_badge_label,
              verification_badge_color = EXCLUDED.verification_badge_color,
              avatar = COALESCE(users.avatar, EXCLUDED.avatar),
              cover_image = COALESCE(users.cover_image, EXCLUDED.cover_image)
          -- Note: Password is NOT overwritten if user already exists
      `, [
          'Juvinho', 
          'juvinho@chrono.net', 
          juvinhoPassword, 
          true, 
          'Criador', 
          'red', 
          'Arquiteto da Chrono. "O tempo é uma ilusão, mas a conexão é real."',
          'https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?w=400&h=400&fit=crop',
          'https://images.unsplash.com/photo-1550745165-9bc0b252726f?w=1200&h=400&fit=crop'
      ]);

      // @Chrono: The System Entity
      console.log('👤 Garantindo conta: @Chrono');
      const chronoPassword = await bcrypt.hash('chrono_secure_system_2026_!@#', 10);
      await pool.query(`
          INSERT INTO users (
              username, email, password_hash, is_verified, 
              verification_badge_label, verification_badge_color, 
              bio, avatar, cover_image
          )
          VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)
          ON CONFLICT (username) DO UPDATE SET 
              is_verified = EXCLUDED.is_verified,
              verification_badge_label = EXCLUDED.verification_badge_label,
              verification_badge_color = EXCLUDED.verification_badge_color,
              avatar = COALESCE(users.avatar, EXCLUDED.avatar),
              cover_image = COALESCE(users.cover_image, EXCLUDED.cover_image)
          -- Note: Password is NOT overwritten if user already exists
      `, [
          'Chrono', 
          'system@chrono.net', 
          chronoPassword, 
          true, 
          'Criador', 
          'red', 
          'A voz da rede. Vigilante da temporalidade.',
          'https://images.unsplash.com/photo-1614728263952-84ea256f9679?w=400&h=400&fit=crop',
          'https://images.unsplash.com/photo-1451187580459-43490279c0fa?w=1200&h=400&fit=crop'
      ]);
      
      console.log('✅ System accounts ensured with assets and passwords.');
      
      console.log('✅ All database migrations completed successfully!');
      return; // Success!
    } catch (error) {
      retries--;
      console.error(`❌ Migration attempt failed. ${retries} retries left.`, error);
      if (retries === 0) throw error;
      // Wait 5s before retrying
      await new Promise(res => setTimeout(res, 5000));
    }
  }
}

// Only run if executed directly
if (process.argv[1] === __filename) {
    migrate().then(() => process.exit(0)).catch(() => process.exit(1));
}

