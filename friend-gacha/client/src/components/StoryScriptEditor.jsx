import React, { useState } from 'react';
import './StoryScriptEditor.css';

function getEntryType(entry) {
  if (entry.type === 'battle') return 'battle';
  if (entry.label != null && !entry.text && !entry.speaker) return 'label';
  if (entry.choices?.length > 0) return 'choice';
  if (entry.speaker) return 'dialogue';
  return 'narration';
}

const TYPE_META = {
  dialogue:  { label: '대사',      color: '#60a5fa' },
  narration: { label: '나레이션',  color: '#a78bfa' },
  choice:    { label: '선택지',    color: '#4ade80' },
  battle:    { label: '전투',      color: '#fb923c' },
  label:     { label: '라벨',      color: '#94a3b8' },
};

function JsonField({ initialValue, onCommit, rows = 4, placeholder }) {
  const [text, setText] = useState(() => JSON.stringify(initialValue ?? [], null, 2));
  const valid = (() => { try { JSON.parse(text); return true; } catch { return false; } })();
  return (
    <textarea
      className={`sse-textarea ${valid ? 'sse-valid' : 'sse-invalid'}`}
      rows={rows} value={text}
      onChange={e => setText(e.target.value)}
      onBlur={() => { if (valid) onCommit(JSON.parse(text)); }}
      placeholder={placeholder}
    />
  );
}

export default function StoryScriptEditor({ value, onChange, characters = [] }) {
  const [jsonMode, setJsonMode] = useState(false);
  const [jsonText, setJsonText] = useState('');
  const [editingIdx, setEditingIdx] = useState(null);
  const script = value || [];

  const updateEntry = (idx, updates) => {
    const next = [...script];
    const entry = { ...next[idx] };
    for (const [k, v] of Object.entries(updates)) {
      if (v === undefined) delete entry[k];
      else entry[k] = v;
    }
    next[idx] = entry;
    onChange(next);
  };

  const addEntry = (type) => {
    const defaults = {
      dialogue:  { speaker: '', text: '' },
      narration: { text: '' },
      choice:    { speaker: '', text: '', choices: [{ text: '' }] },
      battle:    { type: 'battle', enemies: [] },
      label:     { label: '' },
    };
    onChange([...script, defaults[type]]);
    setEditingIdx(script.length);
  };

  const insertAfter = (idx) => {
    const next = [...script];
    next.splice(idx + 1, 0, { speaker: '', text: '' });
    onChange(next);
    setEditingIdx(idx + 1);
  };

  const removeEntry = (idx) => {
    onChange(script.filter((_, i) => i !== idx));
    if (editingIdx === idx) setEditingIdx(null);
    else if (editingIdx !== null && editingIdx > idx) setEditingIdx(editingIdx - 1);
  };

  const moveEntry = (idx, dir) => {
    const t = idx + dir;
    if (t < 0 || t >= script.length) return;
    const next = [...script];
    [next[idx], next[t]] = [next[t], next[idx]];
    onChange(next);
    if (editingIdx === idx) setEditingIdx(t);
    else if (editingIdx === t) setEditingIdx(idx);
  };

  const dupEntry = (idx) => {
    const next = [...script];
    next.splice(idx + 1, 0, JSON.parse(JSON.stringify(script[idx])));
    onChange(next);
  };

  const switchToJson = () => {
    setJsonText(JSON.stringify(script, null, 2));
    setJsonMode(true);
    setEditingIdx(null);
  };

  const switchToVisual = () => {
    try {
      const parsed = JSON.parse(jsonText);
      if (!Array.isArray(parsed)) throw new Error('배열이어야 합니다');
      onChange(parsed);
      setJsonMode(false);
    } catch (e) {
      alert('JSON 오류: ' + e.message);
    }
  };

  if (jsonMode) {
    const valid = (() => { try { return Array.isArray(JSON.parse(jsonText)); } catch { return false; } })();
    return (
      <div className="sse">
        <div className="sse-toolbar">
          <button className="sse-btn" onClick={switchToVisual}>&larr; 비주얼 편집</button>
          <span className={`sse-json-status ${valid ? 'valid' : 'invalid'}`}>{valid ? '유효한 JSON' : '잘못된 JSON'}</span>
        </div>
        <textarea className={`sse-json-full ${valid ? 'sse-valid' : 'sse-invalid'}`}
          value={jsonText} onChange={e => setJsonText(e.target.value)} rows={24} />
      </div>
    );
  }

  const charNames = [...new Set(characters.map(c => c.name).filter(Boolean))];

  return (
    <div className="sse">
      <div className="sse-toolbar">
        {Object.entries(TYPE_META).map(([key, meta]) => (
          <button key={key} className="sse-btn sse-btn-add" onClick={() => addEntry(key)}
            style={{ borderColor: meta.color + '55' }}>+ {meta.label}</button>
        ))}
        <span className="sse-count">{script.length}줄</span>
        <button className="sse-btn sse-btn-json" onClick={switchToJson}>JSON</button>
      </div>

      {script.length === 0 && (
        <div className="sse-empty">스크립트가 비어 있습니다</div>
      )}

      <div className="sse-list">
        {script.map((entry, idx) => {
          const type = getEntryType(entry);
          const meta = TYPE_META[type];
          const open = editingIdx === idx;
          return (
            <div key={idx} className={`sse-item ${open ? 'open' : ''}`}>
              <div className="sse-item-head" onClick={() => setEditingIdx(open ? null : idx)}>
                <span className="sse-num">{idx + 1}</span>
                <span className="sse-type-badge" style={{ background: meta.color + '22', color: meta.color }}>
                  {meta.label}
                </span>
                <span className="sse-preview">
                  {type === 'battle' ? `적 ${entry.enemies?.length || 0}체${entry.stageName ? ` — ${entry.stageName}` : ''}` :
                   type === 'label' ? `[${entry.label || ''}]` :
                   `${entry.speaker ? entry.speaker + ': ' : ''}${(entry.text || '').slice(0, 50)}${(entry.text || '').length > 50 ? '…' : ''}`}
                </span>
                {entry.bg && <span className="sse-tag">BG</span>}
                {entry.bgm && <span className="sse-tag">BGM</span>}
                {entry.characters?.length > 0 && <span className="sse-tag">연출</span>}
                <span className="sse-item-actions" onClick={e => e.stopPropagation()}>
                  <button disabled={idx === 0} onClick={() => moveEntry(idx, -1)} title="위로">&#9650;</button>
                  <button disabled={idx === script.length - 1} onClick={() => moveEntry(idx, 1)} title="아래로">&#9660;</button>
                  <button onClick={() => insertAfter(idx)} title="아래에 삽입">&#8627;</button>
                  <button onClick={() => dupEntry(idx)} title="복제">&#10697;</button>
                  <button className="del" onClick={() => removeEntry(idx)} title="삭제">&#10005;</button>
                </span>
              </div>
              {open && (
                <div className="sse-item-body">
                  {type === 'label' ? (
                    <div className="sse-field">
                      <label>라벨 이름</label>
                      <input value={entry.label || ''} onChange={e => updateEntry(idx, { label: e.target.value })} placeholder="점프 대상 라벨" />
                    </div>
                  ) : type === 'battle' ? (
                    <BattleForm entry={entry} idx={idx} updateEntry={updateEntry} />
                  ) : (
                    <DialogueForm entry={entry} idx={idx} type={type} updateEntry={updateEntry} characters={characters} charNames={charNames} />
                  )}
                </div>
              )}
            </div>
          );
        })}
      </div>

      <datalist id="sse-speakers">
        {charNames.map(n => <option key={n} value={n} />)}
      </datalist>
    </div>
  );
}

function BattleForm({ entry, idx, updateEntry }) {
  const [showGuide, setShowGuide] = useState(!!(entry.guide?.length));
  const [showParty, setShowParty] = useState(!!(entry.party?.length));
  return (
    <>
      <div className="sse-field">
        <label>적 데이터 (JSON)</label>
        <JsonField key={`battle-${idx}`} initialValue={entry.enemies} onCommit={v => updateEntry(idx, { enemies: v })} rows={4} />
      </div>
      <div className="sse-field">
        <label>스테이지 이름</label>
        <input value={entry.stageName || ''} onChange={e => updateEntry(idx, { stageName: e.target.value || undefined })} />
      </div>
      <div className="sse-toggles">
        <button className={`sse-toggle ${showParty ? 'on' : ''}`} onClick={() => setShowParty(!showParty)}>인라인 파티</button>
        <button className={`sse-toggle ${showGuide ? 'on' : ''}`} onClick={() => setShowGuide(!showGuide)}>전투 가이드 ({entry.guide?.length || 0})</button>
      </div>
      {showParty && <PartyEditor party={entry.party || []} onChange={v => updateEntry(idx, { party: v.length > 0 ? v : undefined })} />}
      {showGuide && <GuideEditor guide={entry.guide || []} onChange={v => updateEntry(idx, { guide: v.length > 0 ? v : undefined })} />}
    </>
  );
}

function DialogueForm({ entry, idx, type, updateEntry, characters, charNames }) {
  const [showDir, setShowDir] = useState(!!(entry.bg || entry.bgm));
  const [showChars, setShowChars] = useState(!!(entry.characters?.length));

  const updateChar = (ci, updates) => {
    const chars = [...(entry.characters || [])];
    chars[ci] = { ...chars[ci], ...updates };
    updateEntry(idx, { characters: chars });
  };

  const addChar = () => {
    updateEntry(idx, { characters: [...(entry.characters || []), { position: 'left', image: '', name: '' }] });
    setShowChars(true);
  };

  const removeChar = (ci) => {
    const chars = (entry.characters || []).filter((_, i) => i !== ci);
    updateEntry(idx, { characters: chars.length > 0 ? chars : undefined });
  };

  return (
    <>
      {type !== 'narration' && (
        <div className="sse-field">
          <label>화자</label>
          <input list="sse-speakers" value={entry.speaker || ''} onChange={e => updateEntry(idx, { speaker: e.target.value })} placeholder="캐릭터 이름" />
        </div>
      )}
      <div className="sse-field">
        <label>{type === 'narration' ? '텍스트' : '대사'}</label>
        <textarea rows={3} value={entry.text || ''} onChange={e => updateEntry(idx, { text: e.target.value })} />
      </div>

      <div className="sse-toggles">
        <button className={`sse-toggle ${showDir ? 'on' : ''}`} onClick={() => setShowDir(!showDir)}>연출 (BG/BGM)</button>
        <button className={`sse-toggle ${showChars ? 'on' : ''}`} onClick={() => setShowChars(!showChars)}>캐릭터 배치</button>
      </div>

      {showDir && (
        <div className="sse-row">
          <div className="sse-field">
            <label>배경 이미지</label>
            <input value={entry.bg || ''} onChange={e => updateEntry(idx, { bg: e.target.value || undefined })} placeholder="/images/bg/..." />
          </div>
          <div className="sse-field">
            <label>BGM</label>
            <input value={entry.bgm || ''} onChange={e => updateEntry(idx, { bgm: e.target.value || undefined })} placeholder="BGM 키" />
          </div>
        </div>
      )}

      {showChars && (
        <div className="sse-sub-section">
          {(entry.characters || []).map((ch, ci) => (
            <div key={ci} className="sse-char-row">
              <select value={ch.position || 'left'} onChange={e => updateChar(ci, { position: e.target.value })}>
                <option value="left">왼쪽</option>
                <option value="center">중앙</option>
                <option value="right">오른쪽</option>
              </select>
              <input value={ch.name || ''} list="sse-speakers" onChange={e => updateChar(ci, { name: e.target.value })}
                placeholder="이름" className="sse-char-name" />
              <input value={ch.image || ''} onChange={e => updateChar(ci, { image: e.target.value })}
                placeholder="이미지 URL" className="sse-char-img" />
              <label className="sse-char-active">
                <input type="checkbox" checked={ch.active !== false} onChange={e => updateChar(ci, { active: e.target.checked })} />
                활성
              </label>
              <button className="sse-del-sm" onClick={() => removeChar(ci)}>&#10005;</button>
            </div>
          ))}
          <button className="sse-btn-sub-add" onClick={addChar}>+ 캐릭터 추가</button>
        </div>
      )}

      {type === 'choice' && <ChoiceEditor entry={entry} idx={idx} updateEntry={updateEntry} />}
    </>
  );
}

function ChoiceEditor({ entry, idx, updateEntry }) {
  const choices = entry.choices || [];
  const updateChoice = (ci, updates) => {
    const next = [...choices];
    next[ci] = { ...next[ci], ...updates };
    updateEntry(idx, { choices: next });
  };
  return (
    <div className="sse-sub-section">
      <label className="sse-sub-label">선택지</label>
      {choices.map((c, ci) => (
        <div key={ci} className="sse-choice-row">
          <span className="sse-choice-num">{ci + 1}</span>
          <input value={c.text || ''} onChange={e => updateChoice(ci, { text: e.target.value })}
            placeholder="선택지 텍스트" className="sse-choice-text" />
          <input value={c.next ?? ''} onChange={e => {
            const v = e.target.value;
            updateChoice(ci, { next: v === '' ? undefined : isNaN(v) ? v : Number(v) });
          }} placeholder="이동 (라벨/인덱스)" className="sse-choice-next" />
          <button className="sse-del-sm" onClick={() => updateEntry(idx, { choices: choices.filter((_, i) => i !== ci) })}>&#10005;</button>
        </div>
      ))}
      <button className="sse-btn-sub-add" onClick={() => updateEntry(idx, { choices: [...choices, { text: '' }] })}>+ 선택지 추가</button>
    </div>
  );
}

const GUIDE_TRIGGERS = [
  { value: 'player_turn', label: '아군 턴' },
  { value: 'enemy_turn', label: '적 턴' },
  { value: 'defense_react', label: '방어 반응' },
  { value: 'cycle_end', label: '사이클 종료' },
];
const GUIDE_WAITS = [
  { value: '', label: '없음 (자동 진행)' },
  { value: 'skill_use', label: '스킬 사용 대기' },
  { value: 'defense_use', label: '방어 사용 대기' },
  { value: 'turn_end', label: '턴 종료 대기' },
];

function GuideEditor({ guide, onChange }) {
  const updateStep = (si, updates) => {
    const next = [...guide];
    const step = { ...next[si] };
    for (const [k, v] of Object.entries(updates)) {
      if (v === undefined || v === '') delete step[k];
      else step[k] = v;
    }
    next[si] = step;
    onChange(next);
  };
  return (
    <div className="sse-sub-section">
      <label className="sse-sub-label">전투 가이드 ({guide.length})</label>
      {guide.map((step, si) => (
        <div key={si} className="sse-guide-step">
          <div className="sse-guide-head">
            <span className="sse-choice-num">{si + 1}</span>
            <select value={step.trigger || 'player_turn'} onChange={e => updateStep(si, { trigger: e.target.value })}>
              {GUIDE_TRIGGERS.map(t => <option key={t.value} value={t.value}>{t.label}</option>)}
            </select>
            <input value={step.speaker || ''} onChange={e => updateStep(si, { speaker: e.target.value || undefined })}
              list="sse-speakers" placeholder="화자" className="sse-guide-speaker" />
            <button className="sse-del-sm" onClick={() => onChange(guide.filter((_, i) => i !== si))}>&#10005;</button>
          </div>
          <textarea rows={2} value={step.text || ''} onChange={e => updateStep(si, { text: e.target.value })}
            placeholder="가이드 텍스트" className="sse-guide-text" />
          <div className="sse-guide-opts">
            <select value={step.waitFor || ''} onChange={e => updateStep(si, { waitFor: e.target.value || undefined })}>
              {GUIDE_WAITS.map(w => <option key={w.value} value={w.value}>{w.label}</option>)}
            </select>
            {step.waitFor && (
              <input value={step.allowSkills?.join(',') ?? ''}
                onChange={e => {
                  const v = e.target.value.trim();
                  updateStep(si, { allowSkills: v ? v.split(',').map(Number) : undefined });
                }} placeholder="허용 스킬 인덱스 (0,1,...)" className="sse-guide-skills" />
            )}
          </div>
        </div>
      ))}
      <button className="sse-btn-sub-add" onClick={() => onChange([...guide, { trigger: 'player_turn', text: '' }])}>+ 가이드 스텝</button>
    </div>
  );
}

function PartyEditor({ party, onChange }) {
  const updateMember = (pi, updates) => {
    const next = [...party];
    next[pi] = { ...next[pi], ...updates };
    onChange(next);
  };
  return (
    <div className="sse-sub-section">
      <label className="sse-sub-label">인라인 파티 (스크립트에서 직접 지정)</label>
      {party.map((p, pi) => (
        <div key={pi} className="sse-party-row">
          <span className="sse-choice-num">{pi + 1}</span>
          <label className="sse-party-label">캐릭터ID</label>
          <input type="number" value={p.charId ?? ''} onChange={e => updateMember(pi, { charId: +e.target.value })} className="sse-party-field" />
          <label className="sse-party-label">Lv</label>
          <input type="number" value={p.level ?? 1} onChange={e => updateMember(pi, { level: +e.target.value })} className="sse-party-field" />
          <label className="sse-party-label">각성</label>
          <input type="number" value={p.awakening ?? 0} onChange={e => updateMember(pi, { awakening: +e.target.value })} className="sse-party-field-sm" />
          <label className="sse-party-label">승급</label>
          <input type="number" value={p.promotion ?? 0} onChange={e => updateMember(pi, { promotion: +e.target.value })} className="sse-party-field-sm" />
          <button className="sse-del-sm" onClick={() => onChange(party.filter((_, i) => i !== pi))}>&#10005;</button>
        </div>
      ))}
      <button className="sse-btn-sub-add" onClick={() => onChange([...party, { charId: 0, level: 1, awakening: 0, promotion: 0 }])}>+ 파티 멤버</button>
    </div>
  );
}
