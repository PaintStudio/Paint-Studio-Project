# 친구 가챠 🎰

친구들 내수용 소셜 가챠 게임. 친구들을 캐릭터화해서 뽑고, 교환하고, 경쟁하자!

## 기능

- **가챠 뽑기** — 1회/10연차, 등급별 확률(N 50% / R 35% / SR 13% / SSR 2%), 천장 90연차
- **도감** — 수집한 캐릭터 컬렉션, 도감 달성률
- **교환** — 친구끼리 캐릭터 트레이드
- **실시간 피드** — 누가 뭘 뽑았는지 실시간 알림
- **랭킹** — 도감 수집률/SSR 보유량 순위

## 실행 방법

### 1. 설치
```bash
cd friend-gacha
npm install
cd client && npm install && cd ..
```

### 2. 클라이언트 빌드
```bash
cd client && npx vite build && cd ..
```

### 3. 서버 실행
```bash
npm start
```

브라우저에서 `http://localhost:3000` 접속.

### 4. 개발 모드 (핫 리로드)
```bash
npm run dev
```
프론트: `http://localhost:5173` / 백엔드: `http://localhost:3000`

## 친구들 접속 방법

### 같은 와이파이
내 로컬 IP 확인 (`ipconfig` → IPv4 주소) → 친구가 `http://192.168.x.x:3000` 접속

### 외부 접속 (ngrok)
```bash
npx ngrok http 3000
```
생성된 URL 공유하면 끝.

## 재화 지급 (관리자)

모든 유저에게 재화 뿌리기:
```bash
curl -X POST http://localhost:3000/api/admin/give-currency \
  -H "Content-Type: application/json" \
  -d '{"amount": 500, "secret": "gacha-admin"}'
```

## 커스터마이징

### 캐릭터 추가/수정
`server/db.js`의 `seedCharacters` 배열 수정 후 `data/gacha.db` 삭제하고 서버 재시작.

### 확률 조정
`server/routes/gacha.js`의 `RATES` 객체 수정.

## 기술 스택
- **백엔드**: Node.js + Express + SQLite + Socket.io
- **프론트엔드**: React + Vite (PWA)
