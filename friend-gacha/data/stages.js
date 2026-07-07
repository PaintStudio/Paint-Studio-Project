/**
 * 던전(스테이지) 정의 파일
 *
 * 몬스터는 monsters.js에서 id로 참조합니다.
 * 서버 시작 시 DB에 시드되며, 이미 시드된 경우 다시 삽입하지 않습니다.
 * (데이터를 갱신하려면 DB의 stages 테이블을 비우고 재시작)
 *
 * ──────────────────────────────────────────
 * 스테이지 필드 설명:
 * ──────────────────────────────────────────
 * chapter          : 챕터 번호 (1~5)
 * stage_number     : 챕터 내 스테이지 번호
 * name             : 스테이지 표시 이름
 * difficulty       : 난이도 표기 (normal / hard / hell)
 * stamina_cost     : 소모 스태미나
 * recommended_level: 권장 레벨 (표시용)
 *
 * enemies: 적 배치 배열. 각 항목:
 *   - id          : monsters.js의 몬스터 id
 *   - level_scale : 스탯 스케일링 배율 (1.0 = 기본, 1.5 = 50% 강화)
 *                   hp/atk/def/spd에 곱해짐. 생략 시 1.0
 *   - name_override: 이름 덮어쓰기 (선택, "엘리트 슬라임" 등)
 *
 * rewards: 클리어 보상
 *   - gold                : 비트
 *   - exp                 : 경험치
 *   - first_clear_diamond : 첫 클리어 프리즘 (0이면 없음)
 *
 * ──────────────────────────────────────────
 * 예시:
 *   {
 *     chapter: 1, stage_number: 1,
 *     name: '숲 입구',
 *     stamina_cost: 6, recommended_level: 1,
 *     enemies: [
 *       { id: 'slime', level_scale: 1.0 },
 *       { id: 'slime', level_scale: 1.0 },
 *     ],
 *     rewards: { gold: 100, exp: 50, first_clear_diamond: 20 },
 *   }
 * ──────────────────────────────────────────
 */

const stages = [

  // =============================================
  //  챕터 1: 시작의 마을
  // =============================================
  {
    chapter: 1, stage_number: 1,
    name: '마을 외곽',
    stamina_cost: 6, recommended_level: 1,
    enemies: [
      { id: 'slime' },
      { id: 'slime' },
    ],
    rewards: { gold: 130, exp: 70, first_clear_diamond: 20 },
  },
  {
    chapter: 1, stage_number: 2,
    name: '풀밭 길',
    stamina_cost: 6, recommended_level: 2,
    enemies: [
      { id: 'slime' },
      { id: 'goblin' },
    ],
    rewards: { gold: 160, exp: 90, first_clear_diamond: 20 },
  },
  {
    chapter: 1, stage_number: 3,
    name: '낡은 다리',
    stamina_cost: 6, recommended_level: 3,
    enemies: [
      { id: 'goblin' },
      { id: 'goblin' },
    ],
    rewards: { gold: 190, exp: 110, first_clear_diamond: 20 },
  },
  {
    chapter: 1, stage_number: 4,
    name: '늑대 서식지',
    stamina_cost: 6, recommended_level: 4,
    enemies: [
      { id: 'wolf' },
      { id: 'wolf' },
      { id: 'bat' },
    ],
    rewards: { gold: 220, exp: 130, first_clear_diamond: 20 },
  },
  {
    chapter: 1, stage_number: 5,
    name: '어두운 골목',
    stamina_cost: 6, recommended_level: 5,
    enemies: [
      { id: 'goblin', level_scale: 1.2 },
      { id: 'wolf' },
      { id: 'bat' },
    ],
    rewards: { gold: 250, exp: 150, first_clear_diamond: 20 },
  },
  {
    chapter: 1, stage_number: 6,
    name: '폐허 광장',
    stamina_cost: 6, recommended_level: 6,
    enemies: [
      { id: 'skeleton' },
      { id: 'goblin', level_scale: 1.3 },
      { id: 'wolf', level_scale: 1.2 },
    ],
    rewards: { gold: 280, exp: 170, first_clear_diamond: 20 },
  },
  {
    chapter: 1, stage_number: 7,
    name: '골렘 전초지',
    stamina_cost: 6, recommended_level: 7,
    enemies: [
      { id: 'skeleton', level_scale: 1.3 },
      { id: 'goblin', level_scale: 1.5 },
      { id: 'wolf', level_scale: 1.3 },
      { id: 'slime', level_scale: 1.5 },
    ],
    rewards: { gold: 310, exp: 190, first_clear_diamond: 20 },
  },
  {
    chapter: 1, stage_number: 8,
    name: '마을 수호자 (보스)',
    stamina_cost: 10, recommended_level: 8,
    enemies: [
      { id: 'goblin', level_scale: 1.5 },
      { id: 'skeleton', level_scale: 1.3 },
      { id: 'village_boss' },
    ],
    rewards: { gold: 500, exp: 300, first_clear_diamond: 50 },
  },

  // =============================================
  //  챕터 2: 어둠의 숲
  // =============================================
  {
    chapter: 2, stage_number: 1,
    name: '숲 입구',
    stamina_cost: 6, recommended_level: 9,
    enemies: [
      { id: 'treant' },
      { id: 'mushroom' },
    ],
    rewards: { gold: 370, exp: 230, first_clear_diamond: 20 },
  },
  {
    chapter: 2, stage_number: 2,
    name: '이끼낀 길',
    stamina_cost: 6, recommended_level: 10,
    enemies: [
      { id: 'treant' },
      { id: 'mushroom' },
      { id: 'bat' },
    ],
    rewards: { gold: 400, exp: 250, first_clear_diamond: 20 },
  },
  {
    chapter: 2, stage_number: 3,
    name: '박쥐 동굴',
    stamina_cost: 6, recommended_level: 11,
    enemies: [
      { id: 'shadow_bat' },
      { id: 'shadow_bat' },
      { id: 'bat', level_scale: 1.5 },
    ],
    rewards: { gold: 430, exp: 270, first_clear_diamond: 20 },
  },
  {
    chapter: 2, stage_number: 4,
    name: '독버섯 군락',
    stamina_cost: 6, recommended_level: 12,
    enemies: [
      { id: 'mushroom', level_scale: 1.3 },
      { id: 'mushroom', level_scale: 1.3 },
      { id: 'treant', level_scale: 1.2 },
    ],
    rewards: { gold: 460, exp: 290, first_clear_diamond: 20 },
  },
  {
    chapter: 2, stage_number: 5,
    name: '고대 나무숲',
    stamina_cost: 6, recommended_level: 13,
    enemies: [
      { id: 'treant', level_scale: 1.4 },
      { id: 'shadow_bat', level_scale: 1.2 },
      { id: 'mushroom', level_scale: 1.3 },
    ],
    rewards: { gold: 490, exp: 310, first_clear_diamond: 20 },
  },
  {
    chapter: 2, stage_number: 6,
    name: '그림자 습지',
    stamina_cost: 6, recommended_level: 14,
    enemies: [
      { id: 'shadow_bat', level_scale: 1.3 },
      { id: 'skeleton', level_scale: 1.5 },
      { id: 'mushroom', level_scale: 1.4 },
    ],
    rewards: { gold: 520, exp: 330, first_clear_diamond: 20 },
  },
  {
    chapter: 2, stage_number: 7,
    name: '엔트의 정원',
    stamina_cost: 6, recommended_level: 15,
    enemies: [
      { id: 'treant', level_scale: 1.6 },
      { id: 'treant', level_scale: 1.4 },
      { id: 'shadow_bat', level_scale: 1.4 },
      { id: 'mushroom', level_scale: 1.5 },
    ],
    rewards: { gold: 550, exp: 350, first_clear_diamond: 20 },
  },
  {
    chapter: 2, stage_number: 8,
    name: '숲의 심장부 (보스)',
    stamina_cost: 10, recommended_level: 16,
    enemies: [
      { id: 'treant', level_scale: 1.5 },
      { id: 'shadow_bat', level_scale: 1.5 },
      { id: 'forest_boss' },
    ],
    rewards: { gold: 800, exp: 500, first_clear_diamond: 50 },
  },

  // =============================================
  //  챕터 3: 불꽃의 산
  // =============================================
  {
    chapter: 3, stage_number: 1,
    name: '산기슭',
    stamina_cost: 6, recommended_level: 17,
    enemies: [
      { id: 'fire_imp' },
      { id: 'fire_imp' },
    ],
    rewards: { gold: 610, exp: 390, first_clear_diamond: 20 },
  },
  {
    chapter: 3, stage_number: 2,
    name: '용암 지대',
    stamina_cost: 6, recommended_level: 18,
    enemies: [
      { id: 'fire_imp', level_scale: 1.1 },
      { id: 'lava_golem' },
    ],
    rewards: { gold: 640, exp: 410, first_clear_diamond: 20 },
  },
  {
    chapter: 3, stage_number: 3,
    name: '화산 동굴',
    stamina_cost: 6, recommended_level: 19,
    enemies: [
      { id: 'fire_imp', level_scale: 1.2 },
      { id: 'fire_imp', level_scale: 1.2 },
      { id: 'lava_golem' },
    ],
    rewards: { gold: 670, exp: 430, first_clear_diamond: 20 },
  },
  {
    chapter: 3, stage_number: 4,
    name: '마그마 호수',
    stamina_cost: 6, recommended_level: 20,
    enemies: [
      { id: 'lava_golem', level_scale: 1.2 },
      { id: 'fire_imp', level_scale: 1.3 },
      { id: 'fire_imp', level_scale: 1.3 },
    ],
    rewards: { gold: 700, exp: 450, first_clear_diamond: 20 },
  },
  {
    chapter: 3, stage_number: 5,
    name: '분화구 입구',
    stamina_cost: 6, recommended_level: 21,
    enemies: [
      { id: 'lava_golem', level_scale: 1.3 },
      { id: 'lava_golem', level_scale: 1.2 },
      { id: 'fire_imp', level_scale: 1.4 },
    ],
    rewards: { gold: 730, exp: 470, first_clear_diamond: 20 },
  },
  {
    chapter: 3, stage_number: 6,
    name: '용암 폭포',
    stamina_cost: 6, recommended_level: 22,
    enemies: [
      { id: 'lava_golem', level_scale: 1.4 },
      { id: 'fire_imp', level_scale: 1.5 },
      { id: 'skeleton', level_scale: 2.0, name_override: '화염 스켈레톤' },
    ],
    rewards: { gold: 760, exp: 490, first_clear_diamond: 20 },
  },
  {
    chapter: 3, stage_number: 7,
    name: '화산 정상 전초',
    stamina_cost: 6, recommended_level: 23,
    enemies: [
      { id: 'lava_golem', level_scale: 1.5 },
      { id: 'lava_golem', level_scale: 1.3 },
      { id: 'fire_imp', level_scale: 1.6 },
      { id: 'fire_imp', level_scale: 1.5 },
    ],
    rewards: { gold: 790, exp: 510, first_clear_diamond: 20 },
  },
  {
    chapter: 3, stage_number: 8,
    name: '화산의 군주 (보스)',
    stamina_cost: 10, recommended_level: 24,
    enemies: [
      { id: 'lava_golem', level_scale: 1.5 },
      { id: 'fire_imp', level_scale: 1.6 },
      { id: 'volcano_boss' },
    ],
    rewards: { gold: 1200, exp: 700, first_clear_diamond: 50 },
  },

  // =============================================
  //  챕터 4: 심해 동굴
  // =============================================
  {
    chapter: 4, stage_number: 1,
    name: '해안 동굴',
    stamina_cost: 6, recommended_level: 25,
    enemies: [
      { id: 'sea_serpent' },
      { id: 'jellyfish' },
    ],
    rewards: { gold: 850, exp: 550, first_clear_diamond: 20 },
  },
  {
    chapter: 4, stage_number: 2,
    name: '수중 통로',
    stamina_cost: 6, recommended_level: 26,
    enemies: [
      { id: 'sea_serpent', level_scale: 1.1 },
      { id: 'sea_serpent', level_scale: 1.1 },
      { id: 'jellyfish' },
    ],
    rewards: { gold: 880, exp: 570, first_clear_diamond: 20 },
  },
  {
    chapter: 4, stage_number: 3,
    name: '산호 정원',
    stamina_cost: 6, recommended_level: 27,
    enemies: [
      { id: 'jellyfish', level_scale: 1.2 },
      { id: 'jellyfish', level_scale: 1.2 },
      { id: 'sea_serpent', level_scale: 1.2 },
    ],
    rewards: { gold: 910, exp: 590, first_clear_diamond: 20 },
  },
  {
    chapter: 4, stage_number: 4,
    name: '심해 협곡',
    stamina_cost: 6, recommended_level: 28,
    enemies: [
      { id: 'sea_serpent', level_scale: 1.3 },
      { id: 'jellyfish', level_scale: 1.3 },
      { id: 'shadow_bat', level_scale: 1.8, name_override: '심해 아귀' },
    ],
    rewards: { gold: 940, exp: 610, first_clear_diamond: 20 },
  },
  {
    chapter: 4, stage_number: 5,
    name: '해저 유적',
    stamina_cost: 6, recommended_level: 29,
    enemies: [
      { id: 'sea_serpent', level_scale: 1.4 },
      { id: 'skeleton', level_scale: 2.2, name_override: '해저 망령' },
      { id: 'jellyfish', level_scale: 1.4 },
    ],
    rewards: { gold: 970, exp: 630, first_clear_diamond: 20 },
  },
  {
    chapter: 4, stage_number: 6,
    name: '해구',
    stamina_cost: 6, recommended_level: 30,
    enemies: [
      { id: 'sea_serpent', level_scale: 1.5 },
      { id: 'sea_serpent', level_scale: 1.4 },
      { id: 'jellyfish', level_scale: 1.5 },
    ],
    rewards: { gold: 1000, exp: 650, first_clear_diamond: 20 },
  },
  {
    chapter: 4, stage_number: 7,
    name: '크라켄의 둥지',
    stamina_cost: 6, recommended_level: 31,
    enemies: [
      { id: 'sea_serpent', level_scale: 1.6 },
      { id: 'sea_serpent', level_scale: 1.5 },
      { id: 'jellyfish', level_scale: 1.6 },
      { id: 'jellyfish', level_scale: 1.4 },
    ],
    rewards: { gold: 1030, exp: 670, first_clear_diamond: 20 },
  },
  {
    chapter: 4, stage_number: 8,
    name: '심해의 왕 (보스)',
    stamina_cost: 10, recommended_level: 32,
    enemies: [
      { id: 'sea_serpent', level_scale: 1.6 },
      { id: 'jellyfish', level_scale: 1.5 },
      { id: 'deep_sea_boss' },
    ],
    rewards: { gold: 1600, exp: 900, first_clear_diamond: 50 },
  },

  // =============================================
  //  챕터 5: 빛의 탑
  // =============================================
  {
    chapter: 5, stage_number: 1,
    name: '탑 1층',
    stamina_cost: 6, recommended_level: 33,
    enemies: [
      { id: 'light_spirit' },
      { id: 'light_spirit' },
    ],
    rewards: { gold: 1090, exp: 710, first_clear_diamond: 20 },
  },
  {
    chapter: 5, stage_number: 2,
    name: '탑 3층',
    stamina_cost: 6, recommended_level: 34,
    enemies: [
      { id: 'light_spirit', level_scale: 1.1 },
      { id: 'dark_knight' },
    ],
    rewards: { gold: 1120, exp: 730, first_clear_diamond: 20 },
  },
  {
    chapter: 5, stage_number: 3,
    name: '탑 5층',
    stamina_cost: 6, recommended_level: 35,
    enemies: [
      { id: 'dark_knight', level_scale: 1.1 },
      { id: 'dark_knight' },
      { id: 'light_spirit', level_scale: 1.2 },
    ],
    rewards: { gold: 1150, exp: 750, first_clear_diamond: 20 },
  },
  {
    chapter: 5, stage_number: 4,
    name: '탑 7층',
    stamina_cost: 6, recommended_level: 36,
    enemies: [
      { id: 'light_spirit', level_scale: 1.3 },
      { id: 'dark_knight', level_scale: 1.2 },
      { id: 'skeleton', level_scale: 2.5, name_override: '빛의 시종' },
    ],
    rewards: { gold: 1180, exp: 770, first_clear_diamond: 20 },
  },
  {
    chapter: 5, stage_number: 5,
    name: '탑 10층',
    stamina_cost: 6, recommended_level: 37,
    enemies: [
      { id: 'dark_knight', level_scale: 1.3 },
      { id: 'light_spirit', level_scale: 1.4 },
      { id: 'dark_knight', level_scale: 1.2 },
    ],
    rewards: { gold: 1210, exp: 790, first_clear_diamond: 20 },
  },
  {
    chapter: 5, stage_number: 6,
    name: '탑 15층',
    stamina_cost: 6, recommended_level: 38,
    enemies: [
      { id: 'dark_knight', level_scale: 1.4 },
      { id: 'light_spirit', level_scale: 1.5 },
      { id: 'dark_knight', level_scale: 1.3 },
    ],
    rewards: { gold: 1240, exp: 810, first_clear_diamond: 20 },
  },
  {
    chapter: 5, stage_number: 7,
    name: '탑 최상층 전실',
    stamina_cost: 6, recommended_level: 39,
    enemies: [
      { id: 'dark_knight', level_scale: 1.5 },
      { id: 'dark_knight', level_scale: 1.4 },
      { id: 'light_spirit', level_scale: 1.6 },
      { id: 'light_spirit', level_scale: 1.5 },
    ],
    rewards: { gold: 1270, exp: 830, first_clear_diamond: 20 },
  },
  {
    chapter: 5, stage_number: 8,
    name: '탑의 수호자 (보스)',
    stamina_cost: 10, recommended_level: 40,
    enemies: [
      { id: 'dark_knight', level_scale: 1.5 },
      { id: 'light_spirit', level_scale: 1.5 },
      { id: 'tower_boss' },
    ],
    rewards: { gold: 2000, exp: 1200, first_clear_diamond: 50 },
  },
];

module.exports = stages;
