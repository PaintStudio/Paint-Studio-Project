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
    const charId = c.character_id;
    setEditIds(prev => {
      if (prev.includes(invId)) return prev.filter(id => id !== invId);
      if (prev.length >= MAX_PARTY) return prev;
      const selectedCharIds = prev.map(id => characters.find(ch => ch.inventory_id === id)?.character_id);
      if (selectedCharIds.includes(charId)) return prev;
      return [...prev, invId];
    });
  };

  return (
    <div className="preset-overlay" onClick={onCancel}>
      <div className="preset-modal" onClick={e => e.stopPropagation()}>
        <div className="preset-modal-header">
          <input className="preset-name-input" value={editName}
            onChange={e => setEditName(e.target.value)} placeholder="파티 이름" maxLength={20} />
          <div className="preset-modal-slots">
            {Array.from({ length: MAX_PARTY }, (_, i) => {
              const c = editIds[i] ? getChar(editIds[i]) : null;
              return (
                <div key={i} className={`pe-slot ${c ? 'filled' : ''}`}
                  onClick={() => c && setEditIds(prev => prev.filter(id => id !== editIds[i]))}>
                  {c ? (
                    <div className="pe-slot-img">
                      {c.image_url ? <img src={c.image_url} alt={c.name} /> : c.name?.[0]}
                    </div>
                  ) : (
                    <span className="pe-slot-empty">+</span>
                  )}
                </div>
              );
            })}
          </div>
          <div className="preset-modal-actions">
            <button className="btn-secondary" onClick={onCancel}>취소</button>
            <button className="btn-primary" onClick={() => onSave(editName, editIds)}>저장</button>
          </div>
        </div>
        <CharacterGrid
          characters={characters}
          onSelect={toggleChar}
          selectedIds={editIds}
          title="캐릭터 선택"
        />
      </div>
    </div>
  );
}
