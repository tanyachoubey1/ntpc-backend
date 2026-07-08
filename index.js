require('dotenv').config();
const express = require('express');
const { Pool } = require('pg');
const cors = require('cors');

const app = express();
app.use(cors());
app.use(express.json());

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: { rejectUnauthorized: false }
});

const createTables = async () => {
  try {
    await pool.query(`
      CREATE TABLE IF NOT EXISTS Users (
        Id SERIAL PRIMARY KEY,
        EmployeeId VARCHAR(50) UNIQUE,
        Password VARCHAR(100),
        Role VARCHAR(20) DEFAULT 'user'
      )
    `);

    await pool.query(`
      INSERT INTO Users (EmployeeId, Password, Role)
      VALUES ('NTPC001', 'ntpc@1234', 'admin')
      ON CONFLICT (EmployeeId) DO UPDATE SET Role = 'admin'
    `);

    await pool.query(`
      CREATE TABLE IF NOT EXISTS Assets (
        Id SERIAL PRIMARY KEY,
        Category VARCHAR(100),
        Item VARCHAR(100),
        Total INT,
        Instock INT,
        Used INT,
        Damaged INT,
        Location VARCHAR(200),
        CreatedAt TIMESTAMP DEFAULT NOW()
      )
    `);

    console.log('Tables ready!');
  } catch (err) {
    console.log('Table error:', err.message);
  }
};
createTables();

// Login
app.post('/login', async (req, res) => {
  const { employeeId, password } = req.body;
  try {
    const result = await pool.query(
      'SELECT * FROM Users WHERE EmployeeId = $1 AND Password = $2',
      [employeeId, password]
    );
    if (result.rows.length > 0) {
      res.json({ success: true, role: result.rows[0].role });
    } else {
      res.json({ success: false });
    }
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Reset Password
app.post('/reset-password', async (req, res) => {
  const { employeeId, newPassword } = req.body;
  try {
    const check = await pool.query(
      'SELECT * FROM Users WHERE EmployeeId = $1', [employeeId]
    );
    if (check.rows.length === 0) {
      res.json({ success: false, message: 'Employee ID not found!' });
    } else {
      await pool.query(
        'UPDATE Users SET Password = $1 WHERE EmployeeId = $2',
        [newPassword, employeeId]
      );
      res.json({ success: true });
    }
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Change Password
app.post('/change-password', async (req, res) => {
  const { employeeId, oldPassword, newPassword } = req.body;
  try {
    const check = await pool.query(
      'SELECT * FROM Users WHERE EmployeeId = $1 AND Password = $2',
      [employeeId, oldPassword]
    );
    if (check.rows.length === 0) {
      res.json({ success: false, message: 'Current password is incorrect!' });
    } else {
      await pool.query(
        'UPDATE Users SET Password = $1 WHERE EmployeeId = $2',
        [newPassword, employeeId]
      );
      res.json({ success: true });
    }
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Admin - Add User
app.post('/admin/add-user', async (req, res) => {
  const { employeeId, password } = req.body;
  try {
    const check = await pool.query(
      'SELECT * FROM Users WHERE EmployeeId = $1', [employeeId]
    );
    if (check.rows.length > 0) {
      res.json({ success: false, message: 'Employee ID already exists!' });
    } else {
      await pool.query(
        'INSERT INTO Users (EmployeeId, Password, Role) VALUES ($1, $2, $3)',
        [employeeId, password, 'user']
      );
      res.json({ success: true });
    }
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Admin - Get Users
app.get('/admin/users', async (req, res) => {
  try {
    const result = await pool.query('SELECT Id, EmployeeId, Role FROM Users');
    res.json(result.rows);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Admin - Delete User
app.delete('/admin/users/:id', async (req, res) => {
  try {
    await pool.query('DELETE FROM Users WHERE Id = $1', [req.params.id]);
    res.json({ success: true });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Get Assets
app.get('/assets', async (req, res) => {
  try {
    const result = await pool.query('SELECT * FROM Assets');
    res.json(result.rows);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Add Asset
app.post('/assets', async (req, res) => {
  const { category, item, total, instock, used, damaged, location } = req.body;
  try {
    await pool.query(
      'INSERT INTO Assets (Category, Item, Total, Instock, Used, Damaged, Location) VALUES ($1,$2,$3,$4,$5,$6,$7)',
      [category, item, total, instock, used, damaged, location]
    );
    res.json({ message: 'Asset added!' });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Update Asset
app.put('/assets/:id', async (req, res) => {
  const { category, item, total, instock, used, damaged, location } = req.body;
  try {
    await pool.query(
      `UPDATE Assets SET Category=$1, Item=$2, Total=$3, 
       Instock=$4, Used=$5, Damaged=$6, Location=$7 WHERE Id=$8`,
      [category, item, total, instock, used, damaged, location, req.params.id]
    );
    res.json({ message: 'Asset updated!' });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Delete Asset
app.delete('/assets/:id', async (req, res) => {
  try {
    await pool.query('DELETE FROM Assets WHERE Id = $1', [req.params.id]);
    res.json({ message: 'Asset deleted!' });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

const PORT = process.env.PORT || 5000;
app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});