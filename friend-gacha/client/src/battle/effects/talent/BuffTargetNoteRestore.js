import { Effect, registerEffect } from '../../effectSystem';

// 다른 캐릭터의 버프 대상이 되면 시전자 노트 회복
// args: [noteAmount]  예) [1]
class BuffTargetNoteRestore extends Effect {
  static ID = 175;
  onBuffApplied({ owner, caster, target }) {
    if (owner.id !== target?.id) return;
    if (!caster || caster.id === owner.id) return;
    const amt = this.params[0] || 1;
    return {
      partyNoteRestore: [{ unitId: caster.id, amount: amt }],
      log: `  [신뢰 가능한 지도자] ${caster.name}: 턴 노트 ${amt} 회복`,
    };
  }
}

registerEffect(BuffTargetNoteRestore);
