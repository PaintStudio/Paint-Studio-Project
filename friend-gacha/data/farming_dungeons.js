/**
 * 파밍 던전 정의
 *
 * type     : 던전 종류 (exp / gold / promo 등)
 * label    : 표시 이름
 * icon     : HTML 엔티티 아이콘
 * difficulties: 난이도별 설정
 *   - key           : low / mid / high
 *   - label         : 표시 이름
 *   - staminaCost   : 스태미나 소모
 *   - recommendedLv : 권장 레벨 (표시용)
 *   - enemies       : [{ id: 몬스터ID, level_scale }]
 *   - rewards       : { gold } — 기본 골드 보상
 *   - drops         : [{ itemId, rate, quantity? }] — 클리어 시 추가 드롭
 */

const gameConfig = require('../gameConfig.json');
const origins = Object.keys(gameConfig.origins);

function randomOrigins(count) {
  const picked = [];
  for (let i = 0; i < count; i++) {
    picked.push(origins[Math.floor(Math.random() * origins.length)]);
  }
  return picked;
}

const farmingDungeons = {
  exp: {
    type: 'exp',
    label: '경험치 수집',
    desc: '경험치 파편을 획득할 수 있는 던전',
    icon: '&#128218;',
    difficulties: {
      low: {
        label: '하급',
        staminaCost: 8,
        recommendedLv: 5,
        enemies: [
          { id: 'exp_wisp_low', level_scale: 1.0 },
          { id: 'exp_wisp_low', level_scale: 1.0 },
          { id: 'exp_wisp_low', level_scale: 1.2 },
        ],
        rewards: { gold: 80 },
        dropTable(origins) {
          return origins.map(o => [
            { itemId: `frag_${o}_low`, rate: 0.7, quantity: 2 },
            { itemId: `frag_${o}_mid`, rate: 0.1 },
          ]).flat();
        },
      },
      mid: {
        label: '중급',
        staminaCost: 14,
        recommendedLv: 15,
        enemies: [
          { id: 'exp_wisp_mid', level_scale: 1.0 },
          { id: 'exp_wisp_mid', level_scale: 1.0 },
          { id: 'exp_wisp_mid', level_scale: 1.3 },
        ],
        rewards: { gold: 150 },
        dropTable(origins) {
          return origins.map(o => [
            { itemId: `frag_${o}_low`, rate: 0.5, quantity: 3 },
            { itemId: `frag_${o}_mid`, rate: 0.45, quantity: 2 },
            { itemId: `frag_${o}_high`, rate: 0.08 },
          ]).flat();
        },
      },
      high: {
        label: '상급',
        staminaCost: 20,
        recommendedLv: 30,
        enemies: [
          { id: 'exp_wisp_high', level_scale: 1.0 },
          { id: 'exp_wisp_high', level_scale: 1.2 },
          { id: 'exp_wisp_high', level_scale: 1.5 },
        ],
        rewards: { gold: 250 },
        dropTable(origins) {
          return origins.map(o => [
            { itemId: `frag_${o}_mid`, rate: 0.6, quantity: 3 },
            { itemId: `frag_${o}_high`, rate: 0.3, quantity: 2 },
          ]).flat();
        },
      },
    },
  },

  gold: {
    type: 'gold',
    label: '비트 수집',
    desc: '비트(골드)를 대량 획득할 수 있는 던전',
    icon: '&#128176;',
    difficulties: {
      low: {
        label: '하급',
        staminaCost: 8,
        recommendedLv: 5,
        enemies: [
          { id: 'gold_mimic_low', level_scale: 1.0 },
          { id: 'gold_mimic_low', level_scale: 1.0 },
          { id: 'gold_mimic_low', level_scale: 1.2 },
        ],
        rewards: { gold: 600 },
        dropTable() { return []; },
      },
      mid: {
        label: '중급',
        staminaCost: 14,
        recommendedLv: 15,
        enemies: [
          { id: 'gold_mimic_mid', level_scale: 1.0 },
          { id: 'gold_mimic_mid', level_scale: 1.0 },
          { id: 'gold_mimic_mid', level_scale: 1.3 },
        ],
        rewards: { gold: 1800 },
        dropTable() { return []; },
      },
      high: {
        label: '상급',
        staminaCost: 20,
        recommendedLv: 30,
        enemies: [
          { id: 'gold_mimic_high', level_scale: 1.0 },
          { id: 'gold_mimic_high', level_scale: 1.2 },
          { id: 'gold_mimic_high', level_scale: 1.5 },
        ],
        rewards: { gold: 4500 },
        dropTable() { return []; },
      },
    },
  },
};

module.exports = { farmingDungeons, randomOrigins };
