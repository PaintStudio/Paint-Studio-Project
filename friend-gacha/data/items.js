/**
 * 아이템 정의 파일 (어드민에서 자동 생성)
 *
 * 몬스터(monsters.js)의 drops에서 id로 참조합니다.
 * 유저 인벤토리(user_items 테이블)에 수량으로 저장됩니다.
 */

const items = {

  golem_core: {
      "id": "golem_core",
      "name": "골렘 핵",
      "description": "마을 수호 골렘의 동력원. 대지의 힘이 깃들어 있다",
      "category": "boss",
      "rarity": "SR",
      "image": "/uploads/items/golem_core.png",
      "icon": "&#128296;"
  },

  ent_heart: {
      "id": "ent_heart",
      "name": "엔트의 심장목",
      "description": "수백 년 된 엔트의 핵심 목재",
      "category": "boss",
      "rarity": "SR",
      "image": "/uploads/items/ent_heart.png",
      "icon": "&#127811;"
  },

  volcano_jewel: {
      "id": "volcano_jewel",
      "name": "화산 보석",
      "description": "화산의 군주가 품고 있던 극열의 보석",
      "category": "boss",
      "rarity": "SSR",
      "image": "/uploads/items/volcano_jewel.png",
      "icon": "&#128142;"
  },

  kraken_ink: {
      "id": "kraken_ink",
      "name": "크라켄 잉크",
      "description": "심해의 왕이 내뿜는 특수한 먹물",
      "category": "boss",
      "rarity": "SSR",
      "image": "/uploads/items/kraken_ink.png",
      "icon": "&#127754;"
  },

  guardian_crest: {
      "id": "guardian_crest",
      "name": "수호자의 문장",
      "description": "탑의 수호자가 남긴 신성한 문장. 강력한 힘이 봉인되어 있다",
      "category": "boss",
      "rarity": "SSR",
      "image": "/uploads/items/guardian_crest.png",
      "icon": "&#127775;"
  },

  stamina_drink_s: {
      "id": "stamina_drink_s",
      "name": "스태미나 음료 (소)",
      "description": "스태미나를 20 회복한다",
      "category": "consumable",
      "rarity": "N",
      "icon": "&#9889;",
      "effect": {
          "type": "stamina",
          "value": 20
      }
  },

  stamina_drink: {
      "id": "stamina_drink",
      "name": "스태미나 음료 (중)",
      "description": "스태미나를 50 회복한다",
      "category": "consumable",
      "rarity": "R",
      "icon": "&#9889;",
      "effect": {
          "type": "stamina",
          "value": 50
      }
  },

  stamina_drink_l: {
      "id": "stamina_drink_l",
      "name": "스태미나 음료 (대)",
      "description": "스태미나를 전부 회복한다",
      "category": "consumable",
      "rarity": "SR",
      "icon": "&#9889;",
      "effect": {
          "type": "stamina",
          "value": 9999
      }
  },

  frag_time_low: {
      "id": "frag_time_low",
      "name": "시간의 하급 파편",
      "description": "시간 근원의 하급 경험치 파편",
      "category": "consumable",
      "rarity": "N",
      "icon": "&#9679;",
      "color": "#4fc3f7",
      "effect": {
          "type": "exp",
          "value": 500,
          "origin": "time"
      }
  },

  frag_time_mid: {
      "id": "frag_time_mid",
      "name": "시간의 중급 파편",
      "description": "시간 근원의 중급 경험치 파편",
      "category": "consumable",
      "rarity": "R",
      "icon": "&#9679;",
      "color": "#4fc3f7",
      "effect": {
          "type": "exp",
          "value": 2500,
          "origin": "time"
      }
  },

  frag_time_high: {
      "id": "frag_time_high",
      "name": "시간의 상급 파편",
      "description": "시간 근원의 상급 경험치 파편",
      "category": "consumable",
      "rarity": "SR",
      "icon": "&#9679;",
      "color": "#4fc3f7",
      "effect": {
          "type": "exp",
          "value": 10000,
          "origin": "time"
      }
  },

  frag_space_low: {
      "id": "frag_space_low",
      "name": "공간의 하급 파편",
      "description": "공간 근원의 하급 경험치 파편",
      "category": "consumable",
      "rarity": "N",
      "icon": "&#9679;",
      "color": "#7e57c2",
      "effect": {
          "type": "exp",
          "value": 500,
          "origin": "space"
      }
  },

  frag_space_mid: {
      "id": "frag_space_mid",
      "name": "공간의 중급 파편",
      "description": "공간 근원의 중급 경험치 파편",
      "category": "consumable",
      "rarity": "R",
      "icon": "&#9679;",
      "color": "#7e57c2",
      "effect": {
          "type": "exp",
          "value": 2500,
          "origin": "space"
      }
  },

  frag_space_high: {
      "id": "frag_space_high",
      "name": "공간의 상급 파편",
      "description": "공간 근원의 상급 경험치 파편",
      "category": "consumable",
      "rarity": "SR",
      "icon": "&#9679;",
      "color": "#7e57c2",
      "effect": {
          "type": "exp",
          "value": 10000,
          "origin": "space"
      }
  },

  frag_life_low: {
      "id": "frag_life_low",
      "name": "생명의 하급 파편",
      "description": "생명 근원의 하급 경험치 파편",
      "category": "consumable",
      "rarity": "N",
      "icon": "&#9679;",
      "color": "#66bb6a",
      "effect": {
          "type": "exp",
          "value": 500,
          "origin": "life"
      }
  },

  frag_life_mid: {
      "id": "frag_life_mid",
      "name": "생명의 중급 파편",
      "description": "생명 근원의 중급 경험치 파편",
      "category": "consumable",
      "rarity": "R",
      "icon": "&#9679;",
      "color": "#66bb6a",
      "effect": {
          "type": "exp",
          "value": 2500,
          "origin": "life"
      },
      "flavor": ""
  },

  frag_life_high: {
      "id": "frag_life_high",
      "name": "생명의 상급 파편",
      "description": "생명 근원의 상급 경험치 파편",
      "category": "consumable",
      "rarity": "SR",
      "icon": "&#9679;",
      "color": "#66bb6a",
      "effect": {
          "type": "exp",
          "value": 10000,
          "origin": "life"
      }
  },

  frag_heart_low: {
      "id": "frag_heart_low",
      "name": "마음의 하급 파편",
      "description": "마음 근원의 하급 경험치 파편",
      "category": "consumable",
      "rarity": "N",
      "icon": "&#9679;",
      "color": "#ef5350",
      "effect": {
          "type": "exp",
          "value": 500,
          "origin": "heart"
      }
  },

  frag_heart_mid: {
      "id": "frag_heart_mid",
      "name": "마음의 중급 파편",
      "description": "마음 근원의 중급 경험치 파편",
      "category": "consumable",
      "rarity": "R",
      "icon": "&#9679;",
      "color": "#ef5350",
      "effect": {
          "type": "exp",
          "value": 2500,
          "origin": "heart"
      }
  },

  frag_heart_high: {
      "id": "frag_heart_high",
      "name": "마음의 상급 파편",
      "description": "마음 근원의 상급 경험치 파편",
      "category": "consumable",
      "rarity": "SR",
      "icon": "&#9679;",
      "color": "#ef5350",
      "effect": {
          "type": "exp",
          "value": 10000,
          "origin": "heart"
      }
  },

  frag_intellect_low: {
      "id": "frag_intellect_low",
      "name": "지성의 하급 파편",
      "description": "지성 근원의 하급 경험치 파편",
      "category": "consumable",
      "rarity": "N",
      "icon": "&#9679;",
      "color": "#42a5f5",
      "effect": {
          "type": "exp",
          "value": 500,
          "origin": "intellect"
      }
  },

  frag_intellect_mid: {
      "id": "frag_intellect_mid",
      "name": "지성의 중급 파편",
      "description": "지성 근원의 중급 경험치 파편",
      "category": "consumable",
      "rarity": "R",
      "icon": "&#9679;",
      "color": "#42a5f5",
      "effect": {
          "type": "exp",
          "value": 2500,
          "origin": "intellect"
      }
  },

  frag_intellect_high: {
      "id": "frag_intellect_high",
      "name": "지성의 상급 파편",
      "description": "지성 근원의 상급 경험치 파편",
      "category": "consumable",
      "rarity": "SR",
      "icon": "&#9679;",
      "color": "#42a5f5",
      "effect": {
          "type": "exp",
          "value": 10000,
          "origin": "intellect"
      }
  },

  frag_memory_low: {
      "id": "frag_memory_low",
      "name": "기억의 하급 파편",
      "description": "기억 근원의 하급 경험치 파편",
      "category": "consumable",
      "rarity": "N",
      "icon": "&#9679;",
      "color": "#ab47bc",
      "effect": {
          "type": "exp",
          "value": 500,
          "origin": "memory"
      }
  },

  frag_memory_mid: {
      "id": "frag_memory_mid",
      "name": "기억의 중급 파편",
      "description": "기억 근원의 중급 경험치 파편",
      "category": "consumable",
      "rarity": "R",
      "icon": "&#9679;",
      "color": "#ab47bc",
      "effect": {
          "type": "exp",
          "value": 2500,
          "origin": "memory"
      }
  },

  frag_memory_high: {
      "id": "frag_memory_high",
      "name": "기억의 상급 파편",
      "description": "기억 근원의 상급 경험치 파편",
      "category": "consumable",
      "rarity": "SR",
      "icon": "&#9679;",
      "color": "#ab47bc",
      "effect": {
          "type": "exp",
          "value": 10000,
          "origin": "memory"
      }
  },

  frag_sound_low: {
      "id": "frag_sound_low",
      "name": "소리의 하급 파편",
      "description": "소리 근원의 하급 경험치 파편",
      "category": "consumable",
      "rarity": "N",
      "icon": "&#9679;",
      "color": "#ffa726",
      "effect": {
          "type": "exp",
          "value": 500,
          "origin": "sound"
      }
  },

  frag_sound_mid: {
      "id": "frag_sound_mid",
      "name": "소리의 중급 파편",
      "description": "소리 근원의 중급 경험치 파편",
      "category": "consumable",
      "rarity": "R",
      "icon": "&#9679;",
      "color": "#ffa726",
      "effect": {
          "type": "exp",
          "value": 2500,
          "origin": "sound"
      }
  },

  frag_sound_high: {
      "id": "frag_sound_high",
      "name": "소리의 상급 파편",
      "description": "소리 근원의 상급 경험치 파편",
      "category": "consumable",
      "rarity": "SR",
      "icon": "&#9679;",
      "color": "#ffa726",
      "effect": {
          "type": "exp",
          "value": 10000,
          "origin": "sound"
      }
  },

  frag_season_low: {
      "id": "frag_season_low",
      "name": "계절의 하급 파편",
      "description": "계절 근원의 하급 경험치 파편",
      "category": "consumable",
      "rarity": "N",
      "icon": "&#9679;",
      "color": "#26a69a",
      "effect": {
          "type": "exp",
          "value": 500,
          "origin": "season"
      }
  },

  frag_season_mid: {
      "id": "frag_season_mid",
      "name": "계절의 중급 파편",
      "description": "계절 근원의 중급 경험치 파편",
      "category": "consumable",
      "rarity": "R",
      "icon": "&#9679;",
      "color": "#26a69a",
      "effect": {
          "type": "exp",
          "value": 2500,
          "origin": "season"
      }
  },

  frag_season_high: {
      "id": "frag_season_high",
      "name": "계절의 상급 파편",
      "description": "계절 근원의 상급 경험치 파편",
      "category": "consumable",
      "rarity": "SR",
      "icon": "&#9679;",
      "color": "#26a69a",
      "effect": {
          "type": "exp",
          "value": 10000,
          "origin": "season"
      }
  },

  frag_force_low: {
      "id": "frag_force_low",
      "name": "마력의 하급 파편",
      "description": "마력 근원의 하급 경험치 파편",
      "category": "consumable",
      "rarity": "N",
      "icon": "&#9679;",
      "color": "#ec407a",
      "effect": {
          "type": "exp",
          "value": 500,
          "origin": "force"
      }
  },

  frag_force_mid: {
      "id": "frag_force_mid",
      "name": "마력의 중급 파편",
      "description": "마력 근원의 중급 경험치 파편",
      "category": "consumable",
      "rarity": "R",
      "icon": "&#9679;",
      "color": "#ec407a",
      "effect": {
          "type": "exp",
          "value": 2500,
          "origin": "force"
      }
  },

  frag_force_high: {
      "id": "frag_force_high",
      "name": "마력의 상급 파편",
      "description": "마력 근원의 상급 경험치 파편",
      "category": "consumable",
      "rarity": "SR",
      "icon": "&#9679;",
      "color": "#ec407a",
      "effect": {
          "type": "exp",
          "value": 10000,
          "origin": "force"
      }
  },

  frag_time_top: {
      "id": "frag_time_top",
      "name": "시간의 최상급 파편",
      "description": "시간 근원의 최상급 경험치 파편",
      "category": "consumable",
      "rarity": "SSR",
      "icon": "&#9679;",
      "color": "#4fc3f7",
      "effect": {
          "type": "exp",
          "value": 40000,
          "origin": "time"
      }
  },

  frag_space_top: {
      "id": "frag_space_top",
      "name": "공간의 최상급 파편",
      "description": "공간 근원의 최상급 경험치 파편",
      "category": "consumable",
      "rarity": "SSR",
      "icon": "&#9679;",
      "color": "#7e57c2",
      "effect": {
          "type": "exp",
          "value": 40000,
          "origin": "space"
      }
  },

  frag_life_top: {
      "id": "frag_life_top",
      "name": "생명의 최상급 파편",
      "description": "생명 근원의 최상급 경험치 파편",
      "category": "consumable",
      "rarity": "SSR",
      "icon": "&#9679;",
      "color": "#66bb6a",
      "effect": {
          "type": "exp",
          "value": 40000,
          "origin": "life"
      }
  },

  frag_heart_top: {
      "id": "frag_heart_top",
      "name": "마음의 최상급 파편",
      "description": "마음 근원의 최상급 경험치 파편",
      "category": "consumable",
      "rarity": "SSR",
      "icon": "&#9679;",
      "color": "#ef5350",
      "effect": {
          "type": "exp",
          "value": 40000,
          "origin": "heart"
      }
  },

  frag_intellect_top: {
      "id": "frag_intellect_top",
      "name": "지성의 최상급 파편",
      "description": "지성 근원의 최상급 경험치 파편",
      "category": "consumable",
      "rarity": "SSR",
      "icon": "&#9679;",
      "color": "#42a5f5",
      "effect": {
          "type": "exp",
          "value": 40000,
          "origin": "intellect"
      }
  },

  frag_memory_top: {
      "id": "frag_memory_top",
      "name": "기억의 최상급 파편",
      "description": "기억 근원의 최상급 경험치 파편",
      "category": "consumable",
      "rarity": "SSR",
      "icon": "&#9679;",
      "color": "#ab47bc",
      "effect": {
          "type": "exp",
          "value": 40000,
          "origin": "memory"
      }
  },

  frag_sound_top: {
      "id": "frag_sound_top",
      "name": "소리의 최상급 파편",
      "description": "소리 근원의 최상급 경험치 파편",
      "category": "consumable",
      "rarity": "SSR",
      "icon": "&#9679;",
      "color": "#ffa726",
      "effect": {
          "type": "exp",
          "value": 40000,
          "origin": "sound"
      }
  },

  frag_season_top: {
      "id": "frag_season_top",
      "name": "계절의 최상급 파편",
      "description": "계절 근원의 최상급 경험치 파편",
      "category": "consumable",
      "rarity": "SSR",
      "icon": "&#9679;",
      "color": "#26a69a",
      "effect": {
          "type": "exp",
          "value": 40000,
          "origin": "season"
      }
  },

  frag_force_top: {
      "id": "frag_force_top",
      "name": "마력의 최상급 파편",
      "description": "마력 근원의 최상급 경험치 파편",
      "category": "consumable",
      "rarity": "SSR",
      "icon": "&#9679;",
      "color": "#ec407a",
      "effect": {
          "type": "exp",
          "value": 40000,
          "origin": "force"
      }
  },

  firecodesmall: {
      "id": "firecodesmall",
      "name": "저품질 불꽃의 코드",
      "description": "염 속성 캐릭터의 승급에 필요한 소재.",
      "category": "awakening",
      "rarity": "N",
      "image": "/uploads/items/firecodesmall.png",
      "icon": ""
  },

  firecodemedium: {
      "id": "firecodemedium",
      "name": "불꽃의 코드",
      "description": "염 속성 캐릭터의 승급에 필요한 소재.",
      "category": "awakening",
      "rarity": "R",
      "image": "/uploads/items/firecodemedium.png",
      "icon": ""
  },

  firecodebig: {
      "id": "firecodebig",
      "name": "고품질 불꽃의 코드",
      "description": "염 속성 캐릭터의 승급에 필요한 소재.",
      "category": "awakening",
      "rarity": "SR",
      "image": "/uploads/items/firecodebig.png",
      "icon": ""
  },

  firecodemax: {
      "id": "firecodemax",
      "name": "순수한 불꽃의 코드",
      "description": "염 속성 캐릭터의 승급에 필요한 소재.",
      "category": "awakening",
      "rarity": "SSR",
      "image": "/uploads/items/firecodemax.png",
      "icon": ""
  },

  timestonelow: {
      "id": "timestonelow",
      "name": "부서진 시간의 정수",
      "description": "시간 근원 캐릭터의 승급에 필요한 소재.",
      "category": "awakening",
      "rarity": "N",
      "image": "/uploads/items/timestonelow.png",
      "icon": ""
  },

  timestonemedium: {
      "id": "timestonemedium",
      "name": "금이간 시간의 정수",
      "description": "시간 근원 캐릭터의 승급에 필요한 소재.",
      "category": "awakening",
      "rarity": "R",
      "image": "/uploads/items/timestonemedium.png",
      "icon": ""
  },

  timestonebig: {
      "id": "timestonebig",
      "name": "시간의 정수",
      "description": "시간 근원 캐릭터의 승급에 필요한 소재.",
      "category": "awakening",
      "rarity": "SR",
      "image": "/uploads/items/timestonebig.png",
      "icon": ""
  },

  timestonemax: {
      "id": "timestonemax",
      "name": "완성된 시간의 정수",
      "description": "시간 근원 캐릭터의 승급에 필요한 소재.",
      "category": "awakening",
      "rarity": "SSR",
      "image": "/uploads/items/timestonemax.png",
      "icon": ""
  },

  watercodesmall: {
      "id": "watercodesmall",
      "name": "저품질 물결의 코드",
      "description": "수 속성 캐릭터의 승급에 필요한 소재.",
      "category": "awakening",
      "rarity": "N",
      "image": "/uploads/items/watercodesmall.png",
      "icon": ""
  },

  watercodemedium: {
      "id": "watercodemedium",
      "name": "물결의 코드",
      "description": "수 속성 캐릭터의 승급에 필요한 소재.",
      "category": "awakening",
      "rarity": "R",
      "image": "/uploads/items/watercodemedium.png",
      "icon": ""
  },

  watercodebig: {
      "id": "watercodebig",
      "name": "고품질 물결의 코드",
      "description": "수 속성 캐릭터의 승급에 필요한 소재.",
      "category": "awakening",
      "rarity": "SR",
      "image": "/uploads/items/watercodebig.png",
      "icon": ""
  },

  watercodemax: {
      "id": "watercodemax",
      "name": "순수한 물결의 코드",
      "description": "수 속성 캐릭터의 승급에 필요한 소재.",
      "category": "awakening",
      "rarity": "SSR",
      "image": "/uploads/items/watercodemax.png",
      "icon": ""
  },

  windcodesmall: {
      "id": "windcodesmall",
      "name": "저품질 바람의 코드",
      "description": "풍 속성 캐릭터의 승급에 필요한 소재.",
      "category": "awakening",
      "rarity": "N",
      "image": "/uploads/items/windcodesmall.png",
      "icon": ""
  },

  windcodemedium: {
      "id": "windcodemedium",
      "name": "바람의 코드",
      "description": "풍 속성 캐릭터의 승급에 필요한 소재.",
      "category": "awakening",
      "rarity": "R",
      "image": "/uploads/items/windcodemedium.png",
      "icon": ""
  },

  windcodebig: {
      "id": "windcodebig",
      "name": "고품질 바람의 코드",
      "description": "풍 속성 캐릭터의 승급에 필요한 소재.",
      "category": "awakening",
      "rarity": "SR",
      "image": "/uploads/items/windcodebig.png",
      "icon": ""
  },

  windcodemax: {
      "id": "windcodemax",
      "name": "순수한 바람의 코드",
      "description": "풍 속성 캐릭터의 승급에 필요한 소재.",
      "category": "awakening",
      "rarity": "SSR",
      "image": "/uploads/items/windcodemax.png",
      "icon": ""
  },

  lightcodesmall: {
      "id": "lightcodesmall",
      "name": "저품질 빛의 코드",
      "description": "광 속성 캐릭터의 승급에 필요한 소재.",
      "category": "awakening",
      "rarity": "N",
      "image": "/uploads/items/lightcodesmall.png",
      "icon": ""
  },

  lightcodemedium: {
      "id": "lightcodemedium",
      "name": "빛의 코드",
      "description": "광 속성 캐릭터의 승급에 필요한 소재.",
      "category": "awakening",
      "rarity": "R",
      "image": "/uploads/items/lightcodemedium.png",
      "icon": ""
  },

  lightcodebig: {
      "id": "lightcodebig",
      "name": "고품질 빛의 코드",
      "description": "광 속성 캐릭터의 승급에 필요한 소재.",
      "category": "awakening",
      "rarity": "SR",
      "image": "/uploads/items/lightcodebig.png",
      "icon": ""
  },

  lightcodemax: {
      "id": "lightcodemax",
      "name": "순수한 빛의 코드",
      "description": "광 속성 캐릭터의 승급에 필요한 소재.",
      "category": "awakening",
      "rarity": "SSR",
      "image": "/uploads/items/lightcodemax.png",
      "icon": ""
  },

  darkcodesmall: {
      "id": "darkcodesmall",
      "name": "저품질 어둠의 코드",
      "description": "암 속성 캐릭터의 승급에 필요한 소재.",
      "category": "awakening",
      "rarity": "N",
      "image": "/uploads/items/darkcodesmall.png",
      "icon": ""
  },

  darkcodemedium: {
      "id": "darkcodemedium",
      "name": "어둠의 코드",
      "description": "암 속성 캐릭터의 승급에 필요한 소재.",
      "category": "awakening",
      "rarity": "R",
      "image": "/uploads/items/darkcodemedium.png",
      "icon": ""
  },

  darkcodebig: {
      "id": "darkcodebig",
      "name": "고품질 어둠의 코드",
      "description": "암 속성 캐릭터의 승급에 필요한 소재.",
      "category": "awakening",
      "rarity": "SR",
      "image": "/uploads/items/darkcodebig.png",
      "icon": ""
  },

  darkcodemax: {
      "id": "darkcodemax",
      "name": "순수한 어둠의 코드",
      "description": "암 속성 캐릭터의 승급에 필요한 소재.",
      "category": "awakening",
      "rarity": "SSR",
      "image": "/uploads/items/darkcodemax.png",
      "icon": ""
  },

  forcestonelow: {
      "id": "forcestonelow",
      "name": "부서진 마력의 정수",
      "description": "마력 근원 캐릭터의 승급에 필요한 소재.",
      "category": "awakening",
      "rarity": "N",
      "image": "/uploads/items/forcestonelow.png",
      "icon": ""
  },

  forcestonemedium: {
      "id": "forcestonemedium",
      "name": "금이간 마력의 정수",
      "description": "마력 근원 캐릭터의 승급에 필요한 소재.",
      "category": "awakening",
      "rarity": "R",
      "image": "/uploads/items/forcestonemedium.png",
      "icon": ""
  },

  forcestonebig: {
      "id": "forcestonebig",
      "name": "마력의 정수",
      "description": "마력 근원 캐릭터의 승급에 필요한 소재.",
      "category": "awakening",
      "rarity": "SR",
      "image": "/uploads/items/forcestonebig.png",
      "icon": ""
  },

  forcestonemax: {
      "id": "forcestonemax",
      "name": "완성된 마력의 정수",
      "description": "마력 근원 캐릭터의 승급에 필요한 소재.",
      "category": "awakening",
      "rarity": "SSR",
      "image": "/uploads/items/forcestonemax.png",
      "icon": ""
  },

  lifestonelow: {
      "id": "lifestonelow",
      "name": "부서진 생명의 정수",
      "description": "생명 근원 캐릭터의 승급에 필요한 소재.",
      "category": "awakening",
      "rarity": "N",
      "image": "/uploads/items/lifestonelow.png",
      "icon": ""
  },

  lifestonemedium: {
      "id": "lifestonemedium",
      "name": "금이간 생명의 정수",
      "description": "생명 근원 캐릭터의 승급에 필요한 소재.",
      "category": "awakening",
      "rarity": "R",
      "image": "/uploads/items/lifestonemedium.png",
      "icon": ""
  },

  lifestonebig: {
      "id": "lifestonebig",
      "name": "생명의 정수",
      "description": "생명 근원 캐릭터의 승급에 필요한 소재.",
      "category": "awakening",
      "rarity": "SR",
      "image": "/uploads/items/lifestonebig.png",
      "icon": ""
  },

  lifestonemax: {
      "id": "lifestonemax",
      "name": "완성된 생명의 정수",
      "description": "생명 근원 캐릭터의 승급에 필요한 소재.",
      "category": "awakening",
      "rarity": "SSR",
      "image": "/uploads/items/lifestonemax.png",
      "icon": ""
  },

  seasonstonelow: {
      "id": "seasonstonelow",
      "name": "부서진 계절의 정수",
      "description": "계절 근원 캐릭터의 승급에 필요한 소재.",
      "category": "awakening",
      "rarity": "N",
      "image": "/uploads/items/seasonstonelow.png",
      "icon": ""
  },

  seasonstonemedium: {
      "id": "seasonstonemedium",
      "name": "금이간 계절의 정수",
      "description": "계절 근원 캐릭터의 승급에 필요한 소재.",
      "category": "awakening",
      "rarity": "R",
      "image": "/uploads/items/seasonstonemedium.png",
      "icon": ""
  },

  seasonstonebig: {
      "id": "seasonstonebig",
      "name": "계절의 정수",
      "description": "계절 근원 캐릭터의 승급에 필요한 소재.",
      "category": "awakening",
      "rarity": "SR",
      "image": "/uploads/items/seasonstonebig.png",
      "icon": ""
  },

  seasonstonemax: {
      "id": "seasonstonemax",
      "name": "완성된 계절의 정수",
      "description": "계절 근원 캐릭터의 승급에 필요한 소재.",
      "category": "awakening",
      "rarity": "SSR",
      "image": "/uploads/items/seasonstonemax.png",
      "icon": ""
  },

  memorystonelow: {
      "id": "memorystonelow",
      "name": "부서진 기억의 정수",
      "description": "기억 근원 캐릭터의 승급에 필요한 소재.",
      "category": "awakening",
      "rarity": "N",
      "image": "/uploads/items/memorystonelow.png",
      "icon": ""
  },

  memorystonemedium: {
      "id": "memorystonemedium",
      "name": "금이간 기억의 정수",
      "description": "기억 근원 캐릭터의 승급에 필요한 소재.",
      "category": "awakening",
      "rarity": "R",
      "image": "/uploads/items/memorystonemedium.png",
      "icon": ""
  },

  memorystonebig: {
      "id": "memorystonebig",
      "name": "기억의 정수",
      "description": "기억 근원 캐릭터의 승급에 필요한 소재.",
      "category": "awakening",
      "rarity": "SR",
      "image": "/uploads/items/memorystonebig.png",
      "icon": ""
  },

  memorystonemax: {
      "id": "memorystonemax",
      "name": "완성된 기억의 정수",
      "description": "기억 근원 캐릭터의 승급에 필요한 소재.",
      "category": "awakening",
      "rarity": "SSR",
      "image": "/uploads/items/memorystonemax.png",
      "icon": ""
  },

  soundstonelow: {
      "id": "soundstonelow",
      "name": "부서진 소리의 정수",
      "description": "소리 근원 캐릭터의 승급에 필요한 소재.",
      "category": "awakening",
      "rarity": "N",
      "image": "/uploads/items/soundstonelow.png",
      "icon": ""
  },

  soundstonemedium: {
      "id": "soundstonemedium",
      "name": "금이간 소리의 정수",
      "description": "소리 근원 캐릭터의 승급에 필요한 소재.",
      "category": "awakening",
      "rarity": "R",
      "image": "/uploads/items/soundstonemedium.png",
      "icon": ""
  },

  soundstonebig: {
      "id": "soundstonebig",
      "name": "소리의 정수",
      "description": "소리 근원 캐릭터의 승급에 필요한 소재.",
      "category": "awakening",
      "rarity": "SR",
      "image": "/uploads/items/soundstonebig.png",
      "icon": ""
  },

  soundstonemax: {
      "id": "soundstonemax",
      "name": "완성된 소리의 정수",
      "description": "소리 근원 캐릭터의 승급에 필요한 소재.",
      "category": "awakening",
      "rarity": "SSR",
      "image": "/uploads/items/soundstonemax.png",
      "icon": ""
  },

  spacestonelow: {
      "id": "spacestonelow",
      "name": "부서진 공간의 정수",
      "description": "공간 근원 캐릭터의 승급에 필요한 소재.",
      "category": "awakening",
      "rarity": "N",
      "image": "/uploads/items/spacestonelow.png",
      "icon": ""
  },

  spacestonemedium: {
      "id": "spacestonemedium",
      "name": "금이간 공간의 정수",
      "description": "공간 근원 캐릭터의 승급에 필요한 소재.",
      "category": "awakening",
      "rarity": "R",
      "image": "/uploads/items/spacestonemedium.png",
      "icon": ""
  },

  spacestonebig: {
      "id": "spacestonebig",
      "name": "공간의 정수",
      "description": "공간 근원 캐릭터의 승급에 필요한 소재.",
      "category": "awakening",
      "rarity": "SR",
      "image": "/uploads/items/spacestonebig.png",
      "icon": ""
  },

  spacestonemax: {
      "id": "spacestonemax",
      "name": "완성된 공간의 정수",
      "description": "공간 근원 캐릭터의 승급에 필요한 소재.",
      "category": "awakening",
      "rarity": "SSR",
      "image": "/uploads/items/spacestonemax.png",
      "icon": ""
  },

  intellectstonelow: {
      "id": "intellectstonelow",
      "name": "부서진 지성의 정수",
      "description": "지성 근원 캐릭터의 승급에 필요한 소재.",
      "category": "awakening",
      "rarity": "N",
      "image": "/uploads/items/intellectstonelow.png",
      "icon": ""
  },

  intellectstonemedium: {
      "id": "intellectstonemedium",
      "name": "금이간 지성의 정수",
      "description": "지성 근원 캐릭터의 승급에 필요한 소재.",
      "category": "awakening",
      "rarity": "R",
      "image": "/uploads/items/intellectstonemedium.png",
      "icon": ""
  },

  intellectstonebig: {
      "id": "intellectstonebig",
      "name": "지성의 정수",
      "description": "지성 근원 캐릭터의 승급에 필요한 소재.",
      "category": "awakening",
      "rarity": "SR",
      "image": "/uploads/items/intellectstonebig.png",
      "icon": ""
  },

  intellectstonemax: {
      "id": "intellectstonemax",
      "name": "완성된 지성의 정수",
      "description": "지성 근원 캐릭터의 승급에 필요한 소재.",
      "category": "awakening",
      "rarity": "SSR",
      "image": "/uploads/items/intellectstonemax.png",
      "icon": ""
  },

  heartstonelow: {
      "id": "heartstonelow",
      "name": "부서진 마음의 정수",
      "description": "마음 근원 캐릭터의 승급에 필요한 소재.",
      "category": "awakening",
      "rarity": "N",
      "image": "/uploads/items/heartstonelow.png",
      "icon": ""
  },

  heartstonemedium: {
      "id": "heartstonemedium",
      "name": "금이간 마음의 정수",
      "description": "마음 근원 캐릭터의 승급에 필요한 소재.",
      "category": "awakening",
      "rarity": "R",
      "image": "/uploads/items/heartstonemedium.png",
      "icon": ""
  },

  heartstonebig: {
      "id": "heartstonebig",
      "name": "마음의 정수",
      "description": "마음 근원 캐릭터의 승급에 필요한 소재.",
      "category": "awakening",
      "rarity": "SR",
      "image": "/uploads/items/heartstonebig.png",
      "icon": ""
  },

  heartstonemax: {
      "id": "heartstonemax",
      "name": "완성된 마음의 정수",
      "description": "마음 근원 캐릭터의 승급에 필요한 소재.",
      "category": "awakening",
      "rarity": "SSR",
      "image": "/uploads/items/heartstonemax.png",
      "icon": ""
  },

  red_broken_blade: {
      "id": "red_broken_blade",
      "name": "붉게 물든 검날 파편",
      "description": "붉게 물든 검날 파편. 캐릭터를 승급시키는데에 필요하다.",
      "category": "material",
      "rarity": "N",
      "flavor": "",
      "image": "/uploads/items/red_broken_blade.png",
      "icon": ""
  },
};

module.exports = items;
