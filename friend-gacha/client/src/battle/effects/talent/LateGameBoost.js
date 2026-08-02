import { Effect, registerEffect } from '../../effectSystem';

// 깊은 밤의 산책꾼 (칸나)
// args[0]번째 사이클 이후부터 속도와 최대 턴 노트가 args[1] * 100% 증가
// args: [cycleThreshold, boostRatio]
class LateGameBoost extends Effect {
  static ID = 228;
  onCycleStart({ owner, unit }) {
    if (owner.id !== unit.id) return;
    this.state.cycle = (this.state.cycle || 0) + 1;
    const threshold = this.params[0] ?? 6;
    if (this.state.cycle !== threshold) return;
    const boost = this.params[1] ?? 1.0;
    const noteBoost = Math.round(unit.maxNotes * boost);
    this.state.activated = true;
    return {
      selfMaxNoteBoost: noteBoost,
      log: `  [${unit.talent?.name}] ${unit.name}: 속도 +${Math.round(boost * 100)}%, 최대 턴 노트 +${noteBoost}`
    };
  }
  modifyStat(value, { stat, owner, unit }) {
    if (owner.id !== unit.id) return;
    if (!this.state.activated) return;
    if (stat === 'spd') return Math.round(value * (1 + (this.params[1] ?? 1.0)));
  }
}

registerEffect(LateGameBoost);
