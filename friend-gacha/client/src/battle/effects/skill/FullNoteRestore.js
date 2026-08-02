import { Effect, registerEffect } from '../../effectSystem';

// 라스트 플라워 (칸나 궁극기)
// 사용 즉시 턴 노트 전부 회복 + 과부하 초기화. 다음 사이클 개시시 maxHP의 args[0]% HP를 잃는다.
// args: [nextCycleDamageRatio]  예) [0.99]
class FullNoteRestore extends Effect {
  static ID = 355;

  onSkillUsed({ owner, unit, skill, modSkill }) {
    if (owner.id !== unit.id) return;
    if (!modSkill || skill.id !== modSkill.id) return;
    const noteRecover = unit.maxNotes - unit.notes;
    return {
      noteRecoverUncapped: noteRecover > 0 ? noteRecover : 0,
      overloadReset: true,
      combatStackUpdates: { _lastFlowerPending: 1 },
      log: `  [${skill.name}] ${unit.name}: 턴 노트 전부 회복, 과부하 초기화`
    };
  }

  onCycleStart({ owner, unit }) {
    if (owner.id !== unit.id || !unit.alive) return;
    if (!this.getStack(unit, '_lastFlowerPending')) return;
    const ratio = this.params[0] ?? 0.99;
    const dmg = Math.round(unit.maxHp * ratio);
    return {
      selfDamage: dmg,
      combatStackUpdates: { _lastFlowerPending: 0 },
      log: `  [라스트 플라워] ${unit.name}: HP ${dmg} 소멸 (대가)`
    };
  }
}

registerEffect(FullNoteRestore);
