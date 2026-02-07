import { pool } from './connection.js';
import bcrypt from 'bcryptjs';
import { TAGS_SEED } from './tags-seed.js';

const items = [
  // FRAMES
  {
    type: 'frame',
    name: 'Cyber Samurai',
    description: 'Honor and steel in the digital age.',
    price: 15.00,
    currency: 'BRL',
    imageUrl: 'https://i.imgur.com/7bIqY8T.png', // Placeholder or use CSS-based rendering in FramePreview
    rarity: 'epic'
  },
  {
    type: 'frame',
    name: 'Holo Glitch',
    description: 'Unstable reality projection.',
    price: 12.50,
    currency: 'BRL',
    imageUrl: 'https://i.imgur.com/5wQJ9zL.png',
    rarity: 'rare'
  },
  {
    type: 'frame',
    name: 'Gold Trim',
    description: 'Classic elegance for the discerning user.',
    price: 25.00,
    currency: 'BRL',
    imageUrl: 'https://i.imgur.com/9xKj1mN.png',
    rarity: 'legendary'
  },
  {
    type: 'frame',
    name: 'Neon Punk',
    description: 'Loud, proud, and fluorescent.',
    price: 8.00,
    currency: 'BRL',
    imageUrl: 'https://i.imgur.com/3vUo7pQ.png',
    rarity: 'common'
  },
  {
    type: 'frame',
    name: 'Matrix Code',
    description: 'See the world as it truly is.',
    price: 18.00,
    currency: 'BRL',
    imageUrl: 'https://i.imgur.com/1aBc2dE.png',
    rarity: 'epic'
  },
  {
    type: 'frame',
    name: 'Void Walker',
    description: 'Stare into the abyss.',
    price: 20.00,
    currency: 'BRL',
    imageUrl: 'https://i.imgur.com/8fGh9jK.png',
    rarity: 'epic'
  },
  {
    type: 'frame',
    name: 'Retro TV',
    description: 'Tune in to the past.',
    price: 10.00,
    currency: 'BRL',
    imageUrl: 'https://i.imgur.com/4lMn5oP.png',
    rarity: 'rare'
  },
    {
    type: 'frame',
    name: 'Cosmic Stardust',
    description: 'Born from the nebulae.',
    price: 35.00,
    currency: 'BRL',
    imageUrl: '',
    rarity: 'legendary'
  },
  {
    type: 'frame',
    name: 'Cyber Pulse',
    description: 'Sync with the network.',
    price: 22.00,
    currency: 'BRL',
    imageUrl: '',
    rarity: 'epic'
  },
  {
    type: 'frame',
    name: 'Golden Halo',
    description: 'Angelic radiance.',
    price: 40.00,
    currency: 'BRL',
    imageUrl: '',
    rarity: 'legendary'
  },
  {
    type: 'frame',
    name: 'Glitch Horror',
    description: 'Something is wrong.',
    price: 18.00,
    currency: 'BRL',
    imageUrl: '',
    rarity: 'rare'
  },
  {
    type: 'frame',
    name: 'Crystal Shard',
    description: 'Sharp and pristine.',
    price: 28.00,
    currency: 'BRL',
    imageUrl: '',
    rarity: 'epic'
  },
  {
    type: 'frame',
    name: 'Pixel Heart',
    description: '8-bit love.',
    price: 12.00,
    currency: 'BRL',
    imageUrl: '',
    rarity: 'rare'
  },
  // EXISTING ONES (to ensure they exist or update)
  {
    type: 'frame',
    name: 'Retro Arcade',
    description: 'Pixel perfect nostalgia.',
    price: 10.00,
    currency: 'BRL',
    imageUrl: '', 
    rarity: 'rare'
  },
  {
    type: 'frame',
    name: 'Neon Demon',
    description: 'Pulsing energy from the underworld.',
    price: 20.00,
    currency: 'BRL',
    imageUrl: '',
    rarity: 'epic'
  },
  {
    type: 'frame',
    name: 'Glitch Border',
    description: 'Reality is breaking down.',
    price: 15.00,
    currency: 'BRL',
    imageUrl: '',
    rarity: 'rare'
  },
  {
    type: 'frame',
    name: 'Golden Legend',
    description: 'Pure status symbol.',
    price: 50.00,
    currency: 'BRL',
    imageUrl: '',
    rarity: 'legendary'
  },

  // EFFECTS
  {
    type: 'effect',
    name: 'Matrix Rain',
    description: 'Digital rain overlay.',
    price: 20.00,
    currency: 'BRL',
    imageUrl: 'https://media.giphy.com/media/u0bgM8wzV94v6/giphy.gif', // Placeholder
    rarity: 'epic'
  },
  {
    type: 'effect',
    name: 'Electric Aura',
    description: 'Shocking presence.',
    price: 15.00,
    currency: 'BRL',
    imageUrl: 'https://media.giphy.com/media/3o7TKs7V62v5Q5GZfa/giphy.gif',
    rarity: 'rare'
  },
  {
    type: 'effect',
    name: 'Glitch Storm',
    description: 'Visual noise interference.',
    price: 18.00,
    currency: 'BRL',
    imageUrl: 'https://media.giphy.com/media/l41lFw057lAJQMxw0/giphy.gif',
    rarity: 'epic'
  }
];

async function seed() {
  console.log('Seeding items...');
  
  // -------------------------------------------------------------------------
  // 1. ENSURE TABLES EXIST
  // -------------------------------------------------------------------------
  await pool.query(`
    CREATE TABLE IF NOT EXISTS users (
      id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
      username VARCHAR(50) UNIQUE NOT NULL,
      email VARCHAR(255) UNIQUE NOT NULL,
      password_hash VARCHAR(255),
      google_id VARCHAR(255) UNIQUE,
      avatar TEXT,
      bio TEXT DEFAULT '',
      birthday DATE,
      pronouns VARCHAR(20),
      location VARCHAR(100),
      website VARCHAR(255),
      cover_image TEXT,
      followers_count INTEGER DEFAULT 0,
      following_count INTEGER DEFAULT 0,
      is_private BOOLEAN DEFAULT FALSE,
      is_verified BOOLEAN DEFAULT FALSE,
      email_verification_token VARCHAR(255),
      verification_badge_label VARCHAR(100),
      verification_badge_color VARCHAR(20),
      profile_settings JSONB DEFAULT '{"theme":"light","accentColor":"purple","effect":"none","animationsEnabled":true}'::jsonb,
      blocked_users TEXT[] DEFAULT '{}',
      created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
      updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
    );
  `);

  await pool.query(`
    CREATE TABLE IF NOT EXISTS items (
      id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
      type VARCHAR(20) NOT NULL,
      name VARCHAR(100) NOT NULL,
      description TEXT,
      price DECIMAL(10, 2) NOT NULL,
      currency VARCHAR(10) DEFAULT 'BRL',
      image_url TEXT,
      rarity VARCHAR(20) DEFAULT 'common',
      created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
    );
  `);
  
  // User Items table
  await pool.query(`
    CREATE TABLE IF NOT EXISTS user_items (
      id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
      user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
      item_id UUID NOT NULL REFERENCES items(id) ON DELETE CASCADE,
      is_equipped BOOLEAN DEFAULT FALSE,
      purchased_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
      UNIQUE(user_id, item_id)
    );
  `);

  // -------------------------------------------------------------------------
  // 2. SEED USERS (Creator & AI)
  // -------------------------------------------------------------------------
  console.log('Seeding special users...');
  
  // Special User: @Juvinho (System Creator)
  const juvinhoPassword = await bcrypt.hash('chrono2026', 10);
  await pool.query(`
    INSERT INTO users (username, email, password_hash, is_verified, verification_badge_label, verification_badge_color, bio)
    VALUES ($1, $2, $3, $4, $5, $6, $7)
    ON CONFLICT (username) DO UPDATE SET 
      is_verified = EXCLUDED.is_verified,
      verification_badge_label = EXCLUDED.verification_badge_label,
      verification_badge_color = EXCLUDED.verification_badge_color,
      bio = EXCLUDED.bio
  `, ['Juvinho', 'juvinho@chrono.net', juvinhoPassword, true, 'Criador', 'red', 'Arquiteto da Chrono. "O tempo é uma ilusão, mas a conexão é real."']);

  // Special User: @Chrono (System Entity)
  const chronoPassword = await bcrypt.hash('chrono2026', 10);
  await pool.query(`
    INSERT INTO users (username, email, password_hash, is_verified, verification_badge_label, verification_badge_color, bio)
    VALUES ($1, $2, $3, $4, $5, $6, $7)
    ON CONFLICT (username) DO UPDATE SET 
      is_verified = EXCLUDED.is_verified,
      verification_badge_label = EXCLUDED.verification_badge_label,
      verification_badge_color = EXCLUDED.verification_badge_color,
      bio = EXCLUDED.bio
  `, ['Chrono', 'system@chrono.net', chronoPassword, true, 'Criador', 'red', 'A voz da rede. Vigilante da temporalidade.']);

  console.log('✅ Contas @Juvinho e @Chrono configuradas.');

  // -------------------------------------------------------------------------
  // 3. SEED ITEMS
  // -------------------------------------------------------------------------
  for (const item of items) {
    // Check if item exists by name
    const res = await pool.query('SELECT id FROM items WHERE name = $1', [item.name]);
    
    if (res.rows.length === 0) {
      await pool.query(
        'INSERT INTO items (type, name, description, price, currency, image_url, rarity) VALUES ($1, $2, $3, $4, $5, $6, $7)',
        [item.type, item.name, item.description, item.price, item.currency, item.imageUrl, item.rarity]
      );
      console.log(`Added ${item.name}`);
    } else {
      console.log(`Skipped ${item.name} (already exists)`);
    }
  }

  // -------------------------------------------------------------------------
  // 4. SEED TAGS / BADGES
  // -------------------------------------------------------------------------
  console.log('Seeding tag definitions...');
  for (const tag of TAGS_SEED) {
    const res = await pool.query('SELECT id FROM tag_definitions WHERE id = $1', [tag.id]);
    
    if (res.rows.length === 0) {
      await pool.query(
        `INSERT INTO tag_definitions (id, nome, icone, cor_hex, cor_border, prioridade_exibicao, categoria, visibilidade, condicao_aquisicao, condicao_remocao, descricao_publica, descricao_interna, notificar_aquisicao, notificar_remocao, criado_em, atualizado_em)
         VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16)`,
        [
          tag.id,
          tag.nome,
          tag.icone,
          tag.cor_hex,
          tag.cor_border,
          tag.prioridade_exibicao,
          tag.categoria,
          tag.visibilidade,
          JSON.stringify(tag.condicao_aquisicao),
          tag.condicao_remocao ? JSON.stringify(tag.condicao_remocao) : null,
          tag.descricao_publica,
          tag.descricao_interna || null,
          tag.notificar_aquisicao,
          tag.notificar_remocao,
          tag.criado_em,
          tag.atualizado_em
        ]
      );
      console.log(`✅ Tag "${tag.nome}" criada`);
    } else {
      console.log(`⏭️  Tag "${tag.nome}" já existe`);
    }
  }
  
  console.log('Seeding complete!');
  process.exit(0);
}

seed().catch((err: Error) => {
  console.error(err);
  process.exit(1);
});
