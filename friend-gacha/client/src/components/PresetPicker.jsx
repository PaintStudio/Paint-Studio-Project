import React from 'react';
import './PresetPicker.css';

export default function PresetPicker({ presets, selectedPreset, onSelect, onEdit, getCharByInvId, maxSlots }) {
  return (
    <div className="preset-picker-section">
      <div className="preset-picker-header">
        <h3>&#9876;&#65039; 프리셋 선택</h3>
      </div>
      <div className="preset-picker-grid">
        {presets.map(p => {
          const allMembers = p.partyIds.map(id => getCharByInvId(id)).filter(Boolean);
          const members = maxSlots != null ? allMembers.slice(0, maxSlots) : allMembers;
          const isSelected = selectedPreset?.slot === p.slot;
          return (
            <div key={p.slot}
              className={`preset-pick-card ${isSelected ? 'selected' : ''} ${members.length === 0 ? 'empty' : ''}`}
              onClick={() => members.length > 0 && onSelect(p)}>
              <div className="preset-pick-header">
                <span className="preset-pick-num">{p.slot + 1}</span>
                <span className="preset-pick-name">{p.name}</span>
                <button className="preset-pick-edit" onClick={(e) => {
                  e.stopPropagation();
                  onEdit(p.slot);
                }} dangerouslySetInnerHTML={{ __html: '&#9998;' }} />
              </div>
              {members.length > 0 ? (
                <div className="preset-pick-members">
                  {members.map(c => (
                    <div key={c.inventory_id} className="preset-pick-member">
                      <div className="ppm-avatar">
                        {c.image_url ? <img src={c.image_url} alt={c.name} /> : c.name?.[0]}
                      </div>
                      <div className="ppm-info">
                        <span className="ppm-name">{c.name}</span>
                        <span className="ppm-lv">Lv.{c.level}</span>
                      </div>
                    </div>
                  ))}
                  <div className="preset-pick-power">ATK {members.reduce((s, c) => s + c.stats.atk, 0)}</div>
                </div>
              ) : (
                <div className="preset-pick-empty" onClick={(e) => {
                  e.stopPropagation();
                  onEdit(p.slot);
                }}>+ 편성하기</div>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}
