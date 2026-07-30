const express = require('express');
const path = require('path');
const fs = require('fs');
const { DatabaseSync } = require('node:sqlite');

const dataDir = path.join(__dirname, 'data');
if (!fs.existsSync(dataDir)) fs.mkdirSync(dataDir, { recursive: true });

const db = new DatabaseSync(path.join(dataDir, 'guestbook.db'));
db.exec(`
  CREATE TABLE IF NOT EXISTS messages (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    name TEXT NOT NULL,
    message TEXT NOT NULL,
    created_at TEXT NOT NULL DEFAULT (datetime('now'))
  )
`);

const app = express();
app.use(express.json());
app.use(express.static(path.join(__dirname, 'public')));

app.get('/api/messages', (req, res) => {
  const rows = db.prepare('SELECT id, name, message, created_at FROM messages ORDER BY id DESC LIMIT 200').all();
  res.json(rows);
});

app.post('/api/messages', (req, res) => {
  const name = String((req.body && req.body.name) || '').trim().slice(0, 50);
  const message = String((req.body && req.body.message) || '').trim().slice(0, 300);

  if (!name || !message) {
    return res.status(400).json({ error: '請輸入名字與留言內容' });
  }

  const info = db.prepare('INSERT INTO messages (name, message) VALUES (?, ?)').run(name, message);
  const row = db.prepare('SELECT id, name, message, created_at FROM messages WHERE id = ?').get(info.lastInsertRowid);
  res.status(201).json(row);
});

const port = process.env.PORT || 3000;
app.listen(port, () => {
  console.log(`Server running on port ${port}`);
});
