import { pool } from './connection.js';
import bcrypt from 'bcryptjs';

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
  
  const specialUsers = [
    {
      username: 'Juvinho',
      email: 'juvinho@chrono.social',
      password: '27Set@2004',
      bio: 'Criador do Chrono. Viajante do tempo.',
      is_verified: true,
      verification_badge_label: 'Creator',
      verification_badge_color: 'gold', // or whatever color system you use
      avatar: 'https://i.imgur.com/7bIqY8T.png' // Optional placeholder
    },
    {
      username: 'ChronoBot', // Representing "You" (the AI/System)
      email: 'bot@chrono.social',
      password: 'SuperSecretPassword123!', // Random strong password
      bio: 'Assistente oficial do sistema Chrono.',
      is_verified: true,
      verification_badge_label: 'System',
      verification_badge_color: 'blue',
      avatar: 'https://i.imgur.com/5wQJ9zL.png' // Optional placeholder
    }
  ];

  for (const user of specialUsers) {
    const userExists = await pool.query('SELECT id FROM users WHERE username = $1', [user.username]);
    
    if (userExists.rows.length === 0) {
      const salt = await bcrypt.genSalt(10);
      const hashedPassword = await bcrypt.hash(user.password, salt);
      
      await pool.query(
        `INSERT INTO users (
           username, email, password_hash, bio, is_verified, 
           verification_badge_label, verification_badge_color, avatar
         ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8)`,
        [
          user.username, user.email, hashedPassword, user.bio, 
          user.is_verified, user.verification_badge_label, 
          user.verification_badge_color, user.avatar
        ]
      );
      console.log(`✅ Created user: ${user.username}`);
    } else {
      // Optional: Update existing user to match desired state (e.g. ensure admin status)
      // For now, just logging
      console.log(`ℹ️ User ${user.username} already exists. Skipping creation.`);
      
      // Force update password if it's Juvinho (to ensure it matches what you asked)
      if (user.username === 'Juvinho') {
         const salt = await bcrypt.genSalt(10);
         const hashedPassword = await bcrypt.hash(user.password, salt);
         await pool.query('UPDATE users SET password_hash = $1, is_verified = $2, verification_badge_label = $3 WHERE username = $4', 
            [hashedPassword, true, 'Creator', 'Juvinho']);
         console.log(`🔄 Updated Juvinho password and verified status.`);
      }
    }
  }

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
  
  console.log('Seeding complete!');
  process.exit(0);
}

seed().catch(err => {
  console.error(err);
  process.exit(1);
});
