const express = require('express');
const bcrypt = require('bcryptjs');
const crypto = require('crypto');
const db = require('../db');
const { setSessionCookie, clearSessionCookie, requireAuth } = require('../lib/auth');
const { sendWelcomeEmail, sendPasswordResetEmail } = require('../lib/email');

const router = express.Router();
const ADMIN_EMAIL = (process.env.ADMIN_EMAIL || 'prinda0306@gmail.com').toLowerCase();
const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

function publicUser(u) {
  return { id: u.id, name: u.name, email: u.email, role: u.role };
}

router.post('/register', async (req, res) => {
  const name = String((req.body && req.body.name) || '').trim().slice(0, 50);
  const email = String((req.body && req.body.email) || '').trim().toLowerCase().slice(0, 100);
  const password = String((req.body && req.body.password) || '');

  if (!name || !email || !password) {
    return res.status(400).json({ error: '請填寫姓名、Email 與密碼' });
  }
  if (!EMAIL_PATTERN.test(email)) {
    return res.status(400).json({ error: 'Email 格式不正確' });
  }
  if (password.length < 8) {
    return res.status(400).json({ error: '密碼至少需要 8 個字元' });
  }

  const existing = db.prepare('SELECT id FROM users WHERE email = ?').get(email);
  if (existing) {
    return res.status(409).json({ error: '這個 Email 已經註冊過了' });
  }

  const passwordHash = bcrypt.hashSync(password, 10);
  const role = email === ADMIN_EMAIL ? 'admin' : 'user';
  const info = db
    .prepare('INSERT INTO users (name, email, password_hash, role) VALUES (?, ?, ?, ?)')
    .run(name, email, passwordHash, role);
  const user = db.prepare('SELECT id, name, email, role FROM users WHERE id = ?').get(info.lastInsertRowid);

  setSessionCookie(res, user);
  sendWelcomeEmail(user).catch((err) => console.error('welcome email failed', err));

  res.status(201).json({ user: publicUser(user) });
});

router.post('/login', (req, res) => {
  const email = String((req.body && req.body.email) || '').trim().toLowerCase();
  const password = String((req.body && req.body.password) || '');

  const user = db.prepare('SELECT * FROM users WHERE email = ?').get(email);
  if (!user || !bcrypt.compareSync(password, user.password_hash)) {
    return res.status(401).json({ error: 'Email 或密碼不正確' });
  }

  setSessionCookie(res, user);
  res.json({ user: publicUser(user) });
});

router.post('/logout', (req, res) => {
  clearSessionCookie(res);
  res.json({ ok: true });
});

router.get('/me', requireAuth, (req, res) => {
  const user = db.prepare('SELECT id, name, email, role FROM users WHERE id = ?').get(req.user.id);
  if (!user) return res.status(401).json({ error: '請先登入' });
  res.json({ user: publicUser(user) });
});

router.post('/forgot-password', (req, res) => {
  const email = String((req.body && req.body.email) || '').trim().toLowerCase();
  const genericMsg = { message: '如果這個 Email 有註冊帳號,重設密碼信件已經寄出,請至信箱查收。' };

  const user = db.prepare('SELECT * FROM users WHERE email = ?').get(email);
  if (!user) {
    return res.json(genericMsg);
  }

  const token = crypto.randomBytes(32).toString('hex');
  const tokenHash = crypto.createHash('sha256').update(token).digest('hex');
  const expiresAt = new Date(Date.now() + 60 * 60 * 1000).toISOString();

  db.prepare('INSERT INTO password_resets (user_id, token_hash, expires_at) VALUES (?, ?, ?)').run(
    user.id,
    tokenHash,
    expiresAt
  );

  const baseUrl = process.env.PUBLIC_URL || `${req.protocol}://${req.get('host')}`;
  const resetUrl = `${baseUrl}/reset-password.html?token=${token}`;

  sendPasswordResetEmail(user, resetUrl).catch((err) => console.error('reset email failed', err));

  res.json(genericMsg);
});

router.post('/reset-password', (req, res) => {
  const token = String((req.body && req.body.token) || '');
  const password = String((req.body && req.body.password) || '');

  if (!token || !password) {
    return res.status(400).json({ error: '缺少必要參數' });
  }
  if (password.length < 8) {
    return res.status(400).json({ error: '密碼至少需要 8 個字元' });
  }

  const tokenHash = crypto.createHash('sha256').update(token).digest('hex');
  const record = db.prepare('SELECT * FROM password_resets WHERE token_hash = ? AND used = 0').get(tokenHash);

  if (!record || new Date(record.expires_at).getTime() < Date.now()) {
    return res.status(400).json({ error: '重設密碼連結無效或已過期,請重新申請。' });
  }

  const passwordHash = bcrypt.hashSync(password, 10);
  db.prepare('UPDATE users SET password_hash = ? WHERE id = ?').run(passwordHash, record.user_id);
  db.prepare('UPDATE password_resets SET used = 1 WHERE id = ?').run(record.id);

  res.json({ message: '密碼已重設,請重新登入。' });
});

module.exports = router;
