import React, { useState, useEffect, useCallback } from 'react';
import { currencyImg } from '../components/CurrencyIcon';
import './AdminPage.css';

const API = '/api/admin';
let adminKey = sessionStorage.getItem('admin_key') || '';

async function req(path, opts = {}) {
  const res = await fetch(API + path, {
    ...opts,
    headers: { 'Content-Type': 'application/json', 'X-Admin-Key': adminKey, ...opts.headers },
    body: opts.body && typeof opts.body !== 'string' && !(opts.body instanceof ArrayBuffer) && !(opts.body instanceof Blob)
      ? JSON.stringify(opts.body) : opts.body,
  });
  const data = await res.json();
  if (res.status === 403) throw new Error(data.error || '권한 없음');
  return data;
}

import gameConfig from '@gameConfig';

const RARITIES = Object.keys(gameConfig.rarities);
const ELEMENTS = Object.keys(gameConfig.elements);
const ORIGINS = Object.keys(gameConfig.origins);
const SKILL_TYPES = Object.keys(gameConfig.skillTypes);
const SKILL_RARITIES = Object.keys(gameConfig.skillRarities);
const SKILL_RARITY_LABEL = {};
const SKILL_RARITY_COLOR = {};
for (const [k, v] of Object.entries(gameConfig.skillRarities)) {
  SKILL_RARITY_LABEL[k] = v.label;
  SKILL_RARITY_COLOR[k] = v.color;
}
const TARGETS = Object.keys(gameConfig.targets);

const RARITY_COLORS = {};
for (const [k, v] of Object.entries(gameConfig.rarities)) RARITY_COLORS[k] = v.color;
const ELEM_COLORS = {};
const ELEM_LABEL = {};
for (const [k, v] of Object.entries(gameConfig.elements)) {
  ELEM_COLORS[k] = v.color;
  ELEM_LABEL[k] = v.label;
}
const ORIGIN_COLORS = {};
const ORIGIN_LABEL = {};
for (const [k, v] of Object.entries(gameConfig.origins)) {
  ORIGIN_COLORS[k] = v.color;
  ORIGIN_LABEL[k] = v.label;
}

function getRarityStyle(rarity) {
  if (rarity === 'CR') return { background: 'linear-gradient(90deg, #ff0000, #ff8800, #ffff00, #00ff00, #0088ff, #8800ff)', WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent', fontWeight: 'bold' };
  return { color: RARITY_COLORS[rarity] || '#888' };
}
function getRarityBgStyle(rarity) {
  if (rarity === 'CR') return { background: 'linear-gradient(90deg, #ff0000, #ff8800, #ffff00, #00ff00, #0088ff, #8800ff)' };
  return { background: RARITY_COLORS[rarity] || '#888' };
}

export default function AdminPage() {
  const [authed, setAuthed] = useState(!!sessionStorage.getItem('admin_key'));
  const [pw, setPw] = useState('');
  const [pwError, setPwError] = useState('');
  const [tab, setTab] = useState('characters');
  const [characters, setCharacters] = useState([]);
  const [skills, setSkills] = useState([]);
  const [selectedChar, setSelectedChar] = useState(null);
  const [charSkills, setCharSkills] = useState([]);
  const [editing, setEditing] = useState(null); // 'new' | char object
  const [editingSkill, setEditingSkill] = useState(null);
  const [msg, setMsg] = useState('');
  const [banners, setBanners] = useState([]);
  const [editingBanner, setEditingBanner] = useState(null);
  const [itemList, setItemList] = useState([]);
  const [editingItem, setEditingItem] = useState(null);
  const [charFilter, setCharFilter] = useState({ search: '', rarity: '', element: '', origin: '' });
  const [skillFilter, setSkillFilter] = useState({ search: '', type: '', element: '', rarity: '', obtainable: '' });
  const [poolFilter, setPoolFilter] = useState({ search: '', type: '', element: '', obtainable: '' });
  const [charTalents, setCharTalents] = useState([]);
  const [editingTalentIdx, setEditingTalentIdx] = useState(null);
  const [charPromoTiers, setCharPromoTiers] = useState([]);
  const [editingPromoTier, setEditingPromoTier] = useState(null);
  const [allItems, setAllItems] = useState([]);
  const [gachaConfig, setGachaConfig] = useState(null);
  const [gachaConfigOpen, setGachaConfigOpen] = useState(false);
  const [charTags, setCharTags] = useState([]);
  const [tagDefs, setTagDefs] = useState([]);
  const [newTagLabel, setNewTagLabel] = useState('');
  const [editingTagId, setEditingTagId] = useState(null);
  const [editingTagLabel, setEditingTagLabel] = useState('');
  const [monsters, setMonsters] = useState([]);
  const [editingMonster, setEditingMonster] = useState(null);
  const [selectedMonster, setSelectedMonster] = useState(null);
  const [monsterFilter, setMonsterFilter] = useState({ search: '', element: '', boss: '' });
  const [monSkillFilter, setMonSkillFilter] = useState({ search: '', type: '', element: '' });
  const [monTags, setMonTags] = useState([]);
  const [skillBanners, setSkillBanners] = useState([]);
  const [editingSkillBanner, setEditingSkillBanner] = useState(null);
  const [stages, setStages] = useState([]);
  const [selectedStage, setSelectedStage] = useState(null);
  const [editingStage, setEditingStage] = useState(null);
  const [stageFilter, setStageFilter] = useState({ search: '', type: '' });
  const [storyNodes, setStoryNodes] = useState([]);
  const [editingStoryNode, setEditingStoryNode] = useState(null);
  const [selectedStoryNode, setSelectedStoryNode] = useState(null);
  const [storyFilter, setStoryFilter] = useState({ search: '', category: '' });

  const showMsg = (m) => { setMsg(m); setTimeout(() => setMsg(''), 2500); };

  const handleAdminLogin = async () => {
    try {
      const res = await fetch(API + '/verify', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ password: pw }),
      });
      if (res.ok) {
        adminKey = pw;
        sessionStorage.setItem('admin_key', pw);
        setAuthed(true);
        setPwError('');
      } else {
        setPwError('비밀번호가 틀렸습니다');
      }
    } catch { setPwError('서버 연결 실패'); }
  };

  const loadChars = useCallback(async () => {
    try {
      const d = await req('/characters');
      setCharacters(d.characters || []);
    } catch { setAuthed(false); sessionStorage.removeItem('admin_key'); }
  }, []);

  const loadSkills = useCallback(async () => {
    try {
      const d = await req('/skills');
      setSkills(d.skills || []);
    } catch {}
  }, []);

  const loadCharDetail = useCallback(async (id) => {
    const d = await req('/characters/' + id);
    setSelectedChar(d.character);
    setCharSkills(d.skills || []);
    try {
      const t = await req('/talents/' + id);
      setCharTalents(t.talents || []);
    } catch { setCharTalents([]); }
    try {
      const p = await req('/promotions/' + id);
      setCharPromoTiers(p.tiers || []);
    } catch { setCharPromoTiers([]); }
    try {
      const tg = await req('/characters/' + id + '/tags');
      setCharTags(tg.tags || []);
    } catch { setCharTags([]); }
    if (allItems.length === 0) {
      try {
        const il = await req('/items-list');
        setAllItems(il.items || []);
      } catch {}
    }
    setEditingTalentIdx(null);
    setEditingPromoTier(null);
  }, [allItems.length]);

  const loadBanners = useCallback(async () => {
    try {
      const d = await req('/banners');
      setBanners(d.banners || []);
    } catch {}
  }, []);

  const loadItemList = useCallback(async () => {
    try {
      const d = await req('/items');
      setItemList(d.items || []);
    } catch {}
  }, []);

  const loadGachaConfig = useCallback(async () => {
    try {
      const d = await req('/gacha-config');
      setGachaConfig(d);
    } catch {}
  }, []);

  const loadMonsters = useCallback(async () => {
    try {
      const d = await req('/monsters');
      setMonsters(d.monsters || []);
    } catch {}
  }, []);

  const loadTagDefs = useCallback(async () => {
    try {
      const d = await req('/tag-defs');
      setTagDefs(d.tags || []);
    } catch {}
  }, []);

  const loadSkillBanners = useCallback(async () => {
    try {
      const d = await req('/skill-banners');
      setSkillBanners(d.banners || []);
    } catch {}
  }, []);

  const loadStages = useCallback(async () => {
    try {
      const d = await req('/stages');
      setStages(d.stages || []);
    } catch {}
  }, []);

  const loadStoryNodes = useCallback(async () => {
    try {
      const d = await req('/story-nodes');
      setStoryNodes(d.nodes || []);
    } catch {}
  }, []);

  const saveStage = async (data) => {
    try {
      if (data._isEdit) {
        await req('/stages/' + data.id, { method: 'PUT', body: data });
        showMsg('스테이지 수정 완료');
      } else {
        await req('/stages', { method: 'POST', body: data });
        showMsg('스테이지 생성 완료');
      }
      loadStages();
      setEditingStage(null);
    } catch (err) { showMsg(err.message); }
  };

  const deleteStage = async (id) => {
    if (!confirm('정말 삭제하시겠습니까? 클리어 기록도 함께 삭제됩니다.')) return;
    try {
      await req('/stages/' + id, { method: 'DELETE' });
      showMsg('스테이지 삭제 완료');
      if (selectedStage?.id === id) setSelectedStage(null);
      loadStages();
    } catch (err) { showMsg(err.message); }
  };

  const saveStoryNode = async (raw) => {
    try {
      const data = { ...raw };
      try { data.enemy_data = data._enemy_data_raw ? JSON.parse(data._enemy_data_raw) : []; } catch(e) { return showMsg('적 데이터 JSON 오류: ' + e.message); }
      try { data.rewards = data._rewards_raw ? JSON.parse(data._rewards_raw) : null; } catch(e) { return showMsg('보상 JSON 오류: ' + e.message); }
      try { data.story_script = data._story_script_raw ? JSON.parse(data._story_script_raw) : null; } catch(e) { return showMsg('스토리 스크립트 JSON 오류: ' + e.message); }
      delete data._enemy_data_raw; delete data._rewards_raw; delete data._story_script_raw;
      if (data._isEdit) {
        await req('/story-nodes/' + data.id, { method: 'PUT', body: data });
        showMsg('스토리 노드 수정 완료');
      } else {
        await req('/story-nodes', { method: 'POST', body: data });
        showMsg('스토리 노드 생성 완료');
      }
      loadStoryNodes();
      setEditingStoryNode(null);
    } catch (err) { showMsg(err.message); }
  };

  const deleteStoryNode = async (id) => {
    if (!confirm('정말 삭제하시겠습니까? 클리어 기록도 함께 삭제됩니다.')) return;
    try {
      await req('/story-nodes/' + id, { method: 'DELETE' });
      showMsg('스토리 노드 삭제 완료');
      if (selectedStoryNode?.id === id) setSelectedStoryNode(null);
      loadStoryNodes();
    } catch (err) { showMsg(err.message); }
  };

  useEffect(() => { if (authed) { loadChars(); loadSkills(); loadBanners(); loadSkillBanners(); loadItemList(); loadGachaConfig(); loadMonsters(); loadTagDefs(); loadStages(); loadStoryNodes(); } }, [authed]);

  // ====== 캐릭터 편집 폼 ======
  const CharForm = ({ initial, onSave, onCancel }) => {
    const [form, setForm] = useState(initial || {
      name: '', rarity: 'N', element: 'neutral', origin: 'force', title: '', description: '', quote: '',
      base_hp: 1000, base_atk: 100, base_def: 80, base_spd: 100, turn_notes: 4,
      attack_slots: 3, defense_slots: 2,
    });
    const set = (k, v) => setForm({ ...form, [k]: v });

    return (
      <div className="admin-form">
        <h3>{initial ? '캐릭터 수정' : '새 캐릭터'}</h3>
        <div className="form-grid">
          <label>이름<input value={form.name} onChange={e => set('name', e.target.value)} /></label>
          <label>등급<select value={form.rarity} onChange={e => set('rarity', e.target.value)}>
            {RARITIES.map(r => <option key={r} value={r}>{r}</option>)}
          </select></label>
          <label>속성<select value={form.element} onChange={e => set('element', e.target.value)}>
            {ELEMENTS.map(el => <option key={el} value={el}>{ELEM_LABEL[el]} ({el})</option>)}
          </select></label>
          <label>근원<select value={form.origin || 'force'} onChange={e => set('origin', e.target.value)}>
            {ORIGINS.map(o => <option key={o} value={o}>{ORIGIN_LABEL[o]} ({o})</option>)}
          </select></label>
          <label>칭호<input value={form.title || ''} onChange={e => set('title', e.target.value)} /></label>
          <label>대사<input value={form.quote || ''} onChange={e => set('quote', e.target.value)} /></label>
          <label>턴 노트<input type="number" value={form.turn_notes} onChange={e => set('turn_notes', +e.target.value)} /></label>
          <label>공격 슬롯<input type="number" min="0" max="10" value={form.attack_slots ?? 3} onChange={e => set('attack_slots', +e.target.value)} /></label>
          <label>방어 슬롯<input type="number" min="0" max="10" value={form.defense_slots ?? 2} onChange={e => set('defense_slots', +e.target.value)} /></label>
          <label>HP<input type="number" value={form.base_hp} onChange={e => set('base_hp', +e.target.value)} /></label>
          <label>ATK<input type="number" value={form.base_atk} onChange={e => set('base_atk', +e.target.value)} /></label>
          <label>DEF<input type="number" value={form.base_def} onChange={e => set('base_def', +e.target.value)} /></label>
          <label>SPD<input type="number" value={form.base_spd} onChange={e => set('base_spd', +e.target.value)} /></label>
        </div>
        <label className="form-wide">설명<textarea value={form.description || ''} onChange={e => set('description', e.target.value)} rows={2} /></label>
        <div className="form-actions">
          <button className="btn-save" onClick={() => onSave(form)}>저장</button>
          <button className="btn-cancel" onClick={onCancel}>취소</button>
        </div>
      </div>
    );
  };

  // ====== 스킬 편집 폼 ======
  const SkillForm = ({ initial, onSave, onCancel }) => {
    const initExtra = (() => {
      if (!initial?.extra) return {};
      return typeof initial.extra === 'string' ? JSON.parse(initial.extra || '{}') : initial.extra;
    })();
    const { effectIds: initEffectIds, ...initRestExtra } = initExtra;

    const [form, setForm] = useState(initial ? { ...initial, extra: JSON.stringify(initRestExtra) } : {
      name: '', description: '', type: 'attack', rarity: 'faint', cost: 1, power: 1.0,
      element: 'neutral', target: 'single', defense_mult: 0, cooldown: 0, extra: '{}', equip_condition: '{}',
    });
    const [skillEffectIds, setSkillEffectIds] = useState(initEffectIds || []);
    const set = (k, v) => setForm({ ...form, [k]: v });

    const handleSave = () => {
      let extraObj = {};
      try { extraObj = JSON.parse(form.extra || '{}'); } catch {}
      if (skillEffectIds.length > 0) {
        extraObj.effectIds = skillEffectIds.map(eid => {
          if (typeof eid !== 'object') return eid;
          const args = (eid.args || []).map(a => typeof a === 'string' && a !== '' && !isNaN(a) ? +a : a);
          return args.length > 0 ? { id: eid.id, args } : eid.id;
        });
      }
      onSave({ ...form, extra: JSON.stringify(extraObj) });
    };

    return (
      <div className="admin-form">
        <h3>{initial ? '스킬 수정' : '새 스킬'}</h3>
        <div className="form-grid">
          <label>이름<input value={form.name} onChange={e => set('name', e.target.value)} /></label>
          <label>타입<select value={form.type} onChange={e => set('type', e.target.value)}>
            {SKILL_TYPES.map(t => <option key={t} value={t}>{t}</option>)}
          </select></label>
          <label>등급<select value={form.rarity || 'faint'} onChange={e => set('rarity', e.target.value)}>
            {SKILL_RARITIES.map(r => <option key={r} value={r}>{SKILL_RARITY_LABEL[r]} ({r})</option>)}
          </select></label>
          <label>코스트<input type="number" value={form.cost} onChange={e => set('cost', +e.target.value)} /></label>
          <label>위력<input type="number" step="0.1" value={form.power} onChange={e => set('power', +e.target.value)} /></label>
          <label>속성<select value={form.element} onChange={e => set('element', e.target.value)}>
            {ELEMENTS.map(el => <option key={el} value={el}>{ELEM_LABEL[el]}</option>)}
          </select></label>
          <label>타겟<select value={form.target} onChange={e => set('target', e.target.value)}>
            {TARGETS.map(t => <option key={t} value={t}>{t}</option>)}
          </select></label>
          <label>방어 배율<input type="number" step="0.1" value={form.defense_mult} onChange={e => set('defense_mult', +e.target.value)} /></label>
          <label>쿨다운<input type="number" value={form.cooldown} onChange={e => set('cooldown', +e.target.value)} /></label>
        </div>
        <label className="form-wide">설명<input value={form.description || ''} onChange={e => set('description', e.target.value)} /></label>
        <label className="form-wide">추가 데이터 (JSON)<input value={typeof form.extra === 'string' ? form.extra : JSON.stringify(form.extra)} onChange={e => set('extra', e.target.value)} /></label>
        <div className="talent-effects-section" style={{ marginTop: 8 }}>
          <div className="talent-effects-header">
            <span>이펙트 ({skillEffectIds.length})</span>
            <button className="btn-add" onClick={() => setSkillEffectIds([...skillEffectIds, { id: 0 }])}>+ 이펙트</button>
          </div>
          {skillEffectIds.map((eid, i) => {
            const isObj = typeof eid === 'object';
            const idVal = isObj ? eid.id : eid;
            const args = isObj ? (eid.args || []) : [];
            return (
              <div key={i} className="effect-id-block">
                <div className="talent-effect-row">
                  <span style={{ fontSize: 12, color: '#888', minWidth: 24 }}>ID</span>
                  <input type="number" style={{ width: 60 }} value={idVal} onChange={e => {
                    const next = [...skillEffectIds];
                    next[i] = args.length > 0 ? { id: +e.target.value, args } : +e.target.value;
                    setSkillEffectIds(next);
                  }} />
                  <button className="btn-sm" onClick={() => {
                    const next = [...skillEffectIds];
                    next[i] = { id: idVal, args: [...args, 0] };
                    setSkillEffectIds(next);
                  }}>+ arg</button>
                  <button className="btn-sm btn-remove" onClick={() => setSkillEffectIds(skillEffectIds.filter((_, j) => j !== i))}>&#10005;</button>
                </div>
                {args.map((v, ai) => (
                  <div key={ai} className="talent-effect-row" style={{ paddingLeft: 28 }}>
                    <span style={{ fontSize: 11, color: '#666', minWidth: 16 }}>{ai}</span>
                    <input style={{ flex: 1 }} value={v} onChange={e => {
                      const raw = e.target.value;
                      const val = raw === '' ? '' : /^-?\d+\.?\d*$/.test(raw) && !raw.endsWith('.') ? +raw : raw;
                      const newArgs = [...args]; newArgs[ai] = val;
                      const next = [...skillEffectIds];
                      next[i] = { id: idVal, args: newArgs };
                      setSkillEffectIds(next);
                    }} />
                    <button className="btn-sm btn-remove" onClick={() => {
                      const newArgs = args.filter((_, j) => j !== ai);
                      const next = [...skillEffectIds];
                      next[i] = newArgs.length > 0 ? { id: idVal, args: newArgs } : idVal;
                      setSkillEffectIds(next);
                    }}>&#10005;</button>
                  </div>
                ))}
              </div>
            );
          })}
        </div>
        <label className="form-wide">장착 조건 (JSON)<input value={typeof form.equip_condition === 'string' ? form.equip_condition : JSON.stringify(form.equip_condition || {})} onChange={e => set('equip_condition', e.target.value)} placeholder='예: {"element":"fire"} / {"element":["fire","water"]} / {"minRarity":"SR"}' /></label>
        <div className="form-actions">
          <button className="btn-save" onClick={handleSave}>저장</button>
          <button className="btn-cancel" onClick={onCancel}>취소</button>
        </div>
      </div>
    );
  };

  // ====== 핸들러 ======
  const saveChar = async (form) => {
    if (editing && editing.id) {
      await req('/characters/' + editing.id, { method: 'PUT', body: form });
      showMsg('수정 완료');
    } else {
      await req('/characters', { method: 'POST', body: form });
      showMsg('생성 완료');
    }
    setEditing(null);
    loadChars();
    if (selectedChar) loadCharDetail(selectedChar.id);
  };

  const deleteChar = async (id) => {
    if (!confirm('정말 삭제?')) return;
    await req('/characters/' + id, { method: 'DELETE' });
    showMsg('삭제 완료');
    if (selectedChar?.id === id) { setSelectedChar(null); setCharSkills([]); }
    loadChars();
  };

  const saveSkill = async (form) => {
    if (editingSkill && editingSkill.id) {
      await req('/skills/' + editingSkill.id, { method: 'PUT', body: form });
      showMsg('스킬 수정 완료');
    } else {
      await req('/skills', { method: 'POST', body: form });
      showMsg('스킬 생성 완료');
    }
    setEditingSkill(null);
    loadSkills();
  };

  const deleteSkill = async (id) => {
    if (!confirm('정말 삭제?')) return;
    await req('/skills/' + id, { method: 'DELETE' });
    showMsg('삭제 완료');
    loadSkills();
  };

  const uploadSkillIcon = async (skillId, file) => {
    const buf = await file.arrayBuffer();
    await fetch(API + '/skills/' + skillId + '/icon', {
      method: 'POST',
      headers: { 'Content-Type': file.type, 'X-Admin-Key': adminKey },
      body: buf,
    });
    showMsg('스킬 아이콘 업로드 완료');
    loadSkills();
  };

  const uploadImage = async (charId, file, imageType = 'portrait') => {
    const buf = await file.arrayBuffer();
    const url = imageType === 'portrait'
      ? API + '/characters/' + charId + '/image'
      : API + '/characters/' + charId + '/image/' + imageType;
    await fetch(url, {
      method: 'POST',
      headers: { 'Content-Type': file.type, 'X-Admin-Key': adminKey },
      body: buf,
    });
    showMsg(`이미지(${imageType}) 업로드 완료`);
    loadChars();
    if (selectedChar?.id === charId) loadCharDetail(charId);
  };

  const addSkillToChar = async (charId, skillId) => {
    await req('/characters/' + charId + '/skills', { method: 'POST', body: { skillId, awakeningRequired: 0 } });
    loadCharDetail(charId);
  };

  const removeSkillFromChar = async (charId, skillId) => {
    await req('/characters/' + charId + '/skills/' + skillId, { method: 'DELETE' });
    loadCharDetail(charId);
  };

  const setAwakeningRequired = async (charId, skillId, value) => {
    await req('/characters/' + charId + '/skills/' + skillId + '/awakening', { method: 'PATCH', body: { awakeningRequired: value } });
    loadCharDetail(charId);
  };

  const toggleFixed = async (charId, skillId) => {
    await req('/characters/' + charId + '/skills/' + skillId + '/fixed', { method: 'PATCH' });
    loadCharDetail(charId);
  };

  // ====== 배너 핸들러 ======
  const saveBanner = async (form) => {
    if (editingBanner && editingBanner !== 'new' && editingBanner.id) {
      await req('/banners/' + editingBanner.id, { method: 'PUT', body: form });
      showMsg('배너 수정 완료');
    } else {
      await req('/banners', { method: 'POST', body: form });
      showMsg('배너 생성 완료');
    }
    setEditingBanner(null);
    loadBanners();
  };

  const deleteBanner = async (id) => {
    if (!confirm('배너를 삭제하시겠습니까?')) return;
    await req('/banners/' + id, { method: 'DELETE' });
    showMsg('배너 삭제 완료');
    loadBanners();
  };

  const toggleBannerActive = async (banner) => {
    await req('/banners/' + banner.id, { method: 'PUT', body: { active: !banner.active } });
    loadBanners();
  };

  const uploadBannerImage = async (bannerId, file) => {
    const buf = await file.arrayBuffer();
    await fetch(API + '/banners/' + bannerId + '/image', {
      method: 'POST',
      headers: { 'Content-Type': file.type, 'X-Admin-Key': adminKey },
      body: buf,
    });
    showMsg('배너 이미지 업로드 완료');
    loadBanners();
  };

  // ====== 스킬 배너 핸들러 ======
  const saveSkillBanner = async (form) => {
    if (editingSkillBanner && editingSkillBanner !== 'new' && editingSkillBanner.id) {
      await req('/skill-banners/' + editingSkillBanner.id, { method: 'PUT', body: form });
      showMsg('스킬 배너 수정 완료');
    } else {
      await req('/skill-banners', { method: 'POST', body: form });
      showMsg('스킬 배너 생성 완료');
    }
    setEditingSkillBanner(null);
    loadSkillBanners();
  };

  const deleteSkillBanner = async (id) => {
    if (!confirm('스킬 배너를 삭제하시겠습니까?')) return;
    await req('/skill-banners/' + id, { method: 'DELETE' });
    showMsg('스킬 배너 삭제 완료');
    loadSkillBanners();
  };

  const toggleSkillBannerActive = async (banner) => {
    await req('/skill-banners/' + banner.id, { method: 'PUT', body: { active: !banner.active } });
    loadSkillBanners();
  };

  const uploadSkillBannerImage = async (bannerId, file) => {
    const buf = await file.arrayBuffer();
    await fetch(API + '/skill-banners/' + bannerId + '/image', {
      method: 'POST',
      headers: { 'Content-Type': file.type, 'X-Admin-Key': adminKey },
      body: buf,
    });
    showMsg('스킬 배너 이미지 업로드 완료');
    loadSkillBanners();
  };

  // 배너 편집 폼
  const BannerForm = ({ initial, onSave, onCancel }) => {
    const isEdit = initial && initial._isEdit;
    const [form, setForm] = useState({
      id: initial?.id || '',
      name: initial?.name || '',
      type: initial?.type || 'limited',
      description: initial?.description || '',
      characterPool: initial?.characterPool || 'all',
      featuredCharIds: initial?.featuredCharIds || [],
      featuredRateUp: initial?.featuredRateUp ?? 0.5,
      startDate: initial?.startDate || '',
      endDate: initial?.endDate || '',
      rates: initial?.rates || null,
      showTitle: initial?.showTitle !== undefined ? initial.showTitle : true,
      showRates: initial?.showRates !== undefined ? initial.showRates : true,
    });
    const set = (k, v) => setForm({ ...form, [k]: v });

    const [poolMode, setPoolMode] = useState(form.characterPool === 'all' ? 'all' : 'select');

    return (
      <div className="admin-form">
        <h3>{isEdit ? '배너 수정' : '새 배너'}</h3>
        <div className="form-grid">
          <label>ID{!isEdit && <input value={form.id} onChange={e => set('id', e.target.value)} placeholder="영문 slug" />}{isEdit && <input value={form.id} disabled />}</label>
          <label>이름<input value={form.name} onChange={e => set('name', e.target.value)} /></label>
          <label>타입<select value={form.type} onChange={e => set('type', e.target.value)}>
            <option value="permanent">상시</option>
            <option value="limited">한정</option>
          </select></label>
          <label>픽업 확률<input type="number" step="0.05" min="0" max="1" value={form.featuredRateUp} onChange={e => set('featuredRateUp', +e.target.value)} /></label>
          <label className="form-check-label">이름 표시
            <input type="checkbox" checked={form.showTitle} onChange={e => set('showTitle', e.target.checked)} />
          </label>
          <label className="form-check-label">확률 표시
            <input type="checkbox" checked={form.showRates} onChange={e => set('showRates', e.target.checked)} />
          </label>
          <label>시작일<input type="date" value={form.startDate || ''} onChange={e => set('startDate', e.target.value || null)} /></label>
          <label>종료일<input type="date" value={form.endDate || ''} onChange={e => set('endDate', e.target.value || null)} /></label>
        </div>
        <label className="form-wide">설명<input value={form.description} onChange={e => set('description', e.target.value)} /></label>

        <div className="form-wide">
          <label>캐릭터 풀
            <select value={poolMode} onChange={e => {
              setPoolMode(e.target.value);
              set('characterPool', e.target.value === 'all' ? 'all' : []);
            }}>
              <option value="all">전체</option>
              <option value="select">직접 선택</option>
            </select>
          </label>
          {poolMode === 'select' && (
            <div className="char-pool-select">
              {characters.map(c => {
                const pool = Array.isArray(form.characterPool) ? form.characterPool : [];
                const checked = pool.includes(c.id);
                return (
                  <label key={c.id} className="pool-check">
                    <input type="checkbox" checked={checked} onChange={() => {
                      set('characterPool', checked ? pool.filter(x => x !== c.id) : [...pool, c.id]);
                    }} />
                    <span style={getRarityStyle(c.rarity)}>[{c.rarity}] {c.name}</span>
                  </label>
                );
              })}
            </div>
          )}
        </div>

        <div className="form-wide">
          <label>픽업 캐릭터</label>
          <div className="char-pool-select">
            {characters.filter(c => c.rarity === 'SSR' || c.rarity === 'SR').map(c => {
              const checked = (form.featuredCharIds || []).includes(c.id);
              return (
                <label key={c.id} className="pool-check">
                  <input type="checkbox" checked={checked} onChange={() => {
                    const ids = form.featuredCharIds || [];
                    set('featuredCharIds', checked ? ids.filter(x => x !== c.id) : [...ids, c.id]);
                  }} />
                  <span style={getRarityStyle(c.rarity)}>[{c.rarity}] {c.name}</span>
                </label>
              );
            })}
          </div>
        </div>

        <div className="form-actions">
          <button className="btn-save" onClick={() => onSave(form)}>저장</button>
          <button className="btn-cancel" onClick={onCancel}>취소</button>
        </div>
      </div>
    );
  };

  // 스킬 배너 편집 폼
  const SkillBannerForm = ({ initial, onSave, onCancel }) => {
    const isEdit = initial && initial._isEdit;
    const [form, setForm] = useState({
      id: initial?.id || '',
      name: initial?.name || '',
      type: initial?.type || 'limited',
      description: initial?.description || '',
      skillPool: initial?.skillPool || 'all',
      featuredSkillIds: initial?.featuredSkillIds || [],
      featuredRateUp: initial?.featuredRateUp ?? 0.5,
      startDate: initial?.startDate || '',
      endDate: initial?.endDate || '',
      rates: initial?.rates || null,
      pullCost: initial?.pullCost ?? '',
      showTitle: initial?.showTitle !== undefined ? initial.showTitle : true,
      showRates: initial?.showRates !== undefined ? initial.showRates : true,
    });
    const set = (k, v) => setForm({ ...form, [k]: v });

    const [poolMode, setPoolMode] = useState(form.skillPool === 'all' ? 'all' : 'select');

    const obtainableSkills = skills.filter(s => s.obtainable !== 0);

    return (
      <div className="admin-form">
        <h3>{isEdit ? '스킬 배너 수정' : '새 스킬 배너'}</h3>
        <div className="form-grid">
          <label>ID{!isEdit && <input value={form.id} onChange={e => set('id', e.target.value)} placeholder="영문 slug" />}{isEdit && <input value={form.id} disabled />}</label>
          <label>이름<input value={form.name} onChange={e => set('name', e.target.value)} /></label>
          <label>타입<select value={form.type} onChange={e => set('type', e.target.value)}>
            <option value="permanent">상시</option>
            <option value="limited">한정</option>
          </select></label>
          <label>픽업 확률<input type="number" step="0.05" min="0" max="1" value={form.featuredRateUp} onChange={e => set('featuredRateUp', +e.target.value)} /></label>
          <label>뽑기 비용<input type="number" value={form.pullCost} onChange={e => set('pullCost', e.target.value === '' ? null : +e.target.value)} placeholder="기본값 사용" /></label>
          <label className="form-check-label">이름 표시
            <input type="checkbox" checked={form.showTitle} onChange={e => set('showTitle', e.target.checked)} />
          </label>
          <label className="form-check-label">확률 표시
            <input type="checkbox" checked={form.showRates} onChange={e => set('showRates', e.target.checked)} />
          </label>
          <label>시작일<input type="date" value={form.startDate || ''} onChange={e => set('startDate', e.target.value || null)} /></label>
          <label>종료일<input type="date" value={form.endDate || ''} onChange={e => set('endDate', e.target.value || null)} /></label>
        </div>
        <label className="form-wide">설명<input value={form.description} onChange={e => set('description', e.target.value)} /></label>

        <div className="form-wide">
          <label>스킬 풀
            <select value={poolMode} onChange={e => {
              setPoolMode(e.target.value);
              set('skillPool', e.target.value === 'all' ? 'all' : []);
            }}>
              <option value="all">전체</option>
              <option value="select">직접 선택</option>
            </select>
          </label>
          {poolMode === 'select' && (
            <div className="char-pool-select">
              {obtainableSkills.map(s => {
                const pool = Array.isArray(form.skillPool) ? form.skillPool : [];
                const checked = pool.includes(s.id);
                return (
                  <label key={s.id} className="pool-check">
                    <input type="checkbox" checked={checked} onChange={() => {
                      set('skillPool', checked ? pool.filter(x => x !== s.id) : [...pool, s.id]);
                    }} />
                    <span style={{ color: SKILL_RARITY_COLOR[s.rarity] || '#aaa' }}>[{SKILL_RARITY_LABEL[s.rarity] || s.rarity}] {s.name}</span>
                  </label>
                );
              })}
            </div>
          )}
        </div>

        <div className="form-wide">
          <label>픽업 스킬</label>
          <div className="char-pool-select">
            {obtainableSkills.filter(s => s.rarity === 'iridescent' || s.rarity === 'deep').map(s => {
              const checked = (form.featuredSkillIds || []).includes(s.id);
              return (
                <label key={s.id} className="pool-check">
                  <input type="checkbox" checked={checked} onChange={() => {
                    const ids = form.featuredSkillIds || [];
                    set('featuredSkillIds', checked ? ids.filter(x => x !== s.id) : [...ids, s.id]);
                  }} />
                  <span style={{ color: SKILL_RARITY_COLOR[s.rarity] || '#aaa' }}>[{SKILL_RARITY_LABEL[s.rarity] || s.rarity}] {s.name}</span>
                </label>
              );
            })}
          </div>
        </div>

        <div className="form-actions">
          <button className="btn-save" onClick={() => onSave(form)}>저장</button>
          <button className="btn-cancel" onClick={onCancel}>취소</button>
        </div>
      </div>
    );
  };

  // ====== 아이템 핸들러 ======
  const ITEM_CATEGORIES = [
    { value: 'material', label: '재료' },
    { value: 'awakening', label: '각성' },
    { value: 'consumable', label: '소모품' },
    { value: 'boss', label: '보스' },
  ];

  const saveItem = async (form) => {
    if (editingItem && editingItem !== 'new' && editingItem.id) {
      await req('/items/' + editingItem.id, { method: 'PUT', body: form });
      showMsg('아이템 수정 완료');
    } else {
      await req('/items', { method: 'POST', body: form });
      showMsg('아이템 생성 완료');
    }
    setEditingItem(null);
    loadItemList();
  };

  const deleteItem = async (id) => {
    if (!confirm('아이템을 삭제하시겠습니까?')) return;
    await req('/items/' + id, { method: 'DELETE' });
    showMsg('아이템 삭제 완료');
    loadItemList();
  };

  const uploadItemImage = async (itemId, file) => {
    const buf = await file.arrayBuffer();
    await fetch(API + '/items/' + itemId + '/image', {
      method: 'POST',
      headers: { 'Content-Type': file.type, 'X-Admin-Key': adminKey },
      body: buf,
    });
    showMsg('아이템 이미지 업로드 완료');
    loadItemList();
  };

  const ItemForm = ({ initial, onSave, onCancel }) => {
    const isEdit = initial && initial._isEdit;
    const [form, setForm] = useState({
      id: initial?.id || '',
      name: initial?.name || '',
      description: initial?.description || '',
      category: initial?.category || 'material',
      rarity: initial?.rarity || 'N',
      sellPrice: initial?.sellPrice || 0,
      icon: initial?.icon || '',
    });
    const set = (k, v) => setForm({ ...form, [k]: v });

    return (
      <div className="admin-form">
        <h3>{isEdit ? '아이템 수정' : '새 아이템'}</h3>
        <div className="form-grid">
          <label>ID{!isEdit
            ? <input value={form.id} onChange={e => set('id', e.target.value)} placeholder="영문_snake_case" />
            : <input value={form.id} disabled />}
          </label>
          <label>이름<input value={form.name} onChange={e => set('name', e.target.value)} /></label>
          <label>분류<select value={form.category} onChange={e => set('category', e.target.value)}>
            {ITEM_CATEGORIES.map(c => <option key={c.value} value={c.value}>{c.label}</option>)}
          </select></label>
          <label>등급<select value={form.rarity} onChange={e => set('rarity', e.target.value)}>
            {RARITIES.map(r => <option key={r} value={r}>{r}</option>)}
          </select></label>
          <label>판매가<input type="number" value={form.sellPrice} onChange={e => set('sellPrice', +e.target.value)} /></label>
          <label>아이콘<input value={form.icon} onChange={e => set('icon', e.target.value)} placeholder="HTML entity" /></label>
        </div>
        <label className="form-wide">설명<input value={form.description} onChange={e => set('description', e.target.value)} /></label>
        <div className="form-actions">
          <button className="btn-save" onClick={() => onSave(form)}>저장</button>
          <button className="btn-cancel" onClick={onCancel}>취소</button>
        </div>
      </div>
    );
  };

  // ====== 몬스터 핸들러 ======
  const selectMonster = async (mon) => {
    setSelectedMonster(mon);
    setEditingMonster(null);
    setMonSkillFilter({ search: '', type: '', element: '' });
    try {
      const d = await req('/monsters/' + mon.id + '/tags');
      setMonTags(d.tags || []);
    } catch { setMonTags([]); }
  };

  const refreshSelectedMonster = (updatedList) => {
    if (selectedMonster) {
      const fresh = (updatedList || monsters).find(m => m.id === selectedMonster.id);
      if (fresh) setSelectedMonster(fresh);
    }
  };

  const saveMonster = async (form) => {
    const payload = {
      ...form,
      drops: typeof form.drops === 'string' ? JSON.parse(form.drops || '[]') : form.drops,
    };
    if (editingMonster && editingMonster !== 'new' && editingMonster.id) {
      await req('/monsters/' + editingMonster.id, { method: 'PUT', body: payload });
      showMsg('몬스터 수정 완료');
    } else {
      await req('/monsters', { method: 'POST', body: payload });
      showMsg('몬스터 생성 완료');
    }
    setEditingMonster(null);
    const d = await req('/monsters');
    const list = d.monsters || [];
    setMonsters(list);
    if (selectedMonster) {
      const fresh = list.find(m => m.id === (editingMonster?.id || selectedMonster.id));
      if (fresh) setSelectedMonster(fresh);
    }
  };

  const deleteMonster = async (id) => {
    if (!confirm('몬스터를 삭제하시겠습니까?')) return;
    await req('/monsters/' + id, { method: 'DELETE' });
    showMsg('몬스터 삭제 완료');
    if (selectedMonster?.id === id) setSelectedMonster(null);
    loadMonsters();
  };

  const uploadMonsterImage = async (monsterId, file) => {
    const buf = await file.arrayBuffer();
    await fetch(API + '/monsters/' + monsterId + '/image', {
      method: 'POST',
      headers: { 'Content-Type': file.type, 'X-Admin-Key': adminKey },
      body: buf,
    });
    showMsg('몬스터 이미지 업로드 완료');
    const d = await req('/monsters');
    const list = d.monsters || [];
    setMonsters(list);
    const fresh = list.find(m => m.id === monsterId);
    if (fresh) setSelectedMonster(fresh);
  };

  const addSkillToMonster = async (skill) => {
    if (!selectedMonster) return;
    const currentSkills = selectedMonster.skills || [];
    if (currentSkills.find(s => s.id === skill.id)) return;
    const newSkill = {
      id: skill.id, name: skill.name, type: skill.type,
      cost: skill.cost, power: skill.power || 0,
      element: skill.element || 'neutral',
      target: skill.target || 'single',
      defense_mult: skill.defense_mult || 0,
    };
    if (skill.extra) {
      try { newSkill.extra = typeof skill.extra === 'string' ? JSON.parse(skill.extra) : skill.extra; } catch {}
    }
    const updatedSkills = [...currentSkills, newSkill];
    await req('/monsters/' + selectedMonster.id, { method: 'PUT', body: { skills: updatedSkills } });
    const d = await req('/monsters');
    const list = d.monsters || [];
    setMonsters(list);
    setSelectedMonster(list.find(m => m.id === selectedMonster.id));
    showMsg('스킬 추가 완료');
  };

  const removeSkillFromMonster = async (skillId) => {
    if (!selectedMonster) return;
    const updatedSkills = (selectedMonster.skills || []).filter(s => s.id !== skillId);
    await req('/monsters/' + selectedMonster.id, { method: 'PUT', body: { skills: updatedSkills } });
    const d = await req('/monsters');
    const list = d.monsters || [];
    setMonsters(list);
    setSelectedMonster(list.find(m => m.id === selectedMonster.id));
  };

  const MonsterForm = ({ initial, onSave, onCancel }) => {
    const isEdit = initial && initial._isEdit;
    const [form, setForm] = useState({
      id: initial?.id || '',
      name: initial?.name || '',
      element: initial?.element || 'neutral',
      origin: initial?.origin || 'force',
      is_boss: initial?.is_boss || false,
      hp: initial?.hp || 100,
      atk: initial?.atk || 10,
      def: initial?.def || 5,
      spd: initial?.spd || 5,
      turn_notes: initial?.turn_notes || 3,
      drops: JSON.stringify(initial?.drops || [], null, 2),
    });
    const set = (k, v) => setForm({ ...form, [k]: v });

    return (
      <div className="admin-form">
        <h3>{isEdit ? '몬스터 수정' : '새 몬스터'}</h3>
        <div className="form-grid">
          <label>ID{!isEdit
            ? <input value={form.id} onChange={e => set('id', e.target.value)} placeholder="영문_snake_case" />
            : <input value={form.id} disabled />}
          </label>
          <label>이름<input value={form.name} onChange={e => set('name', e.target.value)} /></label>
          <label>속성<select value={form.element} onChange={e => set('element', e.target.value)}>
            {ELEMENTS.map(el => <option key={el} value={el}>{ELEM_LABEL[el]} ({el})</option>)}
          </select></label>
          <label>근원<select value={form.origin} onChange={e => set('origin', e.target.value)}>
            {ORIGINS.map(o => <option key={o} value={o}>{ORIGIN_LABEL[o]} ({o})</option>)}
          </select></label>
          <label>HP<input type="number" value={form.hp} onChange={e => set('hp', +e.target.value)} /></label>
          <label>ATK<input type="number" value={form.atk} onChange={e => set('atk', +e.target.value)} /></label>
          <label>DEF<input type="number" value={form.def} onChange={e => set('def', +e.target.value)} /></label>
          <label>SPD<input type="number" value={form.spd} onChange={e => set('spd', +e.target.value)} /></label>
          <label>턴 노트<input type="number" value={form.turn_notes} onChange={e => set('turn_notes', +e.target.value)} /></label>
          <label className="form-check-label">보스
            <input type="checkbox" checked={form.is_boss} onChange={e => set('is_boss', e.target.checked)} />
          </label>
        </div>
        <label className="form-wide">드랍 (JSON)<textarea value={form.drops} onChange={e => set('drops', e.target.value)} rows={3} /></label>
        <div className="form-actions">
          <button className="btn-save" onClick={() => onSave(form)}>저장</button>
          <button className="btn-cancel" onClick={onCancel}>취소</button>
        </div>
      </div>
    );
  };

  // ====== 우편 발송 ======
  const MailForm = () => {
    const [target, setTarget] = useState('all');
    const [userQuery, setUserQuery] = useState('');
    const [userResults, setUserResults] = useState([]);
    const [selectedUser, setSelectedUser] = useState(null);
    const [title, setTitle] = useState('');
    const [body, setBody] = useState('');
    const [currency, setCurrency] = useState('');
    const [gold, setGold] = useState('');
    const [charId, setCharId] = useState('');
    const [expiresInDays, setExpiresInDays] = useState('');
    const [mailItems, setMailItems] = useState([]);
    const [sending, setSending] = useState(false);

    const searchUsers = async (q) => {
      setUserQuery(q);
      if (q.length < 1) { setUserResults([]); return; }
      try {
        const d = await req('/users?q=' + encodeURIComponent(q));
        setUserResults(d.users || []);
      } catch {}
    };

    const addMailItem = () => setMailItems(prev => [...prev, { itemId: '', count: 1 }]);
    const removeMailItem = (idx) => setMailItems(prev => prev.filter((_, i) => i !== idx));
    const updateMailItem = (idx, field, value) => setMailItems(prev => {
      const next = [...prev];
      next[idx] = { ...next[idx], [field]: value };
      return next;
    });

    const send = async () => {
      if (!title.trim()) { showMsg('제목을 입력하세요'); return; }
      if (target === 'user' && !selectedUser) { showMsg('대상 유저를 선택하세요'); return; }

      const rewards = {};
      if (currency) rewards.currency = parseInt(currency);
      if (gold) rewards.gold = parseInt(gold);
      if (charId) {
        rewards.characterId = parseInt(charId);
        const c = characters.find(ch => ch.id === parseInt(charId));
        if (c) rewards.characterName = c.name;
      }
      const validItems = mailItems.filter(mi => mi.itemId && mi.count > 0);
      if (validItems.length > 0) {
        rewards.items = validItems.map(mi => ({
          itemId: mi.itemId,
          count: parseInt(mi.count),
          name: itemList.find(it => it.id === mi.itemId)?.name || mi.itemId,
        }));
      }
      const hasRewards = Object.keys(rewards).length > 0;

      const payload = {
        title: title.trim(),
        body: body.trim(),
        rewards: hasRewards ? rewards : null,
        expiresInDays: expiresInDays ? parseInt(expiresInDays) : null,
      };

      setSending(true);
      try {
        if (target === 'all') {
          const r = await req('/mail/broadcast', { method: 'POST', body: payload });
          showMsg(`전체 ${r.sent}명에게 발송 완료`);
        } else {
          await req('/mail/send', { method: 'POST', body: { ...payload, userId: selectedUser.id } });
          showMsg(`${selectedUser.display_name}에게 발송 완료`);
        }
        setTitle(''); setBody(''); setCurrency(''); setGold(''); setCharId(''); setExpiresInDays(''); setMailItems([]);
      } catch (e) {
        showMsg('발송 실패: ' + e.message);
      }
      setSending(false);
    };

    return (
      <div className="admin-mail-tab">
        <div className="admin-form">
          <h3>우편 발송</h3>

          <div className="mail-target-row">
            <label className="mail-radio">
              <input type="radio" name="target" checked={target === 'all'} onChange={() => { setTarget('all'); setSelectedUser(null); }} />
              전체 발송
            </label>
            <label className="mail-radio">
              <input type="radio" name="target" checked={target === 'user'} onChange={() => setTarget('user')} />
              특정 유저
            </label>
          </div>

          {target === 'user' && (
            <div className="mail-user-search">
              <input
                placeholder="유저 검색 (아이디/닉네임)"
                value={userQuery}
                onChange={e => searchUsers(e.target.value)}
              />
              {selectedUser && (
                <div className="mail-selected-user">
                  <span>#{selectedUser.id} {selectedUser.display_name} ({selectedUser.username})</span>
                  <button onClick={() => setSelectedUser(null)}>&#10005;</button>
                </div>
              )}
              {!selectedUser && userResults.length > 0 && (
                <div className="mail-user-results">
                  {userResults.map(u => (
                    <button key={u.id} className="mail-user-item" onClick={() => { setSelectedUser(u); setUserResults([]); setUserQuery(''); }}>
                      <span className="mail-user-id">#{u.id}</span>
                      <span className="mail-user-name">{u.display_name}</span>
                      <span className="mail-user-uname">@{u.username}</span>
                    </button>
                  ))}
                </div>
              )}
            </div>
          )}

          <div className="form-grid">
            <label className="form-wide-full">제목<input value={title} onChange={e => setTitle(e.target.value)} placeholder="우편 제목" /></label>
          </div>
          <label className="form-wide">내용<textarea value={body} onChange={e => setBody(e.target.value)} rows={3} placeholder="우편 내용 (선택)" /></label>

          <div className="mail-rewards-section">
            <h4>보상 첨부</h4>
            <div className="form-grid">
              <label><span dangerouslySetInnerHTML={{ __html: currencyImg('prism') }} /> 프리즘<input type="number" min="0" value={currency} onChange={e => setCurrency(e.target.value)} placeholder="0" /></label>
              <label><span dangerouslySetInnerHTML={{ __html: currencyImg('bit') }} /> 비트<input type="number" min="0" value={gold} onChange={e => setGold(e.target.value)} placeholder="0" /></label>
              <label>&#127873; 캐릭터
                <select value={charId} onChange={e => setCharId(e.target.value)}>
                  <option value="">없음</option>
                  {characters.map(c => (
                    <option key={c.id} value={c.id}>[{c.rarity}] {c.name}</option>
                  ))}
                </select>
              </label>
              <label>만료 (일)<input type="number" min="1" value={expiresInDays} onChange={e => setExpiresInDays(e.target.value)} placeholder="무제한" /></label>
            </div>

            <div className="mail-items-section">
              <div className="mail-items-header">
                <span>아이템 첨부</span>
                <button className="btn-small" onClick={addMailItem}>+ 추가</button>
              </div>
              {mailItems.map((mi, idx) => (
                <div key={idx} className="mail-item-row">
                  <select value={mi.itemId} onChange={e => updateMailItem(idx, 'itemId', e.target.value)}>
                    <option value="">아이템 선택</option>
                    {itemList.map(it => (
                      <option key={it.id} value={it.id}>[{it.category}] {it.name}</option>
                    ))}
                  </select>
                  <input type="number" min="1" value={mi.count} onChange={e => updateMailItem(idx, 'count', parseInt(e.target.value) || 1)} style={{ width: 60 }} />
                  <button className="btn-small btn-danger" onClick={() => removeMailItem(idx)}>&#10005;</button>
                </div>
              ))}
            </div>
          </div>

          <div className="form-actions">
            <button className="btn-save" onClick={send} disabled={sending}>
              {sending ? '발송 중...' : target === 'all' ? '전체 발송' : '발송'}
            </button>
          </div>
        </div>
      </div>
    );
  };

  // ====== 밸런스 계산기 ======
  const BalanceCalculator = ({ characters }) => {
    const growth = gameConfig.growth;
    const battle = gameConfig.battle;

    const [bcForm, setBcForm] = useState({
      recLevel: 10,
      partyRarity: 'SR',
      enemyCount: 3,
      hasBoss: false,
      targetTurns: 15,
      difficulty: 'normal',
    });
    const [bcResult, setBcResult] = useState(null);

    const RARITY_STAT_AVGS = {
      N:   { hp: 55, atk: 7, def: 7, spd: 8, notes: 4 },
      R:   { hp: 75, atk: 10, def: 10, spd: 10, notes: 4 },
      SR:  { hp: 95, atk: 12, def: 13, spd: 11, notes: 5 },
      SSR: { hp: 130, atk: 14, def: 17, spd: 10, notes: 6 },
      CR:  { hp: 140, atk: 13, def: 20, spd: 9, notes: 6 },
    };

    const DIFF_MULTS = {
      easy:   { hpMult: 0.7, atkMult: 0.7, defMult: 0.8, label: '쉬움' },
      normal: { hpMult: 1.0, atkMult: 1.0, defMult: 1.0, label: '보통' },
      hard:   { hpMult: 1.4, atkMult: 1.3, defMult: 1.2, label: '어려움' },
      vhard:  { hpMult: 1.8, atkMult: 1.6, defMult: 1.5, label: '매우 어려움' },
    };

    const calcGrown = (base, level, isSPD) => {
      const rate = isSPD ? growth.spdGrowthPerLevel : growth.statGrowthPerLevel;
      return base * (1 + rate * (level - 1));
    };

    const calculate = () => {
      const { recLevel, partyRarity, enemyCount, hasBoss, targetTurns, difficulty } = bcForm;
      const avg = RARITY_STAT_AVGS[partyRarity];
      const diff = DIFF_MULTS[difficulty];
      const partySize = 3;
      const avgPower = 1.4;
      const attackRatio = 0.7;
      const avgCritMult = 1 + battle.critRate * (battle.critMultiplier - 1);

      const partyATK = calcGrown(avg.atk, recLevel, false);
      const partyDEF = calcGrown(avg.def, recLevel, false);
      const partyHP = calcGrown(avg.hp, recLevel, false);
      const partySPD = calcGrown(avg.spd, recLevel, true);
      const partyNotes = avg.notes;

      const dpsPerUnitPerNote = partyATK * avgPower * avgCritMult;
      const dpsPerCycle = partySize * partyNotes * attackRatio * dpsPerUnitPerNote;

      const totalEnemyHP = dpsPerCycle * targetTurns * 1.2;

      let mobHP, mobATK, mobDEF, mobSPD, mobNotes;
      let bossHP, bossATK, bossDEF, bossSPD, bossNotes;

      if (hasBoss) {
        const bossHPShare = enemyCount > 1 ? 0.5 : 1.0;
        const mobHPShare = enemyCount > 1 ? 0.5 / (enemyCount - 1) : 0;

        bossHP = Math.round(totalEnemyHP * bossHPShare * diff.hpMult);
        bossATK = Math.round(partyDEF * 0.9 * avgPower * diff.atkMult);
        bossDEF = Math.round(partyATK * avgPower * targetTurns * 0.35 * diff.defMult);
        bossSPD = Math.round(partySPD * 0.85);
        bossNotes = Math.min(partyNotes + 1, 7);

        if (enemyCount > 1) {
          mobHP = Math.round(totalEnemyHP * mobHPShare * diff.hpMult);
          mobATK = Math.round(bossATK * 0.6);
          mobDEF = Math.round(bossDEF * 0.5);
          mobSPD = Math.round(partySPD * 0.75);
          mobNotes = Math.max(partyNotes - 1, 3);
        }
      } else {
        const perMobHP = totalEnemyHP / enemyCount;
        mobHP = Math.round(perMobHP * diff.hpMult);
        mobATK = Math.round(partyDEF * 0.7 * avgPower * diff.atkMult);
        mobDEF = Math.round(partyATK * avgPower * targetTurns * 0.25 * diff.defMult);
        mobSPD = Math.round(partySPD * 0.8);
        mobNotes = Math.max(partyNotes - 1, 3);
      }

      const enemyTotalDPS_perCycle = hasBoss
        ? (bossATK * bossNotes * 0.6 + (enemyCount > 1 ? (enemyCount - 1) * mobATK * mobNotes * 0.5 : 0))
        : (enemyCount * mobATK * mobNotes * 0.5);
      const dmgToPartyPerCycle = enemyTotalDPS_perCycle * (100 / (100 + partyDEF));
      const totalPartyHP = partyHP * partySize;
      const survivalTurns = Math.round(totalPartyHP / dmgToPartyPerCycle);

      const effectiveDPS = dpsPerCycle * (100 / (100 + (hasBoss ? bossDEF : mobDEF)));
      const actualClearTurns = Math.round(totalEnemyHP * diff.hpMult / effectiveDPS);

      setBcResult({
        party: { atk: partyATK, def: partyDEF, hp: partyHP, spd: partySPD, notes: partyNotes, dpsPerCycle: Math.round(dpsPerCycle) },
        mob: enemyCount > 1 || !hasBoss ? { hp: mobHP, atk: mobATK, def: mobDEF, spd: mobSPD, notes: mobNotes } : null,
        boss: hasBoss ? { hp: bossHP, atk: bossATK, def: bossDEF, spd: bossSPD, notes: bossNotes } : null,
        analysis: { survivalTurns, actualClearTurns, dmgToPartyPerCycle: Math.round(dmgToPartyPerCycle), effectiveDPS: Math.round(effectiveDPS), totalEnemyHP: Math.round(totalEnemyHP * diff.hpMult) },
        diff,
      });
    };

    const bcSet = (k, v) => setBcForm({ ...bcForm, [k]: v });

    const StatRow = ({ label, stat, color }) => (
      <div style={{ display: 'flex', justifyContent: 'space-between', padding: '4px 0', borderBottom: '1px solid #333' }}>
        <span style={{ color: '#aaa' }}>{label}</span>
        <span style={{ color: color || '#e0e0e0', fontWeight: 700, fontFamily: 'monospace' }}>{stat}</span>
      </div>
    );

    return (
      <div className="detail-card" style={{ borderColor: 'rgba(96,165,250,0.3)' }}>
        <h3 style={{ color: '#60a5fa' }}>&#9881; 밸런스 계산기</h3>
        <p style={{ fontSize: 13, color: '#aaa', margin: '8px 0' }}>
          SR 파티 기준으로 적 스탯을 자동 계산합니다. 버프 없이 클리어 가능, 버프/시너지 활용 시 3성 달성 기준.
        </p>
        <div className="form-grid" style={{ marginTop: 12 }}>
          <label>권장 레벨
            <input type="number" min="1" max="60" value={bcForm.recLevel} onChange={e => bcSet('recLevel', Math.max(1, +e.target.value))} />
          </label>
          <label>기준 레어도
            <select value={bcForm.partyRarity} onChange={e => bcSet('partyRarity', e.target.value)}>
              {RARITIES.map(r => <option key={r} value={r}>{r}</option>)}
            </select>
          </label>
          <label>적 수
            <input type="number" min="1" max="6" value={bcForm.enemyCount} onChange={e => bcSet('enemyCount', Math.max(1, Math.min(6, +e.target.value)))} />
          </label>
          <label>목표 턴 수
            <input type="number" min="5" max="30" value={bcForm.targetTurns} onChange={e => bcSet('targetTurns', Math.max(5, +e.target.value))} />
          </label>
          <label>난이도
            <select value={bcForm.difficulty} onChange={e => bcSet('difficulty', e.target.value)}>
              {Object.entries(DIFF_MULTS).map(([k, v]) => <option key={k} value={k}>{v.label}</option>)}
            </select>
          </label>
          <label style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            <input type="checkbox" checked={bcForm.hasBoss} onChange={e => bcSet('hasBoss', e.target.checked)} />
            보스 포함
          </label>
        </div>
        <div className="form-actions" style={{ marginTop: 12 }}>
          <button className="btn-save" onClick={calculate}>계산</button>
        </div>

        {bcResult && (
          <div style={{ marginTop: 20, display: 'flex', flexDirection: 'column', gap: 16 }}>
            <div style={{ display: 'grid', gridTemplateColumns: bcResult.boss && bcResult.mob ? '1fr 1fr 1fr' : bcResult.boss ? '1fr 1fr' : '1fr 1fr', gap: 12 }}>
              <div style={{ background: '#1a1a2e', borderRadius: 8, padding: 14, border: '1px solid rgba(96,165,250,0.3)' }}>
                <div style={{ fontSize: 13, color: '#60a5fa', fontWeight: 700, marginBottom: 8 }}>&#127917; 아군 파티 ({bcForm.partyRarity} Lv.{bcForm.recLevel})</div>
                <StatRow label="ATK" stat={Math.round(bcResult.party.atk)} color="#ef4444" />
                <StatRow label="DEF" stat={Math.round(bcResult.party.def)} color="#3b82f6" />
                <StatRow label="HP" stat={Math.round(bcResult.party.hp)} color="#22c55e" />
                <StatRow label="SPD" stat={Math.round(bcResult.party.spd)} color="#eab308" />
                <StatRow label="Notes" stat={bcResult.party.notes} color="#a78bfa" />
                <StatRow label="DPS/Cycle" stat={bcResult.party.dpsPerCycle} color="#f97316" />
              </div>

              {bcResult.mob && (
                <div style={{ background: '#1a1a2e', borderRadius: 8, padding: 14, border: '1px solid rgba(239,68,68,0.3)' }}>
                  <div style={{ fontSize: 13, color: '#ef4444', fontWeight: 700, marginBottom: 8 }}>&#128126; 일반 몬스터 (x{bcResult.boss ? bcForm.enemyCount - 1 : bcForm.enemyCount})</div>
                  <StatRow label="HP" stat={bcResult.mob.hp} color="#22c55e" />
                  <StatRow label="ATK" stat={bcResult.mob.atk} color="#ef4444" />
                  <StatRow label="DEF" stat={bcResult.mob.def} color="#3b82f6" />
                  <StatRow label="SPD" stat={bcResult.mob.spd} color="#eab308" />
                  <StatRow label="Notes" stat={bcResult.mob.notes} color="#a78bfa" />
                </div>
              )}

              {bcResult.boss && (
                <div style={{ background: '#1a1a2e', borderRadius: 8, padding: 14, border: '1px solid rgba(251,146,60,0.3)' }}>
                  <div style={{ fontSize: 13, color: '#fb923c', fontWeight: 700, marginBottom: 8 }}>&#128293; 보스</div>
                  <StatRow label="HP" stat={bcResult.boss.hp} color="#22c55e" />
                  <StatRow label="ATK" stat={bcResult.boss.atk} color="#ef4444" />
                  <StatRow label="DEF" stat={bcResult.boss.def} color="#3b82f6" />
                  <StatRow label="SPD" stat={bcResult.boss.spd} color="#eab308" />
                  <StatRow label="Notes" stat={bcResult.boss.notes} color="#a78bfa" />
                </div>
              )}
            </div>

            <div style={{ background: '#1a1a2e', borderRadius: 8, padding: 14, border: '1px solid rgba(168,85,247,0.3)' }}>
              <div style={{ fontSize: 13, color: '#a855f7', fontWeight: 700, marginBottom: 8 }}>&#128202; 시뮬레이션 결과</div>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8 }}>
                <StatRow label="예상 클리어 턴" stat={bcResult.analysis.actualClearTurns + '턴'} color={bcResult.analysis.actualClearTurns <= bcForm.targetTurns ? '#22c55e' : '#ef4444'} />
                <StatRow label="파티 생존 턴" stat={bcResult.analysis.survivalTurns + '턴'} color={bcResult.analysis.survivalTurns >= bcResult.analysis.actualClearTurns ? '#22c55e' : '#ef4444'} />
                <StatRow label="아군 유효 DPS" stat={bcResult.analysis.effectiveDPS + '/cycle'} />
                <StatRow label="적 피해/cycle" stat={bcResult.analysis.dmgToPartyPerCycle} />
                <StatRow label="적 총 HP" stat={bcResult.analysis.totalEnemyHP.toLocaleString()} />
                <StatRow label="난이도" stat={bcResult.diff.label} color="#eab308" />
              </div>
              <div style={{ marginTop: 12, fontSize: 12, color: '#888', lineHeight: 1.6 }}
                dangerouslySetInnerHTML={{ __html:
                  bcResult.analysis.survivalTurns < bcResult.analysis.actualClearTurns
                    ? '&#9888; 파티가 클리어 전에 전멸할 수 있음 &#8594; 적 ATK 하향 또는 파티 DEF/HP 확인 필요'
                    : bcResult.analysis.actualClearTurns > bcForm.targetTurns * 1.3
                    ? '&#9888; 클리어가 너무 느림 &#8594; 적 HP/DEF 하향 고려'
                    : bcResult.analysis.survivalTurns > bcResult.analysis.actualClearTurns * 3
                    ? '&#9888; 너무 쉬움 &#8594; 적 스탯 상향 또는 난이도 올리기'
                    : '&#10003; 밸런스 양호 (버프 없이 클리어 가능, 시너지 활용 시 여유)'
                }} />

            </div>
          </div>
        )}
      </div>
    );
  };

  // ====== 렌더 ======
  if (!authed) {
    return (
      <div className="admin-page">
        <div className="admin-login">
          <h2>어드민 로그인</h2>
          <p>관리자 비밀번호를 입력하세요</p>
          <div className="admin-login-form">
            <input
              type="password"
              value={pw}
              onChange={e => setPw(e.target.value)}
              onKeyDown={e => e.key === 'Enter' && handleAdminLogin()}
              placeholder="비밀번호"
              autoFocus
            />
            <button onClick={handleAdminLogin}>확인</button>
          </div>
          {pwError && <p className="pw-error">{pwError}</p>}
        </div>
      </div>
    );
  }

  return (
    <div className="admin-page">
      <div className="admin-header">
        <h2>어드민</h2>
        <div className="admin-tabs">
          <button className={tab === 'characters' ? 'active' : ''} onClick={() => setTab('characters')}>캐릭터</button>
          <button className={tab === 'skills' ? 'active' : ''} onClick={() => setTab('skills')}>스킬</button>
          <button className={tab === 'banners' ? 'active' : ''} onClick={() => setTab('banners')}>가챠 배너</button>
          <button className={tab === 'items' ? 'active' : ''} onClick={() => setTab('items')}>아이템</button>
          <button className={tab === 'monsters' ? 'active' : ''} onClick={() => setTab('monsters')}>몬스터</button>
          <button className={tab === 'stages' ? 'active' : ''} onClick={() => setTab('stages')}>던전</button>
          <button className={tab === 'story' ? 'active' : ''} onClick={() => setTab('story')}>스토리</button>
          <button className={tab === 'mail' ? 'active' : ''} onClick={() => setTab('mail')}>우편</button>
          <button className={tab === 'manage' ? 'active' : ''} onClick={() => setTab('manage')}>관리</button>
        </div>
        {msg && <span className="admin-msg">{msg}</span>}
      </div>

      {tab === 'characters' && (() => {
        let filteredChars = characters;
        if (charFilter.search) filteredChars = filteredChars.filter(c => c.name.includes(charFilter.search));
        if (charFilter.rarity) filteredChars = filteredChars.filter(c => c.rarity === charFilter.rarity);
        if (charFilter.element) filteredChars = filteredChars.filter(c => c.element === charFilter.element);
        if (charFilter.origin) filteredChars = filteredChars.filter(c => c.origin === charFilter.origin);
        return (
        <div className="admin-layout">
          {/* 왼쪽: 캐릭터 목록 */}
          <div className="admin-list">
            <div className="list-header">
              <span>캐릭터 ({filteredChars.length}/{characters.length})</span>
              <button className="btn-add" onClick={() => setEditing('new')}>+ 추가</button>
            </div>
            <div className="admin-filter-bar">
              <input className="admin-filter-search" placeholder="이름 검색" value={charFilter.search}
                onChange={e => setCharFilter(f => ({ ...f, search: e.target.value }))} />
              <select value={charFilter.rarity} onChange={e => setCharFilter(f => ({ ...f, rarity: e.target.value }))}>
                <option value="">등급</option>
                {RARITIES.map(r => <option key={r} value={r}>{r}</option>)}
              </select>
              <select value={charFilter.element} onChange={e => setCharFilter(f => ({ ...f, element: e.target.value }))}>
                <option value="">속성</option>
                {ELEMENTS.map(el => <option key={el} value={el}>{ELEM_LABEL[el]}</option>)}
              </select>
              <select value={charFilter.origin} onChange={e => setCharFilter(f => ({ ...f, origin: e.target.value }))}>
                <option value="">근원</option>
                {ORIGINS.map(o => <option key={o} value={o}>{ORIGIN_LABEL[o]}</option>)}
              </select>
              {(charFilter.search || charFilter.rarity || charFilter.element || charFilter.origin) && (
                <button className="admin-filter-clear" onClick={() => setCharFilter({ search: '', rarity: '', element: '', origin: '' })}>&#10005;</button>
              )}
            </div>
            {filteredChars.map(c => (
              <div key={c.id}
                className={'list-item' + (selectedChar?.id === c.id ? ' selected' : '')}
                onClick={() => { loadCharDetail(c.id); setEditing(null); }}>
                <div className="item-thumb">
                  {c.image_url ? <img src={c.image_url} alt="" /> : <span className="no-img">?</span>}
                </div>
                <div className="item-info">
                  <span className="item-name" style={getRarityStyle(c.rarity)}><span className="char-id-badge">#{c.id}</span>{c.name}</span>
                  <span className="item-meta">
                    <span className="rarity-badge" style={getRarityBgStyle(c.rarity)}>{c.rarity}</span>
                    <span className="elem-badge" style={{ background: ELEM_COLORS[c.element] }}>{ELEM_LABEL[c.element]}</span>
                    <span className="origin-badge" style={{ background: ORIGIN_COLORS[c.origin] }}>{ORIGIN_LABEL[c.origin] || '?'}</span>
                    <span className="notes-badge">N:{c.turn_notes}</span>
                  </span>
                </div>
              </div>
            ))}
          </div>

          {/* 오른쪽: 상세/편집 */}
          <div className="admin-detail">
            {editing ? (
              <CharForm
                initial={editing === 'new' ? null : editing}
                onSave={saveChar}
                onCancel={() => setEditing(null)}
              />
            ) : selectedChar ? (
              <div className="char-detail">
                <div className="detail-top">
                  <div className="detail-image">
                    {selectedChar.image_url
                      ? <img src={selectedChar.image_url} alt={selectedChar.name} />
                      : <div className="placeholder-img">이미지 없음</div>}
                    <div className="image-upload-grid">
                      {[
                        { type: 'portrait', label: '포트레이트' },
                        { type: 'bust', label: '바스트샷' },
                        { type: 'sd', label: 'SD' },
                        { type: 'ld', label: 'LD' },
                      ].map(img => (
                        <label key={img.type} className="upload-btn-sm">
                          {img.label}
                          {selectedChar[img.type === 'portrait' ? 'image_url' : `image_${img.type}`] ? ' ✓' : ''}
                          <input type="file" accept="image/*" hidden
                            onChange={e => e.target.files[0] && uploadImage(selectedChar.id, e.target.files[0], img.type)} />
                        </label>
                      ))}
                    </div>
                  </div>
                  <div className="detail-info">
                    <h3 style={getRarityStyle(selectedChar.rarity)}>
                      [{selectedChar.rarity}] {selectedChar.name}
                    </h3>
                    <p className="detail-title">{selectedChar.title}</p>
                    <p className="detail-quote">"{selectedChar.quote}"</p>
                    <p className="detail-desc">{selectedChar.description}</p>
                    <div className="stat-grid">
                      <span>HP: {selectedChar.base_hp}</span>
                      <span>ATK: {selectedChar.base_atk}</span>
                      <span>DEF: {selectedChar.base_def}</span>
                      <span>SPD: {selectedChar.base_spd}</span>
                      <span>턴노트: {selectedChar.turn_notes}</span>
                      <span>공격슬롯: {selectedChar.attack_slots ?? 3}</span>
                      <span>방어슬롯: {selectedChar.defense_slots ?? 2}</span>
                      <span className="elem-badge" style={{ background: ELEM_COLORS[selectedChar.element] }}>
                        {ELEM_LABEL[selectedChar.element]}
                      </span>
                      <span className="origin-badge" style={{ background: ORIGIN_COLORS[selectedChar.origin] }}>
                        {ORIGIN_LABEL[selectedChar.origin] || '?'}
                      </span>
                    </div>
                    <div className="detail-actions">
                      <button className="btn-edit" onClick={() => setEditing(selectedChar)}>수정</button>
                      <button className="btn-delete" onClick={() => deleteChar(selectedChar.id)}>삭제</button>
                    </div>
                  </div>
                </div>

                {/* 태그 관리 */}
                <div className="char-tags-section">
                  <h4>태그</h4>
                  <div className="tag-chips">
                    {charTags.map(tag => (
                      <span key={tag.id} className="tag-chip">
                        {tag.label}
                        <button className="tag-remove" onClick={async () => {
                          await req('/characters/' + selectedChar.id + '/tags/' + tag.id, { method: 'DELETE' });
                          setCharTags(charTags.filter(t => t.id !== tag.id));
                          loadTagDefs();
                        }}>&#10005;</button>
                      </span>
                    ))}
                    {charTags.length === 0 && <span style={{ color: '#666', fontSize: 12 }}>태그 없음</span>}
                  </div>
                  {(() => {
                    const available = tagDefs.filter(td => !charTags.find(ct => ct.id === td.id));
                    return available.length > 0 && (
                      <div className="tag-add-row">
                        {available.map(td => (
                          <button key={td.id} className="btn-sm tag-add-btn" onClick={async () => {
                            await req('/characters/' + selectedChar.id + '/tags', { method: 'POST', body: { tagId: td.id } });
                            setCharTags([...charTags, { id: td.id, label: td.label }]);
                            loadTagDefs();
                          }}>+ {td.label}</button>
                        ))}
                      </div>
                    );
                  })()}
                  <div className="tag-manage-section">
                    <details>
                      <summary className="tag-manage-toggle">태그 정의 관리 ({tagDefs.length})</summary>
                      <div className="tag-def-list">
                        {tagDefs.map(td => (
                          <div key={td.id} className="tag-def-item">
                            {editingTagId === td.id ? (
                              <>
                                <input value={editingTagLabel} onChange={e => setEditingTagLabel(e.target.value)}
                                  onKeyDown={e => {
                                    if (e.key === 'Enter') {
                                      (async () => {
                                        await req('/tag-defs/' + td.id, { method: 'PUT', body: { label: editingTagLabel } });
                                        setEditingTagId(null);
                                        loadTagDefs();
                                        loadCharDetail(selectedChar.id);
                                      })();
                                    }
                                  }} />
                                <button className="btn-sm" onClick={async () => {
                                  await req('/tag-defs/' + td.id, { method: 'PUT', body: { label: editingTagLabel } });
                                  setEditingTagId(null);
                                  loadTagDefs();
                                  loadCharDetail(selectedChar.id);
                                }}>&#10003;</button>
                                <button className="btn-sm" onClick={() => setEditingTagId(null)}>&#10005;</button>
                              </>
                            ) : (
                              <>
                                <span className="tag-chip tag-chip-sm">{td.label}</span>
                                <span style={{ fontSize: 11, color: '#666' }}>({td.count})</span>
                                <button className="btn-sm" onClick={() => { setEditingTagId(td.id); setEditingTagLabel(td.label); }}>&#9998;</button>
                                {td.count === 0 && <button className="btn-sm btn-remove" onClick={async () => {
                                  await req('/tag-defs/' + td.id, { method: 'DELETE' });
                                  loadTagDefs();
                                }}>&#10005;</button>}
                              </>
                            )}
                          </div>
                        ))}
                        <div className="tag-def-add">
                          <input placeholder="새 태그 이름" value={newTagLabel} onChange={e => setNewTagLabel(e.target.value)}
                            onKeyDown={e => {
                              if (e.key === 'Enter' && newTagLabel.trim()) {
                                (async () => {
                                  await req('/tag-defs', { method: 'POST', body: { label: newTagLabel.trim() } });
                                  setNewTagLabel('');
                                  loadTagDefs();
                                })();
                              }
                            }} />
                          <button className="btn-sm" onClick={async () => {
                            if (!newTagLabel.trim()) return;
                            await req('/tag-defs', { method: 'POST', body: { label: newTagLabel.trim() } });
                            setNewTagLabel('');
                            loadTagDefs();
                          }}>+ 생성</button>
                        </div>
                      </div>
                    </details>
                  </div>
                </div>

                {/* 스킬 매핑 */}
                <div className="char-skills-section">
                  <h4>보유 스킬</h4>
                  <div className="skill-list">
                    {charSkills.map(s => {
                      const extraObj = (() => { try { return typeof s.extra === 'string' ? JSON.parse(s.extra || '{}') : (s.extra || {}); } catch { return {}; } })();
                      const extraKeys = Object.keys(extraObj).filter(k => k !== 'effectIds');
                      return (
                      <div key={s.id} className="skill-item skill-has-tip">
                        <div className="skill-info">
                          <span className="char-id-badge">#{s.id}</span>
                          <span className={'skill-type st-' + s.type}>{s.type}</span>
                          <span className="skill-name">{s.name}</span>
                          <span className="skill-cost">코스트:{s.cost}</span>
                          {s.type === 'attack' || s.type === 'ultimate' ? <span className="skill-power">위력:{s.power}</span> : null}
                          {s.is_fixed ? <span className="fixed-badge">고정</span> : null}
                        </div>
                        <div className="skill-hover-tip">
                          {s.description && <div className="tip-desc">{s.description}</div>}
                          <div className="tip-row">
                            <span className="elem-badge" style={{ background: ELEM_COLORS[s.element] }}>{ELEM_LABEL[s.element]}</span>
                            <span>대상: {s.target}</span>
                            <span>등급: {SKILL_RARITY_LABEL[s.rarity] || s.rarity}</span>
                            {s.defense_mult > 0 && <span>방어배율: {s.defense_mult}</span>}
                            {s.cooldown > 0 && <span>쿨다운: {s.cooldown}</span>}
                          </div>
                          {extraKeys.length > 0 && <div className="tip-extra">extra: {extraKeys.join(', ')}</div>}
                          {extraObj.effectIds?.length > 0 && <div className="tip-extra">effectIds: [{extraObj.effectIds.map(e => typeof e === 'object' ? `#${e.id}` : `#${e}`).join(', ')}]</div>}
                        </div>
                        <div className="skill-actions">
                          <button onClick={() => {
                            const cur = s.awakening_required ?? 0;
                            const cycle = [0, 11, 12, 13];
                            const next = cycle[(cycle.indexOf(cur) + 1) % cycle.length];
                            setAwakeningRequired(selectedChar.id, s.id, next);
                          }}>
                            {({ 0: '획득시', 11: '1차승급', 12: '2차승급', 13: '3차승급' })[s.awakening_required ?? 0] || '획득시'}
                          </button>
                          <button onClick={() => toggleFixed(selectedChar.id, s.id)}>
                            {s.is_fixed ? '고정해제' : '고정설정'}
                          </button>
                          <button className="btn-remove" onClick={() => removeSkillFromChar(selectedChar.id, s.id)}>제거</button>
                        </div>
                      </div>
                    ); })}
                  </div>

                  <h4>스킬 추가</h4>
                  <div className="admin-filter-bar pool-filter-bar">
                    <input className="admin-filter-search" placeholder="이름 검색" value={poolFilter.search}
                      onChange={e => setPoolFilter(f => ({ ...f, search: e.target.value }))} />
                    <select value={poolFilter.type} onChange={e => setPoolFilter(f => ({ ...f, type: e.target.value }))}>
                      <option value="">타입</option>
                      {SKILL_TYPES.map(t => <option key={t} value={t}>{t}</option>)}
                    </select>
                    <select value={poolFilter.element} onChange={e => setPoolFilter(f => ({ ...f, element: e.target.value }))}>
                      <option value="">속성</option>
                      {ELEMENTS.map(el => <option key={el} value={el}>{ELEM_LABEL[el]}</option>)}
                    </select>
                    <select value={poolFilter.obtainable} onChange={e => setPoolFilter(f => ({ ...f, obtainable: e.target.value }))}>
                      <option value="">획득</option>
                      <option value="1">획득 가능</option>
                      <option value="0">적 전용</option>
                    </select>
                    {(poolFilter.search || poolFilter.type || poolFilter.element || poolFilter.obtainable !== '') && (
                      <button className="admin-filter-clear" onClick={() => setPoolFilter({ search: '', type: '', element: '', obtainable: '' })}>&#10005;</button>
                    )}
                  </div>
                  <div className="skill-pool">
                    {skills.filter(s => {
                      if (charSkills.find(cs => cs.id === s.id)) return false;
                      if (poolFilter.search && !s.name.includes(poolFilter.search)) return false;
                      if (poolFilter.type && s.type !== poolFilter.type) return false;
                      if (poolFilter.element && s.element !== poolFilter.element) return false;
                      if (poolFilter.obtainable !== '' && (s.obtainable ? 1 : 0) !== Number(poolFilter.obtainable)) return false;
                      return true;
                    }).map(s => {
                      const extraObj = (() => { try { return typeof s.extra === 'string' ? JSON.parse(s.extra || '{}') : (s.extra || {}); } catch { return {}; } })();
                      const extraKeys = Object.keys(extraObj).filter(k => k !== 'effectIds');
                      return (
                      <div key={s.id} className="pool-skill-wrap">
                        <button className="pool-skill" onClick={() => addSkillToChar(selectedChar.id, s.id)}>
                          <span className={'skill-type st-' + s.type}>{s.type}</span>
                          {s.name} (코스트:{s.cost})
                        </button>
                        <div className="skill-hover-tip">
                          {s.description && <div className="tip-desc">{s.description}</div>}
                          <div className="tip-row">
                            <span className="elem-badge" style={{ background: ELEM_COLORS[s.element] }}>{ELEM_LABEL[s.element]}</span>
                            <span>대상: {s.target}</span>
                            {s.power > 0 && <span>위력: {s.power}</span>}
                            {s.defense_mult > 0 && <span>방어배율: {s.defense_mult}</span>}
                          </div>
                          {extraKeys.length > 0 && <div className="tip-extra">extra: {extraKeys.join(', ')}</div>}
                          {extraObj.effectIds?.length > 0 && <div className="tip-extra">effectIds: [{extraObj.effectIds.map(e => typeof e === 'object' ? `#${e.id}` : `#${e}`).join(', ')}]</div>}
                        </div>
                      </div>
                    ); })}
                  </div>
                </div>

                {/* 특기 편집 */}
                <div className="char-talents-section">
                  <div className="talents-section-header">
                    <h4>특기 ({charTalents.length}/6)</h4>
                    {charTalents.length < 6 && (
                      <button className="btn-add" onClick={() => {
                        const next = [...charTalents, { name: '새 특기', desc: '', flavor: '', effects: [] }];
                        setCharTalents(next);
                        setEditingTalentIdx(next.length - 1);
                      }}>+ 추가</button>
                    )}
                  </div>

                  {charTalents.map((t, idx) => (
                    <div key={idx} className={`talent-edit-item ${editingTalentIdx === idx ? 'editing' : ''}`}>
                      {editingTalentIdx === idx ? (
                        <div className="talent-edit-form">
                          <div className="talent-edit-header-row">
                            <span className="talent-slot-badge">{idx === 0 ? '기본' : `각성 ${idx}`}</span>
                            <button className="btn-sm btn-remove" onClick={async () => {
                              if (!confirm(`"${t.name}" 특기를 삭제하시겠습니까?`)) return;
                              const next = charTalents.filter((_, i) => i !== idx);
                              setCharTalents(next);
                              setEditingTalentIdx(null);
                              try {
                                await req('/talents/' + selectedChar.id, { method: 'PUT', body: { talents: next } });
                                showMsg('특기 삭제 완료');
                              } catch (e) { showMsg('삭제 저장 실패: ' + e.message); }
                            }}>삭제</button>
                          </div>
                          <div className="form-grid">
                            <label>이름<input value={t.name} onChange={e => {
                              const next = [...charTalents]; next[idx] = { ...t, name: e.target.value }; setCharTalents(next);
                            }} /></label>
                          </div>
                          <label className="form-wide">설명<input value={t.desc} onChange={e => {
                            const next = [...charTalents]; next[idx] = { ...t, desc: e.target.value }; setCharTalents(next);
                          }} /></label>
                          <label className="form-wide">플레이버<input value={t.flavor} onChange={e => {
                            const next = [...charTalents]; next[idx] = { ...t, flavor: e.target.value }; setCharTalents(next);
                          }} /></label>

                          <div className="talent-effects-section">
                            <div className="talent-effects-header">
                              <span>효과 ({t.effects.length})</span>
                              <button className="btn-add" onClick={() => {
                                const next = [...charTalents];
                                next[idx] = { ...t, effects: [...t.effects, { id: 0 }] };
                                setCharTalents(next);
                              }}>+ 효과</button>
                            </div>
                            {t.effects.map((eff, ei) => {
                              const args = Array.isArray(eff.args) ? eff.args : [];
                              const updateEff = (newEff) => { const next = [...charTalents]; next[idx] = { ...t, effects: t.effects.map((x, xi) => xi === ei ? newEff : x) }; setCharTalents(next); };
                              return (
                              <div key={ei} className="effect-id-block">
                              <div className="talent-effect-row">
                                <span style={{ fontSize: 12, color: '#888', minWidth: 24 }}>ID</span>
                                <input type="number" style={{ width: 60 }} value={eff.id ?? 0} onChange={e => {
                                  updateEff({ ...eff, id: +e.target.value });
                                }} />
                                <button className="btn-sm" onClick={() => {
                                  updateEff({ ...eff, args: [...args, 0] });
                                }}>+ arg</button>
                                <button className="btn-sm btn-remove" onClick={() => {
                                  const next = [...charTalents];
                                  next[idx] = { ...t, effects: t.effects.filter((_, xi) => xi !== ei) };
                                  setCharTalents(next);
                                }}>&#10005;</button>
                              </div>
                              {args.map((v, ai) => (
                                <div key={ai} className="talent-effect-row" style={{ paddingLeft: 28 }}>
                                  <span style={{ fontSize: 11, color: '#666', minWidth: 16 }}>{ai}</span>
                                  <input style={{ flex: 1 }} value={typeof v === 'boolean' ? String(v) : Array.isArray(v) ? JSON.stringify(v) : v ?? ''} onChange={e => {
                                    const raw = e.target.value;
                                    let val;
                                    if (raw === 'true') val = true;
                                    else if (raw === 'false') val = false;
                                    else if (raw === 'null') val = null;
                                    else if (raw === '' || raw.endsWith('.')) val = raw;
                                    else if (raw.startsWith('[')) { try { val = JSON.parse(raw); } catch { val = raw; } }
                                    else if (/^-?\d+\.?\d*$/.test(raw) && !raw.endsWith('.')) val = +raw;
                                    else val = raw;
                                    const newArgs = [...args]; newArgs[ai] = val;
                                    updateEff({ ...eff, args: newArgs });
                                  }} />
                                  <button className="btn-sm btn-remove" onClick={() => {
                                    const newArgs = args.filter((_, j) => j !== ai);
                                    updateEff({ ...eff, args: newArgs.length > 0 ? newArgs : undefined });
                                  }}>&#10005;</button>
                                </div>
                              ))}
                              <div className="tag-condition-row">
                                {eff.tagCondition ? (
                                  <>
                                    <span className="tag-cond-label">&#9875; 태그 조건:</span>
                                    <select value={eff.tagCondition.tag || ''} style={{ width: 100 }} onChange={e => {
                                      const next = [...charTalents];
                                      next[idx] = { ...t, effects: t.effects.map((x, xi) => xi === ei ? { ...x, tagCondition: { ...x.tagCondition, tag: +e.target.value } } : x) };
                                      setCharTalents(next);
                                    }}>
                                      <option value="">선택</option>
                                      {tagDefs.map(td => <option key={td.id} value={td.id}>{td.label}</option>)}
                                    </select>
                                    <input type="number" min="1" value={eff.tagCondition.min || 2} style={{ width: 40 }} onChange={e => {
                                      const next = [...charTalents];
                                      next[idx] = { ...t, effects: t.effects.map((x, xi) => xi === ei ? { ...x, tagCondition: { ...x.tagCondition, min: +e.target.value } } : x) };
                                      setCharTalents(next);
                                    }} />
                                    <span style={{ fontSize: 11, color: '#888' }}>명</span>
                                    <button className="btn-sm btn-remove" onClick={() => {
                                      const next = [...charTalents];
                                      next[idx] = { ...t, effects: t.effects.map((x, xi) => { if (xi !== ei) return x; const { tagCondition, ...rest } = x; return rest; }) };
                                      setCharTalents(next);
                                    }}>&#10005;</button>
                                  </>
                                ) : (
                                  <button className="btn-sm tag-cond-add" onClick={() => {
                                    const next = [...charTalents];
                                    next[idx] = { ...t, effects: t.effects.map((x, xi) => xi === ei ? { ...x, tagCondition: { tag: 0, min: 2 } } : x) };
                                    setCharTalents(next);
                                  }}>+ 태그 조건</button>
                                )}
                              </div>
                              </div>
                              );
                            })}
                          </div>
                          <div className="form-actions">
                            <button className="btn-save" onClick={async () => {
                              try {
                                await req('/talents/' + selectedChar.id, { method: 'PUT', body: { talents: charTalents } });
                                showMsg('특기 저장 완료');
                                setEditingTalentIdx(null);
                              } catch (e) { showMsg('저장 실패: ' + e.message); }
                            }}>저장</button>
                            <button className="btn-cancel" onClick={() => {
                              setEditingTalentIdx(null);
                              loadCharDetail(selectedChar.id);
                            }}>취소</button>
                          </div>
                        </div>
                      ) : (
                        <div className="talent-edit-summary" onClick={() => setEditingTalentIdx(idx)}>
                          <span className="talent-slot-badge">{idx === 0 ? '기본' : `각성 ${idx}`}</span>
                          <span className="talent-edit-name">{t.name}</span>
                          <span className="talent-edit-desc">{t.desc}</span>
                          <span className="talent-edit-fx">{t.effects.length}개 효과</span>
                        </div>
                      )}
                    </div>
                  ))}
                  {charTalents.length === 0 && <p style={{ color: '#666', fontSize: 13 }}>등록된 특기가 없습니다.</p>}
                </div>

                {/* 승급 편집 */}
                <div className="char-talents-section">
                  <div className="talents-section-header">
                    <h4>승급 ({charPromoTiers.length}/3)</h4>
                    {charPromoTiers.length < 3 && (
                      <button className="btn-add" onClick={() => {
                        const next = [...charPromoTiers, { gold: 5000, items: [], attackSlots: 0, defenseSlots: 0, unlockTalent: false }];
                        setCharPromoTiers(next);
                        setEditingPromoTier(next.length - 1);
                      }}>+ 추가</button>
                    )}
                  </div>

                  {charPromoTiers.map((tier, idx) => (
                    <div key={idx} className={`talent-edit-item ${editingPromoTier === idx ? 'editing' : ''}`}>
                      {editingPromoTier === idx ? (
                        <div className="talent-edit-form">
                          <div className="talent-edit-header-row">
                            <span className="talent-slot-badge promo-badge">{idx + 1}차 승급</span>
                            <button className="btn-sm btn-remove" onClick={() => {
                              if (!confirm(`${idx + 1}차 승급을 삭제하시겠습니까?`)) return;
                              const next = charPromoTiers.filter((_, i) => i !== idx);
                              setCharPromoTiers(next);
                              setEditingPromoTier(null);
                            }}>삭제</button>
                          </div>
                          <div className="form-grid">
                            <label>비트<input type="number" value={tier.gold} onChange={e => {
                              const next = [...charPromoTiers]; next[idx] = { ...tier, gold: +e.target.value }; setCharPromoTiers(next);
                            }} /></label>
                          </div>
                          <div className="promo-rewards-section">
                            <span className="promo-rewards-label">승급 보상</span>
                            <div className="promo-rewards-grid">
                              <label>공격칸 +<input type="number" min="0" max="3" style={{ width: 50 }} value={tier.attackSlots || 0} onChange={e => {
                                const next = [...charPromoTiers]; next[idx] = { ...tier, attackSlots: +e.target.value }; setCharPromoTiers(next);
                              }} /></label>
                              <label>방어칸 +<input type="number" min="0" max="3" style={{ width: 50 }} value={tier.defenseSlots || 0} onChange={e => {
                                const next = [...charPromoTiers]; next[idx] = { ...tier, defenseSlots: +e.target.value }; setCharPromoTiers(next);
                              }} /></label>
                              <label>노트 +<input type="number" min="0" max="3" style={{ width: 50 }} value={tier.bonusNotes || 0} onChange={e => {
                                const next = [...charPromoTiers]; next[idx] = { ...tier, bonusNotes: +e.target.value }; setCharPromoTiers(next);
                              }} /></label>
                              <label className="promo-check-label">
                                <input type="checkbox" checked={!!tier.unlockTalent} onChange={e => {
                                  const next = [...charPromoTiers]; next[idx] = { ...tier, unlockTalent: e.target.checked }; setCharPromoTiers(next);
                                }} /> 특기 해금
                              </label>
                            </div>
                          </div>
                          <div className="talent-effects-section">
                            <div className="talent-effects-header">
                              <span>필요 재료 ({tier.items.length})</span>
                              <button className="btn-add" onClick={() => {
                                const next = [...charPromoTiers];
                                next[idx] = { ...tier, items: [...tier.items, { itemId: allItems[0]?.id || '', quantity: 1 }] };
                                setCharPromoTiers(next);
                              }}>+ 재료</button>
                            </div>
                            {tier.items.map((mat, mi) => (
                              <div key={mi} className="talent-effect-row">
                                <select value={mat.itemId} onChange={e => {
                                  const next = [...charPromoTiers];
                                  next[idx] = { ...tier, items: tier.items.map((x, xi) => xi === mi ? { ...x, itemId: e.target.value } : x) };
                                  setCharPromoTiers(next);
                                }}>
                                  <option value="">-- 선택 --</option>
                                  {allItems.map(it => (
                                    <option key={it.id} value={it.id}>{it.name} ({it.category})</option>
                                  ))}
                                </select>
                                <input type="number" min="1" style={{ width: 60 }} value={mat.quantity} onChange={e => {
                                  const next = [...charPromoTiers];
                                  next[idx] = { ...tier, items: tier.items.map((x, xi) => xi === mi ? { ...x, quantity: +e.target.value } : x) };
                                  setCharPromoTiers(next);
                                }} />
                                <button className="btn-sm btn-remove" onClick={() => {
                                  const next = [...charPromoTiers];
                                  next[idx] = { ...tier, items: tier.items.filter((_, xi) => xi !== mi) };
                                  setCharPromoTiers(next);
                                }}>&#10005;</button>
                              </div>
                            ))}
                          </div>
                          <div className="form-actions">
                            <button className="btn-save" onClick={async () => {
                              try {
                                await req('/promotions/' + selectedChar.id, { method: 'PUT', body: { tiers: charPromoTiers } });
                                showMsg('승급 저장 완료');
                                setEditingPromoTier(null);
                              } catch (e) { showMsg('저장 실패: ' + e.message); }
                            }}>저장</button>
                            <button className="btn-cancel" onClick={() => {
                              setEditingPromoTier(null);
                              loadCharDetail(selectedChar.id);
                            }}>취소</button>
                          </div>
                        </div>
                      ) : (
                        <div className="talent-edit-summary" onClick={() => setEditingPromoTier(idx)}>
                          <span className="talent-slot-badge promo-badge">{idx + 1}차 승급</span>
                          <span className="talent-edit-name">{tier.gold.toLocaleString()} 비트 / {tier.items.length}개 재료</span>
                          <span className="talent-edit-fx">
                            {[
                              tier.attackSlots ? `공격칸+${tier.attackSlots}` : '',
                              tier.defenseSlots ? `방어칸+${tier.defenseSlots}` : '',
                              tier.bonusNotes ? `노트+${tier.bonusNotes}` : '',
                              tier.unlockTalent ? '특기해금' : '',
                            ].filter(Boolean).join(' ') || '보상 없음'}
                          </span>
                        </div>
                      )}
                    </div>
                  ))}
                  {charPromoTiers.length === 0 && <p style={{ color: '#666', fontSize: 13 }}>등록된 승급 데이터가 없습니다.</p>}
                </div>

              </div>
            ) : (
              <div className="empty-detail">왼쪽에서 캐릭터를 선택하세요</div>
            )}
          </div>
        </div>
        );
      })()}

      {tab === 'skills' && (() => {
        let filteredSkills = skills;
        if (skillFilter.search) filteredSkills = filteredSkills.filter(s => s.name.includes(skillFilter.search));
        if (skillFilter.type) filteredSkills = filteredSkills.filter(s => s.type === skillFilter.type);
        if (skillFilter.element) filteredSkills = filteredSkills.filter(s => s.element === skillFilter.element);
        if (skillFilter.rarity) filteredSkills = filteredSkills.filter(s => s.rarity === skillFilter.rarity);
        if (skillFilter.obtainable !== '') filteredSkills = filteredSkills.filter(s => (s.obtainable ? 1 : 0) === Number(skillFilter.obtainable));
        return (
        <div className="admin-skills-tab">
          <div className="list-header">
            <span>스킬 ({filteredSkills.length}/{skills.length})</span>
            <button className="btn-add" onClick={() => setEditingSkill('new')}>+ 추가</button>
          </div>

          <div className="admin-filter-bar">
            <input className="admin-filter-search" placeholder="이름 검색" value={skillFilter.search}
              onChange={e => setSkillFilter(f => ({ ...f, search: e.target.value }))} />
            <select value={skillFilter.type} onChange={e => setSkillFilter(f => ({ ...f, type: e.target.value }))}>
              <option value="">타입</option>
              {SKILL_TYPES.map(t => <option key={t} value={t}>{t}</option>)}
            </select>
            <select value={skillFilter.element} onChange={e => setSkillFilter(f => ({ ...f, element: e.target.value }))}>
              <option value="">속성</option>
              {ELEMENTS.map(el => <option key={el} value={el}>{ELEM_LABEL[el]}</option>)}
            </select>
            <select value={skillFilter.rarity} onChange={e => setSkillFilter(f => ({ ...f, rarity: e.target.value }))}>
              <option value="">등급</option>
              {SKILL_RARITIES.map(r => <option key={r} value={r}>{SKILL_RARITY_LABEL[r]}</option>)}
            </select>
            <select value={skillFilter.obtainable} onChange={e => setSkillFilter(f => ({ ...f, obtainable: e.target.value }))}>
              <option value="">획득</option>
              <option value="1">획득 가능</option>
              <option value="0">적 전용</option>
            </select>
            {(skillFilter.search || skillFilter.type || skillFilter.element || skillFilter.rarity || skillFilter.obtainable !== '') && (
              <button className="admin-filter-clear" onClick={() => setSkillFilter({ search: '', type: '', element: '', rarity: '', obtainable: '' })}>&#10005;</button>
            )}
          </div>

          {editingSkill && (
            <SkillForm
              key={editingSkill === 'new' ? 'new' : editingSkill.id}
              initial={editingSkill === 'new' ? null : editingSkill}
              onSave={saveSkill}
              onCancel={() => setEditingSkill(null)}
            />
          )}

          <div className="skills-table">
            <table>
              <thead>
                <tr>
                  <th>ID</th><th>아이콘</th><th>이름</th><th>타입</th><th>등급</th><th>코스트</th><th>위력</th>
                  <th>속성</th><th>타겟</th><th>방어배율</th><th>설명</th><th></th>
                </tr>
              </thead>
              <tbody>
                {filteredSkills.map(s => (
                  <tr key={s.id}>
                    <td>{s.id}</td>
                    <td className="skill-icon-cell">
                      <label className="skill-icon-upload">
                        {s.icon ? <img src={s.icon} alt="" /> : <span className="no-icon">+</span>}
                        <input type="file" accept="image/*" hidden
                          onChange={e => e.target.files[0] && uploadSkillIcon(s.id, e.target.files[0])} />
                      </label>
                    </td>
                    <td className="skill-name-cell">{s.name}</td>
                    <td><span className={'skill-type st-' + s.type}>{s.type}</span></td>
                    <td>{SKILL_RARITY_LABEL[s.rarity] || s.rarity || '-'}</td>
                    <td>{s.cost}</td>
                    <td>{s.power}</td>
                    <td><span className="elem-badge-sm" style={{ background: ELEM_COLORS[s.element] }}>{ELEM_LABEL[s.element]}</span></td>
                    <td>{s.target}</td>
                    <td>{s.defense_mult || '-'}</td>
                    <td className="desc-cell">{s.description}</td>
                    <td>
                      <button className="btn-sm" onClick={() => setEditingSkill(s)}>수정</button>
                      <button className="btn-sm btn-remove" onClick={() => deleteSkill(s.id)}>삭제</button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
        );
      })()}

      {tab === 'banners' && (
        <div className="admin-banners-tab">
          {/* 가챠 확률 설정 */}
          <div className="gacha-config-section">
            <div className="gacha-config-header" onClick={() => setGachaConfigOpen(!gachaConfigOpen)}>
              <h4>확률 설정 {gachaConfigOpen ? '▲' : '▼'}</h4>
            </div>
            {gachaConfigOpen && gachaConfig && (() => {
              const gc = gachaConfig.gacha;
              const sg = gachaConfig.skillGacha;
              const charSum = Object.values(gc.rates).reduce((a, b) => a + b, 0);
              const skillSum = Object.values(sg.rates).reduce((a, b) => a + b, 0);

              const setCharRate = (key, val) => setGachaConfig({
                ...gachaConfig,
                gacha: { ...gc, rates: { ...gc.rates, [key]: val } }
              });
              const setSkillRate = (key, val) => setGachaConfig({
                ...gachaConfig,
                skillGacha: { ...sg, rates: { ...sg.rates, [key]: val } }
              });
              const setGP = (key, val) => setGachaConfig({
                ...gachaConfig,
                gacha: { ...gc, [key]: val }
              });
              const setSGP = (key, val) => setGachaConfig({
                ...gachaConfig,
                skillGacha: { ...sg, [key]: val }
              });

              return (
                <div className="gacha-config-body">
                  <div className="gacha-config-group">
                    <h5>캐릭터 가챠</h5>
                    <div className="gacha-rates-grid">
                      {Object.entries(gc.rates).map(([key, val]) => (
                        <label key={key} className="gacha-rate-item">
                          <span className="rate-label" style={getRarityStyle(key)}>{key}</span>
                          <input type="number" step="0.005" min="0" max="1" value={val}
                            onChange={e => setCharRate(key, +e.target.value)} />
                          <span className="rate-pct">{(val * 100).toFixed(1)}%</span>
                        </label>
                      ))}
                    </div>
                    <div className={'rate-total ' + (Math.abs(charSum - 1) < 0.001 ? 'ok' : 'warn')}>
                      합계: {(charSum * 100).toFixed(1)}%
                      {Math.abs(charSum - 1) < 0.001 ? ' ✓' : ' (100%가 아닙니다!)'}
                    </div>
                    <div className="gacha-params-grid">
                      <label>뽑기 비용<input type="number" value={gc.pullCost} onChange={e => setGP('pullCost', +e.target.value)} /></label>
                      <label>10연 횟수<input type="number" value={gc.multiPullCount} onChange={e => setGP('multiPullCount', +e.target.value)} /></label>
                      <label>천장<input type="number" value={gc.pityThreshold} onChange={e => setGP('pityThreshold', +e.target.value)} /></label>
                      <label>소프트 천장<input type="number" value={gc.softPityStart} onChange={e => setGP('softPityStart', +e.target.value)} /></label>
                      <label>소프트 보너스<input type="number" step="0.01" value={gc.softPityBonusPerPull} onChange={e => setGP('softPityBonusPerPull', +e.target.value)} /></label>
                    </div>
                  </div>

                  <div className="gacha-config-group">
                    <h5>스킬 가챠</h5>
                    <div className="gacha-rates-grid">
                      {Object.entries(sg.rates).map(([key, val]) => (
                        <label key={key} className="gacha-rate-item">
                          <span className="rate-label">{SKILL_RARITY_LABEL[key] || key}</span>
                          <input type="number" step="0.005" min="0" max="1" value={val}
                            onChange={e => setSkillRate(key, +e.target.value)} />
                          <span className="rate-pct">{(val * 100).toFixed(1)}%</span>
                        </label>
                      ))}
                    </div>
                    <div className={'rate-total ' + (Math.abs(skillSum - 1) < 0.001 ? 'ok' : 'warn')}>
                      합계: {(skillSum * 100).toFixed(1)}%
                      {Math.abs(skillSum - 1) < 0.001 ? ' ✓' : ' (100%가 아닙니다!)'}
                    </div>
                    <div className="gacha-params-grid">
                      <label>뽑기 비용<input type="number" value={sg.pullCost} onChange={e => setSGP('pullCost', +e.target.value)} /></label>
                      <label>10연 횟수<input type="number" value={sg.multiPullCount} onChange={e => setSGP('multiPullCount', +e.target.value)} /></label>
                    </div>
                  </div>

                  <div className="form-actions">
                    <button className="btn-save" onClick={async () => {
                      try {
                        await req('/gacha-config', { method: 'PUT', body: gachaConfig });
                        showMsg('가챠 설정 저장 완료');
                      } catch (e) { showMsg('저장 실패: ' + e.message); }
                    }}>설정 저장</button>
                  </div>
                </div>
              );
            })()}
          </div>

          <div className="list-header">
            <span>가챠 배너 ({banners.length})</span>
            <button className="btn-add" onClick={() => setEditingBanner('new')}>+ 추가</button>
          </div>

          {editingBanner && (
            <BannerForm
              initial={editingBanner === 'new' ? null : { ...editingBanner, _isEdit: true }}
              onSave={saveBanner}
              onCancel={() => setEditingBanner(null)}
            />
          )}

          <div className="banner-list">
            {banners.map(b => (
              <div key={b.id} className={'banner-card' + (b.active ? ' active' : ' inactive')}>
                <div className="banner-card-img">
                  {b.image ? <img src={b.image} alt={b.name} /> : <span className="no-banner-img">이미지 없음</span>}
                </div>
                <div className="banner-card-info">
                  <div className="banner-card-top">
                    <span className="banner-name">{b.name}</span>
                    <span className={'banner-type-badge ' + b.type}>{b.type === 'permanent' ? '상시' : '한정'}</span>
                    <span className={'banner-status ' + (b.active ? 'on' : 'off')}>{b.active ? '활성' : '비활성'}</span>
                  </div>
                  {b.description && <p className="banner-desc">{b.description}</p>}
                  {b.type === 'limited' && (
                    <p className="banner-period">
                      {b.startDate || '시작일 미정'} ~ {b.endDate || '종료일 미정'}
                    </p>
                  )}
                  {b.featuredCharIds && b.featuredCharIds.length > 0 && (
                    <p className="banner-featured">
                      픽업: {b.featuredCharIds.map(id => characters.find(c => c.id === id)?.name || `#${id}`).join(', ')}
                      {b.featuredRateUp ? ` (${(b.featuredRateUp * 100)}%)` : ''}
                    </p>
                  )}
                  <div className="banner-actions">
                    <button className="btn-sm" onClick={() => toggleBannerActive(b)}>
                      {b.active ? '비활성화' : '활성화'}
                    </button>
                    <button className="btn-sm" onClick={() => setEditingBanner(b)}>수정</button>
                    <label className="btn-sm btn-upload-label">
                      이미지
                      <input type="file" accept="image/*" hidden
                        onChange={e => e.target.files[0] && uploadBannerImage(b.id, e.target.files[0])} />
                    </label>
                    {b.type !== 'permanent' && (
                      <button className="btn-sm btn-remove" onClick={() => deleteBanner(b.id)}>삭제</button>
                    )}
                  </div>
                </div>
              </div>
            ))}
          </div>

          <div className="list-header" style={{ marginTop: 32 }}>
            <span>스킬 배너 ({skillBanners.length})</span>
            <button className="btn-add" onClick={() => setEditingSkillBanner('new')}>+ 추가</button>
          </div>

          {editingSkillBanner && (
            <SkillBannerForm
              initial={editingSkillBanner === 'new' ? null : { ...editingSkillBanner, _isEdit: true }}
              onSave={saveSkillBanner}
              onCancel={() => setEditingSkillBanner(null)}
            />
          )}

          <div className="banner-list">
            {skillBanners.map(b => (
              <div key={b.id} className={'banner-card' + (b.active ? ' active' : ' inactive')}>
                <div className="banner-card-img">
                  {b.image ? <img src={b.image} alt={b.name} /> : <span className="no-banner-img">이미지 없음</span>}
                </div>
                <div className="banner-card-info">
                  <div className="banner-card-top">
                    <span className="banner-name">{b.name}</span>
                    <span className={'banner-type-badge ' + b.type}>{b.type === 'permanent' ? '상시' : '한정'}</span>
                    <span className={'banner-status ' + (b.active ? 'on' : 'off')}>{b.active ? '활성' : '비활성'}</span>
                  </div>
                  {b.description && <p className="banner-desc">{b.description}</p>}
                  {b.type === 'limited' && (
                    <p className="banner-period">
                      {b.startDate || '시작일 미정'} ~ {b.endDate || '종료일 미정'}
                    </p>
                  )}
                  {b.featuredSkillIds && b.featuredSkillIds.length > 0 && (
                    <p className="banner-featured">
                      픽업: {b.featuredSkillIds.map(id => skills.find(s => s.id === id)?.name || `#${id}`).join(', ')}
                      {b.featuredRateUp ? ` (${(b.featuredRateUp * 100)}%)` : ''}
                    </p>
                  )}
                  {b.pullCost != null && (
                    <p className="banner-featured">비용: {b.pullCost}</p>
                  )}
                  <div className="banner-actions">
                    <button className="btn-sm" onClick={() => toggleSkillBannerActive(b)}>
                      {b.active ? '비활성화' : '활성화'}
                    </button>
                    <button className="btn-sm" onClick={() => setEditingSkillBanner(b)}>수정</button>
                    <label className="btn-sm btn-upload-label">
                      이미지
                      <input type="file" accept="image/*" hidden
                        onChange={e => e.target.files[0] && uploadSkillBannerImage(b.id, e.target.files[0])} />
                    </label>
                    {b.type !== 'permanent' && (
                      <button className="btn-sm btn-remove" onClick={() => deleteSkillBanner(b.id)}>삭제</button>
                    )}
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {tab === 'items' && (
        <div className="admin-items-tab">
          <div className="list-header">
            <span>아이템 ({itemList.length})</span>
            <button className="btn-add" onClick={() => setEditingItem('new')}>+ 추가</button>
          </div>

          {editingItem && (
            <ItemForm
              initial={editingItem === 'new' ? null : { ...editingItem, _isEdit: true }}
              onSave={saveItem}
              onCancel={() => setEditingItem(null)}
            />
          )}

          <div className="item-grid-list">
            {ITEM_CATEGORIES.map(cat => {
              const catItems = itemList.filter(i => i.category === cat.value);
              if (catItems.length === 0) return null;
              return (
                <div key={cat.value} className="item-category-section">
                  <h4 className="item-category-title">{cat.label} ({catItems.length})</h4>
                  <div className="item-cards">
                    {catItems.map(item => (
                      <div key={item.id} className="item-card">
                        <div className="item-card-img">
                          {item.image
                            ? <img src={item.image} alt={item.name} onError={e => { e.target.style.display = 'none'; e.target.nextSibling.style.display = 'flex'; }} />
                            : null}
                          <span className="item-card-icon" style={item.image ? { display: 'none' } : {}}
                            dangerouslySetInnerHTML={{ __html: item.icon || '?' }} />
                        </div>
                        <div className="item-card-info">
                          <span className="item-card-name" style={getRarityStyle(item.rarity)}>{item.name}</span>
                          <span className="item-card-meta">
                            <span className="rarity-badge" style={getRarityBgStyle(item.rarity)}>{item.rarity}</span>
                            <span className="item-sell-price" dangerouslySetInnerHTML={{ __html: `${currencyImg('bit')}${item.sellPrice}` }} />
                          </span>
                          <span className="item-card-desc">{item.description}</span>
                        </div>
                        <div className="item-card-actions">
                          <label className="btn-sm btn-upload-label">
                            &#128247;
                            <input type="file" accept="image/*" hidden
                              onChange={e => e.target.files[0] && uploadItemImage(item.id, e.target.files[0])} />
                          </label>
                          <button className="btn-sm" onClick={() => setEditingItem(item)}>&#9998;</button>
                          <button className="btn-sm btn-remove" onClick={() => deleteItem(item.id)}>&#10005;</button>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {tab === 'monsters' && (() => {
        let filtered = monsters;
        if (monsterFilter.search) filtered = filtered.filter(m => m.name.includes(monsterFilter.search) || m.id.includes(monsterFilter.search));
        if (monsterFilter.element) filtered = filtered.filter(m => m.element === monsterFilter.element);
        if (monsterFilter.boss === '1') filtered = filtered.filter(m => m.is_boss);
        if (monsterFilter.boss === '0') filtered = filtered.filter(m => !m.is_boss);

        const monSkills = selectedMonster?.skills || [];

        return (
          <div className="admin-layout">
            {/* 좌측: 몬스터 목록 */}
            <div className="admin-list">
              <div className="list-header">
                <span>몬스터 ({filtered.length}/{monsters.length})</span>
                <button className="btn-add" onClick={() => { setEditingMonster('new'); setSelectedMonster(null); }}>+ 추가</button>
              </div>
              <div className="admin-filter-bar">
                <input className="admin-filter-search" placeholder="이름/ID 검색" value={monsterFilter.search}
                  onChange={e => setMonsterFilter(f => ({ ...f, search: e.target.value }))} />
                <select value={monsterFilter.element} onChange={e => setMonsterFilter(f => ({ ...f, element: e.target.value }))}>
                  <option value="">속성</option>
                  {ELEMENTS.map(el => <option key={el} value={el}>{ELEM_LABEL[el]}</option>)}
                </select>
                <select value={monsterFilter.boss} onChange={e => setMonsterFilter(f => ({ ...f, boss: e.target.value }))}>
                  <option value="">전체</option>
                  <option value="1">보스</option>
                  <option value="0">일반</option>
                </select>
                {(monsterFilter.search || monsterFilter.element || monsterFilter.boss) && (
                  <button className="admin-filter-clear" onClick={() => setMonsterFilter({ search: '', element: '', boss: '' })}>&#10005;</button>
                )}
              </div>
              {filtered.map(m => (
                <div key={m.id}
                  className={'list-item' + (selectedMonster?.id === m.id ? ' selected' : '')}
                  onClick={() => selectMonster(m)}>
                  <div className="item-thumb">
                    {m.image_sd ? <img src={m.image_sd} alt="" /> : <span className="no-img">?</span>}
                  </div>
                  <div className="item-info">
                    <span className="item-name">
                      <span className="char-id-badge">{m.id}</span>
                      {m.name}
                      {m.is_boss && <span className="boss-badge">BOSS</span>}
                    </span>
                    <span className="item-meta">
                      <span className="elem-badge" style={{ background: ELEM_COLORS[m.element] }}>{ELEM_LABEL[m.element]}</span>
                      <span className="origin-badge" style={{ background: ORIGIN_COLORS[m.origin] }}>{ORIGIN_LABEL[m.origin] || '?'}</span>
                      <span className="notes-badge">N:{m.turn_notes}</span>
                      <span style={{ fontSize: 11, color: '#777' }}>스킬:{(m.skills||[]).length}</span>
                    </span>
                  </div>
                </div>
              ))}
            </div>

            {/* 우측: 상세/편집 */}
            <div className="admin-detail">
              {editingMonster ? (
                <MonsterForm
                  initial={editingMonster === 'new' ? null : { ...editingMonster, _isEdit: true }}
                  onSave={saveMonster}
                  onCancel={() => setEditingMonster(null)}
                />
              ) : selectedMonster ? (
                <div className="char-detail">
                  <div className="detail-top">
                    <div className="detail-image">
                      {selectedMonster.image_sd
                        ? <img src={selectedMonster.image_sd} alt={selectedMonster.name} />
                        : <div className="placeholder-img">이미지 없음</div>}
                      <label className="upload-btn-sm" style={{ marginTop: 6, display: 'block', textAlign: 'center' }}>
                        SD 이미지 업로드
                        <input type="file" accept="image/*" hidden
                          onChange={e => e.target.files[0] && uploadMonsterImage(selectedMonster.id, e.target.files[0])} />
                      </label>
                    </div>
                    <div className="detail-info">
                      <h3>
                        {selectedMonster.name}
                        {selectedMonster.is_boss && <span className="boss-badge" style={{ marginLeft: 8 }}>BOSS</span>}
                      </h3>
                      <div className="stat-grid">
                        <span>HP: {selectedMonster.hp}</span>
                        <span>ATK: {selectedMonster.atk}</span>
                        <span>DEF: {selectedMonster.def}</span>
                        <span>SPD: {selectedMonster.spd}</span>
                        <span>턴노트: {selectedMonster.turn_notes}</span>
                        <span className="elem-badge" style={{ background: ELEM_COLORS[selectedMonster.element] }}>
                          {ELEM_LABEL[selectedMonster.element]}
                        </span>
                        <span className="origin-badge" style={{ background: ORIGIN_COLORS[selectedMonster.origin] }}>
                          {ORIGIN_LABEL[selectedMonster.origin] || '?'}
                        </span>
                      </div>
                      <div className="detail-actions">
                        <button className="btn-edit" onClick={() => setEditingMonster(selectedMonster)}>수정</button>
                        <button className="btn-delete" onClick={() => deleteMonster(selectedMonster.id)}>삭제</button>
                      </div>
                    </div>
                  </div>

                  {/* 몬스터 태그 */}
                  <div className="char-tags-section">
                    <h4>태그</h4>
                    <div className="tag-chips">
                      {monTags.map(tag => (
                        <span key={tag.id} className="tag-chip">
                          {tag.label}
                          <button className="tag-remove" onClick={async () => {
                            await req('/monsters/' + selectedMonster.id + '/tags/' + tag.id, { method: 'DELETE' });
                            setMonTags(monTags.filter(t => t.id !== tag.id));
                            loadTagDefs();
                          }}>&#10005;</button>
                        </span>
                      ))}
                      {monTags.length === 0 && <span style={{ color: '#666', fontSize: 12 }}>태그 없음</span>}
                    </div>
                    {(() => {
                      const available = tagDefs.filter(td => !monTags.find(mt => mt.id === td.id));
                      return available.length > 0 && (
                        <div className="tag-add-row">
                          {available.map(td => (
                            <button key={td.id} className="btn-sm tag-add-btn" onClick={async () => {
                              await req('/monsters/' + selectedMonster.id + '/tags', { method: 'POST', body: { tagId: td.id } });
                              setMonTags([...monTags, { id: td.id, label: td.label }]);
                              loadTagDefs();
                            }}>+ {td.label}</button>
                          ))}
                        </div>
                      );
                    })()}
                  </div>

                  {/* 스킬 관리 */}
                  <div className="char-skills-section">
                    <h4>보유 스킬 ({monSkills.length})</h4>
                    <div className="skill-list">
                      {monSkills.map(s => (
                        <div key={s.id} className="skill-item">
                          <div className="skill-info">
                            <span className="char-id-badge">#{s.id}</span>
                            <span className={'skill-type st-' + s.type}>{s.type}</span>
                            <span className="skill-name">{s.name}</span>
                            <span className="skill-cost">코스트:{s.cost}</span>
                            {(s.type === 'attack' || s.type === 'ultimate') && <span className="skill-power">위력:{s.power}</span>}
                          </div>
                          <div className="skill-actions">
                            <button className="btn-remove" onClick={() => removeSkillFromMonster(s.id)}>제거</button>
                          </div>
                        </div>
                      ))}
                      {monSkills.length === 0 && <p style={{ color: '#666', fontSize: 13 }}>등록된 스킬이 없습니다.</p>}
                    </div>

                    <h4>스킬 추가</h4>
                    <div className="admin-filter-bar pool-filter-bar">
                      <input className="admin-filter-search" placeholder="이름 검색" value={monSkillFilter.search}
                        onChange={e => setMonSkillFilter(f => ({ ...f, search: e.target.value }))} />
                      <select value={monSkillFilter.type} onChange={e => setMonSkillFilter(f => ({ ...f, type: e.target.value }))}>
                        <option value="">타입</option>
                        {SKILL_TYPES.map(t => <option key={t} value={t}>{t}</option>)}
                      </select>
                      <select value={monSkillFilter.element} onChange={e => setMonSkillFilter(f => ({ ...f, element: e.target.value }))}>
                        <option value="">속성</option>
                        {ELEMENTS.map(el => <option key={el} value={el}>{ELEM_LABEL[el]}</option>)}
                      </select>
                      {(monSkillFilter.search || monSkillFilter.type || monSkillFilter.element) && (
                        <button className="admin-filter-clear" onClick={() => setMonSkillFilter({ search: '', type: '', element: '' })}>&#10005;</button>
                      )}
                    </div>
                    <div className="skill-pool">
                      {skills.filter(s => {
                        if (monSkills.find(ms => ms.id === s.id)) return false;
                        if (monSkillFilter.search && !s.name.includes(monSkillFilter.search)) return false;
                        if (monSkillFilter.type && s.type !== monSkillFilter.type) return false;
                        if (monSkillFilter.element && s.element !== monSkillFilter.element) return false;
                        return true;
                      }).map(s => (
                        <button key={s.id} className="pool-skill" onClick={() => addSkillToMonster(s)}>
                          <span className={'skill-type st-' + s.type}>{s.type}</span>
                          {s.name} (코스트:{s.cost})
                        </button>
                      ))}
                    </div>
                  </div>

                  {/* 드랍 정보 */}
                  {(selectedMonster.drops || []).length > 0 && (
                    <div className="char-skills-section">
                      <h4>드랍 ({selectedMonster.drops.length})</h4>
                      <div className="monster-drops-list">
                        {selectedMonster.drops.map((d, i) => (
                          <span key={i} className="monster-drop-item">{d.itemId} x{d.min || 1}~{d.max || 1} ({Math.round((d.chance || 1) * 100)}%)</span>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              ) : (
                <div className="empty-detail">왼쪽에서 몬스터를 선택하세요</div>
              )}
            </div>
          </div>
        );
      })()}

      {tab === 'stages' && (() => {
        const TYPE_LABELS = { story: '스토리', farming: '파밍', event: '이벤트' };
        let filtered = stages;
        if (stageFilter.search) filtered = filtered.filter(s => s.name.includes(stageFilter.search));
        if (stageFilter.type) filtered = filtered.filter(s => (s.type || 'story') === stageFilter.type);

        const DAYS = [
          { value: 0, label: '일' }, { value: 1, label: '월' }, { value: 2, label: '화' },
          { value: 3, label: '수' }, { value: 4, label: '목' }, { value: 5, label: '금' }, { value: 6, label: '토' },
        ];

        const StageForm = ({ initial, onSave, onCancel }) => {
          const [f, setF] = useState(initial ? { ...initial, _isEdit: true } : {
            chapter: 1, stage_number: 1, name: '', difficulty: 'normal', stamina_cost: 6,
            recommended_level: 1, enemy_data: [], rewards: { gold: 100, exp: 50, first_clear_diamond: 0 }, type: 'story',
            open_days: null, always_open: false, dungeon_group: '', description: '', icon: '', unlock_condition: null,
          });
          const updateField = (k, v) => setF(prev => ({ ...prev, [k]: v }));
          const addEnemy = () => updateField('enemy_data', [...(f.enemy_data || []), { monsterId: '', level_scale: 1.0, name: '' }]);
          const removeEnemy = (idx) => updateField('enemy_data', f.enemy_data.filter((_, i) => i !== idx));
          const updateEnemy = (idx, k, v) => {
            const arr = [...f.enemy_data];
            arr[idx] = { ...arr[idx], [k]: v };
            updateField('enemy_data', arr);
          };
          const isStory = (f.type || 'story') === 'story';
          const openDays = f.open_days || [];
          const toggleDay = (day) => {
            const next = openDays.includes(day) ? openDays.filter(d => d !== day) : [...openDays, day].sort();
            updateField('open_days', next.length > 0 ? next : null);
          };

          return (
            <div className="admin-form">
              <h3>{f._isEdit ? '스테이지 수정' : '스테이지 생성'}</h3>
              <div className="form-grid">
                <label>타입
                  <select value={f.type || 'story'} onChange={e => updateField('type', e.target.value)}>
                    <option value="story">스토리</option>
                    <option value="farming">파밍</option>
                    <option value="event">이벤트</option>
                  </select>
                </label>
                <label>이름 <input value={f.name} onChange={e => updateField('name', e.target.value)} /></label>
              </div>

              {isStory && (
                <div className="form-grid">
                  <label>챕터 <input type="number" value={f.chapter} onChange={e => updateField('chapter', +e.target.value)} /></label>
                  <label>스테이지 번호 <input type="number" value={f.stage_number} onChange={e => updateField('stage_number', +e.target.value)} /></label>
                </div>
              )}

              {!isStory && (
                <>
                  <div className="form-grid">
                    <label>던전 그룹
                      <input value={f.dungeon_group || ''} onChange={e => updateField('dungeon_group', e.target.value)} placeholder="같은 그룹명 = 같은 던전 묶음" />
                    </label>
                    <label>아이콘 (HTML)
                      <input value={f.icon || ''} onChange={e => updateField('icon', e.target.value)} placeholder="&#128218;" />
                    </label>
                  </div>
                  <label className="form-wide">설명
                    <input value={f.description || ''} onChange={e => updateField('description', e.target.value)} />
                  </label>
                  <div className="stage-open-days">
                    <label className="form-check-label">
                      <input type="checkbox" checked={!!f.always_open} onChange={e => updateField('always_open', e.target.checked)} />
                      상시개방
                    </label>
                    {!f.always_open && (
                      <div className="stage-day-checks">
                        <span style={{ fontSize: 12, color: '#888', marginRight: 4 }}>개방 요일:</span>
                        {DAYS.map(d => (
                          <label key={d.value} className={`stage-day-chip ${openDays.includes(d.value) ? 'active' : ''}`}>
                            <input type="checkbox" hidden checked={openDays.includes(d.value)} onChange={() => toggleDay(d.value)} />
                            {d.label}
                          </label>
                        ))}
                        {openDays.length === 0 && <span style={{ fontSize: 11, color: '#666' }}>(미설정 = 항상)</span>}
                      </div>
                    )}
                  </div>
                </>
              )}

              <div className="form-grid">
                <label>난이도
                  <select value={f.difficulty} onChange={e => updateField('difficulty', e.target.value)}>
                    <option value="normal">Normal</option>
                    <option value="hard">Hard</option>
                    <option value="hell">Hell</option>
                  </select>
                </label>
                <label>스태미나 <input type="number" value={f.stamina_cost} onChange={e => updateField('stamina_cost', +e.target.value)} /></label>
                <label>권장 Lv <input type="number" value={f.recommended_level} onChange={e => updateField('recommended_level', +e.target.value)} /></label>
              </div>

              <h4 style={{ margin: '12px 0 4px' }}>보상</h4>
              <div className="form-grid">
                <label>골드 <input type="number" value={f.rewards?.gold || 0} onChange={e => updateField('rewards', { ...f.rewards, gold: +e.target.value })} /></label>
                <label>EXP <input type="number" value={f.rewards?.exp || 0} onChange={e => updateField('rewards', { ...f.rewards, exp: +e.target.value })} /></label>
                {isStory && <label>첫클리어 프리즘 <input type="number" value={f.rewards?.first_clear_diamond || 0} onChange={e => updateField('rewards', { ...f.rewards, first_clear_diamond: +e.target.value })} /></label>}
              </div>

              <h4 style={{ margin: '12px 0 4px' }}>적 배치 ({(f.enemy_data || []).length})</h4>
              {(f.enemy_data || []).map((en, idx) => (
                <div key={idx} style={{ display: 'flex', gap: 6, alignItems: 'center', marginBottom: 4 }}>
                  <select value={en.monsterId || ''} onChange={e => updateEnemy(idx, 'monsterId', e.target.value)}
                    style={{ flex: 2 }}>
                    <option value="">-- 몬스터 선택 --</option>
                    {monsters.map(m => <option key={m.id} value={m.id}>{m.name} ({m.id})</option>)}
                  </select>
                  <input type="number" step="0.1" min="0.1" value={en.level_scale || 1} onChange={e => updateEnemy(idx, 'level_scale', +e.target.value)}
                    style={{ flex: 0.5 }} title="레벨 스케일" />
                  <input placeholder="이름 덮어쓰기" value={en.name_override || en.name || ''} onChange={e => updateEnemy(idx, 'name_override', e.target.value)}
                    style={{ flex: 1.5 }} />
                  <button className="btn-del-sm" onClick={() => removeEnemy(idx)} dangerouslySetInnerHTML={{ __html: '&#10005;' }} />
                </div>
              ))}
              <button className="btn-add-sm" onClick={addEnemy}>+ 적 추가</button>

              <div className="form-actions">
                <button className="btn-save" onClick={() => onSave(f)}>저장</button>
                <button className="btn-cancel" onClick={onCancel}>취소</button>
              </div>
            </div>
          );
        };

        return (
          <div className="admin-layout">
            <div className="admin-list">
              <div className="list-header">
                <span>던전 ({filtered.length}/{stages.length})</span>
                <button className="btn-add" onClick={() => { setEditingStage('new'); setSelectedStage(null); }}>+ 추가</button>
              </div>
              <div className="admin-filter-bar">
                <input className="admin-filter-search" placeholder="이름 검색" value={stageFilter.search}
                  onChange={e => setStageFilter(f => ({ ...f, search: e.target.value }))} />
                <select value={stageFilter.type} onChange={e => setStageFilter(f => ({ ...f, type: e.target.value }))}>
                  <option value="">전체 타입</option>
                  <option value="story">스토리</option>
                  <option value="farming">파밍</option>
                  <option value="event">이벤트</option>
                </select>
              </div>
              {filtered.map(s => {
                const isStory = (s.type || 'story') === 'story';
                return (
                  <div key={s.id}
                    className={'list-item' + (selectedStage?.id === s.id ? ' selected' : '')}
                    onClick={() => { setSelectedStage(s); setEditingStage(null); }}>
                    <div className="item-info">
                      <span className="item-name">
                        <span className="char-id-badge">{s.id}</span>
                        <span className="stage-type-badge" style={{ background: s.type === 'farming' ? '#ffa726' : s.type === 'event' ? '#ef5350' : '#4fc3f7', color: '#000', fontSize: 10, padding: '1px 5px', borderRadius: 4, marginRight: 4 }}>
                          {TYPE_LABELS[s.type || 'story']}
                        </span>
                        {s.name}
                      </span>
                      <span className="item-meta">
                        {isStory ? `Ch.${s.chapter}-${s.stage_number} | ` : (s.dungeon_group ? `[${s.dungeon_group}] | ` : '')}
                        {s.difficulty} | Lv.{s.recommended_level} | <span dangerouslySetInnerHTML={{ __html: '&#9889;' }} />{s.stamina_cost} | 적 {s.enemy_data?.length || 0}
                        {s.always_open ? ' | 상시' : (s.open_days?.length > 0 ? ` | ${s.open_days.map(d => ['일','월','화','수','목','금','토'][d]).join('')}` : '')}
                      </span>
                    </div>
                  </div>
                );
              })}
            </div>

            <div className="admin-detail">
              {editingStage ? (
                <StageForm
                  initial={editingStage === 'new' ? null : { ...editingStage, _isEdit: true }}
                  onSave={saveStage}
                  onCancel={() => setEditingStage(null)}
                />
              ) : selectedStage ? (() => {
                const ss = selectedStage;
                const isStory = (ss.type || 'story') === 'story';
                const dayNames = ['일','월','화','수','목','금','토'];
                return (
                <div className="char-detail">
                  <div className="detail-info" style={{ width: '100%' }}>
                    <h3>{ss.name}
                      <span style={{ fontSize: 12, color: '#888', marginLeft: 8 }}>
                        ({TYPE_LABELS[ss.type || 'story']})
                        {isStory ? ` Ch.${ss.chapter}-${ss.stage_number}` : (ss.dungeon_group ? ` [${ss.dungeon_group}]` : '')}
                      </span>
                    </h3>
                    {ss.description && <p style={{ fontSize: 12, color: '#999', marginBottom: 8 }}>{ss.description}</p>}
                    <p style={{ fontSize: 13, color: '#aaa' }}>
                      난이도: {ss.difficulty} | 권장 Lv.{ss.recommended_level} | 스태미나: {ss.stamina_cost}
                    </p>
                    {!isStory && (
                      <p style={{ fontSize: 13, color: '#aaa' }}>
                        개방: {ss.always_open ? '상시개방' : (ss.open_days?.length > 0 ? ss.open_days.map(d => dayNames[d]).join(', ') : '항상')}
                      </p>
                    )}
                    <h4 style={{ margin: '12px 0 6px' }}>보상</h4>
                    <p style={{ fontSize: 13 }}>
                      골드: {ss.rewards?.gold || 0} | EXP: {ss.rewards?.exp || 0}
                      {isStory ? ` | 첫클리어: ${ss.rewards?.first_clear_diamond || 0} 프리즘` : ''}
                    </p>
                    <h4 style={{ margin: '12px 0 6px' }}>적 배치 ({ss.enemy_data?.length || 0})</h4>
                    <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
                      {(ss.enemy_data || []).map((en, idx) => {
                        const mon = monsters.find(m => m.id === en.monsterId);
                        return (
                          <div key={idx} style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '4px 8px', background: 'rgba(255,255,255,0.04)', borderRadius: 6 }}>
                            <span style={{ fontWeight: 700, minWidth: 20 }}>#{idx + 1}</span>
                            <span>{en.name_override || en.name || mon?.name || en.monsterId || '?'}</span>
                            {en.monsterId && <span style={{ fontSize: 11, color: '#888' }}>({en.monsterId})</span>}
                            <span style={{ fontSize: 11, color: '#aaa' }}>x{en.level_scale || 1.0}</span>
                            {mon && <span className="elem-badge" style={{ background: ELEM_COLORS[mon.element], fontSize: 10 }}>{ELEM_LABEL[mon.element]}</span>}
                            {en.isBoss && <span className="boss-badge">BOSS</span>}
                          </div>
                        );
                      })}
                    </div>
                    <div className="detail-actions">
                      <button className="btn-edit" onClick={() => setEditingStage(ss)}>편집</button>
                      <button className="btn-delete" onClick={() => deleteStage(ss.id)}>삭제</button>
                    </div>
                  </div>
                </div>);
              })() : (
                <div className="detail-placeholder">스테이지를 선택하세요</div>
              )}
            </div>
          </div>
        );
      })()}

      {tab === 'story' && (() => {
        const CATEGORY_LABELS = { main: '메인', character: '캐릭터', event: '이벤트' };
        const NODE_TYPE_LABELS = { story: '스토리', battle: '전투' };

        const jsonValid = (s) => { if (!s) return true; try { JSON.parse(s); return true; } catch { return false; } };
        const jsonStyle = (s) => s && !jsonValid(s) ? { borderColor: '#f87171' } : s && jsonValid(s) ? { borderColor: '#4ade80' } : {};

        if (editingStoryNode) {
          const isEdit = editingStoryNode._isEdit;
          const [snForm, setSnForm] = [editingStoryNode, setEditingStoryNode];
          return (
            <div className="admin-form">
              <h3>{isEdit ? '스토리 노드 편집' : '새 스토리 노드'}</h3>
              <div className="form-row">
                <label>카테고리</label>
                <select value={snForm.category || 'main'} onChange={e => setSnForm({ ...snForm, category: e.target.value })}>
                  <option value="main">메인 스토리</option>
                  <option value="character">캐릭터 스토리</option>
                  <option value="event">이벤트 스토리</option>
                </select>
              </div>
              <div className="form-row">
                <label>챕터</label>
                <input type="number" value={snForm.chapter ?? 1} onChange={e => setSnForm({ ...snForm, chapter: Number(e.target.value) })} />
              </div>
              <div className="form-row">
                <label>노드 번호</label>
                <input type="number" value={snForm.node_number ?? 1} onChange={e => setSnForm({ ...snForm, node_number: Number(e.target.value) })} />
              </div>
              <div className="form-row">
                <label>제목</label>
                <input value={snForm.title || ''} onChange={e => setSnForm({ ...snForm, title: e.target.value })} placeholder="노드 제목" />
              </div>
              <div className="form-row">
                <label>노드 타입</label>
                <select value={snForm.node_type || 'story'} onChange={e => setSnForm({ ...snForm, node_type: e.target.value })}>
                  <option value="story">스토리 전용</option>
                  <option value="battle">스토리 + 전투</option>
                </select>
              </div>
              {snForm.node_type === 'battle' && (
                <>
                  <div className="form-row">
                    <label>스태미나</label>
                    <input type="number" value={snForm.stamina_cost ?? 0} onChange={e => setSnForm({ ...snForm, stamina_cost: Number(e.target.value) })} />
                  </div>
                  <div className="form-row">
                    <label>권장 레벨</label>
                    <input type="number" value={snForm.recommended_level ?? 1} onChange={e => setSnForm({ ...snForm, recommended_level: Number(e.target.value) })} />
                  </div>
                  <div className="form-row">
                    <label>난이도</label>
                    <select value={snForm.difficulty || 'normal'} onChange={e => setSnForm({ ...snForm, difficulty: e.target.value })}>
                      <option value="easy">쉬움</option>
                      <option value="normal">보통</option>
                      <option value="hard">어려움</option>
                    </select>
                  </div>
                  <div className="form-row">
                    <label>적 데이터 (JSON)</label>
                    <textarea rows={4} style={jsonStyle(snForm._enemy_data_raw)}
                      value={snForm._enemy_data_raw ?? '[]'}
                      onChange={e => setSnForm({ ...snForm, _enemy_data_raw: e.target.value })} />
                  </div>
                  <div className="form-row">
                    <label>보상 (JSON)</label>
                    <textarea rows={3} style={jsonStyle(snForm._rewards_raw)}
                      value={snForm._rewards_raw ?? '{}'}
                      onChange={e => setSnForm({ ...snForm, _rewards_raw: e.target.value })} />
                  </div>
                </>
              )}
              {snForm.node_type === 'story' && (
                <div className="form-row">
                  <label>보상 (JSON, 선택)</label>
                  <textarea rows={3} style={jsonStyle(snForm._rewards_raw)}
                    value={snForm._rewards_raw ?? ''}
                    onChange={e => setSnForm({ ...snForm, _rewards_raw: e.target.value })}
                    placeholder='{"first_clear_diamond": 30, "exp": 10}' />
                </div>
              )}
              <div className="form-row">
                <label>스토리 스크립트 (JSON)</label>
                <textarea rows={6} style={jsonStyle(snForm._story_script_raw)}
                  value={snForm._story_script_raw ?? ''}
                  onChange={e => setSnForm({ ...snForm, _story_script_raw: e.target.value })}
                  placeholder='[{"speaker":"유카리","text":"안녕"}]' />
              </div>
              {snForm.category === 'character' && (
                <div className="form-row">
                  <label>캐릭터 ID</label>
                  <input type="number" value={snForm.character_id ?? ''} onChange={e => setSnForm({ ...snForm, character_id: e.target.value ? Number(e.target.value) : null })} />
                </div>
              )}
              {snForm.category === 'event' && (
                <div className="form-row">
                  <label>이벤트 ID</label>
                  <input value={snForm.event_id || ''} onChange={e => setSnForm({ ...snForm, event_id: e.target.value || null })} />
                </div>
              )}
              <div className="form-actions">
                <button className="btn-save" onClick={() => saveStoryNode(snForm)}>저장</button>
                <button className="btn-cancel" onClick={() => setEditingStoryNode(null)}>취소</button>
              </div>
            </div>
          );
        }

        const filtered = storyNodes.filter(n => {
          if (storyFilter.category && n.category !== storyFilter.category) return false;
          if (storyFilter.search && !n.title.includes(storyFilter.search)) return false;
          return true;
        });

        return (
          <div className="admin-split">
            <div className="admin-list">
              <div className="admin-list-header">
                <h3>스토리 노드 ({filtered.length})</h3>
                <button className="btn-add-sm" onClick={() => setEditingStoryNode({
                  category: 'main', chapter: 1, node_number: 1, title: '', node_type: 'story',
                  stamina_cost: 0, recommended_level: 1, difficulty: 'normal',
                  _enemy_data_raw: '[]', _rewards_raw: '{}', _story_script_raw: '',
                })}>+ 추가</button>
              </div>
              <div className="admin-filters" style={{ gap: 6, marginBottom: 8 }}>
                <input placeholder="검색..." value={storyFilter.search} onChange={e => setStoryFilter({ ...storyFilter, search: e.target.value })} style={{ flex: 1 }} />
                <select value={storyFilter.category} onChange={e => setStoryFilter({ ...storyFilter, category: e.target.value })}>
                  <option value="">전체</option>
                  <option value="main">메인</option>
                  <option value="character">캐릭터</option>
                  <option value="event">이벤트</option>
                </select>
              </div>
              {filtered.map(n => (
                <div key={n.id}
                  className={`admin-list-item ${selectedStoryNode?.id === n.id ? 'selected' : ''}`}
                  onClick={() => setSelectedStoryNode(n)}>
                  <span className="admin-list-id">#{n.id}</span>
                  <span style={{ color: n.category === 'main' ? '#a78bfa' : n.category === 'character' ? '#60a5fa' : '#fb923c', fontSize: 11, fontWeight: 600 }}>
                    [{CATEGORY_LABELS[n.category]}]
                  </span>
                  <span style={{ fontSize: 12, color: '#aaa' }}>{n.chapter}-{n.node_number}</span>
                  <span className="admin-list-name">{n.title}</span>
                  <span style={{ fontSize: 10, padding: '1px 6px', borderRadius: 4, background: n.node_type === 'battle' ? 'rgba(251,146,60,0.15)' : 'rgba(167,139,250,0.15)', color: n.node_type === 'battle' ? '#fb923c' : '#a78bfa' }}>
                    {NODE_TYPE_LABELS[n.node_type]}
                  </span>
                </div>
              ))}
            </div>
            <div className="admin-detail">
              {selectedStoryNode ? (() => {
                const sn = selectedStoryNode;
                return (
                  <div className="detail-card">
                    <h3>{sn.chapter}-{sn.node_number} {sn.title}</h3>
                    <div className="detail-meta">
                      <span style={{ color: sn.category === 'main' ? '#a78bfa' : sn.category === 'character' ? '#60a5fa' : '#fb923c' }}>
                        {CATEGORY_LABELS[sn.category]}
                      </span>
                      <span style={{ color: sn.node_type === 'battle' ? '#fb923c' : '#a78bfa' }}>
                        {NODE_TYPE_LABELS[sn.node_type]}
                      </span>
                      {sn.node_type === 'battle' && (
                        <>
                          <span>Lv.{sn.recommended_level}</span>
                          <span>&#9889;{sn.stamina_cost}</span>
                        </>
                      )}
                    </div>
                    {sn.rewards && (
                      <div className="detail-section">
                        <strong>보상:</strong> {JSON.stringify(sn.rewards)}
                      </div>
                    )}
                    {sn.story_script && (
                      <div className="detail-section">
                        <strong>스크립트:</strong> {sn.story_script.length}개 라인
                      </div>
                    )}
                    {sn.enemy_data && sn.enemy_data.length > 0 && (
                      <div className="detail-section">
                        <strong>적:</strong> {sn.enemy_data.length}체
                        <div style={{ marginTop: 4 }}>
                          {sn.enemy_data.map((en, i) => (
                            <div key={i} style={{ fontSize: 12, color: '#ccc' }}>
                              {en.name || en.monsterId || `적 ${i+1}`}
                              {en.monsterId && <span style={{ fontSize: 11, color: '#888' }}> ({en.monsterId})</span>}
                            </div>
                          ))}
                        </div>
                      </div>
                    )}
                    <div className="detail-actions">
                      <button className="btn-edit" onClick={() => setEditingStoryNode({
                        ...sn, _isEdit: true,
                        _enemy_data_raw: sn.enemy_data ? JSON.stringify(sn.enemy_data, null, 2) : '[]',
                        _rewards_raw: sn.rewards ? JSON.stringify(sn.rewards, null, 2) : '{}',
                        _story_script_raw: sn.story_script ? JSON.stringify(sn.story_script, null, 2) : '',
                      })}>편집</button>
                      <button className="btn-delete" onClick={() => deleteStoryNode(sn.id)}>삭제</button>
                    </div>
                  </div>
                );
              })() : (
                <div className="detail-placeholder">스토리 노드를 선택하세요</div>
              )}
            </div>
          </div>
        );
      })()}

      {tab === 'mail' && <MailForm />}

      {tab === 'manage' && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
          <div className="detail-card">
            <h3>게임 데이터 내보내기</h3>
            <p style={{ fontSize: 13, color: '#aaa', margin: '8px 0' }}>
              캐릭터, 스킬, 몬스터, 스테이지, 스토리 노드, 태그, 레이드 데이터를 game_seed.json에 저장합니다.
            </p>
            <button className="btn-save" onClick={async () => {
              try { await req('/export-game-data', { method: 'POST' }); showMsg('게임 데이터 내보내기 완료'); } catch (e) { showMsg(e.message); }
            }}>내보내기</button>
          </div>
          <div className="detail-card" style={{ borderColor: 'rgba(239,68,68,0.3)' }}>
            <h3 style={{ color: '#ef4444' }}>유저 데이터 리셋</h3>
            <p style={{ fontSize: 13, color: '#aaa', margin: '8px 0' }}>
              모든 유저 계정, 인벤토리, 클리어 기록, 우편 등 유저 데이터를 삭제합니다.<br />
              게임 데이터(캐릭터, 스킬, 몬스터, 스테이지 등)는 보존됩니다.<br />
              실행 전 게임 데이터를 자동으로 내보냅니다.
            </p>
            <button className="btn-danger" onClick={async () => {
              if (!confirm('정말로 모든 유저 데이터를 리셋하시겠습니까?\n이 작업은 되돌릴 수 없습니다.')) return;
              try {
                await req('/reset-user-data', { method: 'POST', body: { confirm: 'RESET' } });
                showMsg('유저 데이터 리셋 완료');
              } catch (e) { showMsg(e.message); }
            }}>유저 데이터 리셋</button>
          </div>
          <BalanceCalculator characters={characters} />
        </div>
      )}

    </div>
  );
}
