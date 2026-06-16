import React, { useState, useEffect, useCallback } from 'react';
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
  }, []);

  useEffect(() => { if (authed) { loadChars(); loadSkills(); } }, [authed]);

  // ====== 캐릭터 편집 폼 ======
  const CharForm = ({ initial, onSave, onCancel }) => {
    const [form, setForm] = useState(initial || {
      name: '', rarity: 'N', element: 'neutral', origin: 'force', title: '', description: '', quote: '',
      base_hp: 1000, base_atk: 100, base_def: 80, base_spd: 100, turn_notes: 4,
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
    const [form, setForm] = useState(initial || {
      name: '', description: '', type: 'attack', cost: 1, power: 1.0,
      element: 'neutral', target: 'single', defense_mult: 0, cooldown: 0, extra: '{}',
    });
    const set = (k, v) => setForm({ ...form, [k]: v });

    return (
      <div className="admin-form">
        <h3>{initial ? '스킬 수정' : '새 스킬'}</h3>
        <div className="form-grid">
          <label>이름<input value={form.name} onChange={e => set('name', e.target.value)} /></label>
          <label>타입<select value={form.type} onChange={e => set('type', e.target.value)}>
            {SKILL_TYPES.map(t => <option key={t} value={t}>{t}</option>)}
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
        <div className="form-actions">
          <button className="btn-save" onClick={() => onSave(form)}>저장</button>
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
    await req('/characters/' + charId + '/skills', { method: 'POST', body: { skillId, isDefault: false } });
    loadCharDetail(charId);
  };

  const removeSkillFromChar = async (charId, skillId) => {
    await req('/characters/' + charId + '/skills/' + skillId, { method: 'DELETE' });
    loadCharDetail(charId);
  };

  const toggleDefault = async (charId, skillId) => {
    await req('/characters/' + charId + '/skills/' + skillId + '/default', { method: 'PATCH' });
    loadCharDetail(charId);
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
        </div>
        {msg && <span className="admin-msg">{msg}</span>}
      </div>

      {tab === 'characters' && (
        <div className="admin-layout">
          {/* 왼쪽: 캐릭터 목록 */}
          <div className="admin-list">
            <div className="list-header">
              <span>캐릭터 ({characters.length})</span>
              <button className="btn-add" onClick={() => setEditing('new')}>+ 추가</button>
            </div>
            {characters.map(c => (
              <div key={c.id}
                className={'list-item' + (selectedChar?.id === c.id ? ' selected' : '')}
                onClick={() => { loadCharDetail(c.id); setEditing(null); }}>
                <div className="item-thumb">
                  {c.image_url ? <img src={c.image_url} alt="" /> : <span className="no-img">?</span>}
                </div>
                <div className="item-info">
                  <span className="item-name" style={getRarityStyle(c.rarity)}>{c.name}</span>
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

                {/* 스킬 매핑 */}
                <div className="char-skills-section">
                  <h4>보유 스킬</h4>
                  <div className="skill-list">
                    {charSkills.map(s => (
                      <div key={s.id} className="skill-item">
                        <div className="skill-info">
                          <span className={'skill-type st-' + s.type}>{s.type}</span>
                          <span className="skill-name">{s.name}</span>
                          <span className="skill-cost">코스트:{s.cost}</span>
                          {s.type === 'attack' || s.type === 'ultimate' ? <span className="skill-power">위력:{s.power}</span> : null}
                          {s.is_default ? <span className="default-badge">기본</span> : null}
                        </div>
                        <div className="skill-actions">
                          <button onClick={() => toggleDefault(selectedChar.id, s.id)}>
                            {s.is_default ? '기본해제' : '기본설정'}
                          </button>
                          <button className="btn-remove" onClick={() => removeSkillFromChar(selectedChar.id, s.id)}>제거</button>
                        </div>
                      </div>
                    ))}
                  </div>

                  <h4>스킬 추가</h4>
                  <div className="skill-pool">
                    {skills.filter(s => !charSkills.find(cs => cs.id === s.id)).map(s => (
                      <button key={s.id} className="pool-skill" onClick={() => addSkillToChar(selectedChar.id, s.id)}>
                        <span className={'skill-type st-' + s.type}>{s.type}</span>
                        {s.name} (코스트:{s.cost})
                      </button>
                    ))}
                  </div>
                </div>
              </div>
            ) : (
              <div className="empty-detail">왼쪽에서 캐릭터를 선택하세요</div>
            )}
          </div>
        </div>
      )}

      {tab === 'skills' && (
        <div className="admin-skills-tab">
          <div className="list-header">
            <span>스킬 ({skills.length})</span>
            <button className="btn-add" onClick={() => setEditingSkill('new')}>+ 추가</button>
          </div>

          {editingSkill && (
            <SkillForm
              initial={editingSkill === 'new' ? null : editingSkill}
              onSave={saveSkill}
              onCancel={() => setEditingSkill(null)}
            />
          )}

          <div className="skills-table">
            <table>
              <thead>
                <tr>
                  <th>ID</th><th>이름</th><th>타입</th><th>코스트</th><th>위력</th>
                  <th>속성</th><th>타겟</th><th>방어배율</th><th>설명</th><th></th>
                </tr>
              </thead>
              <tbody>
                {skills.map(s => (
                  <tr key={s.id}>
                    <td>{s.id}</td>
                    <td className="skill-name-cell">{s.name}</td>
                    <td><span className={'skill-type st-' + s.type}>{s.type}</span></td>
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
      )}
    </div>
  );
}
