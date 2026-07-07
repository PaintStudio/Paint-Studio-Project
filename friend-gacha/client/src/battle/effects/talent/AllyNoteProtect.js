import { Effect, registerEffect, mapType } from '../../effectSystem';

class AllyNoteProtect extends Effect {
  static ID = 144;
  onPartyTakeDamage({ unit, owner, damagedUnit }) {
    if (damagedUnit.id === owner.id || !owner.alive) return;
    if (damagedUnit.notes > 1) return;
    const ownerNotes = owner.notes ?? 0;
    const spend = Math.min(this.params[0] || 3, ownerNotes);
    if (spend <= 0) return;
    return {
      ownerNoteSpend: spend,
      partyNoteRestore: [{ unitId: damagedUnit.id, amount: spend }],
      log: `  [${owner.talent.name}] ${damagedUnit.name} 보호 → 노트 ${spend} 전달`
    };
  }
}

registerEffect(AllyNoteProtect);
mapType('ally_note_protect', 144);
