import React, { useState, useRef, useCallback } from 'react';
import { api } from '../utils/api';
import DialogueBox from '../components/DialogueBox';
import BattlePage from './BattlePage';
import tutorialScript from '../data/tutorialScript';
import './TutorialPage.css';

export default function TutorialPage({ onComplete }) {
  const [mode, setMode] = useState('dialogue');
  const [battleSetup, setBattleSetup] = useState(null);
  const dialogueRef = useRef(null);

  const handleBattle = useCallback(async (entry) => {
    try {
      const { setup } = await api.tutorialBattle({
        party: entry.party,
        enemies: entry.enemies,
        chapter: entry.chapter,
        stageName: entry.stageName,
      });
      setBattleSetup({ ...setup, guide: entry.guide || null });
      setMode('battle');
    } catch (err) {
      console.error('튜토리얼 전투 셋업 실패:', err);
      dialogueRef.current?.advance();
    }
  }, []);

  const handleBattleEnd = useCallback(() => {
    setMode('dialogue');
    setBattleSetup(null);
    dialogueRef.current?.advance();
  }, []);

  return (
    <div className="tutorial-page">
      <div style={{ display: mode === 'dialogue' ? 'contents' : 'none' }}>
        <DialogueBox
          ref={dialogueRef}
          script={tutorialScript}
          onEnd={onComplete}
          onBattle={handleBattle}
        />
      </div>
      {mode === 'battle' && battleSetup && (
        <BattlePage
          setup={battleSetup}
          onBattleEnd={handleBattleEnd}
        />
      )}
    </div>
  );
}
