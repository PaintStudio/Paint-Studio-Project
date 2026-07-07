import React, { useState, useEffect } from 'react';
import { api } from '../utils/api';
import PartyPresetEditor from '../components/PartyPresetEditor';
import './PartyPage.css';

export default function PartyPage({ addToast }) {
  const [presets, setPresets] = useState([]);
  const [characters, setCharacters] = useState([]);
  const [editingSlot, setEditingSlot] = useState(null);

  useEffect(() => { loadData(); }, []);

  const loadData = async () => {
    try {
      const [p, c] = await Promise.all([api.partyPresets(), api.partyList()]);
      setPresets(p.presets);
      setCharacters(c.characters);
    } catch (err) { addToast(err.message, 'error'); }
  };

  const getCharByInvId = (invId) => characters.find(c => c.inventory_id === invId);

  const handleSave = async (name, ids) => {
    try {
      await api.savePartyPreset(editingSlot, name, ids);
      addToast('편성 저장 완료');
      setEditingSlot(null);
      loadData();
    } catch (err) { addToast(err.message, 'error'); }
  };

  if (editingSlot !== null) {
    const preset = presets.find(p => p.slot === editingSlot);
    return (
      <div className="party-page">
        <PartyPresetEditor
          characters={characters}
          initialName={preset?.name || ''}
          initialIds={preset?.partyIds || []}
          onSave={handleSave}
          onCancel={() => setEditingSlot(null)}
        />
      </div>
    );
  }

  return (
    <div className="party-page">
      <h2 className="party-page-title">&#9876;&#65039; 파티 편성</h2>
      <div className="preset-grid">
        {presets.map(p => {
          const members = p.partyIds.map(id => getCharByInvId(id)).filter(Boolean);
          return (
            <div key={p.slot} className={`preset-card ${members.length > 0 ? 'has-members' : ''}`}
              onClick={() => setEditingSlot(p.slot)}>
              <div className="preset-card-header">
                <span className="preset-slot-num">{p.slot + 1}</span>
                <span className="preset-card-name">{p.name}</span>
              </div>
              <div className="preset-members">
                {members.length > 0 ? members.map(c => (
                  <div key={c.inventory_id} className="preset-member">
                    <div className="pm-avatar">
                      {c.image_url ? <img src={c.image_url} alt={c.name} /> : c.name?.[0]}
                    </div>
                    <span className="pm-name">{c.name}</span>
                    <span className="pm-lv">Lv.{c.level}</span>
                  </div>
                )) : (
                  <div className="preset-empty">편성되지 않음</div>
                )}
              </div>
              <div className="preset-card-footer">
                {members.length > 0
                  ? <span className="preset-power">총 ATK {members.reduce((s, c) => s + c.stats.atk, 0)}</span>
                  : null}
                <span className="preset-edit-hint">&#9998; 편집</span>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
