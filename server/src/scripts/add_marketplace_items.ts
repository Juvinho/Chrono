import { pool } from '../db/connection';

const items = [
  // Frames
  { type: 'frame', name: 'Neon Pulse', description: 'A pulsing neon border for your profile.', price: 50, currency: 'BRL', imageUrl: 'https://placehold.co/400x400/00ffff/000000?text=Neon', rarity: 'rare' },
  { type: 'frame', name: 'Cyber Gold', description: 'Luxurious golden cybernetic frame.', price: 500, currency: 'BRL', imageUrl: 'https://placehold.co/400x400/ffd700/000000?text=Gold', rarity: 'legendary' },
  { type: 'frame', name: 'Retro Terminal', description: 'Old school green terminal look.', price: 10, currency: 'BRL', imageUrl: 'https://placehold.co/400x400/00ff00/000000?text=Retro', rarity: 'common' },
  { type: 'frame', name: 'Glitch Border', description: 'Unstable reality border.', price: 25, currency: 'BRL', imageUrl: 'https://placehold.co/400x400/ff00ff/000000?text=Glitch', rarity: 'rare' },
  
  // Effects
  { type: 'effect', name: 'Matrix Rain', description: 'Green code raining down your profile.', price: 100, currency: 'BRL', imageUrl: 'https://placehold.co/400x400/003300/00ff00?text=Matrix', rarity: 'epic' },
  { type: 'effect', name: 'VHS Static', description: 'Retro VHS noise overlay.', price: 75, currency: 'BRL', imageUrl: 'https://placehold.co/400x400/333333/ffffff?text=VHS', rarity: 'rare' },
  { type: 'effect', name: 'Hologram', description: 'Flickering holographic overlay.', price: 80, currency: 'BRL', imageUrl: 'https://placehold.co/400x400/00ffff/ffffff?text=Holo', rarity: 'rare' },
  { type: 'effect', name: 'Cyber Mist', description: 'Neon fog surrounding your profile.', price: 45, currency: 'BRL', imageUrl: 'https://placehold.co/400x400/8800ff/ffffff?text=Mist', rarity: 'common' },
  
  // Themes (New Category idea)
  { type: 'theme', name: 'Retro Terminal', description: 'Old school green terminal look.', price: 100, currency: 'BRL', imageUrl: 'https://placehold.co/400x400/000000/00ff00?text=Terminal', rarity: 'rare' },
  { type: 'theme', name: 'Midnight City', description: 'Dark blue and purple UI theme.', price: 150, currency: 'BRL', imageUrl: 'https://placehold.co/400x400/000033/ffffff?text=Midnight', rarity: 'epic' },
  { type: 'theme', name: 'Solar Punk', description: 'Bright and organic tech theme.', price: 150, currency: 'BRL', imageUrl: 'https://placehold.co/400x400/ffff00/000000?text=Solar', rarity: 'epic' },
];

async function seedItems() {
  console.log('Seeding marketplace items...');
  
  try {
    for (const item of items) {
      // Check if item exists
      const res = await pool.query('SELECT id FROM items WHERE name = $1 AND type = $2', [item.name, item.type]);
      if (res.rows.length === 0) {
        await pool.query(
          'INSERT INTO items (type, name, description, price, currency, image_url, rarity) VALUES ($1, $2, $3, $4, $5, $6, $7)',
          [item.type, item.name, item.description, item.price, item.currency, item.imageUrl, item.rarity]
        );
        console.log(`Added: ${item.name}`);
      } else {
        console.log(`Skipped (exists): ${item.name}`);
      }
    }
    console.log('Done!');
  } catch (err) {
    console.error('Error seeding items:', err);
  } finally {
    await pool.end();
  }
}

seedItems();
