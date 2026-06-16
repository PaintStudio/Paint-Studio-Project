import React, { useState, useEffect } from 'react';
import { api } from '../utils/api';
import BattlePage from './BattlePage';
import './StagePage.css';

const ELEM_ICONS = { fire: '🔥', water: '💧', grass: '🌿', light: '✨', dark: '🌑', neutral: '⚪' };

export default function StagePage({ user, onRefresh, addToast }) {
  const [chapters, setChapters] = useState({});
  const [activeChapter, setActiveChapter] = useState(1);
  const [selectedStage, setSelectedStage] = useState(null);
  const [characters, setCharacters] = useState([]);
  const [partyIds, setPartyIds] = useState([]);
  const [battleSetup, setBattleSetup] = useState(null);
  const [loading, setLoading] = useState(false);

  useEffect(() => { loadData(); }, []);

  const loadData = async () => {
    try {
      const [stageData, charData] = await Promise.all([api.stageList(), api.partyList()]);
      setChapters(stageData.chapters);
      setCharacters(charData.characters);
    } catch (err) { addToast(err.message, 'error'); }
  };

  const toggleParty = (invId) => {
    setPartyIds(prev =>
      prev.includes(invId) ? prev.filter(id => id !== invId) : prev.length < 4 ? [...prev, invId] : prev
    );
  };

  const startBattle = async () => {
    if (partyIds.length === 0) return addToast('파티를 편성하세요', 'error');
    setLoading(true);
    try {
      const result = await api.stageBattleStart(selectedStage.id, partyIds);
      setBattleSetup(result.setup);
      onRefresh();
    } catch (err) {
      addToast(err.message, 'error');
    }
    setLoading(false);
  };

  const onBattleEnd = async (battleLog) => {
    try {
      const result = await api.stageBattleEnd(selectedStage.id, battleLog);
      if (result.rewards) {
        addToast(`승리! +${result.rewards.gold}G +${result.rewards.exp}EXP${result.rewards.diamond ? ` +${result.rewards.diamond}💎` : ''}`, 'sr');
      } else {
        addToast('패배...', 'error');
      }
      onRefresh();
    } catch (err) {
      addToast(err.message, 'error');
    }

    // 전투 종료 후 2초 뒤 복귀
    setTimeout(() => {
      setBattleSetup(null);
      loadData();
    }, 2000);
  };

  // 전투 중
  if (battleSetup) {
    return <BattlePage setup={battleSetup} onBattleEnd={onBattleEnd} partyIds={partyIds} />;
  }

  // 스테이지 선택 + 파티 편성
  if (selectedStage) {
    return (
      <div className="stage-page">
        <button className="btn-back" onClick={() => setSelectedStage(null)}>← 돌아가기</button>
        <div className="stage-detail">
          <h2>{selectedStage.name}</h2>
          <div className="stage-meta">
            <span>추천 Lv.{selectedStage.recommendedLevel}</span>
            <span>⚡{selectedStage.staminaCost}</span>
            <span>{'⭐'.repeat(selectedStage.stars)}</span>
          </div>
          <div className="stage-rewards">
            보상: 🪙{selectedStage.rewards.gold} / EXP {selectedStage.rewards.exp}
            {selectedStage.stars === 0 && ` / 💎${selectedStage.rewards.first_clear_diamond} (첫 클리어)`}
          </div>
        </div>

        <h3>파티 편성 ({partyIds.length}/4)</h3>
        <div className="party-grid">
          {characters.map(c => {
            const inParty = partyIds.includes(c.inventory_id);
            return (
              <div key={c.inventory_id}
                className={`party-char ${inParty ? 'selected' : ''}`}
                onClick={() => toggleParty(c.inventory_id)}>
                <div className="party-char-header">
                  <span className={`rarity-badge ${c.rarity.toLowerCase()}`}>{c.rarity}</span>
                  <span className="party-elem">{ELEM_ICONS[c.element]}</span>
                </div>
                <div className="party-char-name">{c.name}</div>
                <div className="party-char-level">Lv.{c.level}</div>
                <div className="party-char-stats">
                  <span>♥{c.stats.hp}</span>
                  <span>⚔{c.stats.atk}</span>
                </div>
                <div className="party-char-notes">🎵{c.turn_notes}</div>
                {inParty && <div className="party-order">{partyIds.indexOf(c.inventory_id) + 1}</div>}
              </div>
            );
          })}
        </div>

        <button className="btn-primary battle-start-btn" onClick={startBattle} disabled={loading || partyIds.length === 0}>
          {loading ? '준비 중...' : '전투 시작!'}
        </button>
      </div>
    );
  }

  // 스테이지 목록
  const chapterKeys = Object.keys(chapters).sort((a, b) => a - b);
  const chapterNames = ['시작의 마을', '어둠의 숲', '불꽃의 산', '심해 동굴', '빛의 탑'];

  return (
    <div className="stage-page">
      <h2>스테이지</h2>
      <div className="chapter-tabs">
        {chapterKeys.map(ch => (
          <button key={ch}
            className={`chapter-tab ${Number(ch) === activeChapter ? 'active' : ''}`}
            onClick={() => setActiveChapter(Number(ch))}>
            {chapterNames[ch - 1] || `챕터 ${ch}`}
          </button>
        ))}
      </div>

      <div className="stage-list">
        {(chapters[activeChapter] || []).map(s => (
          <div key={s.id}
            className={`stage-item ${!s.unlocked ? 'locked' : ''} ${s.stars > 0 ? 'cleared' : ''}`}
            onClick={() => s.unlocked && setSelectedStage(s)}>
            <div className="stage-item-left">
              <span className="stage-number">{s.stageNumber}</span>
              <div className="stage-info">
                <span className="stage-name">{s.name}</span>
                <span className="stage-rec">Lv.{s.recommendedLevel} · ⚡{s.staminaCost}</span>
              </div>
            </div>
            <div className="stage-stars">
              {s.unlocked ? (s.stars > 0 ? '⭐'.repeat(s.stars) + '☆'.repeat(3 - s.stars) : '☆☆☆') : '🔒'}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
