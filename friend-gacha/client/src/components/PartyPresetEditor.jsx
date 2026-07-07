import React, { useState } from 'react';
import CharacterGrid from './CharacterGrid';
import './PartyPresetEditor.css';

const MAX_PARTY = 3;

export default function PartyPresetEditor({ characters, initialName, initialIds, onSave, onCancel }) {
  const [editName, setEditName] = useState(initialName || '');
  const [editIds, setEditIds] = useState(() => (initialIds || []).slice(0, MAX_PARTY));

  const getChar = (invId) => characters.find(c => c.inventory_id === invId);

  const toggleChar = (c) => {
    const invId = c.inventory_id;
    setEditIds(prev =>
      prev.includes(invId) ? prev.filter(id => id !== invId)
        : prev.length < MAX_PARTY ? [...prev, invId] : prev
    );
  };

  return (
    <div className="preset-editor">
      <div className="preset-editor-header">
        <button className="btn-back" onClick={onCancel}>&larr; &#46027;&#50500;&#44032;&#44592;</button>
        <input className="preset-name-input" value={editName}
          onChange={e => setEditName(e.target.value)} placeholder="파티 이름" maxLength={20} />
        <button className="btn-primary preset-editor-save" onClick={() => onSave(editName, editIds)}>저장</button>
      </div>

      <div className="preset-editor-preview">
        <h3>편성 ({editIds.length}/{MAX_PARTY})</h3>
        <div className="preset-editor-slots">
          {Array.from({ length: MAX_PARTY }, (_, i) => {
            const c = editIds[i] ? getChar(editIds[i]) : null;
            return (
              <div key={i} className={`pe-slot ${c ? 'filled' : ''}`}
                onClick={() => c && setEditIds(prev => prev.filter(id => id !== editIds[i]))}>
                {c ? (
                  <>
                    <div className="pe-slot-img">
                      {c.image_url ? <img src={c.image_url} alt={c.name} /> : c.name?.[0]}
                    </div>
                    <span className="pe-slot-name">{c.name}</span>
                    <span className="pe-slot-lv">Lv.{c.level}</span>
                  </>
                ) : (
                  <span className="pe-slot-empty">+</span>
                )}
              </div>
            );
          })}
        </div>
      </div>

      <CharacterGrid
        characters={characters}
        onSelect={toggleChar}
        selectedIds={editIds}
        title="캐릭터 선택"
      />
    </div>
  );
}
