const jwt = require('jsonwebtoken');

const JWT_SECRET = process.env.JWT_SECRET || 'friend-gacha-secret-key-change-me';

let _db = null;
function setAuthDb(db) { _db = db; }

function authMiddleware(req, res, next) {
  const token = req.headers.authorization?.split(' ')[1];
  if (!token) return res.status(401).json({ error: '로그인이 필요합니다' });

  try {
    const decoded = jwt.verify(token, JWT_SECRET);

    if (_db) {
      const user = _db.prepare('SELECT id, username FROM users WHERE id = ?').get(decoded.id);
      if (!user || user.username !== decoded.username) {
        return res.status(401).json({ error: '유효하지 않은 토큰입니다. 다시 로그인해주세요.' });
      }
    }

    req.user = decoded;
    next();
  } catch {
    return res.status(401).json({ error: '토큰이 만료되었습니다' });
  }
}

function generateToken(user) {
  return jwt.sign({ id: user.id, username: user.username }, JWT_SECRET, { expiresIn: '7d' });
}

module.exports = { authMiddleware, generateToken, setAuthDb, JWT_SECRET };
