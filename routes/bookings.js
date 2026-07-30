const express = require('express');
const db = require('../db');
const { requireAuth } = require('../lib/auth');
const { sendBookingConfirmationEmail, sendBookingAdminNotification } = require('../lib/email');

const router = express.Router();
const ADMIN_EMAIL = process.env.ADMIN_EMAIL || 'prinda0306@gmail.com';

router.post('/', requireAuth, (req, res) => {
  const service = String((req.body && req.body.service) || '').trim().slice(0, 100);
  const preferredDate = String((req.body && req.body.preferred_date) || '').trim().slice(0, 50);
  const note = String((req.body && req.body.note) || '').trim().slice(0, 300);

  if (!service || !preferredDate) {
    return res.status(400).json({ error: '請選擇服務項目與希望日期' });
  }

  const info = db
    .prepare('INSERT INTO bookings (user_id, service, preferred_date, note) VALUES (?, ?, ?, ?)')
    .run(req.user.id, service, preferredDate, note);
  const booking = db.prepare('SELECT * FROM bookings WHERE id = ?').get(info.lastInsertRowid);
  const user = db.prepare('SELECT id, name, email, role FROM users WHERE id = ?').get(req.user.id);

  sendBookingConfirmationEmail(user, booking).catch((err) => console.error('booking confirm email failed', err));
  sendBookingAdminNotification(ADMIN_EMAIL, user, booking).catch((err) =>
    console.error('booking admin email failed', err)
  );

  res.status(201).json({ booking });
});

router.get('/me', requireAuth, (req, res) => {
  const rows = db.prepare('SELECT * FROM bookings WHERE user_id = ? ORDER BY id DESC').all(req.user.id);
  res.json({ bookings: rows });
});

module.exports = router;
