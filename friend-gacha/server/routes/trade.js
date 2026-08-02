const express = require('express');
const db = require('../db');
const { authMiddleware } = require('../middleware/auth');

const router = express.Router();

// 트레이드 신청
router.post('/offer', authMiddleware, (req, res) => {
  const { toUserId, offerInventoryId, wantInventoryId } = req.body;

  // 내 아이템 확인
  const myItem = db.prepare('SELECT * FROM inventory WHERE id = ? AND user_id = ?').get(offerInventoryId, req.user.id);
  if (!myItem) return res.status(400).json({ error: '보유하지 않은 아이템입니다' });
  if (myItem.is_locked) return res.status(400).json({ error: '잠금된 캐릭터는 교환할 수 없습니다' });

  // 상대 아이템 확인
  const theirItem = db.prepare('SELECT * FROM inventory WHERE id = ? AND user_id = ?').get(wantInventoryId, toUserId);
  if (!theirItem) return res.status(400).json({ error: '상대가 보유하지 않은 아이템입니다' });
  if (theirItem.is_locked) return res.status(400).json({ error: '상대의 잠금된 캐릭터는 교환할 수 없습니다' });

  // 이미 거래 중인 아이템인지 확인
  const pending = db.prepare('SELECT id FROM trades WHERE status = "pending" AND (offer_inventory_id = ? OR want_inventory_id = ? OR offer_inventory_id = ? OR want_inventory_id = ?)')
    .get(offerInventoryId, offerInventoryId, wantInventoryId, wantInventoryId);
  if (pending) return res.status(400).json({ error: '이미 거래 진행 중인 아이템입니다' });

  const result = db.prepare('INSERT INTO trades (from_user_id, to_user_id, offer_inventory_id, want_inventory_id) VALUES (?, ?, ?, ?)')
    .run(req.user.id, toUserId, offerInventoryId, wantInventoryId);

  res.json({ tradeId: result.lastInsertRowid });
});

// 내 트레이드 목록 (보낸 거 + 받은 거)
router.get('/my', authMiddleware, (req, res) => {
  const trades = db.prepare(`
    SELECT t.*,
           fu.display_name as from_name, tu.display_name as to_name,
           oc.name as offer_char_name, oc.rarity as offer_rarity, oc.title as offer_title, oc.image_url as offer_image_url,
           wc.name as want_char_name, wc.rarity as want_rarity, wc.title as want_title, wc.image_url as want_image_url
    FROM trades t
    JOIN users fu ON t.from_user_id = fu.id
    JOIN users tu ON t.to_user_id = tu.id
    JOIN inventory oi ON t.offer_inventory_id = oi.id
    JOIN characters oc ON oi.character_id = oc.id
    JOIN inventory wi ON t.want_inventory_id = wi.id
    JOIN characters wc ON wi.character_id = wc.id
    WHERE t.from_user_id = ? OR t.to_user_id = ?
    ORDER BY t.created_at DESC
  `).all(req.user.id, req.user.id);

  res.json({ trades });
});

// 트레이드 수락
router.post('/accept/:tradeId', authMiddleware, (req, res) => {
  const trade = db.prepare('SELECT * FROM trades WHERE id = ? AND to_user_id = ? AND status = "pending"').get(req.params.tradeId, req.user.id);
  if (!trade) return res.status(400).json({ error: '유효하지 않은 거래입니다' });

  // 트랜잭션으로 교환 실행
  const doTrade = db.transaction(() => {
    // 아이템 소유권 교환
    db.prepare('UPDATE inventory SET user_id = ? WHERE id = ?').run(trade.to_user_id, trade.offer_inventory_id);
    db.prepare('UPDATE inventory SET user_id = ? WHERE id = ?').run(trade.from_user_id, trade.want_inventory_id);
    // 양쪽 파티 프리셋에서 교환된 캐릭터 제거
    for (const [userId, invId] of [[trade.from_user_id, trade.offer_inventory_id], [trade.to_user_id, trade.want_inventory_id]]) {
      const presets = db.prepare('SELECT slot, party_ids FROM party_presets WHERE user_id = ?').all(userId);
      for (const p of presets) {
        const ids = JSON.parse(p.party_ids);
        if (ids.includes(invId)) {
          db.prepare('UPDATE party_presets SET party_ids = ? WHERE user_id = ? AND slot = ?')
            .run(JSON.stringify(ids.filter(id => id !== invId)), userId, p.slot);
        }
      }
    }
    // 거래 완료
    db.prepare('UPDATE trades SET status = "accepted", resolved_at = CURRENT_TIMESTAMP WHERE id = ?').run(trade.id);
  });

  doTrade();
  res.json({ ok: true, message: '교환 완료!' });
});

// 트레이드 거절
router.post('/reject/:tradeId', authMiddleware, (req, res) => {
  const trade = db.prepare('SELECT * FROM trades WHERE id = ? AND to_user_id = ? AND status = "pending"').get(req.params.tradeId, req.user.id);
  if (!trade) return res.status(400).json({ error: '유효하지 않은 거래입니다' });

  db.prepare('UPDATE trades SET status = "rejected", resolved_at = CURRENT_TIMESTAMP WHERE id = ?').run(trade.id);
  res.json({ ok: true });
});

// 트레이드 취소 (보낸 사람이)
router.post('/cancel/:tradeId', authMiddleware, (req, res) => {
  const trade = db.prepare('SELECT * FROM trades WHERE id = ? AND from_user_id = ? AND status = "pending"').get(req.params.tradeId, req.user.id);
  if (!trade) return res.status(400).json({ error: '유효하지 않은 거래입니다' });

  db.prepare('UPDATE trades SET status = "cancelled", resolved_at = CURRENT_TIMESTAMP WHERE id = ?').run(trade.id);
  res.json({ ok: true });
});

// 유저 목록 (트레이드 상대 선택용)
router.get('/users', authMiddleware, (req, res) => {
  const users = db.prepare('SELECT id, display_name, total_pulls FROM users WHERE id != ?').all(req.user.id);
  res.json({ users });
});

module.exports = router;
