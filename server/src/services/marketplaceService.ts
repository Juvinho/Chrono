import { pool } from '../db/connection.js';
import { Item, UserItem, User } from '../types/index.js';

export class MarketplaceService {
  
  async getItems(type?: string): Promise<Item[]> {
    let query = 'SELECT * FROM items';
    const params: any[] = [];
    
    if (type) {
      query += ' WHERE type = $1';
      params.push(type);
    }
    
    query += ' ORDER BY price ASC';
    
    const result = await pool.query(query, params);
    return result.rows.map(this.mapItemFromDb);
  }

  async getUserInventory(userId: string): Promise<UserItem[]> {
    const query = `
      SELECT ui.*, i.name, i.type, i.description, i.price, i.image_url, i.rarity
      FROM user_items ui
      JOIN items i ON ui.item_id = i.id
      WHERE ui.user_id = $1
    `;
    const result = await pool.query(query, [userId]);
    return result.rows.map(row => ({
      id: row.id,
      userId: row.user_id,
      itemId: row.item_id,
      isEquipped: row.is_equipped,
      purchasedAt: row.purchased_at,
      item: this.mapItemFromDb(row)
    }));
  }

  async purchaseItem(userId: string, itemId: string): Promise<UserItem> {
    // Check if user already owns it
    const checkQuery = 'SELECT * FROM user_items WHERE user_id = $1 AND item_id = $2';
    const checkResult = await pool.query(checkQuery, [userId, itemId]);
    
    if (checkResult.rows.length > 0) {
      throw new Error('Item already owned');
    }

    // Process "payment" (Mock)
    // In a real app, we would verify transaction here.

    const insertQuery = `
      INSERT INTO user_items (user_id, item_id)
      VALUES ($1, $2)
      RETURNING *
    `;
    
    const result = await pool.query(insertQuery, [userId, itemId]);
    return this.mapUserItemFromDb(result.rows[0]);
  }

  async equipItem(userId: string, itemId: string): Promise<void> {
    const client = await pool.connect();
    
    try {
      await client.query('BEGIN');
      
      // Get item type
      const itemQuery = 'SELECT type FROM items WHERE id = $1';
      const itemResult = await client.query(itemQuery, [itemId]);
      if (itemResult.rows.length === 0) throw new Error('Item not found');
      
      const type = itemResult.rows[0].type;

      // Unequip all items of same type
      const unequipQuery = `
        UPDATE user_items ui
        SET is_equipped = false
        FROM items i
        WHERE ui.item_id = i.id
        AND ui.user_id = $1
        AND i.type = $2
      `;
      await client.query(unequipQuery, [userId, type]);

      // Equip new item
      const equipQuery = `
        UPDATE user_items
        SET is_equipped = true
        WHERE user_id = $1 AND item_id = $2
      `;
      await client.query(equipQuery, [userId, itemId]);

      await client.query('COMMIT');
    } catch (e) {
      await client.query('ROLLBACK');
      throw e;
    } finally {
      client.release();
    }
  }
  
  async unequipItem(userId: string, itemId: string): Promise<void> {
      const query = `
        UPDATE user_items
        SET is_equipped = false
        WHERE user_id = $1 AND item_id = $2
      `;
      await pool.query(query, [userId, itemId]);
  }

  async purchaseSubscription(userId: string, tier: 'pro' | 'pro_plus'): Promise<User> {
    // Update user subscription
    // If upgrading from pro to pro_plus, we might want to handle proration, but let's keep it simple.
    
    const expiresAt = new Date();
    expiresAt.setMonth(expiresAt.getMonth() + 1); // 1 month subscription

    const query = `
      UPDATE users
      SET subscription_tier = $1, subscription_expires_at = $2
      WHERE id = $3
      RETURNING *
    `;
    
    const result = await pool.query(query, [tier, expiresAt, userId]);
    // Note: We need to map this user back to our User type, but for now just returning rows[0] is close enough 
    // provided we handle the mapping elsewhere or here. 
    // Let's rely on UserService or just partial update.
    return result.rows[0]; 
  }

  private mapItemFromDb(row: any): Item {
    return {
      id: row.id || row.item_id, // handle join case
      type: row.type,
      name: row.name,
      description: row.description,
      price: parseFloat(row.price),
      currency: row.currency,
      imageUrl: row.image_url,
      rarity: row.rarity
    };
  }

  private mapUserItemFromDb(row: any): UserItem {
      return {
          id: row.id,
          userId: row.user_id,
          itemId: row.item_id,
          isEquipped: row.is_equipped,
          purchasedAt: row.purchased_at
      };
  }
}
