/**
 * 레이드 보스 정의
 *
 * phases: HP 비율별 스킬셋 전환 (hpThreshold 이하일 때 해당 스킬 사용)
 * battleHp: 전투 시 사용되는 HP (실제 레이드 HP와 별도)
 * perBattleGold: 매 전투 후 지급되는 골드
 */

const raidBosses = {
  slime_king: {
    name: '거대 슬라임 킹',
    element: 'water',
    origin: 'force',
    maxHp: 30000,
    battleHp: 800,
    atk: 28, def: 18, spd: 8,
    turnNotes: 6,
    isBoss: true,
    phases: [
      {
        hpThreshold: 1.0,
        skills: [
          { id: 500, name: '점액 공격', type: 'attack', cost: 1, power: 1.2, element: 'water', target: 'single' },
          { id: 501, name: '점액 폭풍', type: 'attack', cost: 3, power: 0.9, element: 'water', target: 'aoe' },
          { id: 502, name: '점성 방벽', type: 'defense', cost: 2, power: 1, defense_mult: 0.5, element: 'neutral', target: 'self' },
        ],
      },
      {
        hpThreshold: 0.5,
        skills: [
          { id: 503, name: '강화 점액탄', type: 'attack', cost: 2, power: 2.0, element: 'water', target: 'single' },
          { id: 504, name: '점액 해일', type: 'attack', cost: 3, power: 1.4, element: 'water', target: 'aoe' },
          { id: 505, name: '점성 방벽', type: 'defense', cost: 2, power: 1, defense_mult: 0.6, element: 'neutral', target: 'self' },
        ],
      },
      {
        hpThreshold: 0.2,
        skills: [
          { id: 506, name: '폭주 점액포', type: 'attack', cost: 2, power: 2.5, element: 'water', target: 'single' },
          { id: 507, name: '점액 대해일', type: 'attack', cost: 3, power: 2.0, element: 'water', target: 'aoe' },
        ],
      },
    ],
    perBattleGold: 400,
  },

  fire_guardian: {
    name: '불꽃의 수호자',
    element: 'fire',
    origin: 'season',
    maxHp: 50000,
    battleHp: 1200,
    atk: 35, def: 22, spd: 10,
    turnNotes: 7,
    isBoss: true,
    phases: [
      {
        hpThreshold: 1.0,
        skills: [
          { id: 510, name: '화염 일격', type: 'attack', cost: 1, power: 1.3, element: 'fire', target: 'single' },
          { id: 511, name: '화염 선풍', type: 'attack', cost: 3, power: 1.0, element: 'fire', target: 'aoe' },
          { id: 512, name: '불꽃 갑옷', type: 'defense', cost: 2, power: 1, defense_mult: 0.45, element: 'fire', target: 'self' },
        ],
      },
      {
        hpThreshold: 0.5,
        skills: [
          { id: 513, name: '작열 타격', type: 'attack', cost: 2, power: 2.2, element: 'fire', target: 'single' },
          { id: 514, name: '업화', type: 'attack', cost: 4, power: 1.6, element: 'fire', target: 'aoe' },
          { id: 515, name: '용암 방벽', type: 'defense', cost: 2, power: 1, defense_mult: 0.55, element: 'fire', target: 'self' },
        ],
      },
      {
        hpThreshold: 0.2,
        skills: [
          { id: 516, name: '멸화', type: 'attack', cost: 2, power: 3.0, element: 'fire', target: 'single' },
          { id: 517, name: '화산 분출', type: 'attack', cost: 4, power: 2.2, element: 'fire', target: 'aoe' },
        ],
      },
    ],
    perBattleGold: 500,
  },

  dark_dragon: {
    name: '어둠의 용',
    element: 'dark',
    origin: 'memory',
    maxHp: 80000,
    battleHp: 1500,
    atk: 42, def: 28, spd: 12,
    turnNotes: 8,
    isBoss: true,
    phases: [
      {
        hpThreshold: 1.0,
        skills: [
          { id: 520, name: '암흑 발톱', type: 'attack', cost: 1, power: 1.4, element: 'dark', target: 'single' },
          { id: 521, name: '암흑 브레스', type: 'attack', cost: 3, power: 1.1, element: 'dark', target: 'aoe' },
          { id: 522, name: '용린 방어', type: 'defense', cost: 2, power: 1, defense_mult: 0.5, element: 'neutral', target: 'self' },
        ],
      },
      {
        hpThreshold: 0.6,
        skills: [
          { id: 523, name: '심연 강타', type: 'attack', cost: 2, power: 2.4, element: 'dark', target: 'single' },
          { id: 524, name: '어둠의 숨결', type: 'attack', cost: 4, power: 1.8, element: 'dark', target: 'aoe' },
          { id: 525, name: '용린 강화', type: 'defense', cost: 2, power: 1, defense_mult: 0.6, element: 'dark', target: 'self' },
        ],
      },
      {
        hpThreshold: 0.3,
        skills: [
          { id: 526, name: '멸망의 일격', type: 'attack', cost: 3, power: 3.5, element: 'dark', target: 'single' },
          { id: 527, name: '종말의 브레스', type: 'attack', cost: 5, power: 2.5, element: 'dark', target: 'aoe' },
          { id: 528, name: '용린 결계', type: 'defense', cost: 2, power: 1, defense_mult: 0.7, element: 'dark', target: 'self' },
        ],
      },
    ],
    perBattleGold: 600,
  },
};

const bossRotation = ['slime_king', 'fire_guardian', 'dark_dragon'];

const weeklyRankRewards = [
  { maxRank: 1,        gold: 10000, prism: 200 },
  { maxRank: 3,        gold: 7000,  prism: 150 },
  { maxRank: 10,       gold: 4000,  prism: 80 },
  { maxRank: Infinity, gold: 2000,  prism: 30 },
];

const DAILY_ATTEMPTS = 3;
const RESET_DAY = 4; // 0=일, 1=월, ... 4=목

module.exports = { raidBosses, bossRotation, weeklyRankRewards, DAILY_ATTEMPTS, RESET_DAY };
