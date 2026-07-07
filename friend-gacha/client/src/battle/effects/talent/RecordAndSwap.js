import { Effect, registerEffect } from '../../effectSystem';

// 궁극기 사용 시 HP/노트 기록, 다음 궁극기에서 교체
// args: []
class RecordAndSwap extends Effect {
  static ID = 173;
  onSkillUsed({ owner, unit, skill }) {
    if (owner.id !== unit.id) return;
    if (skill?.type !== 'ultimate') return;

    if (this.state._recordedHp != null) {
      const recHp = this.state._recordedHp;
      const recNotes = this.state._recordedNotes;
      const hpDiff = recHp - unit.hp;
      const notesDiff = recNotes - unit.notes;

      this.state._recordedHp = unit.hp;
      this.state._recordedNotes = unit.notes;

      const result = { logs: [`  [되돌아가는 창술사] HP ${unit.hp}→${recHp}, 노트 ${unit.notes}→${recNotes}`] };
      if (hpDiff > 0) result.selfHeal = hpDiff;
      else if (hpDiff < 0) result.selfDamage = -hpDiff;
      if (notesDiff > 0) result.noteRecoverUncapped = notesDiff;
      else if (notesDiff < 0) result.ownerNoteSpend = -notesDiff;
      return result;
    }

    this.state._recordedHp = unit.hp;
    this.state._recordedNotes = unit.notes;
    return { log: `  [되돌아가는 창술사] HP ${unit.hp}, 노트 ${unit.notes} 기록` };
  }
}

registerEffect(RecordAndSwap);
