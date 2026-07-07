let _cache = null;
let _loading = null;

const FALLBACK = {
  lobby: [{ text: "..." }],
  battle_start: ["...!"],
  skill_type: {
    attack: ["하!"],
    defense: ["막아!"],
    buff: ["힘을 빌려줄게!"],
    debuff: ["약해져라!"],
    support: ["서포트!"],
    heal: ["치유!"],
  },
  ultimate: ["전력 가동!"],
  levelUp: ["더 강해졌어!"],
  awakening: ["새로운 힘이...!"],
  promotion: { 1: ["한계를 넘어서!"], 2: ["더 높은 곳으로!"], 3: ["최종 승급!"] },
  lowHp: ["아직...!"],
  victory: ["이겼다!"],
  defeat: ["이런..."],
};

export async function loadDialogues() {
  if (_cache) return _cache;
  if (_loading) return _loading;
  _loading = fetch('/api/dialogues').then(r => r.json()).then(data => {
    _cache = data;
    _loading = null;
    return data;
  }).catch(() => {
    _loading = null;
    return {};
  });
  return _loading;
}

export function getDialoguesSync() {
  return _cache || {};
}

export function invalidateDialogueCache() {
  _cache = null;
  _loading = null;
}

function pick(arr) {
  if (!arr || arr.length === 0) return null;
  return arr[Math.floor(Math.random() * arr.length)];
}

function get(charId) {
  const all = getDialoguesSync();
  return all[charId] || all[String(charId)] || null;
}

export function getLobbyLine(charId, awakening = 0, promotion = 0, ownedCharIds = []) {
  const d = get(charId);
  const pool = (d?.lobby || FALLBACK.lobby).filter(e =>
    (e.awakening || 0) <= awakening && (e.promotion || 0) <= promotion
  );
  if (d?.interaction) {
    for (const entry of d.interaction) {
      if (entry.require?.some(id => ownedCharIds.includes(id))
        && (entry.awakening || 0) <= awakening
        && (entry.promotion || 0) <= promotion) {
        pool.push(entry);
      }
    }
  }
  const chosen = pick(pool);
  return chosen?.text || null;
}

export function getGachaLine(charId) {
  const d = get(charId);
  return pick(d?.gacha || []);
}

export function getSkillLine(charId, skill) {
  const d = get(charId);
  if (!d) return pick(FALLBACK.skill_type[skill.type] || FALLBACK.skill_type.attack);
  if (d.skill?.[skill.id]?.length) return pick(d.skill[skill.id]);
  if (skill.type === 'ultimate' && d.ultimate?.length) return pick(d.ultimate);
  if (d.skill_type?.[skill.type]?.length) return pick(d.skill_type[skill.type]);
  return pick(FALLBACK.skill_type[skill.type] || FALLBACK.skill_type.attack);
}

export function getBattleStartLine(charId) {
  const d = get(charId);
  return pick(d?.battle_start || FALLBACK.battle_start);
}

export function getLine(charId, category) {
  const d = get(charId);
  return pick(d?.[category] || FALLBACK[category] || []);
}

export function getPromotionLine(charId, tier) {
  const d = get(charId);
  const pool = d?.promotion?.[tier] || FALLBACK.promotion?.[tier] || [];
  return pick(pool);
}
