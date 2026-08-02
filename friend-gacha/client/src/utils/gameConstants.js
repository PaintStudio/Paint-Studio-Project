import gameConfig from '@gameConfig';

export const ELEM_ICONS = { fire: '&#128293;', water: '&#128167;', wind: '&#127811;', light: '&#10024;', dark: '&#127761;', neutral: '&#9898;' };

export const ELEM_COLORS = {};
export const ELEM_LABELS = {};
for (const [k, v] of Object.entries(gameConfig.elements)) { ELEM_COLORS[k] = v.color; ELEM_LABELS[k] = v.label; }

export const ORIGIN_LABELS = {};
export const ORIGIN_COLORS = {};
for (const [k, v] of Object.entries(gameConfig.origins)) { ORIGIN_LABELS[k] = v.label; ORIGIN_COLORS[k] = v.color; }

export const RARITY_COLORS = {};
for (const [k, v] of Object.entries(gameConfig.rarities)) RARITY_COLORS[k] = v.color;

export const SKILL_TYPE_LABELS = {};
export const SKILL_TYPE_COLORS = {};
for (const [k, v] of Object.entries(gameConfig.skillTypes)) { SKILL_TYPE_LABELS[k] = v.label; SKILL_TYPE_COLORS[k] = v.color; }

export function getRarityStyle(rarity) {
  if (rarity === 'CR') return { background: 'linear-gradient(90deg, #ff0000, #ff8800, #ffff00, #00ff00, #0088ff, #8800ff)', WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent', fontWeight: 'bold' };
  return { color: RARITY_COLORS[rarity] || '#888' };
}

export const RARITY_ORDER_LIST = ['N', 'R', 'SR', 'SSR', 'CR'];

export function canEquipSkill(condition, character) {
  if (!condition || Object.keys(condition).length === 0) return true;
  for (const [key, value] of Object.entries(condition)) {
    if (key === 'element') {
      if (Array.isArray(value) ? !value.includes(character.element) : character.element !== value) return false;
    } else if (key === 'origin') {
      if (Array.isArray(value) ? !value.includes(character.origin) : character.origin !== value) return false;
    } else if (key === 'minRarity') {
      if (RARITY_ORDER_LIST.indexOf(character.rarity) < RARITY_ORDER_LIST.indexOf(value)) return false;
    }
  }
  return true;
}

export function simulateLevelUp(currentLevel, currentExp, addedExp, maxLevel) {
  let exp = currentExp + addedExp;
  let level = currentLevel;
  while (level < maxLevel) {
    const needed = level * level * 10 + level * 50;
    if (exp >= needed) { exp -= needed; level++; } else break;
  }
  return { level, exp, nextExp: level * level * 10 + level * 50 };
}

export function calcExpToMax(currentLevel, currentExp, maxLevel) {
  let total = 0;
  for (let lv = currentLevel; lv < maxLevel; lv++) total += lv * lv * 10 + lv * 50;
  return Math.max(0, total - currentExp);
}

export const SKILL_RARITY_LABELS = {};
export const SKILL_RARITY_COLORS = {};
for (const [k, v] of Object.entries(gameConfig.skillRarities)) { SKILL_RARITY_LABELS[k] = v.label; SKILL_RARITY_COLORS[k] = v.color; }

export function getSkillRarityStyle(rarity) {
  if (rarity === 'iridescent') return { background: 'linear-gradient(90deg, #ff0000, #ff8800, #ffff00, #00ff00, #0088ff, #8800ff)', WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent', fontWeight: 'bold' };
  return { color: SKILL_RARITY_COLORS[rarity] || '#aaa' };
}

export function timeAgo(dateStr) {
  const diff = (Date.now() - new Date(dateStr + (dateStr.includes('Z') ? '' : 'Z')).getTime()) / 1000;
  if (diff < 60) return '방금 전';
  if (diff < 3600) return `${Math.floor(diff / 60)}분 전`;
  if (diff < 86400) return `${Math.floor(diff / 3600)}시간 전`;
  return `${Math.floor(diff / 86400)}일 전`;
}
