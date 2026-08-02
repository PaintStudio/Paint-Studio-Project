const CHARACTER_DATA = {
  1:  { element: 'fire',  origin: 'life',      rarity: 'SSR' },
  2:  { element: 'light', origin: 'memory',     rarity: 'SSR' },
  3:  { element: 'dark',  origin: 'memory',     rarity: 'SR' },
  4:  { element: 'dark',  origin: 'life',       rarity: 'SR' },
  5:  { element: 'light', origin: 'sound',      rarity: 'SR' },
  6:  { element: 'water', origin: 'force',      rarity: 'SR' },
  7:  { element: 'light', origin: 'time',       rarity: 'R' },
  8:  { element: 'water', origin: 'space',      rarity: 'R' },
  9:  { element: 'wind',  origin: 'memory',     rarity: 'R' },
  10: { element: 'dark',  origin: 'intellect',  rarity: 'R' },
  11: { element: 'wind',  origin: 'life',       rarity: 'R' },
  12: { element: 'water', origin: 'heart',      rarity: 'R' },
  13: { element: 'light', origin: 'sound',      rarity: 'N' },
  14: { element: 'fire',  origin: 'time',       rarity: 'N' },
  15: { element: 'wind',  origin: 'life',       rarity: 'N' },
  16: { element: 'dark',  origin: 'intellect',  rarity: 'N' },
  17: { element: 'wind',  origin: 'force',      rarity: 'N' },
  18: { element: 'fire',  origin: 'memory',     rarity: 'N' },
  19: { element: 'fire',  origin: 'season',     rarity: 'N' },
  20: { element: 'light', origin: 'space',      rarity: 'N' },
  21: { element: 'water', origin: 'heart',      rarity: 'N' },
  22: { element: 'wind',  origin: 'space',      rarity: 'SR' },
  23: { element: 'dark',  origin: 'intellect',  rarity: 'SSR' },
  24: { element: 'wind',  origin: 'force',      rarity: 'SSR' },
  25: { element: 'wind',  origin: 'season',     rarity: 'SSR' },
  26: { element: 'light', origin: 'heart',      rarity: 'SSR' },
  27: { element: 'fire',  origin: 'sound',      rarity: 'SSR' },
  28: { element: 'water', origin: 'space',      rarity: 'SSR' },
  29: { element: 'dark',  origin: 'time',       rarity: 'SSR' },
  30: { element: 'water', origin: 'season',     rarity: 'SR' },
  31: { element: 'wind',  origin: 'heart',      rarity: 'SR' },
  32: { element: 'fire',  origin: 'time',       rarity: 'SR' },
};

function makeCode(element, tier) { return `${element}code${tier}`; }
function makeStone(origin, tier) { return `${origin}stone${tier}`; }

function getTier1Items(element, origin, rarity) {
  const costs = { SSR: [10, 15], SR: [7, 12], R: [5, 8], N: [2, 4] };
  const [codeQty, stoneQty] = costs[rarity];
  return [
    { itemId: makeCode(element, 'small'), quantity: codeQty },
    { itemId: makeStone(origin, 'low'), quantity: stoneQty },
  ];
}

function getTier2Items(element, origin, rarity) {
  const costs = {
    SSR: { codeBig: 3, codeMed: 15, stoneBig: 10, stoneMed: 20 },
    SR:  { codeBig: 2, codeMed: 10, stoneBig: 7,  stoneMed: 14 },
    R:   { codeBig: 2, codeMed: 8,  stoneBig: 5,  stoneMed: 10 },
    N:   { codeBig: 1, codeMed: 3,  stoneBig: 2,  stoneMed: 4 },
  };
  const c = costs[rarity];
  return [
    { itemId: makeCode(element, 'big'), quantity: c.codeBig },
    { itemId: makeCode(element, 'medium'), quantity: c.codeMed },
    { itemId: makeStone(origin, 'big'), quantity: c.stoneBig },
    { itemId: makeStone(origin, 'medium'), quantity: c.stoneMed },
  ];
}

function getTier3Items(element, origin, rarity) {
  const costs = {
    SSR: { codeMax: 5, codeBig: 25, codeMed: 40, stoneMax: 10, stoneBig: 40, stoneMed: 60 },
    SR:  { codeMax: 4, codeBig: 18, codeMed: 28, stoneMax: 7,  stoneBig: 28, stoneMed: 42 },
    R:   { codeMax: 3, codeBig: 13, codeMed: 20, stoneMax: 5,  stoneBig: 20, stoneMed: 30 },
  };
  const c = costs[rarity];
  if (!c) return [];
  return [
    { itemId: makeCode(element, 'max'), quantity: c.codeMax },
    { itemId: makeCode(element, 'big'), quantity: c.codeBig },
    { itemId: makeCode(element, 'medium'), quantity: c.codeMed },
    { itemId: makeStone(origin, 'max'), quantity: c.stoneMax },
    { itemId: makeStone(origin, 'big'), quantity: c.stoneBig },
    { itemId: makeStone(origin, 'medium'), quantity: c.stoneMed },
  ];
}

const TIER_META = {
  1:  [{ gold: 3000, atkS: 1, defS: 0, talent: true, notes: 2 }, { gold: 8000, atkS: 0, defS: 1, talent: true, notes: 2 }, { gold: 15000, atkS: 1, defS: 0, talent: true, notes: 2 }],
  2:  [{ gold: 5000, atkS: 1, defS: 0, talent: true, notes: 2 }, { gold: 5000, atkS: 0, defS: 1, talent: true, notes: 2 }, { gold: 5000, atkS: 1, defS: 0, talent: true, notes: 2 }],
  3:  [{ gold: 5000, atkS: 1, defS: 0, talent: true, notes: 2 }, { gold: 5000, atkS: 0, defS: 1, talent: true, notes: 2 }, { gold: 5000, atkS: 1, defS: 0, talent: true, notes: 2 }],
  4:  [{ gold: 5000, atkS: 1, defS: 0, talent: true, notes: 2 }, { gold: 5000, atkS: 0, defS: 1, talent: true, notes: 2 }, { gold: 5000, atkS: 1, defS: 0, talent: true, notes: 2 }],
  5:  [{ gold: 5000, atkS: 1, defS: 0, talent: true, notes: 2 }, { gold: 5000, atkS: 0, defS: 1, talent: true, notes: 2 }, { gold: 5000, atkS: 1, defS: 0, talent: true, notes: 2 }],
  6:  [{ gold: 5000, atkS: 1, defS: 0, talent: true, notes: 2 }, { gold: 5000, atkS: 0, defS: 1, talent: true, notes: 2 }, { gold: 5000, atkS: 1, defS: 0, talent: true, notes: 2 }],
  7:  [{ gold: 5000, atkS: 1, defS: 0, talent: true, notes: 1 }, { gold: 5000, atkS: 0, defS: 1, talent: true, notes: 1 }, { gold: 5000, atkS: 1, defS: 0, talent: true, notes: 1 }],
  8:  [{ gold: 5000, atkS: 1, defS: 0, talent: true, notes: 1 }, { gold: 5000, atkS: 0, defS: 1, talent: true, notes: 1 }, { gold: 5000, atkS: 1, defS: 0, talent: true, notes: 1 }],
  9:  [{ gold: 5000, atkS: 1, defS: 0, talent: true, notes: 1 }, { gold: 5000, atkS: 0, defS: 1, talent: true, notes: 1 }, { gold: 5000, atkS: 1, defS: 0, talent: true, notes: 1 }],
  10: [{ gold: 5000, atkS: 1, defS: 0, talent: true, notes: 1 }, { gold: 5000, atkS: 0, defS: 1, talent: true, notes: 1 }, { gold: 5000, atkS: 1, defS: 0, talent: true, notes: 1 }],
  11: [{ gold: 5000, atkS: 1, defS: 0, talent: true, notes: 1 }, { gold: 5000, atkS: 0, defS: 1, talent: true, notes: 1 }, { gold: 5000, atkS: 1, defS: 0, talent: true, notes: 1 }],
  12: [{ gold: 5000, atkS: 1, defS: 0, talent: true, notes: 1 }, { gold: 5000, atkS: 0, defS: 1, talent: true, notes: 1 }, { gold: 5000, atkS: 1, defS: 0, talent: true, notes: 1 }],
  13: [{ gold: 5000, atkS: 0, defS: 1, talent: true, notes: 1 }, { gold: 5000, atkS: 1, defS: 0, talent: true, notes: 1 }],
  14: [{ gold: 5000, atkS: 0, defS: 1, talent: true, notes: 1 }, { gold: 5000, atkS: 1, defS: 0, talent: true, notes: 1 }],
  15: [{ gold: 5000, atkS: 0, defS: 1, talent: true, notes: 1 }, { gold: 5000, atkS: 1, defS: 0, talent: true, notes: 1 }],
  16: [{ gold: 5000, atkS: 0, defS: 1, talent: true, notes: 1 }, { gold: 5000, atkS: 1, defS: 0, talent: true, notes: 1 }],
  17: [{ gold: 5000, atkS: 0, defS: 1, talent: true, notes: 1 }, { gold: 5000, atkS: 1, defS: 0, talent: true, notes: 1 }],
  18: [{ gold: 5000, atkS: 0, defS: 1, talent: true, notes: 1 }, { gold: 5000, atkS: 1, defS: 0, talent: true, notes: 1 }],
  19: [{ gold: 5000, atkS: 0, defS: 1, talent: true, notes: 1 }, { gold: 5000, atkS: 1, defS: 0, talent: true, notes: 1 }],
  20: [{ gold: 5000, atkS: 0, defS: 1, talent: true, notes: 1 }, { gold: 5000, atkS: 1, defS: 0, talent: true, notes: 1 }],
  21: [{ gold: 5000, atkS: 0, defS: 1, talent: true, notes: 1 }, { gold: 5000, atkS: 1, defS: 0, talent: true, notes: 1 }],
  22: [{ gold: 5000, atkS: 1, defS: 0, talent: true, notes: 2 }, { gold: 5000, atkS: 0, defS: 1, talent: true, notes: 2 }, { gold: 5000, atkS: 1, defS: 0, talent: true, notes: 2 }],
  23: [{ gold: 5000, atkS: 1, defS: 0, talent: true, notes: 2 }, { gold: 5000, atkS: 0, defS: 1, talent: true, notes: 2 }, { gold: 5000, atkS: 1, defS: 0, talent: true, notes: 2 }],
  24: [{ gold: 5000, atkS: 1, defS: 0, talent: true, notes: 2 }, { gold: 5000, atkS: 0, defS: 1, talent: true, notes: 2 }, { gold: 5000, atkS: 1, defS: 0, talent: true, notes: 2 }],
  25: [{ gold: 5000, atkS: 1, defS: 0, talent: true, notes: 2 }, { gold: 5000, atkS: 0, defS: 1, talent: true, notes: 2 }, { gold: 5000, atkS: 1, defS: 0, talent: true, notes: 2 }],
  26: [{ gold: 5000, atkS: 1, defS: 0, talent: true, notes: 2 }, { gold: 5000, atkS: 0, defS: 1, talent: true, notes: 2 }, { gold: 5000, atkS: 1, defS: 0, talent: true, notes: 2 }],
  27: [{ gold: 5000, atkS: 1, defS: 0, talent: true, notes: 2 }, { gold: 5000, atkS: 0, defS: 1, talent: true, notes: 2 }, { gold: 5000, atkS: 1, defS: 0, talent: true, notes: 2 }],
  28: [{ gold: 5000, atkS: 1, defS: 0, talent: true, notes: 2 }, { gold: 5000, atkS: 0, defS: 1, talent: true, notes: 2 }, { gold: 5000, atkS: 1, defS: 0, talent: true, notes: 2 }],
  29: [{ gold: 5000, atkS: 1, defS: 0, talent: true, notes: 2 }, { gold: 5000, atkS: 0, defS: 1, talent: true, notes: 2 }, { gold: 5000, atkS: 1, defS: 0, talent: true, notes: 2 }],
  30: [{ gold: 5000, atkS: 1, defS: 0, talent: true, notes: 2 }, { gold: 5000, atkS: 0, defS: 1, talent: true, notes: 2 }, { gold: 5000, atkS: 1, defS: 0, talent: true, notes: 2 }],
  31: [{ gold: 5000, atkS: 1, defS: 0, talent: true, notes: 2 }, { gold: 5000, atkS: 0, defS: 1, talent: true, notes: 2 }, { gold: 5000, atkS: 1, defS: 0, talent: true, notes: 2 }],
  32: [{ gold: 5000, atkS: 1, defS: 0, talent: true, notes: 2 }, { gold: 5000, atkS: 0, defS: 1, talent: true, notes: 2 }, { gold: 5000, atkS: 1, defS: 0, talent: true, notes: 2 }],
};

const ITEM_GETTERS = [getTier1Items, getTier2Items, getTier3Items];

const promotions = {};
for (const [id, charData] of Object.entries(CHARACTER_DATA)) {
  const meta = TIER_META[id];
  if (!meta) continue;
  const { element, origin, rarity } = charData;
  promotions[id] = {
    tiers: meta.map((m, i) => ({
      gold: m.gold,
      items: ITEM_GETTERS[i](element, origin, rarity),
      attackSlots: m.atkS,
      defenseSlots: m.defS,
      unlockTalent: m.talent,
      bonusNotes: m.notes,
    })),
  };
}

module.exports = promotions;
