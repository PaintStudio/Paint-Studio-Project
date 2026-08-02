const db = require('./db');
const { createUnit } = require('./battle');
const itemDefs = require('../data/items');

function buildPartyUnits(userId, partyIds) {
  const units = [];
  for (const invId of partyIds) {
    const inv = db.prepare(`
      SELECT i.*, c.name, c.rarity, c.element, c.origin, c.title,
        c.base_hp, c.base_atk, c.base_def, c.base_spd, c.turn_notes, c.image_url, c.image_sd
      FROM inventory i JOIN characters c ON i.character_id = c.id
      WHERE i.id = ? AND i.user_id = ?
    `).get(invId, userId);
    if (!inv) return { error: `인벤토리 #${invId}를 찾을 수 없습니다` };

    const equipped = db.prepare(`
      SELECT s.* FROM equipped_skills es JOIN skills s ON es.skill_id = s.id
      WHERE es.inventory_id = ? ORDER BY es.slot_number
    `).all(invId);

    let skills = equipped;
    if (skills.length === 0) {
      skills = db.prepare(`
        SELECT s.* FROM character_skills cs JOIN skills s ON cs.skill_id = s.id
        WHERE cs.character_id = ? AND cs.is_default = 1
      `).all(inv.character_id);
    }

    const talentData = require('../data/talents');
    const charTalents = talentData[inv.character_id];
    const equippedTalentIdx = inv.equipped_talent ?? 0;
    const activeTalent = charTalents?.talents?.[equippedTalentIdx] || null;

    const unit = createUnit(inv, inv.level, inv.awakening, false, skills, activeTalent, inv.promotion || 0);
    unit.characterId = inv.character_id;
    units.push(unit);
  }
  return { units };
}

function collectTagCounts(partyUnits) {
  const tagCounts = {};
  for (const u of partyUnits) {
    const tags = db.prepare('SELECT t.id, t.label FROM character_tags ct JOIN tags t ON ct.tag_id = t.id WHERE ct.character_id = ?').all(u.characterId);
    u.tags = tags.map(t => ({ id: t.id, label: t.label }));
    for (const t of tags) tagCounts[t.id] = (tagCounts[t.id] || 0) + 1;
  }
  return tagCounts;
}

function buildEnemyFromMonster(e, idx, idPrefix) {
  let monsterId = e.monsterId || e.id;
  if (e.pool && Array.isArray(e.pool) && e.pool.length > 0) {
    monsterId = e.pool[Math.floor(Math.random() * e.pool.length)];
  }

  if (!monsterId) {
    const data = { ...e, id: `${idPrefix}_${idx}` };
    return createUnit(data, 1, 0, true, data.skills || e.skills || [], e.talent || null, 0);
  }

  const monRow = db.prepare('SELECT * FROM monsters WHERE id = ?').get(monsterId);
  if (!monRow) return null;

  const scale = e.level_scale || e.scale || 1.0;
  const data = {
    id: `${idPrefix}_${idx}`,
    name: e.name_override || e.name || monRow.name,
    element: monRow.element,
    origin: monRow.origin,
    hp: Math.round(monRow.hp * scale),
    atk: Math.round(monRow.atk * scale),
    def: Math.round(monRow.def * scale),
    spd: Math.round(monRow.spd * scale),
    turn_notes: monRow.turn_notes,
    isBoss: !!monRow.is_boss,
    ai_type: e.ai_type || monRow.ai_type || 'basic',
    image_sd: monRow.image_sd || null,
    skills: JSON.parse(monRow.skills || '[]'),
  };

  const unit = createUnit(data, 1, 0, true, data.skills, e.talent || null, 0);
  unit._monsterId = monRow.id;

  const eTags = db.prepare('SELECT t.id, t.label FROM monster_tags mt JOIN tags t ON mt.tag_id = t.id WHERE mt.monster_id = ?').all(monRow.id);
  unit.tags = eTags.map(t => ({ id: t.id, label: t.label }));

  return unit;
}

function giveItem(userId, itemId, quantity) {
  db.prepare(`INSERT INTO user_items (user_id, item_id, quantity) VALUES (?, ?, ?)
    ON CONFLICT(user_id, item_id) DO UPDATE SET quantity = quantity + ?`)
    .run(userId, itemId, quantity, quantity);
}

function processDrops(userId, enemyData) {
  const droppedItems = [];
  for (const enemy of enemyData) {
    let drops = enemy.drops;
    if (!drops || !drops.length) {
      const monsterId = enemy.monsterId || enemy.id;
      if (monsterId) {
        const monRow = db.prepare('SELECT drops FROM monsters WHERE id = ?').get(monsterId);
        if (monRow) drops = JSON.parse(monRow.drops || '[]');
      }
    }
    if (!drops) continue;
    for (const drop of drops) {
      if (Math.random() < (drop.rate || 0)) {
        const qty = drop.quantity || 1;
        if (!itemDefs[drop.itemId]) continue;
        giveItem(userId, drop.itemId, qty);
        const existing = droppedItems.find(d => d.itemId === drop.itemId);
        if (existing) {
          existing.quantity += qty;
        } else {
          const def = itemDefs[drop.itemId];
          droppedItems.push({ itemId: drop.itemId, name: def.name, quantity: qty, rarity: def.rarity || 'N' });
        }
      }
    }
  }
  return droppedItems;
}

module.exports = { buildPartyUnits, collectTagCounts, buildEnemyFromMonster, giveItem, processDrops };
