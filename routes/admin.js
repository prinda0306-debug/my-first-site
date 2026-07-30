const express = require('express');
const db = require('../db');
const { requireAdmin } = require('../lib/auth');

const router = express.Router();
const VALID_STATUSES = ['pending', 'confirmed', 'cancelled'];

router.get('/bookings', requireAdmin, (req, res) => {
  const rows = db
    .prepare(
      `SELECT bookings.*, users.name as user_name, users.email as user_email
       FROM bookings
       JOIN users ON users.id = bookings.user_id
       ORDER BY bookings.id DESC`
    )
    .all();
  res.json({ bookings: rows });
});

router.patch('/bookings/:id', requireAdmin, (req, res) => {
  const id = Number(req.params.id);
  const status = String((req.body && req.body.status) || '');

  if (!VALID_STATUSES.includes(status)) {
    return res.status(400).json({ error: '狀態不正確' });
  }

  db.prepare('UPDATE bookings SET status = ? WHERE id = ?').run(status, id);
  const booking = db.prepare('SELECT * FROM bookings WHERE id = ?').get(id);
  if (!booking) return res.status(404).json({ error: '找不到這筆預約' });

  res.json({ booking });
});

module.exports = router;
