const pool = require('../config/mysql');

async function createTable() {
    try {
        const createTableQuery = `
      CREATE TABLE IF NOT EXISTS razorpay_ledger (
        payment_id VARCHAR(255) PRIMARY KEY,
        order_id VARCHAR(255),
        amount DECIMAL(20, 2),
        currency VARCHAR(10),
        status VARCHAR(50),
        method VARCHAR(50),
        email VARCHAR(255),
        contact VARCHAR(50),
        fee DECIMAL(20, 2),
        tax DECIMAL(20, 2),
        created_at TIMESTAMP,
        captured_at TIMESTAMP,
        raw_payload JSON,
        reconciliation_status VARCHAR(50) DEFAULT 'pending',
        last_synced_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        INDEX idx_created_at (created_at),
        INDEX idx_status (status)
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
    `;

        console.log('Creating razorpay_ledger table...');
        await pool.query(createTableQuery);
        console.log('✅ razorpay_ledger table created successfully');

        process.exit(0);
    } catch (error) {
        console.error('Error creating table:', error);
        process.exit(1);
    }
}

createTable();
