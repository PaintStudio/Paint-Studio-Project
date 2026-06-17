# Friend Gacha - 소셜 가챠 웹게임

## 프로젝트 개요
친구들 내수용 소셜 가챠 RPG 웹게임. PWA 지원.

## 기술 스택
- **백엔드**: Node.js + Express, sql.js (SQLite in-memory + 파일 저장), Socket.io (실시간 채팅/알림), JWT 인증
- **프론트엔드**: React 18 + Vite 5, PWA (manifest + service worker)
- **DB**: sql.js with DatabaseWrapper 클래스 (Proxy 패턴으로 lazy init, better-sqlite3 호환 API)

## 실행 방법
```bash
npm start          # 서버만 (프로덕션, client/dist 서빙)
npm run dev        # 서버 + Vite dev 동시 실행
npm run build      # 클라이언트 빌드
```
서버 포트: 3000

## 프로젝트 구조
```
friend-gacha/
├── server/
│   ├── index.js          # Express + Socket.io 메인
│   ├── db.js             # sql.js DatabaseWrapper + 테이블/시드/마이그레이션 (~700줄)
│   ├── battle.js         # Turn Note 기반 전투 엔진
│   ├── middleware/
│   │   └── auth.js       # JWT 인증 미들웨어
│   └── routes/
│       ├── auth.js       # 회원가입/로그인/내정보
│       ├── gacha.js      # 1회/10연차 뽑기, 배너별 분기
│       ├── collection.js # 인벤토리/컬렉션
│       ├── trade.js      # 유저간 교환
│       ├── stage.js      # 스테이지 전투
│       ├── raid.js       # 레이드 전투
│       ├── daily.js      # 일일 미션/로그인 보상
│       ├── growth.js     # 캐릭터 육성 (레벨업/각성/스킬장착)
│       ├── admin.js      # 어드민 (캐릭터/배너 관리, 이미지 업로드)
│       ├── mail.js       # 우편함 시스템
│       └── profile.js    # 프로필 CRUD (닉네임/소개/아이콘)
├── client/
│   ├── src/
│   │   ├── App.jsx       # 라우팅 + 인증 상태 관리
│   │   ├── utils/
│   │   │   ├── api.js    # fetch 래퍼 (모든 API 엔드포인트)
│   │   │   └── socket.js # Socket.io 클라이언트
│   │   ├── components/
│   │   │   ├── CharacterCard.jsx
│   │   │   ├── CharacterDetail.jsx
│   │   │   ├── BottomNav.jsx
│   │   │   └── ProfileModal.jsx   # 프로필 편집 모달
│   │   └── pages/
│   │       ├── LobbyPage.jsx      # 메인 로비 (대표캐릭터 + 프로필)
│   │       ├── GachaPage.jsx      # 가챠 뽑기
│   │       ├── CollectionPage.jsx # 컬렉션/인벤토리
│   │       ├── SocialPage.jsx     # 소셜 (채팅/교환/랭킹/피드)
│   │       ├── BattlePage.jsx     # 인터랙티브 전투
│   │       ├── StagePage.jsx      # 스테이지 선택
│   │       └── AdminPage.jsx      # 어드민 페이지
│   └── vite.config.js
├── gameConfig.json       # 게임 설정 (레어도/속성/근원/가챠확률 등)
├── gachaBanners.json     # 배너 정의 (상시/한정)
├── data/                 # DB 파일 + 업로드 이미지
└── GAME_DESIGN.md        # 게임 시스템 설계서
```

## DB 구조 (server/db.js)
### 주요 테이블
- `users`: id, username, password_hash, display_name, currency, gold, stamina, total_pulls, pity_counter, representative_inventory_id, bio, profile_icon
- `characters`: id, name, rarity, element, origin, title, description, image_url/bust/sd/ld, quote, base_hp/atk/def/spd, turn_notes
- `skills`: id, name, type(attack/defense/ultimate/heal/buff/debuff/support), rarity(faint/pale/deep/iridescent), cost, power, element, target
- `character_skills`: 캐릭터-스킬 매핑 (is_default, is_fixed)
- `inventory`: 유저 보유 캐릭터 (level, exp, awakening)
- `skill_inventory`: 유저 보유 스킬
- `equipped_skills`: 캐릭터별 장착 스킬
- `trades`, `pull_log`, `stages`, `stage_clears`, `raids`, `raid_entries`, `daily_missions`, `mail`

### 마이그레이션 패턴
```js
try {
  db.prepare("SELECT column FROM table LIMIT 1").get();
} catch {
  db.exec("ALTER TABLE table ADD COLUMN column TYPE DEFAULT value");
}
```

## 게임 시스템
- **레어도**: N → R → SR → SSR → CR (무지개)
- **속성**: fire, water, wind, light, dark + neutral
- **근원(origin)**: force, life, season, memory, sound, time, space, intellect, heart
- **가챠**: 천장 90회, 배너별 확률 분기
- **전투**: Turn Note 시스템 (노트 수만큼 스킬 배치 → 자동 실행)
- **프로필**: 닉네임(1-20자) + 한줄소개(100자) + 아이콘(보유 캐릭터 포트레이트)

## JWT 토큰
`{ id, username }` 저장. display_name은 토큰에 없으므로 DB에서 조회해야 함.

## Socket.io 이벤트
- `chat_message`: 채팅 (display_name + profile_icon DB 실시간 조회)
- `pull_result` / `someone_pulled`: SR 이상 뽑기 알림
- `trade_offer` / `trade_incoming` / `trade_resolved` / `trade_update`: 교환
- `online_users`: 접속자 목록

## Vite 설정
- `@gameConfig` alias → `../../gameConfig.json`
- PWA: VitePWA 플러그인
- 빌드 출력: `client/dist/`

## 현재 상태 (2026-06-17)

### 완료된 기능
- 회원가입/로그인, 가챠(1회/10연차, 배너별), 컬렉션, 캐릭터 상세, 교환
- Turn Note 전투 시스템, 스테이지(5챕터x8스테이지), 레이드
- 캐릭터 육성 (레벨업/각성/스킬장착), 일일미션/로그인보상
- 어드민 (캐릭터CRUD/이미지업로드/배너관리)
- 소셜 탭 (실시간채팅/교환/랭킹/피드), 우편함
- 유저 프로필 시스템 (닉네임/소개/아이콘 편집, 채팅에 프로필 반영)
- 로비 페이지 (대표캐릭터 LD 이미지, 재화바, 알림)

### 미완료/예정 작업
- 스킬 가챠 API + 스킬 장착/해제 API 리워크 (skill_inventory 기반으로 전환)
- 어드민 UI에 스킬 관리 섹션 추가
- 스킬 가챠 클라이언트 UI

## 코딩 컨벤션
- 한국어 주석/로그 사용
- CSS: BEM 아님, 컴포넌트별 .css 파일 (className 기반)
- HTML 엔티티 사용 (&#9998; 등) - 이모지 직접 사용 시 빌드 에러 가능성
- DB 쿼리: prepare().get/all/run 패턴
- API 응답: `{ error: '메시지' }` 또는 데이터 객체 직접 반환
