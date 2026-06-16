const express = require('express');
const http = require('http');
const { Server } = require('socket.io');
const cors = require('cors');
const path = require('path');
const jwt = require('jsonwebtoken');
const { JWT_SECRET } = require('./middleware/auth');
const db = require('./db');
const { initDb } = require('./db');

const app = express();
const server = http.createServer(app);
const io = new Server(server, { cors: { origin: '*' } });

const PORT = process.env.PORT || 3000;

// 미들웨어
app.use(cors());
app.use(express.json());

// API 라우트 (initDb 이후에 등록되지만, 라우트 핸들러는 요청 시점에 실행되므로 OK)
app.use('/api/auth', require('./routes/auth'));
app.use('/api/gacha', require('./routes/gacha'));
app.use('/api/collection', require('./routes/collection'));
app.use('/api/trade', require('./routes/trade'));
app.use('/api/stage', require('./routes/stage'));
app.use('/api/raid', require('./routes/raid'));
app.use('/api/daily', require('./routes/daily'));
app.use('/api/growth', require('./routes/growth'));
app.use('/api/admin', require('./routes/admin'));

// 게임 설정 공유 (클라이언트에서도 참조)
app.get('/api/config', (req, res) => {
  res.json(require('../gameConfig.json'));
});

// 재화 지급 (매일 로그인 보너스 대용 - 수동)
app.post('/api/admin/give-currency', (req, res) => {
  const { amount, secret } = req.body;
  if (secret !== 'gacha-admin') return res.status(403).json({ error: 'ㄴㄴ' });
  db.prepare('UPDATE users SET currency = currency + ?').run(amount || 500);
  res.json({ ok: true, message: `모든 유저에게 ${amount || 500} 지급 완료` });
});

// 뽑기 로그 타임라인 (최근 50개)
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

// 업로드 이미지 서빙 (data/images/ → /uploads/)
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

// ============ Socket.io (실시간 알림) ============

const onlineUsers = new Map(); // userId -> socketId

io.use((socket, next) => {
  const token = socket.handshake.auth.token;
  if (!token) return next(new Error('인증 필요'));
  try {
    const decoded = jwt.verify(token, JWT_SECRET);
    socket.userId = decoded.id;
    socket.username = decoded.username;
    next();
  } catch {
    next(new Error('인증 실패'));
  }
});

io.on('connection', (socket) => {
  onlineUsers.set(socket.userId, socket.id);
  io.emit('online_users', Array.from(onlineUsers.keys()));
  console.log(`[Socket] ${socket.username} 접속 (현재 ${onlineUsers.size}명)`);

  // 뽑기 결과 브로드캐스트
  socket.on('pull_result', (data) => {
    socket.broadcast.emit('someone_pulled', {
      userId: socket.userId,
      username: socket.username,
      ...data
    });
  });

  // 트레이드 알림
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

// sql.js는 비동기 초기화 필요 → DB 준비 후 서버 시작
initDb().then(() => {
  server.listen(PORT, '0.0.0.0', () => {
    console.log(`\n🎰 친구 가챠 서버 실행 중!`);
    console.log(`   로컬: http://localhost:${PORT}`);
    console.log(`   네트워크: http://0.0.0.0:${PORT}\n`);
  });
}).catch(err => {
  console.error('[DB] 초기화 실패:', err);
  process.exit(1);
});
