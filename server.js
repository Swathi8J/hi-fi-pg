'use strict';
require('dotenv').config();

const express  = require('express');
const cors     = require('cors');
const path     = require('path');
const multer   = require('multer');
const ExcelJS  = require('exceljs');
const mysql    = require('mysql2/promise');

const app  = express();
const PORT = process.env.PORT || 3000;

app.use(cors());
app.use(express.json({ limit: '20mb' }));
app.use(express.static(__dirname));

const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 10 * 1024 * 1024 }
});

// ── MySQL connection pool ──────────────────────────────────────
let pool;

async function initDB() {
  pool = mysql.createPool({
    host:     process.env.DB_HOST     || 'localhost',
    port:     process.env.DB_PORT     || 3306,
    user:     process.env.DB_USER     || 'root',
    password: process.env.DB_PASSWORD || '',
    database: process.env.DB_NAME     || 'hifi_pg',
    waitForConnections: true,
    connectionLimit:    10,
    queueLimit:         0
  });

  // Create database if not exists
  const tempConn = await mysql.createConnection({
    host:     process.env.DB_HOST     || 'localhost',
    port:     process.env.DB_PORT     || 3306,
    user:     process.env.DB_USER     || 'root',
    password: process.env.DB_PASSWORD || ''
  });
  await tempConn.query(`CREATE DATABASE IF NOT EXISTS \`${process.env.DB_NAME || 'hifi_pg'}\``);
  await tempConn.end();

  // Create students table
  await pool.query(`
    CREATE TABLE IF NOT EXISTS students (
      id                INT AUTO_INCREMENT PRIMARY KEY,
      location          VARCHAR(50)  NOT NULL DEFAULT 'Tumkur',
      pg_type           VARCHAR(10)  NOT NULL,
      name              VARCHAR(150) NOT NULL,
      phone             VARCHAR(15)  NOT NULL,
      address           TEXT         NOT NULL,
      room_number       VARCHAR(20)  NOT NULL,
      joining_date      DATE         NOT NULL,
      duration          INT          NOT NULL,
      rent              DECIMAL(10,2) NOT NULL,
      advance           DECIMAL(10,2) DEFAULT 0,
      advance_return    DECIMAL(10,2) DEFAULT 0,
      rent_paid         DECIMAL(10,2) DEFAULT 0,
      rent_remainder    DECIMAL(10,2) DEFAULT 0,
      outstanding       DECIMAL(10,2) DEFAULT 0,
      total_outstanding DECIMAL(10,2) DEFAULT 0,
      id_proof_name     VARCHAR(255),
      id_proof_type     VARCHAR(100),
      id_proof_data     LONGBLOB,
      admitted_on       VARCHAR(30),
      created_at        TIMESTAMP DEFAULT CURRENT_TIMESTAMP
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4
  `);

  console.log('');
  console.log('  MySQL DB ready: ' + (process.env.DB_NAME || 'hifi_pg'));
}

// ── ROUTES ────────────────────────────────────────────────────

// GET all students by location + pg_type
app.get('/api/students/:location/:pgType', async (req, res) => {
  try {
    const [rows] = await pool.query(
      'SELECT * FROM students WHERE location = ? AND pg_type = ? ORDER BY id DESC',
      [req.params.location, req.params.pgType]
    );
    // Convert BLOB to base64 data URL
    const result = rows.map(s => {
      if (s.id_proof_data && s.id_proof_type) {
        s.id_proof_data = 'data:' + s.id_proof_type + ';base64,' +
          Buffer.from(s.id_proof_data).toString('base64');
      }
      return s;
    });
    res.json(result);
  } catch (e) {
    console.error(e);
    res.status(500).json({ error: e.message });
  }
});

// POST add student
app.post('/api/students', upload.single('idProof'), async (req, res) => {
  try {
    const d    = req.body;
    const file = req.file;

    const [result] = await pool.query(
      `INSERT INTO students
        (location, pg_type, name, phone, address, room_number, joining_date, duration,
         rent, advance, advance_return, rent_paid, rent_remainder, outstanding,
         total_outstanding, id_proof_name, id_proof_type, id_proof_data, admitted_on)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [
        d.location    || 'Tumkur',
        d.pg_type,
        d.name,
        d.phone,
        d.address,
        d.room_number,
        d.joining_date,
        +d.duration,
        +d.rent,
        +(d.advance)         || 0,
        +(d.advance_return)  || 0,
        +(d.rent_paid)       || 0,
        +(d.rent_remainder)  || 0,
        +(d.outstanding)     || 0,
        +(d.total_outstanding) || 0,
        file ? file.originalname : null,
        file ? file.mimetype     : null,
        file ? file.buffer       : null,
        new Date().toLocaleDateString('en-IN')
      ]
    );
    res.json({ success: true, id: result.insertId });
  } catch (e) {
    console.error(e);
    res.status(500).json({ error: e.message });
  }
});

// DELETE student
app.delete('/api/students/:id', async (req, res) => {
  try {
    await pool.query('DELETE FROM students WHERE id = ?', [+req.params.id]);
    res.json({ success: true });
  } catch (e) {
    console.error(e);
    res.status(500).json({ error: e.message });
  }
});

// GET export Excel
app.get('/api/export/:location/:pgType', async (req, res) => {
  try {
    const { location, pgType } = req.params;
    const [list] = await pool.query(
      'SELECT * FROM students WHERE location = ? AND pg_type = ? ORDER BY id',
      [location, pgType]
    );

    const wb    = new ExcelJS.Workbook();
    wb.creator  = 'Hi-Fi PG Management';
    const label = (pgType === 'girls' ? 'Girls' : 'Boys') + ' PG';
    const ws    = wb.addWorksheet(label);
    const color = pgType === 'girls' ? 'FF6B21A8' : 'FF1E40AF';

    // Title row
    ws.mergeCells('A1:N1');
    const t = ws.getCell('A1');
    t.value = 'HI-FI ' + location.toUpperCase() + ' - ' + (pgType === 'girls' ? 'GIRLS' : 'BOYS') + ' PG STUDENT RECORDS';
    t.font  = { bold: true, size: 14, color: { argb: 'FFFFFFFF' } };
    t.fill  = { type: 'pattern', pattern: 'solid', fgColor: { argb: color } };
    t.alignment = { horizontal: 'center', vertical: 'middle' };
    ws.getRow(1).height = 34;

    // Generated date row
    ws.mergeCells('A2:N2');
    const d2 = ws.getCell('A2');
    d2.value = 'Generated: ' + new Date().toLocaleString('en-IN');
    d2.font  = { italic: true, size: 10, color: { argb: 'FF555555' } };
    d2.alignment = { horizontal: 'center' };
    ws.getRow(2).height = 18;

    // Header row
    const hdrs = [
      '#', 'Name', 'Phone', 'Address', 'Room', 'Joining Date', 'Duration (mo)',
      'Rent/mo (Rs)', 'Advance (Rs)', 'Adv.Return (Rs)', 'Rent Paid (Rs)',
      'Rent Remainder (Rs)', 'Outstanding (Rs)', 'Total Due (Rs)'
    ];
    const hr = ws.addRow(hdrs);
    hr.eachCell(cell => {
      cell.font      = { bold: true, color: { argb: 'FFFFFFFF' }, size: 10 };
      cell.fill      = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FF2B6CB0' } };
      cell.alignment = { horizontal: 'center', vertical: 'middle', wrapText: true };
      cell.border    = { top:{style:'thin'}, left:{style:'thin'}, bottom:{style:'thin'}, right:{style:'thin'} };
    });
    ws.getRow(3).height = 24;

    // Data rows
    list.forEach((s, i) => {
      const row = ws.addRow([
        i + 1, s.name, s.phone, s.address, s.room_number,
        s.joining_date ? new Date(s.joining_date).toLocaleDateString('en-IN') : '',
        +s.duration, +s.rent, +s.advance, +s.advance_return,
        +s.rent_paid, +s.rent_remainder, +s.outstanding, +s.total_outstanding
      ]);
      row.eachCell((cell, col) => {
        cell.fill      = { type:'pattern', pattern:'solid', fgColor:{ argb: i%2===0 ? 'FFF0F4FF' : 'FFFFFFFF' } };
        cell.border    = { top:{style:'thin',color:{argb:'FFE2E8F0'}}, left:{style:'thin',color:{argb:'FFE2E8F0'}}, bottom:{style:'thin',color:{argb:'FFE2E8F0'}}, right:{style:'thin',color:{argb:'FFE2E8F0'}} };
        cell.alignment = { vertical:'middle', wrapText: col === 4 };
        if (col >= 8) cell.numFmt = '#,##0.00';
        if (col === 14 && +s.total_outstanding > 0) cell.font = { bold:true, color:{ argb:'FFCC0000' } };
      });
      row.height = 18;
    });

    // Totals row
    if (list.length) {
      ws.addRow([]);
      const sum = ws.addRow([
        '', 'TOTALS', '', '', '', '', '',
        list.reduce((a,s) => a + (+s.rent), 0),
        list.reduce((a,s) => a + (+s.advance), 0),
        list.reduce((a,s) => a + (+s.advance_return), 0),
        list.reduce((a,s) => a + (+s.rent_paid), 0),
        list.reduce((a,s) => a + (+s.rent_remainder), 0),
        list.reduce((a,s) => a + (+s.outstanding), 0),
        list.reduce((a,s) => a + (+s.total_outstanding), 0)
      ]);
      sum.eachCell((cell, col) => {
        cell.font   = { bold: true, size: 11 };
        cell.fill   = { type:'pattern', pattern:'solid', fgColor:{ argb:'FFFFF3CD' } };
        cell.border = { top:{style:'medium'}, bottom:{style:'medium'} };
        if (col >= 8) cell.numFmt = '#,##0.00';
      });
    }

    ws.columns = [
      {width:5},{width:22},{width:14},{width:32},{width:8},
      {width:14},{width:13},{width:14},{width:14},{width:15},
      {width:13},{width:17},{width:17},{width:13}
    ];

    res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
    res.setHeader('Content-Disposition', `attachment; filename=HiFi_${location}_${pgType}_PG.xlsx`);
    await wb.xlsx.write(res);
    res.end();
  } catch (e) {
    console.error(e);
    res.status(500).json({ error: e.message });
  }
});

// ── START ─────────────────────────────────────────────────────
initDB().then(() => {
  app.listen(PORT, () => {
    console.log('  ================================');
    console.log('  Hi-Fi PG Management Server');
    console.log('  http://localhost:' + PORT);
    console.log('  ================================');
    console.log('');
  });
}).catch(err => {
  console.error('');
  console.error('  ❌ Failed to connect to MySQL!');
  console.error('  Check your .env file credentials.');
  console.error('  Error:', err.message);
  console.error('');
  process.exit(1);
});

