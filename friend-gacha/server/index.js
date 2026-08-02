require('dotenv').config({ path: require('path').join(__dirname, '..', '.env') });

const express = require('express');
const http = require('http');
const { Server } = require('socket.io');
const cors = require('cors');
const path = require('path');
const jwt = require('jsonwebtoken');
const { JWT_SECRET, setAuthDb } = require('./middleware/auth');
const db = require('./db');
const hotRequire = require('./hotRequire');
const { initDb } = require('./db');

const app = express();
const server = http.createServer(app);
const io = new Server(server, { cors: { origin: '*' } });

const PORT = process.env.PORT || 3000;

// 미들웨어
app.use(cors());
app.use(express.json());

// API 라우트
app.use('/api/auth', require('./routes/auth'));
app.use('/api/gacha', require('./routes/gacha'));
app.use('/api/collection', require('./routes/collection'));
app.use('/api/trade', require('./routes/trade'));
app.use('/api/stage', require('./routes/stage'));
app.use('/api/raid', require('./routes/raid'));
app.use('/api/farming', require('./routes/farming'));
app.use('/api/story', require('./routes/story'));
app.use('/api/daily', require('./routes/daily'));
app.use('/api/growth', require('./routes/growth'));
app.use('/api/admin', require('./routes/admin'));
app.use('/api/mail', require('./routes/mail'));
app.use('/api/profile', require('./routes/profile'));

// 게임 설정 공유
app.get('/api/config', (req, res) => {
  res.json(require('../gameConfig.json'));
});

// 프리로드 (모든 캐릭터 이미지 URL)
app.get('/api/preload', (req, res) => {
  const chars = db.prepare('SELECT image_url, image_bust, image_sd, image_ld FROM characters WHERE is_released = 1').all();
  const urls = [];
  const sdUrls = [];
  for (const c of chars) {
    if (c.image_url) urls.push(c.image_url);
    if (c.image_bust) urls.push(c.image_bust);
    if (c.image_sd) { urls.push(c.image_sd); sdUrls.push(c.image_sd); }
    if (c.image_ld) urls.push(c.image_ld);
  }
  res.json({ urls, sdUrls });
});

// 대사 데이터
app.get('/api/dialogues', (req, res) => {
  res.json(hotRequire('dialogues'));
});

// 뽑기 로그 타임라인
app.get('/api/feed', (req, res) => {
  const feed = db.prepare(`
    SELECT pl.*, u.display_name, c.name as char_name, c.rarity, c.title
    FROM pull_log pl
    JOIN users u ON pl.user_id = u.id
    JOIN characters c ON pl.character_id = c.id
    ORDER BY pl.pulled_at DESC LIMIT 50
  `).all();
  res.json({ feed });
});

// API 에러 핸들러
app.use('/api', (err, req, res, next) => {
  console.error('[API 에러]', err.stack || err.message);
  res.status(500).json({ error: '서버 내부 오류가 발생했습니다' });
});

// 업로드 이미지 서빙
const uploadsDir = path.join(__dirname, '..', 'data', 'images');
app.use('/uploads', express.static(uploadsDir));

// 프로덕션: React 빌드 서빙
const clientBuild = path.join(__dirname, '..', 'client', 'dist');
app.use(express.static(clientBuild));
app.get('*', (req, res) => {
  if (!req.path.startsWith('/api')) {
    res.sendFile(path.join(clientBuild, 'index.html'));
  }
});

// ============ Socket.io ============

const onlineUsers = new Map();

io.use((socket, next) => {
  const token = socket.handshake.auth.token;
  if (!token) return next(new Error('인증 필요'));
  try {
    const decoded = jwt.verify(token, JWT_SECRET);
    const user = db.prepare('SELECT display_name, session_id FROM users WHERE id = ?').get(decoded.id);
    if (!user) return next(new Error('유저 없음'));
    if (decoded.sessionId && user.session_id && user.session_id !== decoded.sessionId) {
      return next(new Error('세션 만료'));
    }
    socket.userId = decoded.id;
    socket.sessionId = decoded.sessionId;
    socket.displayName = user.display_name;
    socket.username = decoded.username;
    next();
  } catch {
    next(new Error('인증 실패'));
  }
});

const chatHistory = [];
const CHAT_HISTORY_MAX = 20;

io.on('connection', (socket) => {
  const existingSocketId = onlineUsers.get(socket.userId);
  if (existingSocketId && existingSocketId !== socket.id) {
    const oldSocket = io.sockets.sockets.get(existingSocketId);
    if (oldSocket) {
      oldSocket.emit('session_kicked');
      oldSocket.disconnect(true);
    }
  }

  onlineUsers.set(socket.userId, socket.id);
  io.emit('online_users', Array.from(onlineUsers.keys()));
  console.log(`[Socket] ${socket.username} 접속 (현재 ${onlineUsers.size}명)`);

  const enrichHistory = () => {
    if (chatHistory.length === 0) return [];
    const userIds = [...new Set(chatHistory.map(m => m.userId))];
    const profiles = {};
    for (const uid of userIds) {
      const u = db.prepare('SELECT display_name, profile_icon FROM users WHERE id = ?').get(uid);
      if (u) profiles[uid] = { username: u.display_name, profileIcon: u.profile_icon || '' };
    }
    return chatHistory.map(m => ({
      ...m,
      username: profiles[m.userId]?.username || m.username,
      profileIcon: profiles[m.userId]?.profileIcon || '',
    }));
  };

  const enriched = enrichHistory();
  if (enriched.length > 0) {
    socket.emit('chat_history', enriched);
  }

  socket.on('request_chat_history', () => {
    const enriched = enrichHistory();
    if (enriched.length > 0) {
      socket.emit('chat_history', enriched);
    }
  });

  socket.on('chat_message', (data) => {
    const user = db.prepare('SELECT display_name, profile_icon FROM users WHERE id = ?').get(socket.userId);
    const msg = {
      userId: socket.userId,
      username: user ? user.display_name : socket.displayName,
      profileIcon: user ? (user.profile_icon || '') : '',
      text: (data.text || '').slice(0, 200).trim(),
      timestamp: Date.now()
    };
    if (msg.text) {
      chatHistory.push(msg);
      if (chatHistory.length > CHAT_HISTORY_MAX) chatHistory.shift();
      io.emit('chat_message', msg);
    }
  });

  socket.on('profile_update', () => {
    const user = db.prepare('SELECT display_name, profile_icon FROM users WHERE id = ?').get(socket.userId);
    if (user) {
      io.emit('user_profile_changed', {
        userId: socket.userId,
        username: user.display_name,
        profileIcon: user.profile_icon || '',
      });
    }
  });

  socket.on('pull_result', (data) => {
    const user = db.prepare('SELECT display_name FROM users WHERE id = ?').get(socket.userId);
    socket.broadcast.emit('someone_pulled', {
      userId: socket.userId,
      username: user?.display_name || socket.displayName || socket.username,
      ...data
    });
  });

  socket.on('trade_offer', (data) => {
    const targetSocket = onlineUsers.get(data.toUserId);
    if (targetSocket) {
      io.to(targetSocket).emit('trade_incoming', {
        fromUserId: socket.userId,
        fromUsername: socket.username,
        ...data
      });
    }
  });

  socket.on('trade_resolved', (data) => {
    const targetSocket = onlineUsers.get(data.targetUserId);
    if (targetSocket) {
      io.to(targetSocket).emit('trade_update', data);
    }
  });

  socket.on('disconnect', () => {
    onlineUsers.delete(socket.userId);
    io.emit('online_users', Array.from(onlineUsers.keys()));
    console.log(`[Socket] ${socket.username} 퇴장`);
  });
});

initDb().then(() => {
  setAuthDb(db);
  server.listen(PORT, '0.0.0.0', () => {
    console.log(`\n🎰 친구 가챠 서버 실행 중!`);
    console.log(`   로컬: http://localhost:${PORT}`);
    console.log(`   네트워크: http://0.0.0.0:${PORT}\n`);
  });
}).catch(err => {
  console.error('[DB] 초기화 실패:', err);
  process.exit(1);
});
