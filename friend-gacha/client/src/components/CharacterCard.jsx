import React from 'react';
import './CharacterCard.css';

const RARITY_EMOJI = { N: '', R: '💧', SR: '⚡', SSR: '🌟' };
const RARITY_STARS = { N: 1, R: 2, SR: 3, SSR: 5 };

export default function CharacterCard({ character, rarity, isNew, onClick, compact }) {
  const r = rarity || character?.rarity;

  const imgUrl = character.image_url || character.imageUrl;

  if (compact) {
    return (
      <div className={`char-card-compact rarity-bg-${r}`} onClick={onClick}>
        <div className={`char-avatar-sm rarity-border-${r}`}>
          {imgUrl ? <img src={imgUrl} alt={character.name} className="avatar-img-sm" /> : (character.name?.[0] || '?')}
        </div>
        <div className="char-info-compact">
          <span className={`char-name-sm rarity-${r}`}>{character.name}</span>
          <span className="char-rarity-sm">{r}</span>
        </div>
      </div>
    );
  }

  return (
    <div className={`char-card rarity-bg-${r}`} onClick={onClick}>
      {isNew && <span className="new-badge">NEW</span>}
      <div className={`char-avatar rarity-border-${r}`}>
        {imgUrl
          ? <img src={imgUrl} alt={character.name} className="avatar-img" />
          : <span className="avatar-letter">{character.name?.[0] || '?'}</span>}
        <span className="avatar-emoji">{RARITY_EMOJI[r]}</span>
      </div>
      <div className="char-rarity-badge">
        <span className={`rarity-text rarity-${r}`}>
          {'★'.repeat(RARITY_STARS[r])}
        </span>
      </div>
      <h3 className={`char-name rarity-${r}`}>{character.name}</h3>
      <p className="char-title">{character.title}</p>
      {character.quote && <p className="char-quote">"{character.quote}"</p>}
      {character.description && <p className="char-desc">{character.description}</p>}
      {(character.stats_charm !== undefined) && (
        <div className="char-stats">
          <div className="stat"><span className="stat-label">매력</span><div className="stat-bar"><div className="stat-fill" style={{ width: `${character.stats_charm}%`, background: 'var(--accent)' }} /></div></div>
          <div className="stat"><span className="stat-label">유머</span><div className="stat-bar"><div className="stat-fill" style={{ width: `${character.stats_humor}%`, background: 'var(--gold)' }} /></div></div>
          <div className="stat"><span className="stat-label">지능</span><div className="stat-bar"><div className="stat-fill" style={{ width: `${character.stats_intellect}%`, background: 'var(--blue)' }} /></div></div>
          <div className="stat"><span className="stat-label">운</span><div className="stat-bar"><div className="stat-fill" style={{ width: `${character.stats_luck}%`, background: 'var(--green)' }} /></div></div>
        </div>
      )}
    </div>
  );
}
