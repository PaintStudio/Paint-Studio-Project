const express = require('express');
const db = require('../db');
const path = require('path');
const fs = require('fs');

const router = express.Router();

// 어드민 비밀번호 (환경변수 또는 기본값)
const ADMIN_PASSWORD = process.env.ADMIN_PASSWORD || 'gacha-admin-2024';

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
    SELECT s.*, cs.is_default FROM character_skills cs
    JOIN skills s ON cs.skill_id = s.id
    WHERE cs.character_id = ?
    ORDER BY s.type, s.cost
  `).all(req.params.id);

  res.json({ character: char, skills });
});

// 캐릭터 생성
router.post('/characters', (req, res) => {
  const { name, rarity, element, origin, title, description, quote, base_hp, base_atk, base_def, base_spd, turn_notes, image_url } = req.body;
  const result = db.prepare(`
    INSERT INTO characters (name, rarity, element, origin, title, description, quote, base_hp, base_atk, base_def, base_spd, turn_notes, image_url)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
  `).run(name, rarity || 'N', element || 'neutral', origin || 'force', title || '', description || '', quote || '',
    base_hp || 1000, base_atk || 100, base_def || 80, base_spd || 100, turn_notes || 4, image_url || '');

  res.json({ id: result.lastInsertRowid });
});

// 캐릭터 수정
router.put('/characters/:id', (req, res) => {
  const char = db.prepare('SELECT * FROM characters WHERE id = ?').get(req.params.id);
  if (!char) return res.status(404).json({ error: '캐릭터를 찾을 수 없습니다' });

  const fields = ['name', 'rarity', 'element', 'origin', 'title', 'description', 'quote',
    'base_hp', 'base_atk', 'base_def', 'base_spd', 'turn_notes', 'image_url', 'image_bust', 'image_sd', 'image_ld', 'is_limited'];

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
  res.json({ ok: true });
});

// 캐릭터 삭제
router.delete('/characters/:id', (req, res) => {
  // 연관 데이터 정리
  db.prepare('DELETE FROM character_skills WHERE character_id = ?').run(req.params.id);
  db.prepare('DELETE FROM characters WHERE id = ?').run(req.params.id);
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
  const { name, description, type, cost, power, element, target, defense_mult, cooldown, extra } = req.body;
  const result = db.prepare(`
    INSERT INTO skills (name, description, type, cost, power, element, target, defense_mult, cooldown, extra)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
  `).run(name, description || '', type || 'attack', cost || 1, power || 1.0,
    element || 'neutral', target || 'single', defense_mult || 0, cooldown || 0,
    typeof extra === 'string' ? extra : JSON.stringify(extra || {}));

  res.json({ id: result.lastInsertRowid });
});

// 스킬 수정
router.put('/skills/:id', (req, res) => {
  const fields = ['name', 'description', 'type', 'cost', 'power', 'element', 'target', 'defense_mult', 'cooldown', 'extra'];
  const updates = [];
  const values = [];
  for (const f of fields) {
    if (req.body[f] !== undefined) {
      updates.push(`${f} = ?`);
      values.push(f === 'extra' && typeof req.body[f] !== 'string' ? JSON.stringify(req.body[f]) : req.body[f]);
    }
  }
  if (updates.length === 0) return res.json({ ok: true });
  values.push(req.params.id);
  db.prepare(`UPDATE skills SET ${updates.join(', ')} WHERE id = ?`).run(...values);
  res.json({ ok: true });
});

// 스킬 삭제
router.delete('/skills/:id', (req, res) => {
  db.prepare('DELETE FROM character_skills WHERE skill_id = ?').run(req.params.id);
  db.prepare('DELETE FROM equipped_skills WHERE skill_id = ?').run(req.params.id);
  db.prepare('DELETE FROM skills WHERE id = ?').run(req.params.id);
  res.json({ ok: true });
});

// ============ 캐릭터-스킬 매핑 ============

// 캐릭터에 스킬 추가
router.post('/characters/:id/skills', (req, res) => {
  const { skillId, isDefault } = req.body;
  try {
    db.prepare('INSERT OR IGNORE INTO character_skills (character_id, skill_id, is_default) VALUES (?, ?, ?)')
      .run(req.params.id, skillId, isDefault ? 1 : 0);
    res.json({ ok: true });
  } catch (e) {
    res.status(400).json({ error: e.message });
  }
});

// 캐릭터에서 스킬 제거
router.delete('/characters/:charId/skills/:skillId', (req, res) => {
  db.prepare('DELETE FROM character_skills WHERE character_id = ? AND skill_id = ?')
    .run(req.params.charId, req.params.skillId);
  res.json({ ok: true });
});

// 캐릭터 스킬 기본값 토글
router.patch('/characters/:charId/skills/:skillId/default', (req, res) => {
  const current = db.prepare('SELECT is_default FROM character_skills WHERE character_id = ? AND skill_id = ?')
    .get(req.params.charId, req.params.skillId);
  if (!current) return res.status(404).json({ error: '매핑을 찾을 수 없습니다' });

  db.prepare('UPDATE character_skills SET is_default = ? WHERE character_id = ? AND skill_id = ?')
    .run(current.is_default ? 0 : 1, req.params.charId, req.params.skillId);
  res.json({ ok: true, isDefault: !current.is_default });
});

// ============ 스테이지 관리 ============

router.get('/stages', (req, res) => {
  const stages = db.prepare('SELECT * FROM stages ORDER BY chapter, stage_number').all();
  res.json({ stages: stages.map(s => ({ ...s, enemy_data: JSON.parse(s.enemy_data), rewards: JSON.parse(s.rewards) })) });
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

module.exports = router;
