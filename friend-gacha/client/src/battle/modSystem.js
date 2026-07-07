// ═══════════════════════════════════════════════════
//  Effect System API
//  effectSystem.js의 코어를 re-export
//  effects.js의 이펙트 정의를 사이드이펙트로 로드
// ═══════════════════════════════════════════════════

export {
  runCalc, runEvent, clearAllState,
  attachBuff, attachDebuff, addBuff, addDebuff,
  tickBuffs, tickDebuffs, extendBuffs, reduceDebuffs,
  getBuffs, getDebuffs, dispelBuffs, cleanse,
  BUFF_MAX, DEBUFF_MAX,
  setBattleContext, getBattleContext, getEffStat,
} from './effectSystem';
import './effects';
