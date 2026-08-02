# 코드 점검 보고서
> 점검일: 2026-07-30
> 범위: server/, client/src/, data/, config 파일 전체

---

## HIGH — 즉시 수정 필요

### [H1] ~~collection.js 판매 엔드포인트 데드코드~~ ✅ 수정 완료
- **파일**: `server/routes/collection.js:206-223`
- **분류**: 데드코드
- **내용**: 판매 비활성화 `return` 뒤에 DB UPDATE 코드(재화 지급, 아이템 차감)가 도달 불가능한 상태로 남아있었음
- **조치**: 데드코드 제거, 엔드포인트를 즉시 400 반환으로 정리

### [H2] ~~가챠 뽑기 트랜잭션 없음~~ ✅ 수정 완료
- **파일**: `server/routes/gacha.js:109-135` (캐릭터), `323-342` (스킬)
- **분류**: 버그
- **내용**: `executePull`에서 인벤토리 INSERT → 재화 차감 순서로 진행. 재화 차감 실패 시 이미 삽입된 인벤토리/풀로그가 롤백되지 않아 무료 캐릭터 획득 가능. `executeSkillPull`도 동일 구조
- **조치**: 재화 잔액 사전 체크 추가 + 재화 차감/인벤토리 삽입을 `db.transaction()`으로 묶어 원자적 처리

### [H3] ~~index.js에 별도 어드민 엔드포인트 + 비밀번호 하드코딩~~ ✅ 수정 완료
- **파일**: `server/index.js:64-72` → `server/routes/admin.js`
- **분류**: 중복 / 보안
- **내용**: `POST /api/admin/give-currency`가 admin 라우터 외부에 독립적으로 존재하며, `adminAuth` 미들웨어를 거치지 않음. 비밀번호 `dawnsky58`이 하드코딩되어 있으며 `admin.js:12`에도 동일하게 하드코딩
- **조치**: index.js에서 중복 엔드포인트 제거 → admin.js로 이동 (adminAuth 미들웨어 적용). `|| 'dawnsky58'` 폴백 제거 → 환경변수 필수 (없으면 서버 시작 차단)

### [H4] ~~db.js 하드코딩 폴백 캐릭터 데이터와 game_seed.json 불일치~~ ✅ 수정 완료
- **파일**: `server/db.js:973-1099` (하드코딩 폴백 전체)
- **분류**: 중복 / 불일치
- **내용**: `game_seed.json`이 없을 때 사용되는 하드코딩 폴백에 21캐릭터+37스킬+21캐릭터-스킬 매핑이 ~130줄에 걸쳐 있었으나, 정본(game_seed.json)과 심각하게 불일치
- **조치**: 하드코딩 폴백 전체 제거. game_seed.json 없으면 에러 메시지 출력 후 `process.exit(1)`

### [H5] ~~InventoryPage.jsx gameConfig 미임포트 → 런타임 크래시~~ ✅ 수정 완료
- **파일**: `client/src/pages/InventoryPage.jsx:135`
- **분류**: 버그
- **내용**: `gameConfig.stamina.max` 참조하지만 `gameConfig`를 import하지 않음. 스태미나 아이템 클릭 시 `ReferenceError` 크래시
- **조치**: `import gameConfig from '@gameConfig'` 추가

---

## MEDIUM — 정리 권장

### [M1] admin.js GET /items 라우트 중복
- **파일**: `server/routes/admin.js:761` + `admin.js:1032`
- **분류**: 중복/데드코드
- **내용**: 같은 경로의 GET 라우트가 2개 등록. Express는 첫 번째만 사용하므로 두 번째(1032)는 도달 불가. 두 핸들러의 응답 형태도 다름
- **권장**: 1032번째 제거

### [M2] growth.js 응답 형식 불일치
- **파일**: `server/routes/growth.js` 전체 (lines 289, 314, 350, 667 등)
- **분류**: 불일치
- **내용**: `{ success: true }` 반환. 다른 모든 라우트(collection, profile, daily 등)는 `{ ok: true }` 사용
- **권장**: `{ ok: true }`로 통일 (클라이언트 쪽도 확인 필요)

### [M3] 파티 빌드 코드 5곳 복붙
- **파일**: `stage.js:61-93`, `farming.js:120-149`, `raid.js:171-201`, `story.js:174-203`
- **분류**: 중복
- **내용**: 인벤토리 조회 → 장착 스킬 조회 → 기본 스킬 폴백 → 특기 로드 → createUnit 호출 패턴이 ~35줄씩 4+곳에 복사
- **권장**: `buildPartyUnits(userId, partyIds)` 공용 함수 추출

### [M4] 10연차 SR보장 pull_log UPDATE 서브쿼리 문제
- **파일**: `server/routes/gacha.js:207-208`
- **분류**: 버그
- **내용**: `WHERE character_id = ?`로 매칭하므로 같은 캐릭터를 한 번에 여러 번 뽑으면 잘못된 로그가 수정될 수 있음
- **권장**: `pull_log.id`를 `executePull` 반환값에 포함시켜 직접 지정

### [M5] story.js 노드 목록 N+1 쿼리
- **파일**: `server/routes/story.js:44`
- **분류**: 성능
- **내용**: 메인 쿼리에서 `story_clears`를 이미 LEFT JOIN했으나, 루프 안에서 노드마다 `SELECT 1 FROM story_clears` 개별 쿼리를 다시 실행
- **권장**: JOIN 결과의 `n.stars`로 클리어 여부 판단 (추가 쿼리 제거)

### [M6] refreshStamina 타임존 문제
- **파일**: `server/routes/stage.js:206`
- **분류**: 버그
- **내용**: `new Date(user.stamina_updated_at + 'Z')`로 UTC 강제 파싱하지만 SQLite의 `CURRENT_TIMESTAMP`는 로컬 시간 반환 가능. 서버 타임존이 UTC가 아니면 스태미나 회복량 계산 오류
- **권장**: DB 저장 시 UTC 명시 (`datetime('now')`)하거나 파싱 로직 통일

### [M7] trade.js 교환 수락 시 아이템 재검증 없음
- **파일**: `server/routes/trade.js:54-78`
- **분류**: 버그
- **내용**: 교환 수락 시 양쪽 아이템의 존재/소유를 재확인하지 않음. 오퍼 생성~수락 사이에 각성 재료로 소비되었거나 다른 교환에 사용된 경우 문제 발생
- **권장**: 수락 시 트랜잭션 내에서 양쪽 인벤토리 재확인

### [M8] api.js 미사용 메서드 ~15개
- **파일**: `client/src/utils/api.js`
- **분류**: 데드코드
- **내용**: `stageList`, `stageBattleStart`, `stageBattleEnd`, `stageBattle`, `markSeen`, `toggleFavorite`, `skillRates`, `equipSkillsBulk`, `skillInventory`, `mailDelete`, `sellItem`, `admin*` 래퍼 전체
- **권장**: 사용처 없는 메서드 제거

### [M9] AdminPage 자체 req() 함수 vs api.js 이중 구조
- **파일**: `client/src/pages/AdminPage.jsx` + `client/src/utils/api.js:140-149`
- **분류**: 불일치
- **내용**: AdminPage는 자체 `req()` 함수(직접 fetch + X-Admin-Key 헤더)를 사용. api.js에 정의된 admin 래퍼 메서드는 전부 미사용
- **권장**: 한쪽으로 통일

### [M10] promotions.js 캐릭터 33-35 누락
- **파일**: `data/promotions.js`
- **분류**: 누락
- **내용**: 시안(33), 우로보로스(34), 칸나(35)의 승급 데이터 없음. 승급 시도 시 에러 메시지 반환
- **비고**: talents.js에도 시안(33) 누락

### [M11] BgmButton.jsx 미사용 파일
- **파일**: `client/src/components/BgmButton.jsx` + `BgmButton.css`
- **분류**: 미사용
- **내용**: BGM 컨트롤을 설정 메뉴로 이관한 후 더 이상 어디에서도 import하지 않음
- **권장**: 삭제

### [M12] 스태미나 부족 팝업 UI 중복
- **파일**: `StagePage.jsx:55-71,227-254`, `StoryPage.jsx:167-183,511-538`
- **분류**: 중복
- **내용**: 스태미나 부족 시 스태미나 음료 사용 팝업 로직+UI가 두 페이지에 거의 동일하게 복붙
- **권장**: 공용 컴포넌트로 추출

---

## LOW — 여유 있을 때

### [L1] 미사용 import 정리
| 파일 | 미사용 import |
|------|-------------|
| `GachaPage.jsx:10` | `RARITY_COLORS` |
| `GachaPage.jsx:37` | `gachaBubble` state |
| `GrowthPage.jsx:8` | `RARITY_ORDER_LIST` |
| `LobbyPage.jsx:10` | `ORIGIN_LABELS` |
| `InventoryPage.jsx:3` | `currencyImg` |

### [L2] 공용 유틸 함수 중복 정의
- `calcMaxLevel` — `collection.js:22-25` + `growth.js:50-54` 동일
- `loadTalents` / `loadPromotions` — 4+파일에서 동일 패턴 반복
- **권장**: 공용 모듈로 추출

### [L3] raid.js 구 /battle 엔드포인트
- **파일**: `server/routes/raid.js:301-303`
- **내용**: 400 에러만 반환하는 레거시 엔드포인트. 클라이언트에서 호출하지 않음
- **권장**: 제거

### [L4] gameConfig.json 미사용 필드
- `growth.promotion.requirements` (lines 263-291) — 코드에서 안 읽음
- `growth.promotion.maxByRarity` (lines 254-261) — 코드에서 안 읽음
- `skillSlots.attack/defense.maxByRarity` (lines 128-151) — 코드에서 안 읽음

### [L5] game_seed.json 시드 시 무시되는 필드
- 각 캐릭터의 `id`, `created_at`, `is_released` — INSERT 시 사용되지 않음 (auto-increment/default)

### [L6] lore/dialogue 데이터 부족
- `data/lore.js`: 35캐릭 중 4캐릭만 로어 보유
- `data/dialogues.js`: 35캐릭 중 11캐릭만 대사 보유
- 크래시 위험 없음 (graceful fallback), 콘텐츠 보충 필요

### [L7] try-catch 일관성
- `stage.js:42` (battle-start), `farming.js:99` (battle-start) 등 일부 핸들러에 try-catch 없음
- `stage.js:134`, `raid.js:152` 등 유사 핸들러에는 있음
- 예외 발생 시 500 에러가 Express 기본 핸들러로 처리됨

### [L8] mail.js 아이템 지급 시 SELECT+INSERT 대신 ON CONFLICT 사용 권장
- **파일**: `server/routes/mail.js:63-69`, `117-124`
- **내용**: `farming.js`는 `ON CONFLICT` 사용하지만 `mail.js`는 SELECT→UPDATE/INSERT 패턴
- 동시 요청 시 UNIQUE 제약 위반 가능 (낮은 확률)

### [L9] growth.js itemDefs 섀도잉
- **파일**: `server/routes/growth.js:362`
- **내용**: 모듈 레벨 `itemDefs`(line 20)와 동일한 변수가 함수 내에서 재선언. 동작은 동일하나 혼란 유발

### [L10] promotions.js 내부 CHARACTER_DATA 중복
- **파일**: `data/promotions.js:1-34`
- **내용**: 캐릭터 1-32의 element/origin/rarity를 자체 객체에 저장. game_seed.json과 동일 데이터이나 수동 동기화 필요
- **권장**: DB에서 런타임 조회하도록 변경하거나 주의해서 유지

---

## 요약

| 심각도 | 총 건수 | 수정 완료 | 미수정 |
|--------|---------|----------|--------|
| HIGH   | 5       | 5 (H1~H5 전부) | 0 |
| MEDIUM | 12      | 0        | 12     |
| LOW    | 10      | 0        | 10     |
