const express = require('express');
const sql = require('mssql');
const cors = require('cors');

const app = express();
app.use(cors());
app.use(express.json());

const config = {
  server: 'localhost',
  database: 'ntpc_assets',
  user: 'sa',
  password: 'ntpc@1234',
  options: {
    trustServerCertificate: true,
    enableArithAbort: true
  }
};

const createUsersTable = async () => {
  try {
    await sql.connect(config);
    
    // Users table banao
    await sql.query(`
      IF NOT EXISTS (SELECT * FROM sysobjects WHERE name='Users' AND xtype='U')
      CREATE TABLE Users (
        Id INT IDENTITY(1,1) PRIMARY KEY,
        EmployeeId NVARCHAR(50) UNIQUE,
        Password NVARCHAR(100),
        Role NVARCHAR(20) DEFAULT 'user'
      )
    `);

    // Role column add karo agar nahi hai
    await sql.query(`
      IF NOT EXISTS (SELECT * FROM sys.columns WHERE name = 'Role' AND object_id = OBJECT_ID('Users'))
      ALTER TABLE Users ADD Role NVARCHAR(20) DEFAULT 'user'
    `);

    // Admin user add karo
    await sql.query(`
      IF NOT EXISTS (SELECT * FROM Users WHERE EmployeeId = 'NTPC001')
      INSERT INTO Users (EmployeeId, Password, Role) VALUES ('NTPC001', 'ntpc@1234', 'admin')
    `);

    // NTPC001 ko admin banao agar pehle se hai
    await sql.query(`
      UPDATE Users SET Role = 'admin' WHERE EmployeeId = 'NTPC001'
    `);

    console.log('Users table ready!');
  } catch (err) {
    console.log('Table error:', err.message);
  }
};
createUsersTable();

app.post('/login', async (req, res) => {
  const { employeeId, password } = req.body;
  try {
    await sql.connect(config);
    const result = await sql.query(
      `SELECT * FROM Users WHERE EmployeeId = '${employeeId}' AND Password = '${password}'`
    );
    if (result.recordset.length > 0) {
      res.json({ success: true, role: result.recordset[0].Role });
    } else {
      res.json({ success: false });
    }
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.post('/reset-password', async (req, res) => {
  const { employeeId, newPassword } = req.body;
  try {
    await sql.connect(config);
    const check = await sql.query(`SELECT * FROM Users WHERE EmployeeId = '${employeeId}'`);
    if (check.recordset.length === 0) {
      res.json({ success: false, message: 'Employee ID not found!' });
    } else {
      await sql.query(`UPDATE Users SET Password = '${newPassword}' WHERE EmployeeId = '${employeeId}'`);
      res.json({ success: true });
    }
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.post('/change-password', async (req, res) => {
  const { employeeId, oldPassword, newPassword } = req.body;
  try {
    await sql.connect(config);
    const check = await sql.query(
      `SELECT * FROM Users WHERE EmployeeId = '${employeeId}' AND Password = '${oldPassword}'`
    );
    if (check.recordset.length === 0) {
      res.json({ success: false, message: 'Current password is incorrect!' });
    } else {
      await sql.query(`UPDATE Users SET Password = '${newPassword}' WHERE EmployeeId = '${employeeId}'`);
      res.json({ success: true });
    }
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.post('/admin/add-user', async (req, res) => {
  const { employeeId, password } = req.body;
  try {
    await sql.connect(config);
    const check = await sql.query(`SELECT * FROM Users WHERE EmployeeId = '${employeeId}'`);
    if (check.recordset.length > 0) {
      res.json({ success: false, message: 'Employee ID already exists!' });
    } else {
      await sql.query(`INSERT INTO Users (EmployeeId, Password, Role) VALUES ('${employeeId}', '${password}', 'user')`);
      res.json({ success: true });
    }
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.get('/admin/users', async (req, res) => {
  try {
    await sql.connect(config);
    const result = await sql.query(`SELECT Id, EmployeeId, Role FROM Users`);
    res.json(result.recordset);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.delete('/admin/users/:id', async (req, res) => {
  try {
    await sql.connect(config);
    await sql.query(`DELETE FROM Users WHERE Id = ${req.params.id}`);
    res.json({ success: true });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.get('/assets', async (req, res) => {
  try {
    await sql.connect(config);
    const result = await sql.query('SELECT * FROM Assets');
    res.json(result.recordset);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.post('/assets', async (req, res) => {
  const { category, item, total, instock, used, damaged, location } = req.body;
  try {
    await sql.connect(config);
    await sql.query(`INSERT INTO Assets (Category, Item, Total, Instock, Used, Damaged, Location) 
      VALUES ('${category}', '${item}', ${total}, ${instock}, ${used}, ${damaged}, '${location}')`);
    res.json({ message: 'Asset added!' });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.put('/assets/:id', async (req, res) => {
  const { category, item, total, instock, used, damaged, location } = req.body;
  try {
    await sql.connect(config);
    await sql.query(`UPDATE Assets SET 
      Category='${category}', Item='${item}', Total=${total}, 
      Instock=${instock}, Used=${used}, Damaged=${damaged}, Location='${location}'
      WHERE Id=${req.params.id}`);
    res.json({ message: 'Asset updated!' });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.delete('/assets/:id', async (req, res) => {
  try {
    await sql.connect(config);
    await sql.query(`DELETE FROM Assets WHERE Id = ${req.params.id}`);
    res.json({ message: 'Asset deleted!' });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.listen(5000, () => {
  console.log('Server running on port 5000');
});