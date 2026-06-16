const express = require('express');
const bcrypt = require('bcryptjs');
const db = require('../db');
const { generateToken, authMiddleware } = require('../middleware/auth');

const router = express.Router();

// 회원가입
router.post('/register', (req, res) => {
  const { username, password, displayName } = req.body;
  if (!username || !password) return res.status(400).json({ error: '아이디와 비밀번호를 입력하세요' });

  const exists = db.prepare('SELECT id FROM users WHERE username = ?').get(username);
  if (exists) return res.status(409).json({ error: '이미 존재하는 아이디입니다' });

  const hash = bcrypt.hashSync(password, 10);
  const name = displayName || username;
  const result = db.prepare('INSERT INTO users (username, password_hash, display_name) VALUES (?, ?, ?)').run(username, hash, name);

  const user = db.prepare('SELECT id, username, display_name, currency FROM users WHERE id = ?').get(result.lastInsertRowid);
  const token = generateToken(user);

  res.json({ token, user: { id: user.id, username: user.username, displayName: user.display_name, currency: user.currency } });
});

// 로그인
router.post('/login', (req, res) => {
  const { username, password } = req.body;
  const user = db.prepare('SELECT * FROM users WHERE username = ?').get(username);
  if (!user || !bcrypt.compareSync(password, user.password_hash)) {
    return res.status(401).json({ error: '아이디 또는 비밀번호가 틀렸습니다' });
  }

  const token = generateToken(user);
  res.json({
    token,
    user: { id: user.id, username: user.username, displayName: user.display_name, currency: user.currency, totalPulls: user.total_pulls }
  });
});

// 내 정보
router.get('/me', authMiddleware, (req, res) => {
  const user = db.prepare('SELECT id, username, display_name, currency, total_pulls, pity_counter FROM users WHERE id = ?').get(req.user.id);
  if (!user) return res.status(404).json({ error: '유저를 찾을 수 없습니다' });
  res.json({
    id: user.id, username: user.username, displayName: user.display_name,
    currency: user.currency, totalPulls: user.total_pulls, pityCounter: user.pity_counter
  });
});

module.exports = router;
