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

## 스킬/전투 설계 원칙

모든 스킬/특기 동작은 `Effect` 클래스 + `effectIds`로 구현한다. `extra` 키-값 핸들러는 레거시이며 신규 작성 금지.

### Effect 시스템 구조
- `client/src/battle/effects/` 하위 디렉토리별 자동 등록 (`import.meta.glob`)
- 각 Effect는 `static ID`를 가진 클래스, `registerEffect()`로 등록
- `runCalc(hookName, units, value, ctx)` — 값 변환 체인 (스탯, 코스트, 데미지 등)
- `runEvent(hookName, units, ctx)` — 이벤트 결과 수집 → `processResults()`로 일괄 적용
- `Effect.PRIORITY` (기본 0) — 높을수록 나중에 처리 (최종 결정권)

### Effect ID 범위
| 범위 | 용도 | 디렉토리 | 예시 |
|---|---|---|---|
| 1~99 | 패시브 | `effects/passive/` | ElementBoost(1), StatBoostPassive(16) |
| 101~199 | 트리거 (조건부 발동) | `effects/trigger/` | SkillUseStack(101), Prepare(127) |
| 136~199 | 특기 (캐릭터 고유) | `effects/talent/` | TagPartyAtkScaling(136), TauntDamageReduce(148) |
| 201~299 | 상태이상 | `effects/status/` | StatusSubmerge(201), StatusStorm(204) |
| 301~399 | 스킬 이펙트 | `effects/skill/` | SelfHealOnAttack(301), NoteSteal(326) |
| 401~499 | 버프/디버프 | `effects/buff/` | StatBuff(401), StatDebuff(402) |
| 501~599 | 스택 (자체 효과) | `effects/stack/` | StackTaunt(501), StackEcho(504) |

### 스킬에 effectIds 연결하기
`game_seed.json`의 스킬 `extra` 필드에 JSON으로 저장:
```json
"extra": "{\"effectIds\":[{\"id\":329,\"args\":[1.5]},{\"id\":330,\"args\":[1,3]}]}"
```
서버(`battle.js`)가 파싱하여 `skill.effectIds` 배열로 분리. args는 **인덱스 배열** (`[0, 1, 2]`), key-value 금지.

### 핵심 규칙
1. **extra 핸들러 신규 작성 금지** — 모든 스킬 동작은 effectIds + Effect 클래스로 구현
2. **다른 효과 = 다른 ID** — 보호막 부여와 도발 부여는 별도 Effect (329, 330)
3. **args는 인덱스 배열** — `this.params[0]`, `this.params[1]`로 접근. key-value 사용 금지
4. **modSkill 가드** — 스킬 Effect는 반드시 `modSkill?.id !== skill?.id` 체크로 자기 스킬에만 발동
5. **owner 가드** — `owner.id !== unit.id` 체크로 소유자만 발동 (파티 전체에 훅이 전파되므로)

### 스택 시스템
- **STACK_REGISTRY** (`battleActions.js`): 아이콘/이모지/CSS 클래스 등록 → UI 자동 표시
- **자체 효과 스택**: `mapStack(key, effectId)`로 등록, `getEffects()`가 combatStacks에서 자동 수집
- **카운터 전용 스택**: Effect 없이 데이터만 (다른 Effect가 값을 읽어서 사용)

### processResults 결과 타입 (주요)
| 키 | 타입 | 동작 |
|---|---|---|
| `combatStackUpdates` | `{key: value}` | 소유자 스택 갱신 |
| `partyStackUpdates` | `[{targetId, stacks}]` | 지정 아군 스택 갱신 |
| `partyHeal` | `[{unitId, amount}]` | 아군 HP 회복 |
| `partyNoteRestore` | `[{unitId, amount}]` | 아군 노트 회복 (maxNotes 캡) |
| `noteRecoverUncapped` | `number` | 소유자 노트 회복 (캡 없음, 누적) |
| `enemyNoteReduce` | `[{targetId, amount}]` | 적 노트 감소 |
| `enemyDamage` | `{targetId, damage, ...}` | 적 단일 피해 |
| `bonusDamage` | `[{targetId, damage}]` | 적 추가 피해 (다수) |
| `grantShield` | `number` | 소유자 보호막 |
| `partyShieldGrant` | `[{unitId, amount}]` | 지정 아군 보호막 |
| `selfCleanse` | `number` | 소유자 디버프 제거 |
| `selfHeal` | `number` | 소유자 HP 회복 |
| `repeatAttack` | `{attackerId, defenderId}` | 앵콜 (공격 1회 반복) |
| `log` / `logs` | `string` / `string[]` | 전투 로그 |

## 전투 상태 카테고리
새 메카닉 추가 시 아래 4가지 중 어디에 해당하는지 먼저 판단할 것:

| 카테고리 | 저장 위치 | 슬롯 제한 | 용도 | 예시 |
|---|---|---|---|---|
| **버프/디버프** | `unit.buffs[]` / `unit.debuffs[]` | 각 5슬롯 | 스탯 증감 (ATK/DEF/SPD %) | 견고(DEF+), 탈색(ATK-) |
| **전투 스택** | `unit.combatStacks` | 없음 | 카운터, 마킹, 플래그 | 환영, 도발, 앵콜, 파트너, 탈색 카운터 |
| **상태이상** | `unit.statuses[]` | 없음 | 지속 효과 (턴 기반 자동 소멸) | 수몰, 색 추출, 속성 취약 |
| **마크** | `unit.marks[]` | 없음 | 아군 행동 시 추가 피해 트리거 | 좌표 고정 |

- **버프/디버프**: `skillId` 기준 연장 판정. 같은 스킬 재시전 → 턴 합산 + 시전자/수치 갱신. 6번째 다른 스킬 → 가장 오래된 슬롯 밀림. `effectSystem.js`의 `attachBuff`/`attachDebuff` API 사용, `StatBuff`/`StatDebuff` Effect가 `modifyStat`으로 적용
- **전투 스택**: 키 이름 `_` 접두사 관례 (`_tauntStacks`, `_illusionStacks`). 사이클 종료 시 필요한 것만 수동 리셋
- **상태이상**: `statusKey`로 식별, `effects/` 디렉토리에 `Status*` 이펙트 클래스로 등록
- **보호막**: `unit.shield` (숫자). 데미지 흡수 → HP 이전에 소모. 버프/디버프 슬롯과 무관

## 코딩 컨벤션
- 한국어 주석/로그 사용
- CSS: BEM 아님, 컴포넌트별 .css 파일 (className 기반)
- HTML 엔티티 사용 (&#9998; 등) - 이모지 직접 사용 시 빌드 에러 가능성
- **레이아웃 1920px 기준**: 앱 전체 `width: 1920px; margin: 0 auto`. 모든 `position: fixed` 오버레이/모달도 `left: 50%; width: 1920px; transform: translateX(-50%)`로 맞출 것. `inset: 0` 사용 금지
- DB 쿼리: prepare().get/all/run 패턴
- API 응답: `{ error: '메시지' }` 또는 데이터 객체 직접 반환
