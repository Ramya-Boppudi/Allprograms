async function ensurePaymentSchema(pool) {
  await pool.query(`
    CREATE TABLE IF NOT EXISTS grievance_payments (
      id INT AUTO_INCREMENT PRIMARY KEY,
      grievance_id INT NOT NULL,
      order_ref VARCHAR(40) NOT NULL UNIQUE,
      amount DECIMAL(10,2) NOT NULL,
      status ENUM('PENDING','PAID','EXPIRED','CANCELLED') NOT NULL DEFAULT 'PENDING',
      upi_link TEXT NOT NULL,
      pay_url VARCHAR(500) NOT NULL,
      transaction_id VARCHAR(80) NULL,
      payer_vpa VARCHAR(80) NULL,
      paid_at DATETIME NULL,
      created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
      updated_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
      CONSTRAINT fk_pay_g FOREIGN KEY (grievance_id) REFERENCES grievances(id)
    )
  `);
  try {
    await pool.query('ALTER TABLE grievances ADD COLUMN fee_transaction_id VARCHAR(80) NULL');
  } catch (err) {
    if (err.code !== 'ER_DUP_FIELDNAME') throw err;
  }
}

module.exports = { ensurePaymentSchema };
