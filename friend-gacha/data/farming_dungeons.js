/**
 * 파밍 던전 정의
 *
 * 구성: 잡몹(Type A) x3 + 수호자(Type B) x1 = 총 4마리
 * 근원 소재 던전: 근원별 전용 몬스터 사용 (monsters.js에서 자동 생성)
 */

const TIERS = ['low', 'mid', 'high', 'top'];
const TIER_LABELS = { low: '하급', mid: '중급', high: '상급', top: '최상급' };
const TIER_STAMINA = { low: 8, mid: 14, high: 20, top: 25 };
const TIER_REC_LV = { low: 10, mid: 30, high: 50, top: 70 };
const TIER_GOLD = { low: 100, mid: 250, high: 450, top: 700 };
const TIER_FIRST_CLEAR_PRISM = { low: 10, mid: 20, high: 40, top: 60 };

function makeOriginEnemies(tier, origin) {
  return [
    { id: `exp_wisp_${origin}_${tier}`, level_scale: 1.0 },
    { id: `exp_wisp_${origin}_${tier}`, level_scale: 1.0 },
    { id: `exp_wisp_${origin}_${tier}`, level_scale: 1.1 },
    { id: `exp_guardian_${origin}_${tier}`, level_scale: 1.0 },
  ];
}

function makeDifficulties(enemyFn, firstClearOverrides) {
  const result = {};
  for (const tier of TIERS) {
    const fc = firstClearOverrides?.[tier] || {};
    result[tier] = {
      label: TIER_LABELS[tier],
      staminaCost: TIER_STAMINA[tier],
      recommendedLv: TIER_REC_LV[tier],
      enemies: enemyFn(tier),
      rewards: { gold: TIER_GOLD[tier], firstClear: { prism: TIER_FIRST_CLEAR_PRISM[tier], ...fc } },
    };
  }
  return result;
}

const ORIGIN_META = {
  force:     { label: '마력',   icon: '&#128171;', days: [1, 4, 0] },
  life:      { label: '생명',   icon: '&#127807;', days: [1, 4, 0] },
  season:    { label: '계절',   icon: '&#127808;', days: [1, 4, 0] },
  memory:    { label: '기억',   icon: '&#128218;', days: [2, 5, 0] },
  sound:     { label: '소리',   icon: '&#127925;', days: [2, 5, 0] },
  time:      { label: '시간',   icon: '&#9202;',   days: [2, 5, 0] },
  space:     { label: '공간',   icon: '&#127756;', days: [3, 6, 0] },
  intellect: { label: '지성',   icon: '&#128214;', days: [3, 6, 0] },
  heart:     { label: '마음',   icon: '&#10084;',  days: [3, 6, 0] },
};

const GOLD_TIER_REWARDS = { low: 800, mid: 2500, high: 6000, top: 10000 };

function makeGoldEnemies(tier) {
  return [
    { id: `gold_mimic_${tier}`, level_scale: 1.0 },
    { id: `gold_mimic_${tier}`, level_scale: 1.0 },
    { id: `gold_mimic_${tier}`, level_scale: 1.1 },
    { id: `gold_mimic_${tier}`, level_scale: 1.3 },
  ];
}

const goldDiffs = makeDifficulties(makeGoldEnemies);
for (const [tier, diff] of Object.entries(goldDiffs)) {
  diff.rewards.gold = GOLD_TIER_REWARDS[tier];
}

const farmingDungeons = {
  gold: {
    type: 'farming',
    label: '비트 수집',
    desc: '비트(골드)를 대량 획득할 수 있는 던전',
    icon: '&#128176;',
    alwaysOpen: true,
    difficulties: goldDiffs,
  },
};

for (const [origin, meta] of Object.entries(ORIGIN_META)) {
  farmingDungeons[`origin_${origin}`] = {
    type: 'farming',
    label: meta.label,
    dungeonGroup: '근원 소재 수집',
    desc: '근원별 경험치 파편 집중 획득 (요일별 개방)',
    icon: '&#128302;',
    openDays: meta.days,
    difficulties: makeDifficulties(tier => makeOriginEnemies(tier, origin)),
  };
}

// ========== 승급 소재: 근원 정수 (3근원 묶음, 랜덤 출현) ==========
const ORIGIN_BUNDLES = [
  { key: 'awaken_origin_1', origins: ['force', 'life', 'season'], label: '승급: 마력/생명/계절', days: [1, 4, 0], icon: '&#128302;' },
  { key: 'awaken_origin_2', origins: ['memory', 'sound', 'time'], label: '승급: 기억/소리/시간', days: [2, 5, 0], icon: '&#128302;' },
  { key: 'awaken_origin_3', origins: ['space', 'intellect', 'heart'], label: '승급: 공간/지성/마음', days: [3, 6, 0], icon: '&#128302;' },
];

for (const bundle of ORIGIN_BUNDLES) {
  farmingDungeons[bundle.key] = {
    type: 'farming',
    label: bundle.label,
    dungeonGroup: '승급 소재: 근원',
    desc: '근원별 승급 정수 획득 (랜덤 출현, 요일별 개방)',
    icon: bundle.icon,
    openDays: bundle.days,
    difficulties: makeDifficulties(tier => [
      { pool: bundle.origins.map(o => `awaken_wisp_${o}_${tier}`), level_scale: 1.0 },
      { pool: bundle.origins.map(o => `awaken_wisp_${o}_${tier}`), level_scale: 1.0 },
      { pool: bundle.origins.map(o => `awaken_wisp_${o}_${tier}`), level_scale: 1.1 },
      { pool: bundle.origins.map(o => `awaken_guardian_${o}_${tier}`), level_scale: 1.0 },
    ]),
  };
}

// ========== 승급 소재: 속성 코드 (속성별 1개) ==========
const ELEMENT_DUNGEONS = {
  fire:  { label: '승급: 불꽃',  icon: '&#128308;' },
  water: { label: '승급: 물결',  icon: '&#128309;' },
  wind:  { label: '승급: 바람',  icon: '&#128994;' },
  light: { label: '승급: 빛',   icon: '&#128993;' },
  dark:  { label: '승급: 어둠',  icon: '&#9899;' },
};

for (const [element, meta] of Object.entries(ELEMENT_DUNGEONS)) {
  farmingDungeons[`awaken_${element}`] = {
    type: 'farming',
    label: meta.label,
    dungeonGroup: '승급 소재: 속성',
    desc: `${meta.label} 코드 획득`,
    icon: meta.icon,
    alwaysOpen: true,
    difficulties: makeDifficulties(tier => [
      { id: `awaken_elem_${element}_${tier}`, level_scale: 1.0 },
      { id: `awaken_elem_${element}_${tier}`, level_scale: 1.0 },
      { id: `awaken_elem_${element}_${tier}`, level_scale: 1.1 },
      { id: `awaken_elem_guard_${element}_${tier}`, level_scale: 1.0 },
    ]),
  };
}

// ========== 일반 던전 (난이도 없음, Lv.1~30) ==========
const NORMAL_DUNGEONS = [
  { key: 'normal_01', label: '던전 1', lv: 1,  stamina: 3,  gold: 30,  prism: 40, mobs: ['normal_mob_a', 'normal_mob_a', 'normal_mob_a', 'normal_mob_b'] },
  { key: 'normal_02', label: '던전 2', lv: 5,  stamina: 4,  gold: 60,  prism: 40, mobs: ['normal_mob_b', 'normal_mob_b', 'normal_mob_c', 'normal_mob_c'] },
  { key: 'normal_03', label: '던전 3', lv: 10, stamina: 5,  gold: 100, prism: 40, mobs: ['normal_mob_c', 'normal_mob_c', 'normal_mob_d', 'normal_mob_d'] },
  { key: 'normal_04', label: '던전 4', lv: 15, stamina: 6,  gold: 150, prism: 40, mobs: ['normal_mob_d', 'normal_mob_d', 'normal_mob_e', 'normal_mob_e'] },
  { key: 'normal_05', label: '던전 5', lv: 20, stamina: 7,  gold: 200, prism: 40, mobs: ['normal_mob_e', 'normal_mob_e', 'normal_mob_f', 'normal_mob_f'] },
  { key: 'normal_06', label: '던전 6', lv: 25, stamina: 8,  gold: 280, prism: 40, mobs: ['normal_mob_f', 'normal_mob_f', 'normal_mob_g', 'normal_mob_g'] },
  { key: 'normal_07', label: '던전 7', lv: 30, stamina: 10, gold: 400, prism: 40, mobs: ['normal_mob_g', 'normal_mob_g', 'normal_mob_h', 'normal_mob_h'] },
];

for (const nd of NORMAL_DUNGEONS) {
  farmingDungeons[nd.key] = {
    type: 'normal',
    label: nd.label,
    dungeonGroup: '일반 던전',
    desc: '일반 탐색 던전',
    icon: '&#9876;',
    alwaysOpen: true,
    difficulties: {
      normal: {
        label: '',
        staminaCost: nd.stamina,
        recommendedLv: nd.lv,
        enemies: nd.mobs.map((id, i) => ({ id, level_scale: i === 3 ? 1.2 : 1.0 })),
        rewards: { gold: nd.gold, firstClear: { prism: nd.prism } },
      },
    },
  };
}

module.exports = { farmingDungeons, ORIGIN_META };
