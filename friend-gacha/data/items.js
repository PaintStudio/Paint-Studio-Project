/**
 * 아이템 정의 파일 (어드민에서 자동 생성)
 *
 * 몬스터(monsters.js)의 drops에서 id로 참조합니다.
 * 유저 인벤토리(user_items 테이블)에 수량으로 저장됩니다.
 */

const items = {

  fire_crystal: {
      "id": "fire_crystal",
      "name": "염화 결정",
      "description": "불꽃 속성 몬스터에서 얻을 수 있는 붉은 결정",
      "category": "material",
      "rarity": "R",
      "sellPrice": 50,
      "image": "/uploads/items/fire_crystal.png",
      "icon": "&#128308;"
  },

  water_crystal: {
      "id": "water_crystal",
      "name": "수류 결정",
      "description": "물 속성 몬스터에서 얻을 수 있는 푸른 결정",
      "category": "material",
      "rarity": "R",
      "sellPrice": 50,
      "image": "/uploads/items/water_crystal.png",
      "icon": "&#128309;"
  },

  wind_crystal: {
      "id": "wind_crystal",
      "name": "풍림 결정",
      "description": "바람 속성 몬스터에서 얻을 수 있는 초록 결정",
      "category": "material",
      "rarity": "R",
      "sellPrice": 50,
      "image": "/uploads/items/wind_crystal.png",
      "icon": "&#128994;"
  },

  light_crystal: {
      "id": "light_crystal",
      "name": "광휘 결정",
      "description": "빛 속성 몬스터에서 얻을 수 있는 빛나는 결정",
      "category": "material",
      "rarity": "R",
      "sellPrice": 50,
      "image": "/uploads/items/light_crystal.png",
      "icon": "&#128993;"
  },

  dark_crystal: {
      "id": "dark_crystal",
      "name": "암영 결정",
      "description": "어둠 속성 몬스터에서 얻을 수 있는 검은 결정",
      "category": "material",
      "rarity": "R",
      "sellPrice": 50,
      "image": "/uploads/items/dark_crystal.png",
      "icon": "&#9899;"
  },

  neutral_crystal: {
      "id": "neutral_crystal",
      "name": "무색 결정",
      "description": "무속성 몬스터에서 얻을 수 있는 투명한 결정",
      "category": "material",
      "rarity": "R",
      "sellPrice": 50,
      "image": "/uploads/items/neutral_crystal.png",
      "icon": "&#9898;"
  },

  slime_jelly: {
      "id": "slime_jelly",
      "name": "슬라임 젤리",
      "description": "슬라임의 끈적한 핵. 의외로 영양가가 높다",
      "category": "material",
      "rarity": "N",
      "sellPrice": 15,
      "image": "/uploads/items/slime_jelly.png",
      "icon": "&#128167;"
  },

  goblin_cloth: {
      "id": "goblin_cloth",
      "name": "고블린 천조각",
      "description": "고블린이 두른 낡은 천. 의외로 튼튼하다",
      "category": "material",
      "rarity": "N",
      "sellPrice": 15,
      "image": "/uploads/items/goblin_cloth.png",
      "icon": "&#129511;"
  },

  wolf_fang: {
      "id": "wolf_fang",
      "name": "늑대 송곳니",
      "description": "날카로운 늑대의 이빨",
      "category": "material",
      "rarity": "N",
      "sellPrice": 20,
      "image": "/uploads/items/wolf_fang.png",
      "icon": "&#129463;"
  },

  bat_wing: {
      "id": "bat_wing",
      "name": "박쥐 날개막",
      "description": "얇지만 질긴 박쥐 날개 조각",
      "category": "material",
      "rarity": "N",
      "sellPrice": 10,
      "image": "/uploads/items/bat_wing.png",
      "icon": "&#129415;"
  },

  old_bone: {
      "id": "old_bone",
      "name": "낡은 뼈",
      "description": "스켈레톤에서 떨어진 오래된 뼈",
      "category": "material",
      "rarity": "N",
      "sellPrice": 15,
      "image": "/uploads/items/old_bone.png",
      "icon": "&#129460;"
  },

  treant_bark: {
      "id": "treant_bark",
      "name": "트렌트 수피",
      "description": "생명력이 깃든 나무 껍질",
      "category": "material",
      "rarity": "R",
      "sellPrice": 30,
      "image": "/uploads/items/treant_bark.png",
      "icon": "&#127795;"
  },

  shadow_essence: {
      "id": "shadow_essence",
      "name": "그림자 정수",
      "description": "그림자 박쥐에서 추출한 어둠의 에너지",
      "category": "material",
      "rarity": "R",
      "sellPrice": 35,
      "image": "/uploads/items/shadow_essence.png",
      "icon": "&#127761;"
  },

  toxic_spore: {
      "id": "toxic_spore",
      "name": "독성 포자",
      "description": "독버섯에서 채집한 위험한 포자",
      "category": "material",
      "rarity": "R",
      "sellPrice": 30,
      "image": "/uploads/items/toxic_spore.png",
      "icon": "&#127812;"
  },

  fire_ember: {
      "id": "fire_ember",
      "name": "화염 잔불",
      "description": "화염 임프의 꺼지지 않는 불씨",
      "category": "material",
      "rarity": "R",
      "sellPrice": 40,
      "image": "/uploads/items/fire_ember.png",
      "icon": "&#128293;"
  },

  magma_shard: {
      "id": "magma_shard",
      "name": "용암 파편",
      "description": "용암 골렘의 굳은 용암 조각. 아직 뜨겁다",
      "category": "material",
      "rarity": "R",
      "sellPrice": 45,
      "image": "/uploads/items/magma_shard.png",
      "icon": "&#129707;"
  },

  serpent_scale: {
      "id": "serpent_scale",
      "name": "바다뱀 비늘",
      "description": "단단하고 매끄러운 바다뱀의 비늘",
      "category": "material",
      "rarity": "R",
      "sellPrice": 45,
      "image": "/uploads/items/serpent_scale.png",
      "icon": "&#128032;"
  },

  jelly_membrane: {
      "id": "jelly_membrane",
      "name": "해파리 막",
      "description": "전기를 머금은 투명한 막",
      "category": "material",
      "rarity": "R",
      "sellPrice": 40,
      "image": "/uploads/items/jelly_membrane.png",
      "icon": "&#10035;"
  },

  light_fragment: {
      "id": "light_fragment",
      "name": "빛의 파편",
      "description": "빛의 정령이 남긴 따뜻한 빛 조각",
      "category": "material",
      "rarity": "SR",
      "sellPrice": 60,
      "image": "/uploads/items/light_fragment.png",
      "icon": "&#10024;"
  },

  dark_steel: {
      "id": "dark_steel",
      "name": "암흑강",
      "description": "암흑 기사의 갑옷에서 떨어진 검은 금속",
      "category": "material",
      "rarity": "SR",
      "sellPrice": 65,
      "image": "/uploads/items/dark_steel.png",
      "icon": "&#9876;"
  },

  awakening_shard_low: {
      "id": "awakening_shard_low",
      "name": "하급 각성석",
      "description": "1~2단계 각성에 필요한 기본 각성 재료",
      "category": "awakening",
      "rarity": "R",
      "sellPrice": 80,
      "image": "/uploads/items/awakening_shard_low.png",
      "icon": "&#9670;"
  },

  awakening_shard_mid: {
      "id": "awakening_shard_mid",
      "name": "중급 각성석",
      "description": "3~4단계 각성에 필요한 중급 각성 재료",
      "category": "awakening",
      "rarity": "SR",
      "sellPrice": 200,
      "image": "/uploads/items/awakening_shard_mid.png",
      "icon": "&#9671;"
  },

  awakening_shard_high: {
      "id": "awakening_shard_high",
      "name": "상급 각성석",
      "description": "5단계 각성에 필요한 최고급 각성 재료",
      "category": "awakening",
      "rarity": "SSR",
      "sellPrice": 500,
      "image": "/uploads/items/awakening_shard_high.png",
      "icon": "&#11045;"
  },

  golem_core: {
      "id": "golem_core",
      "name": "골렘 핵",
      "description": "마을 수호 골렘의 동력원. 대지의 힘이 깃들어 있다",
      "category": "boss",
      "rarity": "SR",
      "sellPrice": 150,
      "image": "/uploads/items/golem_core.png",
      "icon": "&#128296;"
  },

  ent_heart: {
      "id": "ent_heart",
      "name": "엔트의 심장목",
      "description": "수백 년 된 엔트의 핵심 목재",
      "category": "boss",
      "rarity": "SR",
      "sellPrice": 200,
      "image": "/uploads/items/ent_heart.png",
      "icon": "&#127811;"
  },

  volcano_jewel: {
      "id": "volcano_jewel",
      "name": "화산 보석",
      "description": "화산의 군주가 품고 있던 극열의 보석",
      "category": "boss",
      "rarity": "SSR",
      "sellPrice": 350,
      "image": "/uploads/items/volcano_jewel.png",
      "icon": "&#128142;"
  },

  kraken_ink: {
      "id": "kraken_ink",
      "name": "크라켄 잉크",
      "description": "심해의 왕이 내뿜는 특수한 먹물",
      "category": "boss",
      "rarity": "SSR",
      "sellPrice": 400,
      "image": "/uploads/items/kraken_ink.png",
      "icon": "&#127754;"
  },

  guardian_crest: {
      "id": "guardian_crest",
      "name": "수호자의 문장",
      "description": "탑의 수호자가 남긴 신성한 문장. 강력한 힘이 봉인되어 있다",
      "category": "boss",
      "rarity": "SSR",
      "sellPrice": 500,
      "image": "/uploads/items/guardian_crest.png",
      "icon": "&#127775;"
  },

  stamina_drink_s: {
      "id": "stamina_drink_s",
      "name": "스태미나 음료 (소)",
      "description": "스태미나를 20 회복한다",
      "category": "consumable",
      "rarity": "N",
      "sellPrice": 50,
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
      "sellPrice": 100,
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
      "sellPrice": 300,
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
      "sellPrice": 25,
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
      "sellPrice": 125,
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
      "sellPrice": 500,
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
      "sellPrice": 25,
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
      "sellPrice": 125,
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
      "sellPrice": 500,
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
      "sellPrice": 25,
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
      "sellPrice": 125,
      "icon": "&#9679;",
      "color": "#66bb6a",
      "effect": {
          "type": "exp",
          "value": 2500,
          "origin": "life"
      }
  },

  frag_life_high: {
      "id": "frag_life_high",
      "name": "생명의 상급 파편",
      "description": "생명 근원의 상급 경험치 파편",
      "category": "consumable",
      "rarity": "SR",
      "sellPrice": 500,
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
      "sellPrice": 25,
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
      "sellPrice": 125,
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
      "sellPrice": 500,
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
      "sellPrice": 25,
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
      "sellPrice": 125,
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
      "sellPrice": 500,
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
      "sellPrice": 25,
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
      "sellPrice": 125,
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
      "sellPrice": 500,
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
      "sellPrice": 25,
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
      "sellPrice": 125,
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
      "sellPrice": 500,
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
      "sellPrice": 25,
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
      "sellPrice": 125,
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
      "sellPrice": 500,
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
      "sellPrice": 25,
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
      "sellPrice": 125,
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
      "sellPrice": 500,
      "icon": "&#9679;",
      "color": "#ec407a",
      "effect": {
          "type": "exp",
          "value": 10000,
          "origin": "force"
      }
  },
};

module.exports = items;
