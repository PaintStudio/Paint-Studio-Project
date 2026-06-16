# 친구 가챠 — 게임 시스템 설계서

## Phase 1 (핵심)

---

### 1. 캐릭터

**스탯 구조**
- HP: 체력. 0 되면 전투불능
- ATK: 공격력. 스킬 데미지 기반
- DEF: 방어력. 받는 데미지 감소
- SPD: 속도. 턴 순서 결정
- 스킬 1~3: 캐릭터마다 고유 스킬

**등급**: N / R / SR / SSR
- 등급은 기본 스탯 배율에 영향 (N: x1.0, R: x1.2, SR: x1.5, SSR: x1.8)
- 등급이 낮아도 육성하면 쓸 수 있게 밸런스 (천차만별은 아닌 식)

**속성**: 불 / 물 / 풀 / 빛 / 암
- 상성: 불→풀→물→불 (1.5x 데미지), 빛↔암 (서로 1.3x)
- 파티 편성의 전략 요소

**레벨업**
- 전투 경험치 + 경험치 재료(골드 소모)로 레벨업
- 최대 레벨: 등급별 차등 (N: 40, R: 50, SR: 60, SSR: 70). 각성 시 상한 +10

**각성**
- 같은 캐릭터 중복 소모: 1각 → 2각 → ... → 5각
- 각성마다 스탯 보너스 + 최대 레벨 상한 증가
- 가챠 중복이 의미 있게 됨

**스킬**
- 기본 공격: 항상 사용 가능, 궁극기 게이지 충전
- 스킬 1: 쿨타임 2~3턴. 단일/범위 공격 or 버프/디버프
- 스킬 2: 쿨타임 3~5턴. 더 강력한 효과
- 궁극기: 게이지 100% 차면 사용. 캐릭터별 고유 연출

---

### 2. 가챠

**확률**
| 등급 | 기본 확률 | 픽업 시 |
|------|-----------|---------|
| SSR  | 2%        | 0.7% (픽업) + 1.3% (일반) |
| SR   | 13%       | 13% |
| R    | 35%       | 35% |
| N    | 50%       | 50% |

**천장**
- 소프트 천장: 75회부터 SSR 확률 점진적 증가 (+3%/회)
- 하드 천장: 90회 SSR 확정
- 픽업 천장: 180회에 픽업 캐릭터 확정 (50/50 패배 시 다음은 픽업 확정)

**배너**
- 상시 배너: 전체 캐릭터 풀
- 픽업 배너: 특정 캐릭터 확률 UP (관리자가 설정)

**10연차 보장**: 최소 R 이상 1개

---

### 3. 턴제 전투

**기본 흐름**
1. 파티 편성 (최대 4인)
2. 전투 시작 → SPD 순으로 행동 순서 결정
3. 내 턴: 기본공격 / 스킬1 / 스킬2 / 궁극기 중 선택
4. 적 턴: AI 자동 행동
5. 한쪽 전멸 시 종료

**데미지 공식**
```
기본 = ATK * 스킬배율
방어 적용 = 기본 * (100 / (100 + 상대DEF))
속성 보정 = 상성 배율 (1.5x / 1.0x / 0.5x)
최종 = 방어적용 * 속성보정 * (0.9 ~ 1.1 랜덤)
```

**궁극기 게이지**
- 기본공격 시 +20, 피격 시 +10, 스킬 사용 시 +10
- 100% 도달 시 궁극기 사용 가능 (사용 후 0%로 리셋)

**버프/디버프**
- ATK↑, DEF↑, SPD↑ (버프, 2~3턴)
- ATK↓, DEF↓, 독, 기절 (디버프)
- 최대 3개 중첩

---

### 4. 스테이지 (PVE)

**구조**
- 챕터 1~N, 각 챕터에 스테이지 10개
- 일반 / 하드 난이도
- 스태미나 소모: 일반 6, 하드 12

**클리어 보상**
- 첫 클리어: 다이아 보너스
- 반복: 골드, 경험치 재료, 장비 재료
- 3성 클리어 조건: 전원 생존 / N턴 이내 / 특정 속성 포함

**적 AI**
- 패턴 기반: 일반 몹은 기본공격 위주, 보스는 HP% 따라 패턴 변화
- 예: HP 50% 이하 → 범위 공격 사용 빈도 증가

---

### 5. 레이드 (비동기 협동)

**구조**
- 주간 보스 1체, HP 수백만~수천만
- 모든 유저가 각자 도전 (1일 3회)
- 내가 넣은 데미지가 공유 HP에서 차감

**보상**
- 기여도 비례 보상 (데미지 순위)
- 보스 처치 시 전원 보너스
- 고급 장비 재료, 각성 재료 등

**전투 방식**
- 일반 전투와 동일하지만 턴 제한 있음 (15턴)
- 15턴 내 최대한 많은 데미지를 넣는 게 목표

---

### 6. 경제 시스템

**재화**
| 재화 | 용도 | 획득처 |
|------|------|--------|
| 💎 다이아 | 가챠, 스태미나 충전 | 스테이지 첫 클리어, 데일리, 업적 |
| 🪙 골드 | 레벨업, 스킬 강화, 장비 | 스테이지, 레이드, 미션 |
| ⚡ 스태미나 | 전투 입장 | 시간 회복(5분/1), 다이아 충전 |

**스태미나**
- 최대 120, 5분당 1 회복
- 다이아로 충전 가능 (1일 3회)

**일일 루프**
1. 출석 보상 (다이아 + 골드 + 스태미나)
2. 데일리 미션 3종 (예: "전투 5회", "캐릭터 레벨업 1회", "가챠 1회")
3. 스태미나로 스테이지/레이드 소화
4. 보상으로 캐릭터 육성
5. 모은 다이아로 가챠

---

## Phase 2 (확장)

### 장비/룬
- 스테이지 드랍, 6부위 장착
- 세트 효과 (같은 종류 2/4개)
- 옵션 랜덤 + 강화

### 길드
- 친구들끼리 길드 생성
- 길드 레이드 (더 강한 보스)
- 길드 버프 (경험치 UP 등)

### 이벤트
- 한정 배너 + 한정 캐릭터
- 이벤트 전용 스테이지
- 이벤트 포인트 교환소

### 아레나 (비동기 PvP)
- 방어 편성 설정 → AI가 조종
- 다른 유저 방어팀에 도전
- 시즌제 랭킹 보상

---

## DB 스키마 변경 사항 (Phase 1)

기존 테이블에 추가/수정 필요:

```sql
-- characters 테이블 확장
ALTER TABLE characters ADD COLUMN element TEXT DEFAULT 'neutral'; -- 속성
ALTER TABLE characters ADD COLUMN base_hp INTEGER DEFAULT 1000;
ALTER TABLE characters ADD COLUMN base_atk INTEGER DEFAULT 100;
ALTER TABLE characters ADD COLUMN base_def INTEGER DEFAULT 80;
ALTER TABLE characters ADD COLUMN base_spd INTEGER DEFAULT 100;
ALTER TABLE characters ADD COLUMN skill1_name TEXT DEFAULT '';
ALTER TABLE characters ADD COLUMN skill1_desc TEXT DEFAULT '';
ALTER TABLE characters ADD COLUMN skill1_multiplier REAL DEFAULT 1.5;
ALTER TABLE characters ADD COLUMN skill1_cooldown INTEGER DEFAULT 2;
ALTER TABLE characters ADD COLUMN skill2_name TEXT DEFAULT '';
ALTER TABLE characters ADD COLUMN skill2_desc TEXT DEFAULT '';
ALTER TABLE characters ADD COLUMN skill2_multiplier REAL DEFAULT 2.5;
ALTER TABLE characters ADD COLUMN skill2_cooldown INTEGER DEFAULT 4;
ALTER TABLE characters ADD COLUMN ult_name TEXT DEFAULT '';
ALTER TABLE characters ADD COLUMN ult_desc TEXT DEFAULT '';
ALTER TABLE characters ADD COLUMN ult_multiplier REAL DEFAULT 4.0;

-- inventory 확장 (육성 정보)
ALTER TABLE inventory ADD COLUMN level INTEGER DEFAULT 1;
ALTER TABLE inventory ADD COLUMN awakening INTEGER DEFAULT 0;
ALTER TABLE inventory ADD COLUMN exp INTEGER DEFAULT 0;

-- 스테이지 정의
CREATE TABLE stages (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  chapter INTEGER NOT NULL,
  stage_number INTEGER NOT NULL,
  name TEXT NOT NULL,
  difficulty TEXT DEFAULT 'normal',
  stamina_cost INTEGER DEFAULT 6,
  enemy_data TEXT NOT NULL, -- JSON: 적 캐릭터 구성
  rewards TEXT NOT NULL,    -- JSON: 보상 정보
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

-- 스테이지 클리어 기록
CREATE TABLE stage_clears (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  user_id INTEGER NOT NULL,
  stage_id INTEGER NOT NULL,
  stars INTEGER DEFAULT 0,
  best_turns INTEGER,
  cleared_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (user_id) REFERENCES users(id),
  FOREIGN KEY (stage_id) REFERENCES stages(id)
);

-- 레이드 보스
CREATE TABLE raids (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  name TEXT NOT NULL,
  element TEXT NOT NULL,
  max_hp INTEGER NOT NULL,
  current_hp INTEGER NOT NULL,
  attack_pattern TEXT NOT NULL, -- JSON
  rewards TEXT NOT NULL,        -- JSON
  starts_at DATETIME NOT NULL,
  ends_at DATETIME NOT NULL,
  is_active INTEGER DEFAULT 1
);

-- 레이드 참여 기록
CREATE TABLE raid_entries (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  raid_id INTEGER NOT NULL,
  user_id INTEGER NOT NULL,
  damage_dealt INTEGER NOT NULL,
  turns_used INTEGER NOT NULL,
  entered_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (raid_id) REFERENCES raids(id),
  FOREIGN KEY (user_id) REFERENCES users(id)
);

-- 데일리 미션
CREATE TABLE daily_missions (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  user_id INTEGER NOT NULL,
  mission_type TEXT NOT NULL,
  target_count INTEGER NOT NULL,
  current_count INTEGER DEFAULT 0,
  reward_type TEXT NOT NULL,
  reward_amount INTEGER NOT NULL,
  is_completed INTEGER DEFAULT 0,
  date TEXT NOT NULL, -- YYYY-MM-DD
  FOREIGN KEY (user_id) REFERENCES users(id)
);

-- users 확장
ALTER TABLE users ADD COLUMN stamina INTEGER DEFAULT 120;
ALTER TABLE users ADD COLUMN stamina_updated_at DATETIME DEFAULT CURRENT_TIMESTAMP;
ALTER TABLE users ADD COLUMN gold INTEGER DEFAULT 5000;
ALTER TABLE users ADD COLUMN last_login_date TEXT DEFAULT '';
ALTER TABLE users ADD COLUMN login_streak INTEGER DEFAULT 0;
```
