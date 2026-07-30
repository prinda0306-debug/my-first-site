const express = require('express');
const path = require('path');
const fs = require('fs');
const { DatabaseSync } = require('node:sqlite');
const Anthropic = require('@anthropic-ai/sdk');

const anthropic = new Anthropic(); // reads ANTHROPIC_API_KEY from env

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

app.post('/api/summarize', async (req, res) => {
  const rows = db.prepare('SELECT name, message FROM messages ORDER BY id ASC LIMIT 200').all();

  if (!rows.length) {
    return res.json({ summary: '目前還沒有留言,快來當第一個留言的人吧！' });
  }

  const messagesText = rows.map((r) => `${r.name}: ${r.message}`).join('\n');

  try {
    const response = await anthropic.messages.create({
      model: 'claude-haiku-4-5',
      max_tokens: 300,
      messages: [
        {
          role: 'user',
          content: `以下是網站留言板上訪客們的留言,請用「繁體中文」寫「一句話」總結這些留言呈現出來的整體氛圍與重點,不要條列項目,只回傳這一句話本身:\n\n${messagesText}`,
        },
      ],
    });

    const textBlock = response.content.find((block) => block.type === 'text');
    res.json({ summary: textBlock ? textBlock.text.trim() : '' });
  } catch (err) {
    console.error('Summarize error:', err);
    if (err instanceof Anthropic.AuthenticationError) {
      return res.status(500).json({ error: '伺服器尚未設定 ANTHROPIC_API_KEY,請聯絡管理員。' });
    }
    if (err instanceof Anthropic.RateLimitError) {
      return res.status(429).json({ error: 'AI 服務忙碌中,請稍後再試。' });
    }
    res.status(500).json({ error: 'AI 總結失敗,請稍後再試。' });
  }
});

const port = process.env.PORT || 3000;
app.listen(port, () => {
  console.log(`Server running on port ${port}`);
});
