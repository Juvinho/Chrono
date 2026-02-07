import pkg from 'pg';
const { Pool } = pkg;

const pool = new Pool({
  connectionString: 'postgresql://postgres:BoFGapolkDlHsoPiOTzhJMhxpCibElvB@crossover.proxy.rlwy.net:32792/railway'
});

async function updateDisplayNames() {
  try {
    console.log('Connecting to Railway PostgreSQL...');
    
    // Execute UPDATE
    const updateResult = await pool.query(
      `UPDATE users SET display_name = username WHERE display_name IS NULL OR display_name = ''`
    );
    
    console.log(`✓ Updated ${updateResult.rowCount} users with display_name`);
    
    // Verify results
    const verifyResult = await pool.query(
      `SELECT id, username, display_name FROM users LIMIT 5`
    );
    
    console.log('\n✓ Sample of updated users:');
    console.table(verifyResult.rows);
    
    // Count total
    const countResult = await pool.query(
      `SELECT COUNT(*) as total_users, COUNT(CASE WHEN display_name IS NOT NULL THEN 1 END) as with_display_name FROM users`
    );
    
    console.log('\n✓ Summary:');
    console.table(countResult.rows);
    
    await pool.end();
    console.log('\n✓ Done! display_name column has been successfully populated.');
    process.exit(0);
  } catch (error) {
    console.error('✗ Error:', error.message);
    process.exit(1);
  }
}

updateDisplayNames();
