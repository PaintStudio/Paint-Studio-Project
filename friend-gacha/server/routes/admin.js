const express = require('express');
const db = require('../db');
const { exportGameData, resetUserData } = require('../db');
const path = require('path');
const fs = require('fs');

const router = express.Router();

// 어드민 비밀번호 (환경변수 또는 기본값)
const ADMIN_PASSWORD = process.env.ADMIN_PASSWORD || 'dawnsky58';

// 어드민 인증 미들웨어
function adminAuth(req, res, next) {
  const pw = req.headers['x-admin-key'];
  if (pw !== ADMIN_PASSWORD) {
    return res.status(403).json({ error: '어드민 권한이 없습니다' });
  }
  next();
}

// 비밀번호 확인 엔드포인트 (프론트에서 로그인용)
router.post('/verify', (req, res) => {
  if (req.body.password === ADMIN_PASSWORD) {
    res.json({ ok: true });
  } else {
    res.status(403).json({ error: '비밀번호가 틀렸습니다' });
  }
});

// 이하 모든 라우트에 어드민 인증 적용
router.use(adminAuth);

// 게임 데이터 수동 내보내기
router.post('/export-game-data', (req, res) => {
  exportGameData();
  res.json({ ok: true });
});

// 유저 데이터 리셋
router.post('/reset-user-data', (req, res) => {
  const { confirm } = req.body;
  if (confirm !== 'RESET') return res.status(400).json({ error: '확인 코드를 입력하세요 (RESET)' });
  exportGameData();
  resetUserData();
  res.json({ ok: true });
});

// 이미지 저장 경로 (data/ 아래에 저장 → Express가 직접 서빙)
const IMAGE_DIR = path.join(__dirname, '..', '..', 'data', 'images', 'characters');

// ============ 캐릭터 CRUD ============

// 캐릭터 전체 목록
router.get('/characters', (req, res) => {
  const characters = db.prepare(`
    SELECT * FROM characters ORDER BY
      CASE rarity WHEN 'CR' THEN 0 WHEN 'SSR' THEN 1 WHEN 'SR' THEN 2 WHEN 'R' THEN 3 ELSE 4 END,
      id
  `).all();
  res.json({ characters });
});

// 캐릭터 상세 (스킬 매핑 포함)
router.get('/characters/:id', (req, res) => {
  const char = db.prepare('SELECT * FROM characters WHERE id = ?').get(req.params.id);
  if (!char) return res.status(404).json({ error: '캐릭터를 찾을 수 없습니다' });

  const skills = db.prepare(`
    SELECT s.*, cs.is_default, cs.is_fixed, cs.awakening_required FROM character_skills cs
    JOIN skills s ON cs.skill_id = s.id
    WHERE cs.character_id = ?
    ORDER BY s.type, s.cost, s.name
  `).all(req.params.id);

  res.json({ character: char, skills });
});

// 캐릭터 생성
router.post('/characters', (req, res) => {
  const { name, rarity, element, origin, title, description, quote, base_hp, base_atk, base_def, base_spd, turn_notes, image_url, attack_slots, defense_slots } = req.body;
  const result = db.prepare(`
    INSERT INTO characters (name, rarity, element, origin, title, description, quote, base_hp, base_atk, base_def, base_spd, turn_notes, image_url, attack_slots, defense_slots)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
  `).run(name, rarity || 'N', element || 'neutral', origin || 'force', title || '', description || '', quote || '',
    base_hp || 1000, base_atk || 100, base_def || 80, base_spd || 100, turn_notes || 4, image_url || '',
    attack_slots ?? 3, defense_slots ?? 2);

  exportGameData();
  res.json({ id: result.lastInsertRowid });
});

// 캐릭터 수정
router.put('/characters/:id', (req, res) => {
  const char = db.prepare('SELECT * FROM characters WHERE id = ?').get(req.params.id);
  if (!char) return res.status(404).json({ error: '캐릭터를 찾을 수 없습니다' });

  const fields = ['name', 'rarity', 'element', 'origin', 'title', 'description', 'quote',
    'base_hp', 'base_atk', 'base_def', 'base_spd', 'turn_notes', 'image_url', 'image_bust', 'image_sd', 'image_ld', 'is_limited',
    'attack_slots', 'defense_slots'];

  const updates = [];
  const values = [];
  for (const f of fields) {
    if (req.body[f] !== undefined) {
      updates.push(`${f} = ?`);
      values.push(req.body[f]);
    }
  }

  if (updates.length === 0) return res.json({ ok: true });

  values.push(req.params.id);
  db.prepare(`UPDATE characters SET ${updates.join(', ')} WHERE id = ?`).run(...values);
  exportGameData();
  res.json({ ok: true });
});

// 캐릭터 삭제
router.delete('/characters/:id', (req, res) => {
  // 연관 데이터 정리
  db.prepare('DELETE FROM character_skills WHERE character_id = ?').run(req.params.id);
  db.prepare('DELETE FROM characters WHERE id = ?').run(req.params.id);
  exportGameData();
  res.json({ ok: true });
});

// ============ 이미지 업로드 ============

const IMAGE_TYPES = { portrait: 'image_url', bust: 'image_bust', sd: 'image_sd', ld: 'image_ld' };

function handleImageUpload(req, res, imageType) {
  const char = db.prepare('SELECT * FROM characters WHERE id = ?').get(req.params.id);
  if (!char) return res.status(404).json({ error: '캐릭터를 찾을 수 없습니다' });
  if (!fs.existsSync(IMAGE_DIR)) fs.mkdirSync(IMAGE_DIR, { recursive: true });

  const contentType = req.headers['content-type'] || 'image/png';
  const ext = contentType.includes('jpeg') || contentType.includes('jpg') ? 'jpg'
    : contentType.includes('webp') ? 'webp'
    : contentType.includes('gif') ? 'gif' : 'png';

  const prefix = imageType === 'portrait' ? 'char' : `char_${imageType}`;
  const filename = `${prefix}_${req.params.id}.${ext}`;
  const filepath = path.join(IMAGE_DIR, filename);

  for (const old of ['png', 'jpg', 'webp', 'gif']) {
    const oldPath = path.join(IMAGE_DIR, `${prefix}_${req.params.id}.${old}`);
    if (fs.existsSync(oldPath)) fs.unlinkSync(oldPath);
  }

  fs.writeFileSync(filepath, req.body);
  const imageUrl = `/uploads/characters/${filename}`;
  const column = IMAGE_TYPES[imageType];
  db.prepare(`UPDATE characters SET ${column} = ? WHERE id = ?`).run(imageUrl, req.params.id);
  res.json({ ok: true, [column]: imageUrl });
}

// 기본 이미지 업로드 (portrait, 기존 호환)
router.post('/characters/:id/image', express.raw({ type: ['image/*'], limit: '5mb' }), (req, res) => {
  handleImageUpload(req, res, 'portrait');
});

// 종류별 이미지 업로드: /admin/characters/:id/image/:type (portrait/bust/sd/ld)
router.post('/characters/:id/image/:type', express.raw({ type: ['image/*'], limit: '10mb' }), (req, res) => {
  const type = req.params.type;
  if (!IMAGE_TYPES[type]) return res.status(400).json({ error: `유효하지 않은 이미지 타입: ${type}` });
  handleImageUpload(req, res, type);
});

// ============ 스킬 CRUD ============

// 스킬 전체 목록
router.get('/skills', (req, res) => {
  const skills = db.prepare('SELECT * FROM skills ORDER BY type, cost, name').all();
  res.json({ skills });
});

// 스킬 생성
router.post('/skills', (req, res) => {
  const { name, description, type, rarity, cost, power, element, target, defense_mult, cooldown, extra, equip_condition } = req.body;
  const result = db.prepare(`
    INSERT INTO skills (name, description, type, rarity, cost, power, element, target, defense_mult, cooldown, extra, equip_condition)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
  `).run(name, description || '', type || 'attack', rarity || 'faint', cost ?? 1, power ?? 1.0,
    element || 'neutral', target || 'single', defense_mult ?? 0, cooldown ?? 0,
    typeof extra === 'string' ? extra : JSON.stringify(extra || {}),
    typeof equip_condition === 'string' ? equip_condition : JSON.stringify(equip_condition || {}));

  exportGameData();
  res.json({ id: result.lastInsertRowid });
});

// 스킬 수정
router.put('/skills/:id', (req, res) => {
  const fields = ['name', 'description', 'type', 'rarity', 'cost', 'power', 'element', 'target', 'defense_mult', 'cooldown', 'extra', 'equip_condition', 'icon'];
  const jsonFields = new Set(['extra', 'equip_condition']);
  const updates = [];
  const values = [];
  for (const f of fields) {
    if (req.body[f] !== undefined) {
      updates.push(`${f} = ?`);
      values.push(jsonFields.has(f) && typeof req.body[f] !== 'string' ? JSON.stringify(req.body[f]) : req.body[f]);
    }
  }
  if (updates.length === 0) return res.json({ ok: true });
  values.push(req.params.id);
  db.prepare(`UPDATE skills SET ${updates.join(', ')} WHERE id = ?`).run(...values);
  exportGameData();
  res.json({ ok: true });
});

// 스킬 삭제
router.delete('/skills/:id', (req, res) => {
  db.prepare('DELETE FROM character_skills WHERE skill_id = ?').run(req.params.id);
  db.prepare('DELETE FROM equipped_skills WHERE skill_id = ?').run(req.params.id);
  db.prepare('DELETE FROM skills WHERE id = ?').run(req.params.id);
  exportGameData();
  res.json({ ok: true });
});

// 스킬 아이콘 업로드
const SKILL_ICON_DIR = path.join(__dirname, '..', '..', 'data', 'images', 'skills');
router.post('/skills/:id/icon', express.raw({ type: ['image/*'], limit: '2mb' }), (req, res) => {
  const skill = db.prepare('SELECT id FROM skills WHERE id = ?').get(req.params.id);
  if (!skill) return res.status(404).json({ error: '스킬을 찾을 수 없습니다' });
  if (!fs.existsSync(SKILL_ICON_DIR)) fs.mkdirSync(SKILL_ICON_DIR, { recursive: true });

  const contentType = req.headers['content-type'] || 'image/png';
  const ext = contentType.includes('jpeg') || contentType.includes('jpg') ? 'jpg'
    : contentType.includes('webp') ? 'webp' : 'png';
  const filename = `skill_${req.params.id}.${ext}`;
  const filepath = path.join(SKILL_ICON_DIR, filename);

  for (const old of ['png', 'jpg', 'webp']) {
    const oldPath = path.join(SKILL_ICON_DIR, `skill_${req.params.id}.${old}`);
    if (fs.existsSync(oldPath)) fs.unlinkSync(oldPath);
  }

  fs.writeFileSync(filepath, req.body);
  const icon = `/uploads/skills/${filename}`;
  db.prepare('UPDATE skills SET icon = ? WHERE id = ?').run(icon, req.params.id);
  res.json({ ok: true, icon });
});

// ============ 캐릭터-스킬 매핑 ============

// 캐릭터에 스킬 추가
router.post('/characters/:id/skills', (req, res) => {
  const { skillId, isDefault, isFixed, awakeningRequired } = req.body;
  const awkReq = awakeningRequired !== undefined ? awakeningRequired : (isDefault ? 0 : -1);
  try {
    db.prepare('INSERT OR IGNORE INTO character_skills (character_id, skill_id, is_default, is_fixed, awakening_required) VALUES (?, ?, ?, ?, ?)')
      .run(req.params.id, skillId, awkReq === 0 ? 1 : 0, isFixed ? 1 : 0, awkReq);
    exportGameData();
    res.json({ ok: true });
  } catch (e) {
    res.status(400).json({ error: e.message });
  }
});

// 캐릭터에서 스킬 제거
router.delete('/characters/:charId/skills/:skillId', (req, res) => {
  db.prepare('DELETE FROM character_skills WHERE character_id = ? AND skill_id = ?')
    .run(req.params.charId, req.params.skillId);
  exportGameData();
  res.json({ ok: true });
});

// 캐릭터 스킬 기본값 토글 (하위호환 + awakening_required 연동)
router.patch('/characters/:charId/skills/:skillId/default', (req, res) => {
  const current = db.prepare('SELECT is_default, awakening_required FROM character_skills WHERE character_id = ? AND skill_id = ?')
    .get(req.params.charId, req.params.skillId);
  if (!current) return res.status(404).json({ error: '매핑을 찾을 수 없습니다' });

  const newDefault = current.is_default ? 0 : 1;
  db.prepare('UPDATE character_skills SET is_default = ?, awakening_required = ? WHERE character_id = ? AND skill_id = ?')
    .run(newDefault, newDefault ? 0 : -1, req.params.charId, req.params.skillId);
  exportGameData();
  res.json({ ok: true, isDefault: !!newDefault, awakeningRequired: newDefault ? 0 : -1 });
});

// 캐릭터 스킬 획득 단계 설정 (0=획득시, 1~5=각성, 11~13=승급)
router.patch('/characters/:charId/skills/:skillId/awakening', (req, res) => {
  const { awakeningRequired } = req.body;
  if (awakeningRequired === undefined) return res.status(400).json({ error: 'awakeningRequired 필수' });

  const current = db.prepare('SELECT 1 FROM character_skills WHERE character_id = ? AND skill_id = ?')
    .get(req.params.charId, req.params.skillId);
  if (!current) return res.status(404).json({ error: '매핑을 찾을 수 없습니다' });

  db.prepare('UPDATE character_skills SET awakening_required = ?, is_default = ? WHERE character_id = ? AND skill_id = ?')
    .run(awakeningRequired, awakeningRequired === 0 ? 1 : 0, req.params.charId, req.params.skillId);
  exportGameData();
  res.json({ ok: true });
});

// 캐릭터 스킬 고정 토글
router.patch('/characters/:charId/skills/:skillId/fixed', (req, res) => {
  const current = db.prepare('SELECT is_fixed FROM character_skills WHERE character_id = ? AND skill_id = ?')
    .get(req.params.charId, req.params.skillId);
  if (!current) return res.status(404).json({ error: '매핑을 찾을 수 없습니다' });

  db.prepare('UPDATE character_skills SET is_fixed = ? WHERE character_id = ? AND skill_id = ?')
    .run(current.is_fixed ? 0 : 1, req.params.charId, req.params.skillId);
  exportGameData();
  res.json({ ok: true, isFixed: !current.is_fixed });
});

// ============ 태그 정의 관리 ============

router.get('/tag-defs', (req, res) => {
  const tags = db.prepare(`
    SELECT t.*,
      (SELECT COUNT(*) FROM character_tags ct WHERE ct.tag_id = t.id) as charCount,
      (SELECT COUNT(*) FROM monster_tags mt WHERE mt.tag_id = t.id) as monCount
    FROM tags t ORDER BY t.label
  `).all();
  res.json({ tags: tags.map(t => ({ ...t, count: t.charCount + t.monCount })) });
});

router.post('/tag-defs', (req, res) => {
  const { label } = req.body;
  if (!label || !label.trim()) return res.status(400).json({ error: '태그 이름을 입력하세요' });
  try {
    const result = db.prepare('INSERT INTO tags (label) VALUES (?)').run(label.trim());
    res.json({ ok: true, id: result.lastInsertRowid, label: label.trim() });
  } catch (e) {
    res.status(400).json({ error: '이미 존재하는 태그입니다' });
  }
});

router.put('/tag-defs/:id', (req, res) => {
  const { label } = req.body;
  if (!label || !label.trim()) return res.status(400).json({ error: '태그 이름을 입력하세요' });
  db.prepare('UPDATE tags SET label = ? WHERE id = ?').run(label.trim(), req.params.id);
  res.json({ ok: true });
});

router.delete('/tag-defs/:id', (req, res) => {
  db.prepare('DELETE FROM character_tags WHERE tag_id = ?').run(req.params.id);
  db.prepare('DELETE FROM monster_tags WHERE tag_id = ?').run(req.params.id);
  db.prepare('DELETE FROM tags WHERE id = ?').run(req.params.id);
  res.json({ ok: true });
});

// ============ 캐릭터 태그 관리 ============

router.get('/characters/:id/tags', (req, res) => {
  const tags = db.prepare(`
    SELECT t.id, t.label FROM character_tags ct
    JOIN tags t ON ct.tag_id = t.id
    WHERE ct.character_id = ? ORDER BY t.label
  `).all(req.params.id);
  res.json({ tags });
});

router.post('/characters/:id/tags', (req, res) => {
  const { tagId } = req.body;
  if (!tagId) return res.status(400).json({ error: 'tagId를 입력하세요' });
  try {
    db.prepare('INSERT OR IGNORE INTO character_tags (character_id, tag_id) VALUES (?, ?)').run(req.params.id, tagId);
    res.json({ ok: true });
  } catch (e) {
    res.status(400).json({ error: e.message });
  }
});

router.delete('/characters/:charId/tags/:tagId', (req, res) => {
  db.prepare('DELETE FROM character_tags WHERE character_id = ? AND tag_id = ?').run(req.params.charId, req.params.tagId);
  res.json({ ok: true });
});

// ============ 몬스터 태그 관리 ============

router.get('/monsters/:id/tags', (req, res) => {
  const tags = db.prepare(`
    SELECT t.id, t.label FROM monster_tags mt
    JOIN tags t ON mt.tag_id = t.id
    WHERE mt.monster_id = ? ORDER BY t.label
  `).all(req.params.id);
  res.json({ tags });
});

router.post('/monsters/:id/tags', (req, res) => {
  const { tagId } = req.body;
  if (!tagId) return res.status(400).json({ error: 'tagId를 입력하세요' });
  try {
    db.prepare('INSERT OR IGNORE INTO monster_tags (monster_id, tag_id) VALUES (?, ?)').run(req.params.id, tagId);
    res.json({ ok: true });
  } catch (e) {
    res.status(400).json({ error: e.message });
  }
});

router.delete('/monsters/:monId/tags/:tagId', (req, res) => {
  db.prepare('DELETE FROM monster_tags WHERE monster_id = ? AND tag_id = ?').run(req.params.monId, req.params.tagId);
  res.json({ ok: true });
});

// ============ 스테이지 관리 ============

router.get('/stages', (req, res) => {
  const stages = db.prepare('SELECT * FROM stages ORDER BY type, dungeon_group, chapter, stage_number').all();
  res.json({ stages: stages.map(s => ({
    ...s,
    enemy_data: JSON.parse(s.enemy_data),
    rewards: JSON.parse(s.rewards),
    story_script: s.story_script ? JSON.parse(s.story_script) : null,
    open_days: s.open_days ? JSON.parse(s.open_days) : null,
    always_open: !!s.always_open,
    unlock_condition: s.unlock_condition ? JSON.parse(s.unlock_condition) : null,
    type: s.type || 'story',
  })) });
});

router.post('/stages', (req, res) => {
  const { chapter, stage_number, name, difficulty, stamina_cost, recommended_level,
    enemy_data, rewards, type, open_days, always_open, unlock_condition,
    dungeon_group, description, icon } = req.body;
  if (!name) return res.status(400).json({ error: '이름은 필수입니다' });
  const result = db.prepare(
    `INSERT INTO stages (chapter, stage_number, name, difficulty, stamina_cost, recommended_level,
      enemy_data, rewards, type, open_days, always_open, unlock_condition, dungeon_group, description, icon)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`
  ).run(
    chapter || 0, stage_number || 0, name, difficulty || 'normal',
    stamina_cost || 6, recommended_level || 1,
    JSON.stringify(enemy_data || []), JSON.stringify(rewards || { gold: 100, exp: 50 }),
    type || 'story',
    open_days ? JSON.stringify(open_days) : null,
    always_open ? 1 : 0,
    unlock_condition ? JSON.stringify(unlock_condition) : null,
    dungeon_group || null, description || null, icon || null
  );
  res.json({ id: result.lastInsertRowid });
});

router.put('/stages/:id', (req, res) => {
  const b = req.body;
  const stage = db.prepare('SELECT * FROM stages WHERE id = ?').get(req.params.id);
  if (!stage) return res.status(404).json({ error: '스테이지를 찾을 수 없습니다' });
  db.prepare(
    `UPDATE stages SET chapter=?, stage_number=?, name=?, difficulty=?, stamina_cost=?, recommended_level=?,
      enemy_data=?, rewards=?, type=?, open_days=?, always_open=?, unlock_condition=?,
      dungeon_group=?, description=?, icon=? WHERE id=?`
  ).run(
    b.chapter ?? stage.chapter, b.stage_number ?? stage.stage_number,
    b.name ?? stage.name, b.difficulty ?? stage.difficulty,
    b.stamina_cost ?? stage.stamina_cost, b.recommended_level ?? stage.recommended_level,
    b.enemy_data ? JSON.stringify(b.enemy_data) : stage.enemy_data,
    b.rewards ? JSON.stringify(b.rewards) : stage.rewards,
    b.type ?? stage.type ?? 'story',
    b.open_days !== undefined ? (b.open_days ? JSON.stringify(b.open_days) : null) : stage.open_days,
    b.always_open !== undefined ? (b.always_open ? 1 : 0) : stage.always_open,
    b.unlock_condition !== undefined ? (b.unlock_condition ? JSON.stringify(b.unlock_condition) : null) : stage.unlock_condition,
    b.dungeon_group !== undefined ? (b.dungeon_group || null) : stage.dungeon_group,
    b.description !== undefined ? (b.description || null) : stage.description,
    b.icon !== undefined ? (b.icon || null) : stage.icon,
    req.params.id
  );
  res.json({ ok: true });
});

router.delete('/stages/:id', (req, res) => {
  db.prepare('DELETE FROM stage_clears WHERE stage_id = ?').run(req.params.id);
  db.prepare('DELETE FROM stages WHERE id = ?').run(req.params.id);
  res.json({ ok: true });
});

router.put('/stages/:id/story', (req, res) => {
  const { storyScript } = req.body;
  const val = storyScript ? JSON.stringify(storyScript) : null;
  db.prepare('UPDATE stages SET story_script = ? WHERE id = ?').run(val, req.params.id);
  res.json({ ok: true });
});

// ============ 스토리 노드 관리 ============

router.get('/story-nodes', (req, res) => {
  const nodes = db.prepare('SELECT * FROM story_nodes ORDER BY category, chapter, node_number').all();
  res.json({ nodes: nodes.map(n => ({
    ...n,
    story_script: n.story_script ? JSON.parse(n.story_script) : null,
    enemy_data: n.enemy_data ? JSON.parse(n.enemy_data) : null,
    rewards: n.rewards ? JSON.parse(n.rewards) : null,
  })) });
});

router.post('/story-nodes', (req, res) => {
  const { category, chapter, node_number, title, node_type, story_script,
    enemy_data, stamina_cost, rewards, recommended_level, difficulty,
    character_id, event_id } = req.body;
  if (!title) return res.status(400).json({ error: '제목은 필수입니다' });
  const result = db.prepare(
    `INSERT INTO story_nodes (category, chapter, node_number, title, node_type, story_script,
      enemy_data, stamina_cost, rewards, recommended_level, difficulty, character_id, event_id)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`
  ).run(
    category || 'main', chapter || 1, node_number || 1, title,
    node_type || 'story',
    story_script ? JSON.stringify(story_script) : null,
    enemy_data ? JSON.stringify(enemy_data) : null,
    stamina_cost || 0,
    rewards ? JSON.stringify(rewards) : null,
    recommended_level || 1, difficulty || 'normal',
    character_id || null, event_id || null
  );
  res.json({ id: result.lastInsertRowid });
});

router.put('/story-nodes/:id', (req, res) => {
  const b = req.body;
  const node = db.prepare('SELECT * FROM story_nodes WHERE id = ?').get(req.params.id);
  if (!node) return res.status(404).json({ error: '노드를 찾을 수 없습니다' });
  db.prepare(
    `UPDATE story_nodes SET category=?, chapter=?, node_number=?, title=?, node_type=?,
      story_script=?, enemy_data=?, stamina_cost=?, rewards=?, recommended_level=?,
      difficulty=?, character_id=?, event_id=? WHERE id=?`
  ).run(
    b.category ?? node.category, b.chapter ?? node.chapter,
    b.node_number ?? node.node_number, b.title ?? node.title,
    b.node_type ?? node.node_type,
    b.story_script !== undefined ? (b.story_script ? JSON.stringify(b.story_script) : null) : node.story_script,
    b.enemy_data !== undefined ? (b.enemy_data ? JSON.stringify(b.enemy_data) : null) : node.enemy_data,
    b.stamina_cost ?? node.stamina_cost,
    b.rewards !== undefined ? (b.rewards ? JSON.stringify(b.rewards) : null) : node.rewards,
    b.recommended_level ?? node.recommended_level,
    b.difficulty ?? node.difficulty,
    b.character_id !== undefined ? (b.character_id || null) : node.character_id,
    b.event_id !== undefined ? (b.event_id || null) : node.event_id,
    req.params.id
  );
  res.json({ ok: true });
});

router.delete('/story-nodes/:id', (req, res) => {
  db.prepare('DELETE FROM story_clears WHERE node_id = ?').run(req.params.id);
  db.prepare('DELETE FROM story_nodes WHERE id = ?').run(req.params.id);
  res.json({ ok: true });
});

// ============ 가챠 배너 관리 ============

const { loadBanners, saveBanners } = require('./gacha');
const BANNER_IMAGE_DIR = path.join(__dirname, '..', '..', 'data', 'images', 'banners');

// 배너 전체 목록 (어드민용 - 비활성 포함)
router.get('/banners', (req, res) => {
  const data = loadBanners();
  res.json(data);
});

// 배너 생성
router.post('/banners', (req, res) => {
  const data = loadBanners();
  const { id, name, type, description, characterPool, featuredCharIds, rates, featuredRateUp, startDate, endDate } = req.body;

  if (!id || !name) return res.status(400).json({ error: 'id와 name은 필수입니다' });
  if (data.banners.find(b => b.id === id)) return res.status(400).json({ error: '이미 존재하는 배너 ID입니다' });

  data.banners.push({
    id, name,
    type: type || 'limited',
    description: description || '',
    image: null,
    characterPool: characterPool || 'all',
    featuredCharIds: featuredCharIds || [],
    rates: rates || null,
    featuredRateUp: featuredRateUp || 0.5,
    active: false,
    startDate: startDate || null,
    endDate: endDate || null,
    showTitle: req.body.showTitle !== undefined ? req.body.showTitle : true,
    showRates: req.body.showRates !== undefined ? req.body.showRates : true,
  });

  saveBanners(data);
  res.json({ ok: true });
});

// 배너 수정
router.put('/banners/:bannerId', (req, res) => {
  const data = loadBanners();
  const idx = data.banners.findIndex(b => b.id === req.params.bannerId);
  if (idx === -1) return res.status(404).json({ error: '배너를 찾을 수 없습니다' });

  const allowed = ['name', 'type', 'description', 'characterPool', 'featuredCharIds', 'rates', 'featuredRateUp', 'active', 'startDate', 'endDate', 'showTitle', 'showRates'];
  for (const key of allowed) {
    if (req.body[key] !== undefined) data.banners[idx][key] = req.body[key];
  }

  saveBanners(data);
  res.json({ ok: true });
});

// 배너 삭제
router.delete('/banners/:bannerId', (req, res) => {
  const data = loadBanners();
  data.banners = data.banners.filter(b => b.id !== req.params.bannerId);
  saveBanners(data);
  res.json({ ok: true });
});

// 배너 이미지 업로드
router.post('/banners/:bannerId/image', express.raw({ type: ['image/*'], limit: '5mb' }), (req, res) => {
  const data = loadBanners();
  const banner = data.banners.find(b => b.id === req.params.bannerId);
  if (!banner) return res.status(404).json({ error: '배너를 찾을 수 없습니다' });

  if (!fs.existsSync(BANNER_IMAGE_DIR)) fs.mkdirSync(BANNER_IMAGE_DIR, { recursive: true });

  const contentType = req.headers['content-type'] || 'image/png';
  const ext = contentType.includes('jpeg') || contentType.includes('jpg') ? 'jpg'
    : contentType.includes('webp') ? 'webp' : 'png';

  const filename = `banner_${req.params.bannerId}.${ext}`;
  const filepath = path.join(BANNER_IMAGE_DIR, filename);

  // 기존 파일 삭제
  for (const old of ['png', 'jpg', 'webp']) {
    const oldPath = path.join(BANNER_IMAGE_DIR, `banner_${req.params.bannerId}.${old}`);
    if (fs.existsSync(oldPath)) fs.unlinkSync(oldPath);
  }

  fs.writeFileSync(filepath, req.body);
  const imageUrl = `/uploads/banners/${filename}`;
  banner.image = imageUrl;
  saveBanners(data);

  res.json({ ok: true, image: imageUrl });
});

// ============ 스킬 가챠 배너 관리 ============

const { loadSkillBanners, saveSkillBanners } = require('./gacha');
const SKILL_BANNER_IMAGE_DIR = path.join(__dirname, '..', '..', 'data', 'images', 'banners');

router.get('/skill-banners', (req, res) => {
  const data = loadSkillBanners();
  res.json(data);
});

router.post('/skill-banners', (req, res) => {
  const data = loadSkillBanners();
  const { id, name, type, description, skillPool, featuredSkillIds, rates, featuredRateUp, startDate, endDate, pullCost } = req.body;

  if (!id || !name) return res.status(400).json({ error: 'id와 name은 필수입니다' });
  if (data.banners.find(b => b.id === id)) return res.status(400).json({ error: '이미 존재하는 배너 ID입니다' });

  data.banners.push({
    id, name,
    type: type || 'limited',
    description: description || '',
    image: null,
    skillPool: skillPool || 'all',
    featuredSkillIds: featuredSkillIds || [],
    rates: rates || null,
    featuredRateUp: featuredRateUp ?? 0.5,
    active: false,
    startDate: startDate || null,
    endDate: endDate || null,
    pullCost: pullCost ?? null,
    showTitle: req.body.showTitle !== undefined ? req.body.showTitle : true,
    showRates: req.body.showRates !== undefined ? req.body.showRates : true,
  });

  saveSkillBanners(data);
  res.json({ ok: true });
});

router.put('/skill-banners/:bannerId', (req, res) => {
  const data = loadSkillBanners();
  const idx = data.banners.findIndex(b => b.id === req.params.bannerId);
  if (idx === -1) return res.status(404).json({ error: '배너를 찾을 수 없습니다' });

  const allowed = ['name', 'type', 'description', 'skillPool', 'featuredSkillIds', 'rates', 'featuredRateUp', 'active', 'startDate', 'endDate', 'pullCost', 'showTitle', 'showRates'];
  for (const key of allowed) {
    if (req.body[key] !== undefined) data.banners[idx][key] = req.body[key];
  }

  saveSkillBanners(data);
  res.json({ ok: true });
});

router.delete('/skill-banners/:bannerId', (req, res) => {
  const data = loadSkillBanners();
  data.banners = data.banners.filter(b => b.id !== req.params.bannerId);
  saveSkillBanners(data);
  res.json({ ok: true });
});

router.post('/skill-banners/:bannerId/image', express.raw({ type: ['image/*'], limit: '5mb' }), (req, res) => {
  const data = loadSkillBanners();
  const banner = data.banners.find(b => b.id === req.params.bannerId);
  if (!banner) return res.status(404).json({ error: '배너를 찾을 수 없습니다' });

  if (!fs.existsSync(SKILL_BANNER_IMAGE_DIR)) fs.mkdirSync(SKILL_BANNER_IMAGE_DIR, { recursive: true });

  const contentType = req.headers['content-type'] || 'image/png';
  const ext = contentType.includes('jpeg') || contentType.includes('jpg') ? 'jpg'
    : contentType.includes('webp') ? 'webp' : 'png';

  const filename = `sbanner_${req.params.bannerId}.${ext}`;
  const filepath = path.join(SKILL_BANNER_IMAGE_DIR, filename);

  for (const old of ['png', 'jpg', 'webp']) {
    const oldPath = path.join(SKILL_BANNER_IMAGE_DIR, `sbanner_${req.params.bannerId}.${old}`);
    if (fs.existsSync(oldPath)) fs.unlinkSync(oldPath);
  }

  fs.writeFileSync(filepath, req.body);
  const imageUrl = `/uploads/banners/${filename}`;
  banner.image = imageUrl;
  saveSkillBanners(data);

  res.json({ ok: true, image: imageUrl });
});

// ============ 아이템 관리 (data/items.js) ============

const ITEM_FILE = path.join(__dirname, '..', '..', 'data', 'items.js');
const ITEM_IMAGE_DIR = path.join(__dirname, '..', '..', 'data', 'images', 'items');

function loadItems() {
  delete require.cache[require.resolve('../../data/items')];
  return require('../../data/items');
}

function writeItemsFile(items) {
  const header = `/**
 * 아이템 정의 파일 (어드민에서 자동 생성)
 *
 * 몬스터(monsters.js)의 drops에서 id로 참조합니다.
 * 유저 인벤토리(user_items 테이블)에 수량으로 저장됩니다.
 */

`;
  let body = 'const items = {\n';
  for (const [key, item] of Object.entries(items)) {
    body += `\n  ${key}: ${JSON.stringify(item, null, 4).replace(/\n/g, '\n  ')},\n`;
  }
  body += '};\n\nmodule.exports = items;\n';
  fs.writeFileSync(ITEM_FILE, header + body, 'utf-8');
}

router.get('/items', (req, res) => {
  const items = loadItems();
  res.json({ items: Object.values(items) });
});

router.post('/items', (req, res) => {
  const items = loadItems();
  const { id, name, description, category, rarity, sellPrice, icon, effect } = req.body;
  if (!id || !name) return res.status(400).json({ error: 'id와 name은 필수입니다' });
  if (items[id]) return res.status(400).json({ error: '이미 존재하는 아이템 ID입니다' });

  items[id] = {
    id, name,
    description: description || '',
    category: category || 'material',
    rarity: rarity || 'N',
    sellPrice: sellPrice || 0,
    image: `/uploads/items/${id}.png`,
    icon: icon || '',
    ...(effect ? { effect } : {}),
  };
  writeItemsFile(items);
  res.json({ ok: true, item: items[id] });
});

router.put('/items/:id', (req, res) => {
  const items = loadItems();
  if (!items[req.params.id]) return res.status(404).json({ error: '아이템을 찾을 수 없습니다' });

  const allowed = ['name', 'description', 'category', 'rarity', 'sellPrice', 'icon', 'effect'];
  for (const key of allowed) {
    if (req.body[key] !== undefined) items[req.params.id][key] = req.body[key];
  }
  writeItemsFile(items);
  res.json({ ok: true });
});

router.delete('/items/:id', (req, res) => {
  const items = loadItems();
  if (!items[req.params.id]) return res.status(404).json({ error: '아이템을 찾을 수 없습니다' });
  delete items[req.params.id];
  writeItemsFile(items);
  res.json({ ok: true });
});

router.post('/items/:id/image', express.raw({ type: ['image/*'], limit: '5mb' }), (req, res) => {
  const items = loadItems();
  if (!items[req.params.id]) return res.status(404).json({ error: '아이템을 찾을 수 없습니다' });
  if (!fs.existsSync(ITEM_IMAGE_DIR)) fs.mkdirSync(ITEM_IMAGE_DIR, { recursive: true });

  const contentType = req.headers['content-type'] || 'image/png';
  const ext = contentType.includes('jpeg') || contentType.includes('jpg') ? 'jpg'
    : contentType.includes('webp') ? 'webp' : 'png';

  const filename = `${req.params.id}.${ext}`;
  const filepath = path.join(ITEM_IMAGE_DIR, filename);

  for (const old of ['png', 'jpg', 'webp']) {
    const oldPath = path.join(ITEM_IMAGE_DIR, `${req.params.id}.${old}`);
    if (fs.existsSync(oldPath)) fs.unlinkSync(oldPath);
  }

  fs.writeFileSync(filepath, req.body);
  const imageUrl = `/uploads/items/${filename}`;
  items[req.params.id].image = imageUrl;
  writeItemsFile(items);
  res.json({ ok: true, image: imageUrl });
});

// ============ 몬스터 CRUD ============

const MONSTER_IMAGE_DIR = path.join(__dirname, '..', '..', 'data', 'images', 'monsters');

router.get('/monsters', (req, res) => {
  const monsters = db.prepare('SELECT * FROM monsters ORDER BY id').all();
  res.json({ monsters: monsters.map(m => ({
    ...m,
    is_boss: !!m.is_boss,
    skills: JSON.parse(m.skills || '[]'),
    drops: JSON.parse(m.drops || '[]'),
  })) });
});

router.get('/monsters/:id', (req, res) => {
  const mon = db.prepare('SELECT * FROM monsters WHERE id = ?').get(req.params.id);
  if (!mon) return res.status(404).json({ error: '몬스터를 찾을 수 없습니다' });
  res.json({ monster: { ...mon, is_boss: !!mon.is_boss, skills: JSON.parse(mon.skills || '[]'), drops: JSON.parse(mon.drops || '[]') } });
});

router.post('/monsters', (req, res) => {
  const { id, name, element, origin, image_sd, is_boss, hp, atk, def, spd, turn_notes, skills, drops } = req.body;
  if (!id || !name) return res.status(400).json({ error: 'id와 name은 필수입니다' });
  const exists = db.prepare('SELECT id FROM monsters WHERE id = ?').get(id);
  if (exists) return res.status(400).json({ error: '이미 존재하는 몬스터 ID입니다' });

  db.prepare('INSERT INTO monsters (id, name, element, origin, image_sd, is_boss, hp, atk, def, spd, turn_notes, skills, drops) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)')
    .run(id, name, element || 'neutral', origin || 'force', image_sd || null, is_boss ? 1 : 0,
      hp || 100, atk || 10, def || 5, spd || 5, turn_notes || 3,
      JSON.stringify(skills || []), JSON.stringify(drops || []));

  res.json({ ok: true, id });
});

router.put('/monsters/:id', (req, res) => {
  const mon = db.prepare('SELECT id FROM monsters WHERE id = ?').get(req.params.id);
  if (!mon) return res.status(404).json({ error: '몬스터를 찾을 수 없습니다' });

  const fields = ['name', 'element', 'origin', 'image_sd', 'is_boss', 'hp', 'atk', 'def', 'spd', 'turn_notes'];
  const jsonFields = ['skills', 'drops'];
  const updates = [];
  const values = [];
  for (const f of fields) {
    if (req.body[f] !== undefined) {
      updates.push(`${f} = ?`);
      values.push(f === 'is_boss' ? (req.body[f] ? 1 : 0) : req.body[f]);
    }
  }
  for (const f of jsonFields) {
    if (req.body[f] !== undefined) {
      updates.push(`${f} = ?`);
      values.push(JSON.stringify(req.body[f]));
    }
  }
  if (updates.length === 0) return res.json({ ok: true });
  values.push(req.params.id);
  db.prepare(`UPDATE monsters SET ${updates.join(', ')} WHERE id = ?`).run(...values);
  res.json({ ok: true });
});

router.delete('/monsters/:id', (req, res) => {
  db.prepare('DELETE FROM monsters WHERE id = ?').run(req.params.id);
  res.json({ ok: true });
});

router.post('/monsters/:id/image', express.raw({ type: ['image/*'], limit: '5mb' }), (req, res) => {
  const mon = db.prepare('SELECT id FROM monsters WHERE id = ?').get(req.params.id);
  if (!mon) return res.status(404).json({ error: '몬스터를 찾을 수 없습니다' });
  if (!fs.existsSync(MONSTER_IMAGE_DIR)) fs.mkdirSync(MONSTER_IMAGE_DIR, { recursive: true });

  const contentType = req.headers['content-type'] || 'image/png';
  const ext = contentType.includes('jpeg') || contentType.includes('jpg') ? 'jpg'
    : contentType.includes('webp') ? 'webp' : 'png';

  const filename = `mon_${req.params.id}.${ext}`;
  const filepath = path.join(MONSTER_IMAGE_DIR, filename);

  for (const old of ['png', 'jpg', 'webp']) {
    const oldPath = path.join(MONSTER_IMAGE_DIR, `mon_${req.params.id}.${old}`);
    if (fs.existsSync(oldPath)) fs.unlinkSync(oldPath);
  }

  fs.writeFileSync(filepath, req.body);
  const imageUrl = `/uploads/monsters/${filename}`;
  db.prepare('UPDATE monsters SET image_sd = ? WHERE id = ?').run(imageUrl, req.params.id);
  res.json({ ok: true, image_sd: imageUrl });
});

// ============ DB 유틸 ============

// DB 리셋 (캐릭터/스킬만 — 유저 데이터는 보존 옵션)
router.post('/reset-characters', (req, res) => {
  const doReset = db.transaction(() => {
    db.prepare('DELETE FROM equipped_skills').run();
    db.prepare('DELETE FROM character_skills').run();
    db.prepare('DELETE FROM skills').run();
    db.prepare('DELETE From characters').run();
  });
  doReset();
  res.json({ ok: true, message: '캐릭터/스킬 데이터 초기화 완료. 서버 재시작하면 시드가 다시 생성됩니다.' });
});

// 현재 DB를 시드 코드로 내보내기 (db.js에 붙여넣기용)
router.get('/export-seed', (req, res) => {
  const characters = db.prepare('SELECT * FROM characters ORDER BY id').all();
  const skills = db.prepare('SELECT * FROM skills ORDER BY id').all();
  const mappings = db.prepare(`
    SELECT cs.character_id, c.name as char_name, cs.skill_id, s.name as skill_name, cs.is_default
    FROM character_skills cs
    JOIN characters c ON cs.character_id = c.id
    JOIN skills s ON cs.skill_id = s.id
    ORDER BY cs.character_id, cs.skill_id
  `).all();

  res.json({ characters, skills, mappings });
});

// ============ 유저 관리 ============

router.get('/users', (req, res) => {
  const q = req.query.q || '';
  let users;
  if (q) {
    users = db.prepare(`
      SELECT id, username, display_name, currency, gold, total_pulls
      FROM users WHERE username LIKE ? OR display_name LIKE ?
      ORDER BY id LIMIT 50
    `).all(`%${q}%`, `%${q}%`);
  } else {
    users = db.prepare(`
      SELECT id, username, display_name, currency, gold, total_pulls
      FROM users ORDER BY id LIMIT 50
    `).all();
  }
  res.json({ users });
});

// ============ 아이템 목록 ============
router.get('/items', (req, res) => {
  const itemDefs = require('../../data/items');
  const items = Object.values(itemDefs).map(d => ({
    id: d.id, name: d.name, category: d.category, rarity: d.rarity,
    icon: d.icon, color: d.color,
  }));
  res.json({ items });
});

// ============ 우편 관리 ============

// 전체 유저에게 우편 발송
router.post('/mail/broadcast', (req, res) => {
  const { title, body, rewards, expiresInDays } = req.body;
  if (!title) return res.status(400).json({ error: 'title은 필수입니다' });

  const users = db.prepare('SELECT id FROM users').all();
  const rewardsJson = rewards ? JSON.stringify(rewards) : null;
  const expiresAt = expiresInDays
    ? new Date(Date.now() + expiresInDays * 86400000).toISOString()
    : null;

  const insert = db.prepare(`
    INSERT INTO mail (sender_id, recipient_id, title, body, rewards, expires_at)
    VALUES (NULL, ?, ?, ?, ?, ?)
  `);

  for (const u of users) {
    insert.run(u.id, title, body || '', rewardsJson, expiresAt);
  }

  res.json({ ok: true, sent: users.length });
});

// 특정 유저에게 우편 발송
router.post('/mail/send', (req, res) => {
  const { userId, title, body, rewards, expiresInDays } = req.body;
  if (!userId || !title) return res.status(400).json({ error: 'userId와 title은 필수입니다' });

  const user = db.prepare('SELECT id FROM users WHERE id = ?').get(userId);
  if (!user) return res.status(404).json({ error: '존재하지 않는 유저입니다' });

  const rewardsJson = rewards ? JSON.stringify(rewards) : null;
  const expiresAt = expiresInDays
    ? new Date(Date.now() + expiresInDays * 86400000).toISOString()
    : null;

  db.prepare(`
    INSERT INTO mail (sender_id, recipient_id, title, body, rewards, expires_at)
    VALUES (NULL, ?, ?, ?, ?, ?)
  `).run(userId, title, body || '', rewardsJson, expiresAt);

  res.json({ ok: true });
});

// ============ 특기 관리 ============
const TALENTS_PATH = path.join(__dirname, '../../data/talents.js');

function loadTalents() {
  delete require.cache[require.resolve('../../data/talents')];
  return require('../../data/talents');
}

function saveTalents(data) {
  const lines = ['const talents = ' + JSON.stringify(data, null, 2) + ';\n\nmodule.exports = talents;\n'];
  fs.writeFileSync(TALENTS_PATH, lines.join(''), 'utf-8');
  delete require.cache[require.resolve('../../data/talents')];
}

router.get('/talents/:charId', (req, res) => {
  const charId = Number(req.params.charId);
  const all = loadTalents();
  res.json({ talents: all[charId]?.talents || [] });
});

router.put('/talents/:charId', (req, res) => {
  const charId = Number(req.params.charId);
  const { talents: newTalents } = req.body;
  if (!Array.isArray(newTalents)) return res.status(400).json({ error: '잘못된 형식' });
  const all = loadTalents();
  all[charId] = { talents: newTalents };
  saveTalents(all);
  res.json({ ok: true, count: newTalents.length });
});

// ============ 승급 관리 ============
const PROMOTIONS_PATH = path.join(__dirname, '../../data/promotions.js');

function loadPromotions() {
  delete require.cache[require.resolve('../../data/promotions')];
  return require('../../data/promotions');
}

function savePromotions(data) {
  const lines = ['const promotions = ' + JSON.stringify(data, null, 2) + ';\n\nmodule.exports = promotions;\n'];
  fs.writeFileSync(PROMOTIONS_PATH, lines.join(''), 'utf-8');
  delete require.cache[require.resolve('../../data/promotions')];
}

router.get('/promotions/:charId', (req, res) => {
  const charId = Number(req.params.charId);
  const all = loadPromotions();
  res.json({ tiers: all[charId]?.tiers || [] });
});

router.put('/promotions/:charId', (req, res) => {
  const charId = Number(req.params.charId);
  const { tiers } = req.body;
  if (!Array.isArray(tiers)) return res.status(400).json({ error: '잘못된 형식' });
  const all = loadPromotions();
  if (tiers.length === 0) {
    delete all[charId];
  } else {
    all[charId] = { tiers };
  }
  savePromotions(all);
  res.json({ ok: true, count: tiers.length });
});

// 아이템 목록 (승급 편집에서 아이템 선택용)
router.get('/items-list', (req, res) => {
  const items = loadItems();
  res.json({ items: Object.values(items).map(i => ({ id: i.id, name: i.name, category: i.category, rarity: i.rarity, icon: i.icon })) });
});

// ============ 가챠 설정 관리 ============
const GAME_CONFIG_PATH = path.join(__dirname, '..', '..', 'gameConfig.json');

router.get('/gacha-config', (req, res) => {
  const config = JSON.parse(fs.readFileSync(GAME_CONFIG_PATH, 'utf-8'));
  res.json({ gacha: config.gacha, skillGacha: config.skillGacha });
});

router.put('/gacha-config', (req, res) => {
  const config = JSON.parse(fs.readFileSync(GAME_CONFIG_PATH, 'utf-8'));
  if (req.body.gacha) config.gacha = req.body.gacha;
  if (req.body.skillGacha) config.skillGacha = req.body.skillGacha;
  fs.writeFileSync(GAME_CONFIG_PATH, JSON.stringify(config, null, 2), 'utf-8');
  const { reloadConfig } = require('./gacha');
  reloadConfig();
  res.json({ ok: true });
});

// ============ 대사 관리 ============
const DIALOGUES_PATH = path.join(__dirname, '../../data/dialogues.js');

function loadDialogues() {
  delete require.cache[require.resolve('../../data/dialogues')];
  return require('../../data/dialogues');
}

function saveDialogues(data) {
  const lines = ['const dialogues = ' + JSON.stringify(data, null, 2) + ';\n\nmodule.exports = dialogues;\n'];
  fs.writeFileSync(DIALOGUES_PATH, lines.join(''), 'utf-8');
  delete require.cache[require.resolve('../../data/dialogues')];
}

router.get('/dialogues/:charId', (req, res) => {
  const charId = Number(req.params.charId);
  const all = loadDialogues();
  res.json(all[charId] || {});
});

router.put('/dialogues/:charId', (req, res) => {
  const charId = Number(req.params.charId);
  const all = loadDialogues();
  all[charId] = req.body;
  saveDialogues(all);
  res.json({ ok: true });
});

module.exports = router;
