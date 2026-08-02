/**
 * 몬스터 정의 파일
 *
 * 던전(stages.js)에서 id로 참조합니다.
 * 스테이지에 배치할 때 레벨 스케일링이 적용되므로,
 * 여기서는 "기준 스탯"과 스킬셋만 정의합니다.
 *
 * ──────────────────────────────────────────
 * 몬스터 필드 설명:
 * ──────────────────────────────────────────
 * id          : 고유 식별자 (stages.js에서 참조)
 * name        : 표시 이름
 * element     : 속성 (fire / water / wind / light / dark / neutral)
 * origin      : 근원 (force / life / season / memory / sound / time / space / intellect / heart)
 * image_sd    : SD 이미지 경로 (없으면 null, 이름 첫글자로 대체)
 * isBoss      : true면 보스급 (더 큰 스프라이트, AI 강화)
 *
 * --- 기준 스탯 (레벨 1 기준, 스케일링 전) ---
 * hp, atk, def, spd
 * turn_notes  : 턴당 행동 자원
 *
 * --- 스킬 ---
 * skills: [{ id, name, type, cost, power, target, defense_mult?, extra? }]
 *   id: skills 테이블에 등록되는 고유 ID (100번대 = 몬스터 스킬)
 *   obtainable=0으로 자동 등록되어 플레이어 획득 불가
 *
 * --- 드롭 ---
 * drops: [{ itemId, rate }]
 * ──────────────────────────────────────────
 */

const ORIGINS = ['force', 'life', 'season', 'memory', 'sound', 'time', 'space', 'intellect', 'heart'];

const monsters = {

  // ========== 챕터 1: 시작의 마을 (N 캐릭터 대상) ==========
  slime: {
    id: 'slime',
    name: '슬라임',
    element: 'water',
    origin: 'life',
    image_sd: null,
    isBoss: false,
    hp: 30, atk: 4, def: 3, spd: 6,
    turn_notes: 3,
    skills: [
      { id: 100, name: '몸통 박치기', type: 'attack', cost: 1, power: 1.0, element: 'water', target: 'single' },
      { id: 101, name: '점액 방어', type: 'defense', cost: 1, power: 1, defense_mult: 0.3, element: 'neutral', target: 'self' },
    ],
    drops: [
      { itemId: 'slime_jelly', rate: 0.5 },
      { itemId: 'water_crystal', rate: 0.12 },
      { itemId: 'hp_potion_s', rate: 0.08 },
    ],
  },

  goblin: {
    id: 'goblin',
    name: '고블린',
    element: 'wind',
    origin: 'memory',
    image_sd: null,
    isBoss: false,
    hp: 35, atk: 5, def: 2, spd: 7,
    turn_notes: 3,
    skills: [
      { id: 102, name: '단검 찌르기', type: 'attack', cost: 1, power: 1.0, element: 'neutral', target: 'single' },
      { id: 103, name: '연속 베기', type: 'attack', cost: 2, power: 1.5, element: 'neutral', target: 'single' },
      { id: 104, name: '회피 자세', type: 'defense', cost: 1, power: 1, defense_mult: 0.4, element: 'neutral', target: 'self' },
    ],
    drops: [
      { itemId: 'goblin_cloth', rate: 0.5 },
      { itemId: 'wind_crystal', rate: 0.12 },
      { itemId: 'hp_potion_s', rate: 0.06 },
    ],
  },

  wolf: {
    id: 'wolf',
    name: '늑대',
    element: 'neutral',
    origin: 'force',
    image_sd: null,
    isBoss: false,
    hp: 40, atk: 6, def: 2, spd: 8,
    turn_notes: 3,
    skills: [
      { id: 105, name: '물기', type: 'attack', cost: 1, power: 1.1, element: 'neutral', target: 'single' },
      { id: 106, name: '돌진', type: 'attack', cost: 2, power: 1.6, element: 'neutral', target: 'single' },
    ],
    drops: [
      { itemId: 'wolf_fang', rate: 0.5 },
      { itemId: 'neutral_crystal', rate: 0.12 },
    ],
  },

  village_boss: {
    id: 'village_boss',
    name: '마을 수호 골렘',
    element: 'neutral',
    origin: 'space',
    image_sd: null,
    isBoss: true,
    hp: 120, atk: 7, def: 5, spd: 4,
    turn_notes: 4,
    skills: [
      { id: 107, name: '바위 주먹', type: 'attack', cost: 1, power: 1.0, element: 'neutral', target: 'single' },
      { id: 108, name: '대지 강타', type: 'attack', cost: 2, power: 1.8, element: 'neutral', target: 'single' },
      { id: 109, name: '지진', type: 'attack', cost: 3, power: 1.3, element: 'neutral', target: 'aoe' },
      { id: 110, name: '돌 방패', type: 'defense', cost: 1, power: 1, defense_mult: 0.6, element: 'neutral', target: 'self' },
    ],
    drops: [
      { itemId: 'golem_core', rate: 0.6 },
      { itemId: 'neutral_crystal', rate: 0.4 },
      { itemId: 'awakening_shard_low', rate: 0.25 },
      { itemId: 'exp_scroll_s', rate: 0.15 },
    ],
  },

  // ========== 챕터 2: 어둠의 숲 (N→R 전환기) ==========
  treant: {
    id: 'treant',
    name: '트렌트',
    element: 'wind',
    origin: 'life',
    image_sd: null,
    isBoss: false,
    hp: 45, atk: 5, def: 5, spd: 4,
    turn_notes: 3,
    skills: [
      { id: 111, name: '가지 채찍', type: 'attack', cost: 1, power: 1.0, element: 'wind', target: 'single' },
      { id: 112, name: '뿌리 엮기', type: 'attack', cost: 2, power: 1.4, element: 'wind', target: 'single' },
      { id: 113, name: '껍질 방어', type: 'defense', cost: 1, power: 1, defense_mult: 0.5, element: 'neutral', target: 'self' },
    ],
    drops: [
      { itemId: 'treant_bark', rate: 0.45 },
      { itemId: 'wind_crystal', rate: 0.15 },
    ],
  },

  shadow_bat: {
    id: 'shadow_bat',
    name: '그림자 박쥐',
    element: 'dark',
    origin: 'time',
    image_sd: null,
    isBoss: false,
    hp: 25, atk: 7, def: 2, spd: 9,
    turn_notes: 4,
    skills: [
      { id: 114, name: '흡혈', type: 'attack', cost: 1, power: 0.9, element: 'dark', target: 'single', extra: { effects: [{ type: 'healPercent', params: { percent: 0.3 }, scope: 'self' }] } },
      { id: 115, name: '초음파', type: 'attack', cost: 2, power: 1.3, element: 'dark', target: 'aoe' },
    ],
    drops: [
      { itemId: 'shadow_essence', rate: 0.4 },
      { itemId: 'dark_crystal', rate: 0.15 },
      { itemId: 'bat_wing', rate: 0.3 },
    ],
  },

  mushroom: {
    id: 'mushroom',
    name: '독버섯',
    element: 'wind',
    origin: 'season',
    image_sd: null,
    isBoss: false,
    hp: 35, atk: 5, def: 3, spd: 5,
    turn_notes: 3,
    skills: [
      { id: 116, name: '포자 뿜기', type: 'attack', cost: 1, power: 0.8, element: 'wind', target: 'single' },
      { id: 117, name: '독안개', type: 'debuff', cost: 2, power: 0.2, element: 'wind', target: 'single', extra: { stat: 'def', turns: 3 } },
    ],
    drops: [
      { itemId: 'toxic_spore', rate: 0.45 },
      { itemId: 'wind_crystal', rate: 0.12 },
      { itemId: 'hp_potion_s', rate: 0.1 },
    ],
  },

  forest_boss: {
    id: 'forest_boss',
    name: '숲의 지배자 엔트',
    element: 'wind',
    origin: 'life',
    image_sd: null,
    isBoss: true,
    hp: 180, atk: 9, def: 7, spd: 5,
    turn_notes: 5,
    skills: [
      { id: 118, name: '거목 내려치기', type: 'attack', cost: 1, power: 1.2, element: 'wind', target: 'single' },
      { id: 119, name: '뿌리 관통', type: 'attack', cost: 2, power: 2.0, element: 'wind', target: 'single' },
      { id: 120, name: '숲의 분노', type: 'attack', cost: 3, power: 1.5, element: 'wind', target: 'aoe' },
      { id: 121, name: '자연 재생', type: 'heal', cost: 2, power: 0.1, element: 'wind', target: 'self' },
      { id: 122, name: '나무 껍질', type: 'defense', cost: 1, power: 1, defense_mult: 0.5, element: 'neutral', target: 'self' },
    ],
    drops: [
      { itemId: 'ent_heart', rate: 0.6 },
      { itemId: 'wind_crystal', rate: 0.4 },
      { itemId: 'awakening_shard_low', rate: 0.3 },
      { itemId: 'exp_scroll_s', rate: 0.2 },
    ],
  },

  // ========== 챕터 3: 불꽃의 산 (R 캐릭터 대상) ==========
  fire_imp: {
    id: 'fire_imp',
    name: '화염 임프',
    element: 'fire',
    origin: 'force',
    image_sd: null,
    isBoss: false,
    hp: 40, atk: 7, def: 2, spd: 7,
    turn_notes: 3,
    skills: [
      { id: 123, name: '화염구', type: 'attack', cost: 1, power: 1.1, element: 'fire', target: 'single' },
      { id: 124, name: '폭발', type: 'attack', cost: 2, power: 1.6, element: 'fire', target: 'single' },
    ],
    drops: [
      { itemId: 'fire_ember', rate: 0.45 },
      { itemId: 'fire_crystal', rate: 0.15 },
    ],
  },

  lava_golem: {
    id: 'lava_golem',
    name: '용암 골렘',
    element: 'fire',
    origin: 'space',
    image_sd: null,
    isBoss: false,
    hp: 55, atk: 6, def: 6, spd: 3,
    turn_notes: 3,
    skills: [
      { id: 125, name: '용암 주먹', type: 'attack', cost: 1, power: 1.0, element: 'fire', target: 'single' },
      { id: 126, name: '용암 방벽', type: 'defense', cost: 1, power: 0.5, defense_mult: 0.5, element: 'fire', target: 'self', extra: { counter: true } },
    ],
    drops: [
      { itemId: 'magma_shard', rate: 0.45 },
      { itemId: 'fire_crystal', rate: 0.15 },
      { itemId: 'hp_potion_s', rate: 0.08 },
    ],
  },

  volcano_boss: {
    id: 'volcano_boss',
    name: '화산의 군주',
    element: 'fire',
    origin: 'force',
    image_sd: null,
    isBoss: true,
    hp: 280, atk: 11, def: 8, spd: 6,
    turn_notes: 5,
    skills: [
      { id: 127, name: '화염 일격', type: 'attack', cost: 1, power: 1.2, element: 'fire', target: 'single' },
      { id: 128, name: '업화', type: 'attack', cost: 2, power: 2.2, element: 'fire', target: 'single' },
      { id: 129, name: '화산 분출', type: 'attack', cost: 4, power: 1.8, element: 'fire', target: 'aoe' },
      { id: 130, name: '용암 갑옷', type: 'defense', cost: 2, power: 0.8, defense_mult: 0.6, element: 'fire', target: 'self', extra: { counter: true } },
    ],
    drops: [
      { itemId: 'volcano_jewel', rate: 0.5 },
      { itemId: 'fire_crystal', rate: 0.5 },
      { itemId: 'awakening_shard_mid', rate: 0.3 },
      { itemId: 'exp_scroll_m', rate: 0.15 },
    ],
  },

  // ========== 챕터 4: 심해 동굴 (R→SR 전환기) ==========
  sea_serpent: {
    id: 'sea_serpent',
    name: '바다뱀',
    element: 'water',
    origin: 'time',
    image_sd: null,
    isBoss: false,
    hp: 50, atk: 7, def: 3, spd: 6,
    turn_notes: 3,
    skills: [
      { id: 131, name: '물줄기', type: 'attack', cost: 1, power: 1.0, element: 'water', target: 'single' },
      { id: 132, name: '소용돌이', type: 'attack', cost: 2, power: 1.2, element: 'water', target: 'aoe' },
    ],
    drops: [
      { itemId: 'serpent_scale', rate: 0.45 },
      { itemId: 'water_crystal', rate: 0.15 },
    ],
  },

  jellyfish: {
    id: 'jellyfish',
    name: '전기 해파리',
    element: 'light',
    origin: 'sound',
    image_sd: null,
    isBoss: false,
    hp: 25, atk: 8, def: 1, spd: 8,
    turn_notes: 4,
    skills: [
      { id: 133, name: '감전', type: 'attack', cost: 1, power: 1.0, element: 'light', target: 'single' },
      { id: 134, name: '마비 촉수', type: 'debuff', cost: 2, power: 0.25, element: 'light', target: 'single', extra: { stat: 'spd', turns: 2 } },
    ],
    drops: [
      { itemId: 'jelly_membrane', rate: 0.45 },
      { itemId: 'light_crystal', rate: 0.15 },
      { itemId: 'hp_potion_m', rate: 0.05 },
    ],
  },

  deep_sea_boss: {
    id: 'deep_sea_boss',
    name: '심해의 왕 크라켄',
    element: 'water',
    origin: 'force',
    image_sd: null,
    isBoss: true,
    hp: 400, atk: 13, def: 9, spd: 5,
    turn_notes: 6,
    skills: [
      { id: 135, name: '촉수 타격', type: 'attack', cost: 1, power: 1.3, element: 'water', target: 'single' },
      { id: 136, name: '촉수 난타', type: 'attack', cost: 3, power: 2.0, element: 'water', target: 'single' },
      { id: 137, name: '해일', type: 'attack', cost: 4, power: 1.6, element: 'water', target: 'aoe' },
      { id: 138, name: '먹물 장막', type: 'debuff', cost: 2, power: 0.3, element: 'dark', target: 'single', extra: { stat: 'atk', turns: 3 } },
      { id: 139, name: '경화', type: 'defense', cost: 2, power: 1, defense_mult: 0.6, element: 'neutral', target: 'self' },
    ],
    drops: [
      { itemId: 'kraken_ink', rate: 0.5 },
      { itemId: 'water_crystal', rate: 0.5 },
      { itemId: 'awakening_shard_mid', rate: 0.35 },
      { itemId: 'exp_scroll_m', rate: 0.2 },
    ],
  },

  // ========== 챕터 5: 빛의 탑 (SR 캐릭터 대상) ==========
  light_spirit: {
    id: 'light_spirit',
    name: '빛의 정령',
    element: 'light',
    origin: 'intellect',
    image_sd: null,
    isBoss: false,
    hp: 45, atk: 7, def: 4, spd: 7,
    turn_notes: 4,
    skills: [
      { id: 140, name: '광선', type: 'attack', cost: 1, power: 1.1, element: 'light', target: 'single' },
      { id: 141, name: '섬광', type: 'attack', cost: 2, power: 1.5, element: 'light', target: 'aoe' },
      { id: 142, name: '빛 보호막', type: 'defense', cost: 1, power: 1, defense_mult: 0.4, element: 'light', target: 'self' },
    ],
    drops: [
      { itemId: 'light_fragment', rate: 0.4 },
      { itemId: 'light_crystal', rate: 0.18 },
      { itemId: 'hp_potion_m', rate: 0.05 },
    ],
  },

  dark_knight: {
    id: 'dark_knight',
    name: '암흑 기사',
    element: 'dark',
    origin: 'force',
    image_sd: null,
    isBoss: false,
    hp: 60, atk: 9, def: 5, spd: 6,
    turn_notes: 4,
    skills: [
      { id: 143, name: '암흑 검격', type: 'attack', cost: 1, power: 1.2, element: 'dark', target: 'single' },
      { id: 144, name: '그림자 베기', type: 'attack', cost: 2, power: 1.8, element: 'dark', target: 'single', extra: { ignoreDef: true } },
      { id: 145, name: '암흑 방패', type: 'defense', cost: 1, power: 1, defense_mult: 0.5, element: 'dark', target: 'self' },
    ],
    drops: [
      { itemId: 'dark_steel', rate: 0.4 },
      { itemId: 'dark_crystal', rate: 0.18 },
      { itemId: 'awakening_shard_mid', rate: 0.08 },
    ],
  },

  tower_boss: {
    id: 'tower_boss',
    name: '탑의 수호자',
    element: 'light',
    origin: 'heart',
    image_sd: null,
    isBoss: true,
    hp: 600, atk: 15, def: 10, spd: 7,
    turn_notes: 7,
    skills: [
      { id: 146, name: '심판의 검', type: 'attack', cost: 1, power: 1.3, element: 'light', target: 'single' },
      { id: 147, name: '천벌', type: 'attack', cost: 3, power: 2.5, element: 'light', target: 'single' },
      { id: 148, name: '정화의 빛', type: 'attack', cost: 4, power: 2.0, element: 'light', target: 'aoe' },
      { id: 149, name: '축복', type: 'heal', cost: 2, power: 0.08, element: 'light', target: 'self' },
      { id: 150, name: '성스러운 방벽', type: 'defense', cost: 2, power: 1, defense_mult: 0.7, element: 'light', target: 'self' },
    ],
    drops: [
      { itemId: 'guardian_crest', rate: 0.5 },
      { itemId: 'light_crystal', rate: 0.5 },
      { itemId: 'awakening_shard_high', rate: 0.3 },
      { itemId: 'exp_scroll_m', rate: 0.25 },
    ],
  },

  // ========== 공통 잡몹 ==========
  bat: {
    id: 'bat',
    name: '박쥐',
    element: 'dark',
    origin: 'time',
    image_sd: null,
    isBoss: false,
    hp: 20, atk: 4, def: 1, spd: 8,
    turn_notes: 3,
    skills: [
      { id: 151, name: '할퀴기', type: 'attack', cost: 1, power: 0.9, element: 'dark', target: 'single' },
    ],
    drops: [
      { itemId: 'bat_wing', rate: 0.5 },
      { itemId: 'dark_crystal', rate: 0.08 },
    ],
  },

  skeleton: {
    id: 'skeleton',
    name: '스켈레톤',
    element: 'dark',
    origin: 'memory',
    image_sd: null,
    isBoss: false,
    hp: 40, atk: 6, def: 4, spd: 5,
    turn_notes: 3,
    skills: [
      { id: 152, name: '뼈 던지기', type: 'attack', cost: 1, power: 1.0, element: 'dark', target: 'single' },
      { id: 153, name: '뼈 방패', type: 'defense', cost: 1, power: 1, defense_mult: 0.4, element: 'neutral', target: 'self' },
    ],
    drops: [
      { itemId: 'old_bone', rate: 0.5 },
      { itemId: 'dark_crystal', rate: 0.1 },
    ],
  },

  // ========== 파밍 던전: 비트 (골드) ==========
  gold_mimic_low: {
    id: 'gold_mimic_low',
    name: '동전 요정',
    element: 'light',
    origin: 'heart',
    image_sd: null,
    isBoss: false,
    hp: 20, atk: 4, def: 2, spd: 8,
    turn_notes: 2,
    skills: [
      { id: 206, name: '동전 던지기', type: 'attack', cost: 1, power: 0.9, element: 'light', target: 'single' },
    ],
    drops: [],
  },

  gold_mimic_mid: {
    id: 'gold_mimic_mid',
    name: '보석 미믹',
    element: 'light',
    origin: 'heart',
    image_sd: null,
    isBoss: false,
    hp: 55, atk: 10, def: 7, spd: 6,
    turn_notes: 3,
    skills: [
      { id: 207, name: '보석 탄막', type: 'attack', cost: 1, power: 1.0, element: 'light', target: 'single' },
      { id: 208, name: '금화 산사태', type: 'attack', cost: 2, power: 0.8, element: 'light', target: 'aoe' },
    ],
    drops: [],
  },

  gold_mimic_high: {
    id: 'gold_mimic_high',
    name: '황금 골렘',
    element: 'light',
    origin: 'heart',
    image_sd: null,
    isBoss: false,
    hp: 130, atk: 16, def: 14, spd: 5,
    turn_notes: 4,
    skills: [
      { id: 209, name: '황금 주먹', type: 'attack', cost: 1, power: 1.3, element: 'light', target: 'single' },
      { id: 210, name: '재보 투척', type: 'attack', cost: 3, power: 1.1, element: 'light', target: 'aoe' },
      { id: 211, name: '금벽', type: 'defense', cost: 1, power: 1, defense_mult: 0.5, element: 'neutral', target: 'self' },
    ],
    drops: [],
  },

  gold_mimic_top: {
    id: 'gold_mimic_top',
    name: '백금 드래곤',
    element: 'light',
    origin: 'heart',
    image_sd: null,
    isBoss: false,
    hp: 280, atk: 26, def: 22, spd: 7,
    turn_notes: 5,
    skills: [
      { id: 230, name: '백금 브레스', type: 'attack', cost: 2, power: 1.5, element: 'light', target: 'single' },
      { id: 231, name: '보물 폭풍', type: 'attack', cost: 3, power: 1.2, element: 'light', target: 'aoe' },
      { id: 232, name: '백금 갑옷', type: 'defense', cost: 1, power: 1, defense_mult: 0.6, element: 'neutral', target: 'self' },
    ],
    drops: [],
  },

  // ========== 일반 던전 몬스터 (placeholder) ==========
  normal_mob_a: {
    id: 'normal_mob_a', name: '몬스터 A',
    element: 'neutral', origin: 'force',
    hp: 25, atk: 3, def: 2, spd: 5, turn_notes: 2,
    skills: [
      { id: 240, name: '공격 A', type: 'attack', cost: 1, power: 0.8, element: 'neutral', target: 'single' },
    ],
    drops: [],
  },
  normal_mob_b: {
    id: 'normal_mob_b', name: '몬스터 B',
    element: 'fire', origin: 'life',
    hp: 35, atk: 5, def: 3, spd: 6, turn_notes: 2,
    skills: [
      { id: 241, name: '공격 B', type: 'attack', cost: 1, power: 0.9, element: 'fire', target: 'single' },
    ],
    drops: [],
  },
  normal_mob_c: {
    id: 'normal_mob_c', name: '몬스터 C',
    element: 'water', origin: 'season',
    hp: 50, atk: 8, def: 5, spd: 7, turn_notes: 3,
    skills: [
      { id: 242, name: '공격 C', type: 'attack', cost: 1, power: 1.0, element: 'water', target: 'single' },
      { id: 243, name: '방어 C', type: 'defense', cost: 1, power: 1, defense_mult: 0.3, element: 'neutral', target: 'self' },
    ],
    drops: [],
  },
  normal_mob_d: {
    id: 'normal_mob_d', name: '몬스터 D',
    element: 'wind', origin: 'memory',
    hp: 70, atk: 11, def: 8, spd: 7, turn_notes: 3,
    skills: [
      { id: 244, name: '공격 D', type: 'attack', cost: 1, power: 1.0, element: 'wind', target: 'single' },
      { id: 245, name: '방어 D', type: 'defense', cost: 1, power: 1, defense_mult: 0.35, element: 'neutral', target: 'self' },
    ],
    drops: [],
  },
  normal_mob_e: {
    id: 'normal_mob_e', name: '몬스터 E',
    element: 'dark', origin: 'sound',
    hp: 95, atk: 14, def: 10, spd: 8, turn_notes: 3,
    skills: [
      { id: 246, name: '공격 E', type: 'attack', cost: 1, power: 1.1, element: 'dark', target: 'single' },
      { id: 247, name: '범위 공격 E', type: 'attack', cost: 2, power: 0.8, element: 'dark', target: 'aoe' },
    ],
    drops: [],
  },
  normal_mob_f: {
    id: 'normal_mob_f', name: '몬스터 F',
    element: 'light', origin: 'time',
    hp: 120, atk: 17, def: 13, spd: 8, turn_notes: 4,
    skills: [
      { id: 248, name: '공격 F', type: 'attack', cost: 1, power: 1.2, element: 'light', target: 'single' },
      { id: 249, name: '방어 F', type: 'defense', cost: 1, power: 1, defense_mult: 0.4, element: 'neutral', target: 'self' },
    ],
    drops: [],
  },
  normal_mob_g: {
    id: 'normal_mob_g', name: '몬스터 G',
    element: 'fire', origin: 'space',
    hp: 150, atk: 20, def: 16, spd: 9, turn_notes: 4,
    skills: [
      { id: 250, name: '공격 G', type: 'attack', cost: 1, power: 1.2, element: 'fire', target: 'single' },
      { id: 251, name: '범위 공격 G', type: 'attack', cost: 3, power: 1.0, element: 'fire', target: 'aoe' },
      { id: 252, name: '방어 G', type: 'defense', cost: 1, power: 1, defense_mult: 0.45, element: 'neutral', target: 'self' },
    ],
    drops: [],
  },
  normal_mob_h: {
    id: 'normal_mob_h', name: '몬스터 H',
    element: 'water', origin: 'intellect',
    hp: 190, atk: 24, def: 19, spd: 10, turn_notes: 4,
    skills: [
      { id: 253, name: '공격 H', type: 'attack', cost: 2, power: 1.4, element: 'water', target: 'single' },
      { id: 254, name: '범위 공격 H', type: 'attack', cost: 3, power: 1.1, element: 'water', target: 'aoe' },
      { id: 255, name: '방어 H', type: 'defense', cost: 1, power: 1, defense_mult: 0.5, element: 'neutral', target: 'self' },
    ],
    drops: [],
  },
};

// ========== 파밍 던전: 근원별 경험치 몬스터 (자동 생성) ==========
const ORIGIN_LABELS = {
  force: '마력', life: '생명', season: '계절',
  memory: '기억', sound: '소리', time: '시간',
  space: '공간', intellect: '지성', heart: '마음',
};
const NEXT_TIER = { low: 'mid', mid: 'high', high: 'top', top: null };

const WISP_TIERS = {
  low:  { suffix: '의 잔영',   hp: 200, atk: 16, def: 14, spd: 9,  notes: 2, skills: [{ id: 200, name: '흐릿한 빛', type: 'attack', cost: 1, power: 0.9, element: 'neutral', target: 'single' }, { id: 229, name: '약한 응축', type: 'defense', cost: 1, power: 1, defense_mult: 0.25, element: 'neutral', target: 'self' }] },
  mid:  { suffix: '의 파편체', hp: 280, atk: 28, def: 18, spd: 10, notes: 3, skills: [{ id: 201, name: '파편 투사',     type: 'attack', cost: 1, power: 1.0, element: 'neutral', target: 'single' }, { id: 202, name: '근원 산란', type: 'attack', cost: 2, power: 0.9, element: 'neutral', target: 'aoe' }] },
  high: { suffix: '의 결정체', hp: 500, atk: 42, def: 28, spd: 12, notes: 3, skills: [{ id: 203, name: '결정 쇄도',     type: 'attack', cost: 1, power: 1.2, element: 'neutral', target: 'single' }, { id: 204, name: '근원 폭류', type: 'attack', cost: 3, power: 1.0, element: 'neutral', target: 'aoe' }, { id: 205, name: '응축', type: 'defense', cost: 1, power: 1, defense_mult: 0.4, element: 'neutral', target: 'self' }] },
  top:  { suffix: '의 현신',   hp: 750, atk: 58, def: 38, spd: 14, notes: 4, skills: [{ id: 225, name: '고대 결정 쇄도', type: 'attack', cost: 1, power: 1.3, element: 'neutral', target: 'single' }, { id: 226, name: '근원 대폭류', type: 'attack', cost: 3, power: 1.1, element: 'neutral', target: 'aoe' }, { id: 227, name: '고대 응축', type: 'defense', cost: 1, power: 1, defense_mult: 0.5, element: 'neutral', target: 'self' }] },
};

const GUARDIAN_TIERS = {
  low:  { suffix: '의 수호자',     hp: 400,  atk: 22, def: 18, spd: 7,  notes: 3, skills: [{ id: 212, name: '근원의 파동', type: 'attack', cost: 1, power: 1.0, element: 'neutral', target: 'single' }, { id: 213, name: '근원의 일격', type: 'attack', cost: 2, power: 1.4, element: 'neutral', target: 'single' }, { id: 228, name: '약한 방벽', type: 'defense', cost: 1, power: 1, defense_mult: 0.3, element: 'neutral', target: 'self' }] },
  mid:  { suffix: '의 결정 수호자', hp: 550,  atk: 38, def: 24, spd: 9,  notes: 4, skills: [{ id: 214, name: '파편의 빛', type: 'attack', cost: 1, power: 1.0, element: 'neutral', target: 'single' }, { id: 215, name: '결정 사출', type: 'attack', cost: 2, power: 1.4, element: 'neutral', target: 'single' }, { id: 216, name: '근원의 방벽', type: 'defense', cost: 1, power: 1, defense_mult: 0.4, element: 'neutral', target: 'self' }] },
  high: { suffix: '의 태고 수호자', hp: 900,  atk: 55, def: 38, spd: 11, notes: 5, skills: [{ id: 217, name: '결정 포격', type: 'attack', cost: 1, power: 1.2, element: 'neutral', target: 'single' }, { id: 218, name: '근원 연쇄', type: 'attack', cost: 2, power: 1.6, element: 'neutral', target: 'single' }, { id: 219, name: '결정 폭우', type: 'attack', cost: 3, power: 1.0, element: 'neutral', target: 'aoe' }, { id: 220, name: '태고의 방벽', type: 'defense', cost: 1, power: 1, defense_mult: 0.5, element: 'neutral', target: 'self' }] },
  top:  { suffix: '의 시원 수호자', hp: 1400, atk: 75, def: 52, spd: 13, notes: 6, skills: [{ id: 221, name: '태고 결정', type: 'attack', cost: 1, power: 1.3, element: 'neutral', target: 'single' }, { id: 222, name: '근원의 심판', type: 'attack', cost: 2, power: 1.8, element: 'neutral', target: 'single' }, { id: 223, name: '결정 대폭발', type: 'attack', cost: 4, power: 1.2, element: 'neutral', target: 'aoe' }, { id: 224, name: '태고의 수정벽', type: 'defense', cost: 2, power: 1, defense_mult: 0.6, element: 'neutral', target: 'self' }] },
};

for (const origin of ORIGINS) {
  const label = ORIGIN_LABELS[origin];
  for (const [tier, t] of Object.entries(WISP_TIERS)) {
    monsters[`exp_wisp_${origin}_${tier}`] = {
      id: `exp_wisp_${origin}_${tier}`, name: `${label}${t.suffix}`,
      element: 'neutral', origin, image_sd: null, isBoss: false,
      hp: t.hp, atk: t.atk, def: t.def, spd: t.spd, turn_notes: t.notes,
      skills: t.skills,
      drops: [{ itemId: `frag_${origin}_${tier}`, rate: 0.80 }],
    };
  }
  for (const [tier, t] of Object.entries(GUARDIAN_TIERS)) {
    const next = NEXT_TIER[tier];
    const drops = [
      { itemId: `frag_${origin}_${tier}`, rate: 0.90, quantity: 2 },
      ...(next
        ? [{ itemId: `frag_${origin}_${next}`, rate: 0.15 }]
        : [{ itemId: `frag_${origin}_${tier}`, rate: 0.50 }]),
    ];
    monsters[`exp_guardian_${origin}_${tier}`] = {
      id: `exp_guardian_${origin}_${tier}`, name: `${label}${t.suffix}`,
      element: 'neutral', origin, image_sd: null, isBoss: false,
      hp: t.hp, atk: t.atk, def: t.def, spd: t.spd, turn_notes: t.notes,
      skills: t.skills,
      drops,
    };
  }
}

// ========== 승급 던전: 근원 정수 몬스터 (자동 생성) ==========
const STONE_SIZE = { low: 'low', mid: 'medium', high: 'big', top: 'max' };
const AW_WISP_TIERS = {
  low:  { suffix: '의 정수체',     hp: 230, atk: 18, def: 16, spd: 9,  notes: 2, skills: [{ id: 200, name: '흐릿한 빛', type: 'attack', cost: 1, power: 0.9, element: 'neutral', target: 'single' }, { id: 229, name: '약한 응축', type: 'defense', cost: 1, power: 1, defense_mult: 0.25, element: 'neutral', target: 'self' }] },
  mid:  { suffix: '의 정수 결정',   hp: 320, atk: 32, def: 21, spd: 10, notes: 3, skills: [{ id: 201, name: '파편 투사', type: 'attack', cost: 1, power: 1.0, element: 'neutral', target: 'single' }, { id: 202, name: '근원 산란', type: 'attack', cost: 2, power: 0.9, element: 'neutral', target: 'aoe' }] },
  high: { suffix: '의 정수 핵',     hp: 575, atk: 48, def: 32, spd: 12, notes: 3, skills: [{ id: 203, name: '결정 쇄도', type: 'attack', cost: 1, power: 1.2, element: 'neutral', target: 'single' }, { id: 204, name: '근원 폭류', type: 'attack', cost: 3, power: 1.0, element: 'neutral', target: 'aoe' }, { id: 205, name: '응축', type: 'defense', cost: 1, power: 1, defense_mult: 0.4, element: 'neutral', target: 'self' }] },
  top:  { suffix: '의 순수 정수체', hp: 860, atk: 67, def: 44, spd: 14, notes: 4, skills: [{ id: 225, name: '고대 결정 쇄도', type: 'attack', cost: 1, power: 1.3, element: 'neutral', target: 'single' }, { id: 226, name: '근원 대폭류', type: 'attack', cost: 3, power: 1.1, element: 'neutral', target: 'aoe' }, { id: 227, name: '고대 응축', type: 'defense', cost: 1, power: 1, defense_mult: 0.5, element: 'neutral', target: 'self' }] },
};
const AW_GUARD_TIERS = {
  low:  { suffix: '의 정수 수호자',       hp: 460,  atk: 25, def: 21, spd: 7,  notes: 3, skills: [{ id: 212, name: '근원의 파동', type: 'attack', cost: 1, power: 1.0, element: 'neutral', target: 'single' }, { id: 213, name: '근원의 일격', type: 'attack', cost: 2, power: 1.4, element: 'neutral', target: 'single' }, { id: 228, name: '약한 방벽', type: 'defense', cost: 1, power: 1, defense_mult: 0.3, element: 'neutral', target: 'self' }] },
  mid:  { suffix: '의 정수 결정 수호자',   hp: 630,  atk: 44, def: 28, spd: 9,  notes: 4, skills: [{ id: 214, name: '파편의 빛', type: 'attack', cost: 1, power: 1.0, element: 'neutral', target: 'single' }, { id: 215, name: '결정 사출', type: 'attack', cost: 2, power: 1.4, element: 'neutral', target: 'single' }, { id: 216, name: '근원의 방벽', type: 'defense', cost: 1, power: 1, defense_mult: 0.4, element: 'neutral', target: 'self' }] },
  high: { suffix: '의 정수 태고 수호자',   hp: 1035, atk: 63, def: 44, spd: 11, notes: 5, skills: [{ id: 217, name: '결정 포격', type: 'attack', cost: 1, power: 1.2, element: 'neutral', target: 'single' }, { id: 218, name: '근원 연쇄', type: 'attack', cost: 2, power: 1.6, element: 'neutral', target: 'single' }, { id: 219, name: '결정 폭우', type: 'attack', cost: 3, power: 1.0, element: 'neutral', target: 'aoe' }, { id: 220, name: '태고의 방벽', type: 'defense', cost: 1, power: 1, defense_mult: 0.5, element: 'neutral', target: 'self' }] },
  top:  { suffix: '의 정수 시원 수호자',   hp: 1610, atk: 86, def: 60, spd: 13, notes: 6, skills: [{ id: 221, name: '태고 결정', type: 'attack', cost: 1, power: 1.3, element: 'neutral', target: 'single' }, { id: 222, name: '근원의 심판', type: 'attack', cost: 2, power: 1.8, element: 'neutral', target: 'single' }, { id: 223, name: '결정 대폭발', type: 'attack', cost: 4, power: 1.2, element: 'neutral', target: 'aoe' }, { id: 224, name: '태고의 수정벽', type: 'defense', cost: 2, power: 1, defense_mult: 0.6, element: 'neutral', target: 'self' }] },
};

for (const origin of ORIGINS) {
  const label = ORIGIN_LABELS[origin];
  for (const [tier, t] of Object.entries(AW_WISP_TIERS)) {
    monsters[`awaken_wisp_${origin}_${tier}`] = {
      id: `awaken_wisp_${origin}_${tier}`, name: `${label}${t.suffix}`,
      element: 'neutral', origin, image_sd: null, isBoss: false,
      hp: t.hp, atk: t.atk, def: t.def, spd: t.spd, turn_notes: t.notes,
      skills: t.skills,
      drops: [{ itemId: `${origin}stone${STONE_SIZE[tier]}`, rate: 0.65 }],
    };
  }
  for (const [tier, t] of Object.entries(AW_GUARD_TIERS)) {
    const next = NEXT_TIER[tier];
    const nextSize = next ? STONE_SIZE[next] : null;
    const drops = [
      { itemId: `${origin}stone${STONE_SIZE[tier]}`, rate: 0.85, quantity: 2 },
      ...(nextSize
        ? [{ itemId: `${origin}stone${nextSize}`, rate: 0.10 }]
        : [{ itemId: `${origin}stone${STONE_SIZE[tier]}`, rate: 0.40 }]),
    ];
    monsters[`awaken_guardian_${origin}_${tier}`] = {
      id: `awaken_guardian_${origin}_${tier}`, name: `${label}${t.suffix}`,
      element: 'neutral', origin, image_sd: null, isBoss: false,
      hp: t.hp, atk: t.atk, def: t.def, spd: t.spd, turn_notes: t.notes,
      skills: t.skills, drops,
    };
  }
}

// ========== 승급 던전: 속성 코드 몬스터 (자동 생성) ==========
const ELEMENT_LABELS = { fire: '불꽃', water: '물결', wind: '바람', light: '빛', dark: '어둠' };
const ELEMENTS = ['fire', 'water', 'wind', 'light', 'dark'];
const CODE_SIZE = { low: 'small', mid: 'medium', high: 'big', top: 'max' };

const ELEM_WISP_TIERS = {
  low:  { suffix: '의 코드 조각', hp: 230, atk: 18, def: 16, spd: 9,  notes: 2, skills: [{ id: 200, name: '흐릿한 빛', type: 'attack', cost: 1, power: 0.9, element: 'neutral', target: 'single' }, { id: 229, name: '약한 응축', type: 'defense', cost: 1, power: 1, defense_mult: 0.25, element: 'neutral', target: 'self' }] },
  mid:  { suffix: '의 코드 파편', hp: 320, atk: 32, def: 21, spd: 10, notes: 3, skills: [{ id: 201, name: '파편 투사', type: 'attack', cost: 1, power: 1.0, element: 'neutral', target: 'single' }, { id: 202, name: '근원 산란', type: 'attack', cost: 2, power: 0.9, element: 'neutral', target: 'aoe' }] },
  high: { suffix: '의 코드 결정', hp: 575, atk: 48, def: 32, spd: 12, notes: 3, skills: [{ id: 203, name: '결정 쇄도', type: 'attack', cost: 1, power: 1.2, element: 'neutral', target: 'single' }, { id: 204, name: '근원 폭류', type: 'attack', cost: 3, power: 1.0, element: 'neutral', target: 'aoe' }, { id: 205, name: '응축', type: 'defense', cost: 1, power: 1, defense_mult: 0.4, element: 'neutral', target: 'self' }] },
  top:  { suffix: '의 순수 코드',  hp: 860, atk: 67, def: 44, spd: 14, notes: 4, skills: [{ id: 225, name: '고대 결정 쇄도', type: 'attack', cost: 1, power: 1.3, element: 'neutral', target: 'single' }, { id: 226, name: '근원 대폭류', type: 'attack', cost: 3, power: 1.1, element: 'neutral', target: 'aoe' }, { id: 227, name: '고대 응축', type: 'defense', cost: 1, power: 1, defense_mult: 0.5, element: 'neutral', target: 'self' }] },
};
const ELEM_GUARD_TIERS = {
  low:  { suffix: '의 코드 수호자',     hp: 460,  atk: 25, def: 21, spd: 7,  notes: 3, skills: [{ id: 212, name: '근원의 파동', type: 'attack', cost: 1, power: 1.0, element: 'neutral', target: 'single' }, { id: 213, name: '근원의 일격', type: 'attack', cost: 2, power: 1.4, element: 'neutral', target: 'single' }, { id: 228, name: '약한 방벽', type: 'defense', cost: 1, power: 1, defense_mult: 0.3, element: 'neutral', target: 'self' }] },
  mid:  { suffix: '의 코드 결정 수호자', hp: 630,  atk: 44, def: 28, spd: 9,  notes: 4, skills: [{ id: 214, name: '파편의 빛', type: 'attack', cost: 1, power: 1.0, element: 'neutral', target: 'single' }, { id: 215, name: '결정 사출', type: 'attack', cost: 2, power: 1.4, element: 'neutral', target: 'single' }, { id: 216, name: '근원의 방벽', type: 'defense', cost: 1, power: 1, defense_mult: 0.4, element: 'neutral', target: 'self' }] },
  high: { suffix: '의 코드 태고 수호자', hp: 1035, atk: 63, def: 44, spd: 11, notes: 5, skills: [{ id: 217, name: '결정 포격', type: 'attack', cost: 1, power: 1.2, element: 'neutral', target: 'single' }, { id: 218, name: '근원 연쇄', type: 'attack', cost: 2, power: 1.6, element: 'neutral', target: 'single' }, { id: 219, name: '결정 폭우', type: 'attack', cost: 3, power: 1.0, element: 'neutral', target: 'aoe' }, { id: 220, name: '태고의 방벽', type: 'defense', cost: 1, power: 1, defense_mult: 0.5, element: 'neutral', target: 'self' }] },
  top:  { suffix: '의 코드 시원 수호자', hp: 1610, atk: 86, def: 60, spd: 13, notes: 6, skills: [{ id: 221, name: '태고 결정', type: 'attack', cost: 1, power: 1.3, element: 'neutral', target: 'single' }, { id: 222, name: '근원의 심판', type: 'attack', cost: 2, power: 1.8, element: 'neutral', target: 'single' }, { id: 223, name: '결정 대폭발', type: 'attack', cost: 4, power: 1.2, element: 'neutral', target: 'aoe' }, { id: 224, name: '태고의 수정벽', type: 'defense', cost: 2, power: 1, defense_mult: 0.6, element: 'neutral', target: 'self' }] },
};

const ADMIN_CUSTOM_ELEMENTS = ['fire', 'water', 'wind', 'light', 'dark'];

for (const element of ELEMENTS) {
  const label = ELEMENT_LABELS[element];
  if (!ADMIN_CUSTOM_ELEMENTS.includes(element)) {
    for (const [tier, t] of Object.entries(ELEM_WISP_TIERS)) {
      monsters[`awaken_elem_${element}_${tier}`] = {
        id: `awaken_elem_${element}_${tier}`, name: `${label}${t.suffix}`,
        element, origin: 'force', image_sd: null, isBoss: false,
        hp: t.hp, atk: t.atk, def: t.def, spd: t.spd, turn_notes: t.notes,
        skills: t.skills,
        drops: [{ itemId: `${element}code${CODE_SIZE[tier]}`, rate: 0.65 }],
      };
    }
  }
  for (const [tier, t] of Object.entries(ELEM_GUARD_TIERS)) {
    const next = NEXT_TIER[tier];
    const nextSize = next ? CODE_SIZE[next] : null;
    const drops = [
      { itemId: `${element}code${CODE_SIZE[tier]}`, rate: 0.85, quantity: 2 },
      ...(nextSize
        ? [{ itemId: `${element}code${nextSize}`, rate: 0.10 }]
        : [{ itemId: `${element}code${CODE_SIZE[tier]}`, rate: 0.40 }]),
    ];
    monsters[`awaken_elem_guard_${element}_${tier}`] = {
      id: `awaken_elem_guard_${element}_${tier}`, name: `${label}${t.suffix}`,
      element, origin: 'force', image_sd: null, isBoss: false,
      hp: t.hp, atk: t.atk, def: t.def, spd: t.spd, turn_notes: t.notes,
      skills: t.skills, drops,
    };
  }
}

module.exports = monsters;
