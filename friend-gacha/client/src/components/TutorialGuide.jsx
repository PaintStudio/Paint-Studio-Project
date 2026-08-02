import React, { useState, useEffect, useCallback, useImperativeHandle, forwardRef } from 'react';
import { api } from '../utils/api';
import tutorialGuide from '../data/tutorialGuide';
import './TutorialGuide.css';

const TutorialGuide = forwardRef(function TutorialGuide({ user, currentPage, onNavigate, onUserUpdate }, ref) {
  const [guideStep, setGuideStep] = useState(0);
  const [visible, setVisible] = useState(false);
  const [constraint, setConstraint] = useState(null);
  const tutorialStep = user?.tutorialStep;

  const alreadyPulled = (user?.totalPulls || 0) > 0;
  const gachaTutorialSteps = tutorialGuide.filter(g => g.steps.some(s => s.waitFor === 'gacha_pull')).map(g => g.step);
  const maxGachaStep = Math.max(...gachaTutorialSteps, 0);
  const shouldSkipGacha = alreadyPulled && tutorialStep >= 1 && tutorialStep <= maxGachaStep;

  const config = shouldSkipGacha ? null : tutorialGuide.find(g => g.step === tutorialStep && g.page === currentPage);

  useEffect(() => {
    if (shouldSkipGacha) {
      setVisible(false);
      setConstraint(null);
      api.tutorialAdvance(999).then(() => {
        onUserUpdate(prev => ({ ...prev, tutorialStep: 999, tutorialDone: true }));
      });
      return;
    }
    if (!config) { setVisible(false); setConstraint(null); setGuideStep(0); return; }
    setGuideStep(0);
    setConstraint(null);
    setVisible(true);
  }, [tutorialStep, currentPage]);

  const advanceStep = useCallback(() => {
    api.tutorialAdvance().then(r => {
      onUserUpdate(prev => ({ ...prev, tutorialStep: r.tutorialStep }));
    });
  }, [onUserUpdate]);

  const finishTutorial = useCallback(() => {
    setVisible(false);
    setConstraint(null);
    api.tutorialAdvance(999).then(() => {
      onUserUpdate(prev => ({ ...prev, tutorialStep: 999, tutorialDone: true }));
    });
  }, [onUserUpdate]);

  const advanceLocal = useCallback(() => {
    if (!config) return;
    const step = config.steps[guideStep];
    const wf = step?.waitFor;

    if (wf && wf !== 'click') {
      setVisible(false);
      setConstraint(step);
    } else if (step?.onComplete === 'finish') {
      finishTutorial();
    } else if (guideStep + 1 < config.steps.length) {
      setGuideStep(prev => prev + 1);
    } else {
      setVisible(false);
      setConstraint(null);
      advanceStep();
    }
  }, [config, guideStep, advanceStep, finishTutorial]);

  const completeAction = useCallback((actionType) => {
    if (!constraint) return false;

    if (constraint.waitFor === 'tab_click' && actionType === 'tab_click') {
      setConstraint(null);
      advanceStep();
      if (constraint.targetTab) onNavigate(constraint.targetTab);
      return true;
    }

    if (constraint.waitFor === actionType) {
      setConstraint(null);
      if (config && guideStep + 1 < config.steps.length) {
        setGuideStep(prev => prev + 1);
        setVisible(true);
      } else {
        advanceStep();
      }
      return true;
    }

    return false;
  }, [constraint, config, guideStep, onNavigate, advanceStep]);

  const isTabBlocked = useCallback((tabKey) => {
    if (visible) return true;
    if (!constraint || constraint.waitFor !== 'tab_click') return false;
    return constraint.targetTab && tabKey !== constraint.targetTab;
  }, [constraint, visible]);

  const isActionBlocked = useCallback(() => {
    return visible || !!constraint;
  }, [visible, constraint]);

  useImperativeHandle(ref, () => ({
    completeAction,
    isTabBlocked,
    isActionBlocked,
  }), [completeAction, isTabBlocked, isActionBlocked]);

  useEffect(() => {
    if (!constraint?.highlight) return;
    const el = document.querySelector(constraint.highlight);
    if (el) el.classList.add('tutorial-highlight');
    return () => { if (el) el.classList.remove('tutorial-highlight'); };
  }, [constraint]);

  if (!config && !constraint) return null;

  const currentStep = visible ? config?.steps[guideStep] : null;

  return (
    <>
      {visible && currentStep && (
        <div className="tutorial-guide-overlay" onClick={advanceLocal}>
          <div className={`tutorial-guide-box ${currentStep.position === 'center' ? 'pos-center' : currentStep.position === 'top' ? 'pos-top' : 'pos-bottom'}`}
            onClick={e => e.stopPropagation()}>
            {currentStep.speakerImage && (
              <div className="tg-speaker-img">
                <img src={currentStep.speakerImage} alt="" />
              </div>
            )}
            <div className="tg-content">
              {currentStep.speaker && <span className="tg-speaker-name">{currentStep.speaker}</span>}
              <p className="tg-text">{currentStep.text}</p>
            </div>
            <button className="tg-next" onClick={advanceLocal}>
              {currentStep.waitFor && currentStep.waitFor !== 'click'
                ? '▼ 클릭하여 진행'
                : '▼ 클릭하여 계속'}
            </button>
          </div>
        </div>
      )}

      {constraint && !visible && (
        <div className="tutorial-constraint-bar">
          <span className="tc-icon">&#9888;</span>
          <span className="tc-text">{constraint.text}</span>
        </div>
      )}
    </>
  );
});

export default TutorialGuide;
