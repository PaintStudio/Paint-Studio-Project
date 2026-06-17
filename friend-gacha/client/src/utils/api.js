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
  const data = await res.json();
  if (!res.ok) throw new Error(data.error || 'Request failed');
  return data;
}

export const api = {
  login: (username, password) => request('/auth/login', { method: 'POST', body: { username, password } }),
  register: (username, password, displayName) => request('/auth/register', { method: 'POST', body: { username, password, displayName } }),
  me: () => request('/auth/me'),
  pull: (bannerId) => request('/gacha/pull', { method: 'POST', body: { bannerId } }),
  pull10: (bannerId) => request('/gacha/pull10', { method: 'POST', body: { bannerId } }),
  rates: (bannerId) => request('/gacha/rates' + (bannerId ? '?bannerId=' + bannerId : '')),
  banners: () => request('/gacha/banners'),
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
  levelUp: (inventoryId, amount) => request('/growth/levelup', { method: 'POST', body: { inventoryId, amount } }),
  awaken: (inventoryId, materialId) => request('/growth/awaken', { method: 'POST', body: { inventoryId, materialId } }),
  equipSkill: (inventoryId, skillId, slotNumber) =>
    request('/growth/equip-skill', { method: 'POST', body: { inventoryId, skillId, slotNumber } }),
  unequipSkill: (inventoryId, slotNumber) =>
    request('/growth/unequip-skill', { method: 'POST', body: { inventoryId, slotNumber } }),
  equipSkillsBulk: (inventoryId, skillIds) =>
    request('/growth/equip-skills-bulk', { method: 'POST', body: { inventoryId, skillIds } }),
  partyList: () => request('/growth/party-list'),
  // 로비
  lobby: () => request('/growth/lobby'),
  setRepresentative: (inventoryId) => request('/growth/set-representative', { method: 'POST', body: { inventoryId } }),
  // 우편
  mailList: () => request('/mail/list'),
  mailRead: (id) => request('/mail/read/' + id, { method: 'PATCH' }),
  mailClaim: (id) => request('/mail/claim/' + id, { method: 'POST' }),
  mailDelete: (id) => request('/mail/' + id, { method: 'DELETE' }),
  mailCleanup: () => request('/mail/cleanup/read', { method: 'DELETE' }),
  mailUnreadCount: () => request('/mail/unread-count'),
  // 프로필
  profile: () => request('/profile/me'),
  updateProfile: (data) => request('/profile/me', { method: 'PUT', body: data }),
  profileIcons: () => request('/profile/icons'),
};
