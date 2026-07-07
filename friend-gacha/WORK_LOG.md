# Friend Gacha 작업 기록

## 최근 작업 내역 (2026-06-17 ~ 06-23)

### 1. 전투 모디파이어 시스템 리팩토링
- **modSystem.js**: PASSIVE 테이블(데이터 기반) + `defineMod` 레지스트리(복잡 행동) 이중 구조로 재작성
- **modifiers.js**: 커스텀 모디파이어 정의 (skill_use_stack, cycle_atk_stack, extra_turn_on_cycle_end, hp_loss_track, defense_grant_stack, unique_element_note_recover, debuff_bonus_damage, debuff_taunt, revive, skill:hpLostCostReduce, status:submerge)
- **BattlePage.jsx**: 모든 hookName을 modSystem PASSIVE 테이블과 일치시킴
- PASSIVE phase 매핑: `modifyDamageDealt`, `modifyAtk`, `modifyCritRate`, `calcDamageReduction`, `modifyCost`, `modifyOverloadInc`, `modifyDefenseMult`, `modifyEnemyDefCost`, `turnStartNotes`, `healOnKill`, `lifestealRate`

### 2. 전투 버그 수정
- **전투 종료 즉시 퇴장 문제**: 결과 화면 + 확인 버튼 패턴으로 변경, `confirmedRef` 가드로 이중 제출 방지
- **수월 특기 방어스킬 스택 미적용**: `applyAttackWithDefense`에서 방어 스킬도 `onSkillUsed` 트리거 추가
- **광역기 방어 불가**: 적 AOE 공격 시 파티원 각각 개별 방어 선택 (`processAoeTarget` 순차 처리)
- **데미지 미터**: `dmgTracker` ref로 모든 데미지 소스 추적 (직격, AOE, 반격, 패시브 등), 결과 화면에 막대 그래프 + 상세 내역

### 3. 특기 해금 조건 변경
- 기존: 각성 기준 → **변경: 승급 기준**
- `growth.js`: `talentUnlockCount = Math.min(1 + promoBonuses.talentCount, totalTalentCount)`

### 4. 파티 편성 인라인 편집
- **PartyPresetEditor.jsx/css**: 공용 파티 편집 컴포넌트 생성
- **StagePage.jsx, RaidPage.jsx**: 전투 진입 프리셋 선택 화면에서 바로 편성 편집 가능

### 5. 색 파편 (EXP 아이템) 시스템
- **data/items.js**: 9근원 × 3등급 = 27종 파편 아이템 자동 생성 (`frag_{origin}_{tier}`)
  - 하급 500 EXP (N), 중급 2500 EXP (R), 상급 10000 EXP (SR)
- **아이템 기반 레벨업**: 하드코딩 제거, `effect.type === 'exp'`인 아이템이면 자동으로 레벨업 UI에 표시
  - 기존 `exp_scroll_s` (500), `exp_scroll_m` (2000)도 자동 포함
  - `effect.origin` 일치 시 `gameConfig.growth.expOriginBonus` (1.5배) 적용
- **서버**: `/growth/levelup`이 `[{itemId, count}]` 형태 수신, `itemDefs`에서 정의 조회
- **클라이언트**: `api.myItems()` → `effect?.type === 'exp'` 필터 → 동적 UI 렌더링

### 6. 어드민 우편 아이템 첨부
- **admin.js**: `GET /items` (전체 아이템 정의 반환)
- **mail.js**: `rewards.items` 배열 처리 추가 (수령 시 `user_items`에 수량 추가)
- **AdminPage.jsx MailForm**: 아이템 드롭다운 + 수량 행 동적 추가/삭제

### 7. 재화 이름 변경
- **골드 → 비트** (DB 컬럼 `gold`은 유지, 표시명만 변경)
- **다이아 → 프리즘** (DB 컬럼 `currency`는 유지, 표시명만 변경)
- 변경 범위: LobbyPage, InventoryPage, GachaPage, GrowthPage, StagePage, BattleHub, AdminPage, SocialPage, 서버 에러 메시지

---

## 캐릭터 특기/스킬 검증 체크리스트

### 특기 이펙트 타입별 처리 현황

| 이펙트 타입 | 처리 방식 | 검증 |
|---|---|---|
| `stat_boost` | 서버 init 시 스탯에 반영 | ✅ |
| `note_bonus` | 서버 init 시 턴노트에 반영 | ✅ |
| `element_boost` | PASSIVE → modifyDamageDealt | ✅ |
| `first_strike` | PASSIVE → modifyDamageDealt (isFirstAttack) | ✅ |
| `atk_boost_vs_slower` | PASSIVE → modifyAtk (spd 비교) | ✅ |
| `crit_boost` | PASSIVE → modifyCritRate | ✅ |
| `damage_reduce` | PASSIVE → calcDamageReduction | ✅ |
| `defense_boost` | PASSIVE → modifyDefenseMult | ✅ |
| `note_regen` | PASSIVE → turnStartNotes | ✅ |
| `heal_on_kill` | PASSIVE → healOnKill | ✅ |
| `lifesteal` | PASSIVE → lifestealRate | ✅ |
| `overload_reduce` | PASSIVE → modifyOverloadInc | ✅ |
| `debuff_cost_reduce` | PASSIVE → modifyCost (디버프 스킬) | ✅ |
| `debuff_defense_cost_up` | PASSIVE → modifyEnemyDefCost | ✅ |
| `skill_use_stack` | 커스텀 (modifiers.js) | ✅ |
| `cycle_atk_stack` | 커스텀 (modifiers.js) | ✅ |
| `extra_turn_on_cycle_end` | 커스텀 (modifiers.js) | ✅ |
| `hp_loss_track` | 커스텀 (modifiers.js) | ✅ |
| `defense_grant_stack` | 커스텀 (modifiers.js) | ✅ |
| `unique_element_note_recover` | 커스텀 (modifiers.js) | ✅ |
| `debuff_bonus_damage` | 커스텀 (modifiers.js) | ✅ |
| `debuff_taunt` | 커스텀 + PASSIVE DR | ✅ |
| `non_debuff_cost_up` | PASSIVE → modifyCost (비디버프 스킬) | ✅ |
| `debuff_heal_ally` | 커스텀 (modifiers.js) | ✅ |
| `bleach_stack` | 커스텀 (modifiers.js) | ✅ |
| `debuff_note_restore` | 커스텀 (modifiers.js) | ✅ |
| `cycle_hp_regen` | 커스텀 (modifiers.js) | ✅ |
| `low_hp_party_def` | 커스텀 → partyDefenseAura | ✅ |
| `buff_self_taunt` | 커스텀 (modifiers.js) | ✅ |
| `overload_increase` | PASSIVE → modifyOverloadInc | ✅ |
| `dawn_stack` | 커스텀 (modifiers.js) | ✅ |
| `first_cycle_note_boost` | 커스텀 → onFirstCycle | ✅ |
| `party_buff` | ❌ 미구현 (킵 — 설계 미정) | — |
| `revive` | 커스텀 핸들러 존재, 사용 캐릭 없음 | — |

### 캐릭터별 검증 상태

> ✅ = 특기 이펙트가 모디파이어 시스템에서 정상 매핑 확인됨
> ⚠️ = 일부 미구현 이펙트 포함 (party_buff)
> 🔧 = 특기 데이터 미설정 / 빈 이펙트

| ID | 이름 | 레어 | 속성 | 근원 | 특기 수 | 이펙트 타입 | 상태 |
|---|---|---|---|---|---|---|---|
| 1 | 유카리 | SSR | fire | life | 4 | stat_boost, skill_use_stack, hp_loss_track, defense_grant_stack | ✅ |
| 2 | 츠바키 | SSR | light | memory | 4 | debuff_defense_cost_up, debuff_bonus_damage, debuff_cost_reduce, debuff_taunt | ✅ |
| 3 | 시스투스 | SR | dark | memory | 4 | debuff_heal_ally, bleach_stack, debuff_note_restore, note_bonus+non_debuff_cost_up | ✅ |
| 4 | 베르트랑 | SR | dark | life | 4 | cycle_hp_regen, low_hp_party_def, buff_self_taunt, stat_boost×2 | ✅ |
| 5 | 아우라 | SR | light | sound | 4 | stat_boost×3, overload_increase, dawn_stack, first_cycle_note_boost | ✅ |
| 6 | 카날리 | SR | water | force | 4 | atk_boost_vs_slower, extra_turn_on_cycle_end, unique_element_note_recover, cycle_atk_stack | ✅ |
| 7 | 코루리 | R | light | time | 6 | stat_boost, element_boost, note_regen, first_strike, damage_reduce, crit_boost | ✅ |
| 8 | 리카 | R | water | space | 6 | stat_boost, element_boost, damage_reduce, stat_boost, heal_on_kill, note_bonus | ✅ |
| 9 | 린네 | R | wind | memory | 6 | stat_boost, element_boost, defense_boost, damage_reduce, heal_on_kill, party_buff | ⚠️ party_buff |
| 10 | 페리도트 | R | dark | intellect | 6 | crit_boost, element_boost, overload_reduce, first_strike, stat_boost, note_bonus | ✅ |
| 11 | 렌 | R | wind | life | 6 | stat_boost, element_boost, heal_on_kill, stat_boost, lifesteal, party_buff | ⚠️ party_buff |
| 12 | 게로트 | R | wind | heart | 6 | stat_boost, element_boost, damage_reduce, party_buff, defense_boost, note_bonus | ⚠️ party_buff |
| 13 | 쿼시 | N | light | sound | 6 | stat_boost, element_boost, stat_boost, crit_boost, damage_reduce, first_strike | ✅ |
| 14 | 가네트 | N | fire | time | 6 | stat_boost, element_boost, stat_boost, first_strike, overload_reduce, crit_boost+stat_boost | ✅ |
| 15 | 호프 | N | wind | life | 6 | stat_boost, element_boost, heal_on_kill, damage_reduce, stat_boost, party_buff | ⚠️ party_buff |
| 16 | 메이 | N | dark | intellect | 6 | stat_boost, element_boost, stat_boost, crit_boost, overload_reduce, first_strike | ✅ |
| 17 | 티어리 | N | wind | force | 6 | stat_boost, element_boost, damage_reduce, crit_boost, stat_boost, stat_boost | ✅ |
| 18 | 밥 | N | fire | memory | 6 | stat_boost, element_boost, stat_boost, first_strike, heal_on_kill, stat_boost+crit_boost | ✅ |
| 19 | 아이유브 | N | fire | season | 6 | stat_boost, element_boost, heal_on_kill, damage_reduce, stat_boost, stat_boost | ✅ |
| 20 | 리사 | N | light | space | 6 | stat_boost, element_boost, stat_boost, damage_reduce, stat_boost, crit_boost+stat_boost | ✅ |
| 21 | 아르시스 | N | water | heart | 6 | stat_boost, element_boost, heal_on_kill, party_buff, damage_reduce, defense_boost+stat_boost | ⚠️ party_buff |

### 요약
- **완전 검증 (✅)**: 1, 2, 3, 4, 5, 6, 7, 8, 10, 13, 14, 16, 17, 18, 19, 20 (16캐릭터)
- **party_buff 미구현 (⚠️)**: 9, 11, 12, 15, 21 (5캐릭터 — party_buff 외 이펙트는 정상)
- **이펙트 미설정 (🔧)**: 없음

---

## 미완료 / 예정 작업
- [ ] `party_buff` 이펙트 구현 (설계 미정)
- [x] 시스투스(3) 특기 이펙트 설계 및 구현
- [x] 베르트랑(4) 특기 이펙트 설계 및 구현
- [x] 아우라(5) 특기 이펙트 설계 및 구현
- [ ] 파밍 던전 시스템
- [ ] 스킬 가챠 API 리워크
- [ ] 어드민 스킬 관리 UI
- [ ] 주기적 DB 백업
