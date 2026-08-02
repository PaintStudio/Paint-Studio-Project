const API_BASE = '/api';

function getToken() { return localStorage.getItem('gacha_token'); }
export function setToken(token) { localStorage.setItem('gacha_token', token); }
export function clearToken() { localStorage.removeItem('gacha_token'); }

async function request(path, options = {}) {
  const token = getToken();
  const res = await fetch(API_BASE + path, {
    ...options,
    headers: {
      'Content-Type': 'application/json',
      ...(token ? { Authorization: 'Bearer ' + token } : {}),
      ...options.headers,
    },
    body: options.body ? JSON.stringify(options.body) : undefined,
  });
  let data;
  try {
    data = await res.json();
  } catch {
    throw new Error(`서버 응답 파싱 실패 (${res.status})`);
  }
  if (res.status === 401) {
    clearToken();
    window.dispatchEvent(new CustomEvent('session_expired'));
  }
  if (!res.ok) throw new Error(data.error || 'Request failed');
  return data;
}

export const api = {
  login: (username, password) => request('/auth/login', { method: 'POST', body: { username, password } }),
  register: (username, password, displayName) => request('/auth/register', { method: 'POST', body: { username, password, displayName } }),
  me: () => request('/auth/me'),
  preload: () => request('/preload'),
  tutorialDone: () => request('/auth/tutorial-done', { method: 'POST' }),
  tutorialAdvance: (step) => request('/auth/tutorial-advance', { method: 'POST', body: step !== undefined ? { step } : {} }),
  tutorialBattle: (data) => request('/auth/tutorial-battle', { method: 'POST', body: data }),
  pull: (bannerId) => request('/gacha/pull', { method: 'POST', body: { bannerId } }),
  pull10: (bannerId) => request('/gacha/pull10', { method: 'POST', body: { bannerId } }),
  rates: (bannerId) => request('/gacha/rates' + (bannerId ? '?bannerId=' + bannerId : '')),
  banners: () => request('/gacha/banners'),
  skillPull: (bannerId) => request('/gacha/skill-pull', { method: 'POST', body: { bannerId } }),
  skillPull10: (bannerId) => request('/gacha/skill-pull10', { method: 'POST', body: { bannerId } }),
  skillBanners: () => request('/gacha/skill-banners'),
  skillRates: (bannerId) => request('/gacha/skill-rates' + (bannerId ? '?bannerId=' + bannerId : '')),
  codex: () => request('/collection/codex'),
  myCollection: () => request('/collection/my'),
  userCollection: (userId) => request('/collection/user/' + userId),
  markSeen: (invId) => request('/collection/mark-seen/' + invId, { method: 'PATCH' }),
  toggleFavorite: (invId) => request('/collection/favorite/' + invId, { method: 'PATCH' }),
  rankings: () => request('/collection/rankings'),
  offerTrade: (toUserId, offerInventoryId, wantInventoryId) =>
    request('/trade/offer', { method: 'POST', body: { toUserId, offerInventoryId, wantInventoryId } }),
  myTrades: () => request('/trade/my'),
  acceptTrade: (tradeId) => request('/trade/accept/' + tradeId, { method: 'POST' }),
  rejectTrade: (tradeId) => request('/trade/reject/' + tradeId, { method: 'POST' }),
  cancelTrade: (tradeId) => request('/trade/cancel/' + tradeId, { method: 'POST' }),
  users: () => request('/trade/users'),
  feed: () => request('/feed'),
  // 스테이지
  stageList: () => request('/stage/list'),
  stageBattleStart: (stageId, partyIds) =>
    request('/stage/battle-start', { method: 'POST', body: { stageId, partyIds } }),
  stageBattleEnd: (stageId, battleLog) =>
    request('/stage/battle-end', { method: 'POST', body: { stageId, battleLog } }),
  // 레거시 호환
  stageBattle: (stageId, partyIds) =>
    request('/stage/battle', { method: 'POST', body: { stageId, partyIds } }),
  // 파밍 던전
  farmingList: () => request('/farming/list'),
  farmingBattleStart: (stageId, partyIds) =>
    request('/farming/battle-start', { method: 'POST', body: { stageId, partyIds } }),
  farmingBattleEnd: (stageId, battleLog) =>
    request('/farming/battle-end', { method: 'POST', body: { stageId, battleLog } }),
  // 레이드
  raidCurrent: () => request('/raid/current'),
  raidBattleStart: (partyIds) =>
    request('/raid/battle-start', { method: 'POST', body: { partyIds } }),
  raidBattleEnd: (raidId, battleLog) =>
    request('/raid/battle-end', { method: 'POST', body: { raidId, battleLog } }),
  // 데일리
  checkin: () => request('/daily/checkin', { method: 'POST' }),
  missions: () => request('/daily/missions'),
  claimMission: (id) => request('/daily/missions/' + id + '/claim', { method: 'POST' }),
  userStatus: () => request('/daily/status'),
  // 육성
  charDetail: (invId) => request('/growth/detail/' + invId),
  levelUp: (inventoryId, items) => request('/growth/levelup', { method: 'POST', body: { inventoryId, items } }),
  awaken: (inventoryId, materialId) => request('/growth/awaken', { method: 'POST', body: { inventoryId, materialId } }),
  equipSkill: (inventoryId, skillId, slotNumber, slotType, skillInventoryId) =>
    request('/growth/equip-skill', { method: 'POST', body: { inventoryId, skillId, slotNumber, slotType, skillInventoryId } }),
  unequipSkill: (inventoryId, slotNumber, slotType) =>
    request('/growth/unequip-skill', { method: 'POST', body: { inventoryId, slotNumber, slotType } }),
  equipSkillsBulk: (inventoryId, skillIds) =>
    request('/growth/equip-skills-bulk', { method: 'POST', body: { inventoryId, skillIds } }),
  skillInventory: () => request('/growth/skill-inventory'),
  equipTalent: (inventoryId, talentIndex) =>
    request('/growth/equip-talent', { method: 'POST', body: { inventoryId, talentIndex } }),
  promote: (inventoryId) =>
    request('/growth/promote', { method: 'POST', body: { inventoryId } }),
  promoteInfo: (inventoryId) => request('/growth/promote-info/' + inventoryId),
  toggleLock: (inventoryId) =>
    request('/growth/toggle-lock', { method: 'POST', body: { inventoryId } }),
  batchLock: (lockIds) =>
    request('/growth/batch-lock', { method: 'POST', body: { lockIds } }),
  partyList: () => request('/growth/party-list'),
  partyPresets: () => request('/growth/party-presets'),
  savePartyPreset: (slot, name, partyIds) =>
    request('/growth/party-presets/' + slot, { method: 'PUT', body: { name, partyIds } }),
  // 로비
  lobby: () => request('/growth/lobby'),
  setRepresentative: (inventoryId, characterId) => request('/growth/set-representative', { method: 'POST', body: { inventoryId, characterId } }),
  // 우편
  mailList: () => request('/mail/list'),
  mailRead: (id) => request('/mail/read/' + id, { method: 'PATCH' }),
  mailClaim: (id) => request('/mail/claim/' + id, { method: 'POST' }),
  mailClaimAll: () => request('/mail/claim-all', { method: 'POST' }),
  mailDelete: (id) => request('/mail/' + id, { method: 'DELETE' }),
  mailCleanup: () => request('/mail/cleanup/read', { method: 'DELETE' }),
  mailUnreadCount: () => request('/mail/unread-count'),
  // 아이템
  myItems: () => request('/collection/items'),
  sellItem: (itemId, quantity) => request('/collection/items/sell', { method: 'POST', body: { itemId, quantity } }),
  useItem: (itemId, targetInventoryId) => request('/collection/items/use', { method: 'POST', body: { itemId, targetInventoryId } }),
  // 프로필
  profile: () => request('/profile/me'),
  updateProfile: (data) => request('/profile/me', { method: 'PUT', body: data }),
  profileIcons: () => request('/profile/icons'),
  // 스토리
  storyList: (category) => request('/story/list?category=' + (category || 'main')),
  storyNode: (id) => request('/story/node/' + id),
  storyRead: (nodeId) => request('/story/read', { method: 'POST', body: { nodeId } }),
  storyBattleStart: (nodeId, partyIds, enemies, party) =>
    request('/story/battle-start', { method: 'POST', body: { nodeId, partyIds, enemies, party } }),
  tutorialScript: () => request('/story/tutorial'),
  storyBattleEnd: (battleLog) =>
    request('/story/battle-end', { method: 'POST', body: { battleLog } }),
  // 어드민 - 스토리 노드
  adminStoryNodes: (adminKey) => request('/admin/story-nodes', { headers: { 'x-admin-key': adminKey } }),
  adminCreateStoryNode: (adminKey, data) => request('/admin/story-nodes', { method: 'POST', body: data, headers: { 'x-admin-key': adminKey } }),
  adminUpdateStoryNode: (adminKey, id, data) => request('/admin/story-nodes/' + id, { method: 'PUT', body: data, headers: { 'x-admin-key': adminKey } }),
  adminDeleteStoryNode: (adminKey, id) => request('/admin/story-nodes/' + id, { method: 'DELETE', headers: { 'x-admin-key': adminKey } }),
  // 어드민 - 몬스터
  adminMonsters: (adminKey) => request('/admin/monsters', { headers: { 'x-admin-key': adminKey } }),
  adminMonster: (adminKey, id) => request('/admin/monsters/' + id, { headers: { 'x-admin-key': adminKey } }),
  adminCreateMonster: (adminKey, data) => request('/admin/monsters', { method: 'POST', body: data, headers: { 'x-admin-key': adminKey } }),
  adminUpdateMonster: (adminKey, id, data) => request('/admin/monsters/' + id, { method: 'PUT', body: data, headers: { 'x-admin-key': adminKey } }),
  adminDeleteMonster: (adminKey, id) => request('/admin/monsters/' + id, { method: 'DELETE', headers: { 'x-admin-key': adminKey } }),
};
