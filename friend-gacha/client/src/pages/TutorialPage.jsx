import React, { useState, useRef, useCallback, useEffect } from 'react';
import { api } from '../utils/api';
import DialogueBox from '../components/DialogueBox';
import BattlePage from './BattlePage';
import tutorialScriptFallback from '../data/tutorialScript';
import './TutorialPage.css';

export default function TutorialPage({ onComplete }) {
  const [mode, setMode] = useState('dialogue');
  const [battleSetup, setBattleSetup] = useState(null);
  const [script, setScript] = useState(null);
  const [nodeId, setNodeId] = useState(null);
  const dialogueRef = useRef(null);

  useEffect(() => {
    api.tutorialScript().then(data => {
      setScript(data.storyScript);
      setNodeId(data.nodeId);
    }).catch(() => {
      setScript(tutorialScriptFallback);
    });
  }, []);

  const handleBattle = useCallback(async (entry) => {
    try {
      if (nodeId) {
        const { setup } = await api.storyBattleStart(nodeId, [], entry.enemies, entry.party);
        setBattleSetup({ ...setup, guide: entry.guide || null });
      } else {
        const { setup } = await api.tutorialBattle({
          party: entry.party,
          enemies: entry.enemies,
          chapter: entry.chapter,
          stageName: entry.stageName,
        });
        setBattleSetup({ ...setup, guide: entry.guide || null });
      }
      setMode('battle');
    } catch (err) {
      console.error('튜토리얼 전투 셋업 실패:', err);
      dialogueRef.current?.advance();
    }
  }, [nodeId]);

  const handleBattleEnd = useCallback(() => {
    setMode('dialogue');
    setBattleSetup(null);
    dialogueRef.current?.advance();
  }, []);

  if (!script) return null;

  return (
    <div className="tutorial-page">
      <div style={{ display: mode === 'dialogue' ? 'contents' : 'none' }}>
        <DialogueBox
          ref={dialogueRef}
          script={script}
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
