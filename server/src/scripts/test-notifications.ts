import dotenv from 'dotenv';
import { pool } from '../db/connection.js';
import { NotificationService } from '../services/notificationService.js';
import crypto from 'crypto';

dotenv.config();

async function ensureUser(username: string, email: string) {
  const found = await pool.query('SELECT id FROM users WHERE username = $1', [username]);
  if (found.rows.length > 0) return found.rows[0].id as string;
  const id = crypto.randomUUID();
  await pool.query(
    `INSERT INTO users (id, username, email, is_verified) VALUES ($1, $2, $3, TRUE)`,
    [id, username, email]
  );
  return id;
}

async function run() {
  console.log('▶ Running notification integration test...');
  const aliceId = await ensureUser(`alice_${Date.now()}`, `alice_${Date.now()}@example.com`);
  const bobId = await ensureUser(`bob_${Date.now()}`, `bob_${Date.now()}@example.com`);

  const notifSvc = new NotificationService();
  notifSvc.startQueueWorker();

  console.log('Creating notification: bob → alice (follow)');
  const notif = await notifSvc.createNotification(aliceId, bobId, 'follow');
  console.log('Notification created:', !!notif, notif?.id);

  // Allow queue worker a moment to process
  await new Promise(res => setTimeout(res, 2000));

  const rows = await pool.query('SELECT * FROM notifications WHERE user_id = $1 ORDER BY created_at DESC LIMIT 1', [aliceId]);
  console.log('Latest notification:', rows.rows[0]?.notification_type, rows.rows[0]?.created_at);

  console.log('✔ Notification integration test completed');
  process.exit(0);
}

run().catch(err => {
  console.error('✖ Test failed:', err);
  process.exit(1);
});
