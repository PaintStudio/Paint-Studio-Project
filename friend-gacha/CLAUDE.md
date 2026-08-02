# Friend Gacha - 소셜 가챠 웹게임

## 프로젝트 개요
친구들 내수용 소셜 가챠 RPG 웹게임. PWA 지원.

## 기술 스택
- **백엔드**: Node.js + Express, sql.js (SQLite in-memory + 파일 저장), Socket.io (실시간 채팅/알림), JWT 인증
- **프론트엔드**: React 18 + Vite 5, PWA (manifest + service worker)
- **DB**: sql.js with DatabaseWrapper 클래스 (Proxy 패턴으로 lazy init, better-sqlite3 호환 API)
- **인증**: JWT (`.env`의 `JWT_SECRET`), 어드민은 `ADMIN_PASSWORD` 환경변수 + `x-admin-key` 헤더

## 실행 방법
```bash
npm start          # 서버만 (프로덕션, client/dist 서빙)
npm run dev        # 서버 + Vite dev 동시 실행
npm run build      # 클라이언트 빌드 (friend-gacha/client/ 에서 실행)
```
- 서버 포트: 3000, Vite dev: 5173 (→ 3000으로 프록시)
- **빌드 디렉토리 주의**: `npm run build`는 반드시 `friend-gacha/client/` 에서 실행. `friend-gacha/`에서 실행 시 `UNRESOLVED_ENTRY` 에러

## 환경 변수 (.env)
```
JWT_SECRET=...         # JWT 서명 키
ADMIN_PASSWORD=...     # 어드민 인증 비밀번호 (없으면 서버 시작 불가 — process.exit(1))
PORT=3000              # 서버 포트
```
`.env`는 `.gitignore`에 포함됨. 절대 하드코딩하지 말 것.

## 프로젝트 구조
```
friend-gacha/
├── server/
│   ├── index.js          # Express + Socket.io 메인, 정적 파일 서빙
│   ├── db.js             # sql.js DatabaseWrapper + 테이블/시드/마이그레이션
│   ├── battle.js         # Turn Note 기반 전투 엔진 (createUnit, createBattleSetup, validateBattleResult, calcStats)
│   ├── battleUtils.js    # 전투 공유 유틸 (buildPartyUnits, collectTagCounts, buildEnemyFromMonster, giveItem, processDrops)
│   ├── hotRequire.js     # data 파일 핫리로드 유틸 (require 캐시 무효화)
│   ├── middleware/
│   │   └── auth.js       # JWT 인증 미들웨어 (authMiddleware)
│   └── routes/
│       ├── auth.js       # 회원가입/로그인/내정보
│       ├── gacha.js      # 캐릭터/스킬 가챠, 배너 관리 (loadBanners/saveBanners export)
│       ├── collection.js # 인벤토리/컬렉션 상세
│       ├── trade.js      # 유저간 교환
│       ├── stage.js      # 스테이지 전투 + 공유 유틸 export (refreshStamina, deductStamina, addExp, calcLevelUp, addAccountExp, progressMission)
│       ├── raid.js       # 레이드 (주간 보스, 랭킹, 정산)
│       ├── farming.js    # 파밍 던전 (요일별 개방, 해금 조건)
│       ├── story.js      # 스토리 (노드/스크립트/게스트 시스템)
│       ├── daily.js      # 일일 미션/로그인 보상/스태미나 갱신
│       ├── growth.js     # 캐릭터 육성 (레벨업/각성/스킬장착/승급)
│       ├── admin.js      # 어드민 CRUD 전체 (saveImageFile, saveJsModule 공유)
│       ├── mail.js       # 우편함 시스템
│       └── profile.js    # 프로필 CRUD (닉네임/소개/아이콘)
├── client/
│   ├── src/
│   │   ├── App.jsx       # 라우팅 + 인증 상태 관리 + PC/모바일 분기
│   │   ├── hooks/
│   │   │   ├── usePartyPresets.js  # 파티 프리셋 공유 훅
│   │   │   └── useIsMobile.js     # 모바일 감지 훅
│   │   ├── utils/
│   │   │   ├── api.js            # fetch 래퍼 (모든 API 엔드포인트)
│   │   │   ├── socket.js         # Socket.io 클라이언트
│   │   │   ├── gameConstants.js  # 게임 상수/유틸 (색상, 라벨, 스타일, timeAgo 등)
│   │   │   ├── bgm.js            # BGM 재생 관리
│   │   │   ├── toast.js          # 토스트 알림
│   │   │   ├── dialogues.js      # 대사 데이터 로더
│   │   │   └── skillEffects.js   # 스킬 이펙트 텍스트 표시
│   │   ├── battle/
│   │   │   ├── battleActions.js  # 턴 실행 로직, STACK_REGISTRY
│   │   │   ├── effectSystem.js   # Effect 훅 실행 (runCalc, runEvent, processResults, attachBuff/attachDebuff)
│   │   │   ├── modSystem.js      # 스탯 수정자 시스템
│   │   │   └── effects/          # Effect 클래스 (passive/, trigger/, talent/, status/, skill/, buff/, stack/)
│   │   ├── components/           # 공유 컴포넌트 (PresetPicker, CharacterCard, CharacterGrid, ProfileModal 등)
│   │   ├── pages/                # PC 페이지 (LobbyPage, GachaPage, CollectionPage 등)
│   │   │   └── mobile/           # 모바일 페이지 (MobileLobbyPage, MobileGachaPage 등)
│   │   └── styles/
│   │       ├── global.css        # CSS 변수, 공통 클래스 (.btn-back, .empty-msg, rarity-bg-*)
│   │       └── app.css           # 앱 레이아웃
│   └── vite.config.js            # @gameConfig alias, API 프록시
├── gameConfig.json       # 게임 설정 (레어도/속성/근원/가챠확률/육성수치 등)
├── gachaBanners.json     # 캐릭터 배너 정의 (상시/한정)
├── data/
│   ├── game_seed.json    # 캐릭터/스킬 시드 데이터 (없으면 서버 시작 불가)
│   ├── gacha.db          # SQLite DB 파일 (.gitignore)
│   ├── items.js          # 아이템 정의 (어드민에서 자동 생성)
│   ├── talents.js        # 특기 정의
│   ├── promotions.js     # 승급 정의
│   ├── dialogues.js      # 대사 정의
│   ├── lore.js           # 로어/배경 스토리
│   ├── stages.js         # 스테이지 정의
│   ├── farming_dungeons.js # 파밍 던전 정의
│   ├── raid_bosses.js    # 레이드 보스 정의
│   ├── monsters.js       # 몬스터 정의
│   └── images/           # 업로드 이미지 (characters/, skills/, banners/, items/, monsters/, bg/, icons/, origins/, standings/)
└── GAME_DESIGN.md        # 게임 시스템 설계서
```

## DB 구조 (server/db.js)
### 주요 테이블
- `users`: id, username, password_hash, display_name, currency, gold, stamina, stamina_updated_at, total_pulls, pity_counter, login_streak, representative_inventory_id, bio, profile_icon, tutorial_done, tutorial_step, account_level, account_exp
- `characters`: id, name, rarity, element, origin, title, description, image_url/bust/sd/ld, quote, base_hp/atk/def/spd, turn_notes, attack_slots, defense_slots, is_limited, is_released
- `skills`: id, name, type(attack/defense/ultimate/heal/buff/debuff/support), rarity(faint/pale/deep/iridescent), cost, power, element, target, icon, extra(JSON — effectIds 포함)
- `character_skills`: 캐릭터-스킬 매핑 (is_default, is_fixed, awakening_required)
- `inventory`: 유저 보유 캐릭터 (level, exp, awakening, promotion, equipped_talent)
- `skill_inventory`: 유저 보유 스킬 (user_id, skill_id)
- `equipped_skills`: 캐릭터별 장착 스킬 (inventory_id, skill_id, slot_number)
- `stages`, `stage_clears`: 스테이지 정의 및 클리어 기록
- `story_nodes`, `story_clears`: 스토리 노드 및 클리어 기록
- `monsters`, `monster_tags`: 몬스터 정의 및 태그
- `tags`, `character_tags`: 태그 시스템
- `raids`, `raid_entries`: 레이드 정의 및 참여 기록
- `trades`, `pull_log`, `daily_missions`, `mail`, `user_items`, `party_presets`

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
- **가챠**: 천장 90회, 배너별 확률 분기 (캐릭터/스킬 별도)
- **전투**: Turn Note 시스템 (노트 수만큼 스킬 배치 → 자동 실행)
- **육성**: 레벨업(경험치 아이템) → 각성(재료) → 승급(promotion) → 스킬 장착/교체
- **경험치 공식**: `needed = level * level * 10 + level * 50`
- **프로필**: 닉네임(1-20자) + 한줄소개(100자) + 아이콘(보유 캐릭터 포트레이트)

## JWT 토큰
`{ id, username }` 저장. display_name은 토큰에 없으므로 DB에서 조회해야 함.

## 어드민 인증
- 헤더: `x-admin-key: <ADMIN_PASSWORD>` (모든 어드민 API 요청에 필요)
- 스킬 effectIds 업데이트: `PUT /api/admin/skills/:id` — effectIds는 `extra` 필드 안에 JSON으로 저장
- AdminPage.jsx의 `req()` 함수가 `X-Admin-Key` 헤더를 자동 추가

## Socket.io 이벤트
- `chat_message`: 채팅 (display_name + profile_icon DB 실시간 조회)
- `pull_result` / `someone_pulled`: SR 이상 뽑기 알림
- `trade_offer` / `trade_incoming` / `trade_resolved` / `trade_update`: 교환
- `online_users`: 접속자 목록

## Vite 설정
- `@gameConfig` alias → `../../gameConfig.json` (클라이언트에서 `import gameConfig from '@gameConfig'`)
- Proxy: `/api` → `http://localhost:3000`, `/socket.io` → ws
- 빌드 출력: `client/dist/`

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
- DB 쿼리: `prepare().get/all/run` 패턴
- API 응답: `{ error: '메시지' }` 또는 데이터 객체 직접 반환
- **Windows 환경**: curl로 한국어 포함 요청 시 UTF-8 깨짐 → Node.js http 모듈 사용

### 레이아웃 규칙
- **PC**: `#game-root` 1920x1080px 고정, `transform: scale()`로 뷰포트 맞춤
  - 내부에서 `position: fixed` 사용 금지 → `position: absolute` 사용
  - `vw`/`vh`/`dvh` 단위 금지 → `px` 사용
  - `inset: 0` 사용 금지
- **모바일**: `pages/mobile/` 별도 컴포넌트, PC 레이아웃 제약 면제
- App.jsx에서 `useIsMobile()` 훅으로 PC/모바일 분기

## 공유 모듈 가이드 (중복 방지)
새 기능 추가 시 아래 공유 모듈을 **먼저 확인**하고, 이미 있는 것을 다시 만들지 말 것.

### 서버 공유 유틸
| 모듈 | 함수 | 용도 | 사용처 |
|---|---|---|---|
| `battleUtils.js` | `buildPartyUnits(userId, partyIds)` | 인벤토리 → 전투 유닛 생성 | stage, raid, farming, story |
| | `collectTagCounts(partyUnits)` | 파티 태그 집계 | stage, raid, farming, story |
| | `buildEnemyFromMonster(e, idx, prefix)` | 몬스터 DB → 적 유닛 생성 | farming, story |
| | `giveItem(userId, itemId, qty)` | 아이템 upsert (ON CONFLICT) | stage, farming |
| | `processDrops(userId, enemyData)` | 드랍 처리 | stage, farming |
| `hotRequire.js` | `hotRequire(path)` | data 파일 핫리로드 (require 캐시 무효화) | admin, growth, collection, battle, index |
| `routes/stage.js` | `refreshStamina(userId)` | 스태미나 시간 회복 | stage, farming, daily |
| | `deductStamina(userId, cost)` | 스태미나 체크+차감 (에러 객체 반환) | stage, farming |
| | `calcLevelUp(level, exp, added, max)` | 순수 레벨업 계산 (DB 미접근) | stage(addExp), growth |
| | `addExp(inventoryId, amount)` | 캐릭터 경험치 추가 + DB 저장 | stage |
| | `addAccountExp(userId, amount)` | 계정 경험치 추가 | stage, farming, story |
| | `progressMission(userId, type, count)` | 일일미션 진행 | stage, story |
| `routes/admin.js` | `saveImageFile(body, contentType, dir, prefix, id, urlBase)` | 이미지 업로드 통합 (확장자 감지, 기존 파일 삭제, 저장, URL 반환) | admin 내 6곳 |
| | `saveJsModule(filePath, varName, data)` | JS 데이터 파일 저장 (`const x = {...}; module.exports = x;`) | admin (talents, promotions, dialogues) |
| `routes/gacha.js` | `loadBanners()` / `saveBanners(data)` | 배너 JSON 로드/저장 | gacha, admin |
| | `loadSkillBanners()` / `saveSkillBanners(data)` | 스킬배너 JSON 로드/저장 | gacha, admin |

### 클라이언트 공유 유틸
| 모듈 | export | 용도 |
|---|---|---|
| `utils/gameConstants.js` | `RARITY_COLORS`, `ELEM_COLORS/LABELS`, `ORIGIN_COLORS/LABELS` | 게임 상수 색상/라벨 |
| | `SKILL_RARITY_LABELS/COLORS`, `getSkillRarityStyle(rarity)` | 스킬 레어도 스타일 |
| | `SKILL_TYPE_LABELS/COLORS` | 스킬 타입 라벨/색상 |
| | `getRarityStyle(rarity)` | 캐릭터 레어도 텍스트 스타일 (CR=무지개) |
| | `timeAgo(dateStr)` | 상대 시간 표시 (방금 전/N분 전/N시간 전) |
| | `canEquipSkill(condition, character)` | 스킬 장착 조건 체크 |
| | `simulateLevelUp(level, exp, added, max)` | 레벨업 시뮬레이션 |
| | `calcExpToMax(level, exp, max)` | 만렙까지 필요 경험치 |
| `hooks/usePartyPresets.js` | `usePartyPresets(addToast)` | 프리셋 로드/저장/캐릭터 조회 |
| `components/PresetPicker.jsx` | `<PresetPicker>` | 프리셋 선택 그리드 UI (maxSlots prop으로 게스트 대응) |

### 공통 CSS (global.css)
- CSS 변수: `--bg-primary`, `--accent`, `--gold`, `--rarity-*` 등
- `.btn-back`: 뒤로가기 버튼 (페이지별 override만 작성)
- `.empty-msg`: 빈 상태 메시지 (페이지별 override만 작성)
- `.rarity-bg-*`: 레어도별 배경 그라디언트

## 작업 시 주의사항

### 절대 금지
- **서버 start/stop 금지** — 테스트는 유저가 직접 함. 마음대로 서버 닫았다 열지 말 것
- **extra 핸들러 신규 작성 금지** — 모든 스킬 동작은 effectIds + Effect 클래스
- **key-value args 금지** — Effect args는 인덱스 배열 `[0, 1, 2]`만 사용
- **같은 ID로 다른 효과 금지** — 다른 효과면 새 Effect ID 할당

### 스킬 effectIds 수정 절차
effectIds 변경은 반드시 어드민 API를 통해야 함 (DB에 저장되므로):
```
PUT /api/admin/skills/:id
Header: x-admin-key: <ADMIN_PASSWORD>
Body: { "extra": "{\"effectIds\":[{\"id\":301,\"args\":[0.3]}]}" }
```

### data/ 파일 관리
- `data/*.js` 파일은 어드민 페이지에서 자동 생성/수정됨 (수동 편집 가능하지만 어드민 API 우선)
- 핫리로드: `hotRequire()` 사용 — 서버 재시작 없이 데이터 반영
- `data/game_seed.json` 없으면 서버 시작 불가 (process.exit(1))

### 이미지 업로드 경로
| 대상 | 디렉토리 | URL 경로 | 파일명 패턴 |
|---|---|---|---|
| 캐릭터 | `data/images/characters/` | `/uploads/characters/` | `char_{id}`, `char_bust_{id}`, `char_sd_{id}`, `char_ld_{id}` |
| 스킬 아이콘 | `data/images/skills/` | `/uploads/skills/` | `skill_{id}` |
| 배너 | `data/images/banners/` | `/uploads/banners/` | `banner_{id}`, `sbanner_{id}` |
| 아이템 | `data/images/items/` | `/uploads/items/` | `{id}` |
| 몬스터 | `data/images/monsters/` | `/uploads/monsters/` | `mon_{id}` |
| 배경 | `data/images/bg/` | `/uploads/bg/` | 수동 배치 |
