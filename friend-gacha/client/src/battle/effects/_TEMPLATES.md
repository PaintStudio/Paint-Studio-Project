# Effect 템플릿

새 이펙트 추가 시 해당 카테고리 폴더에 복사 후 편집.
import 경로, 클래스명, ID, 훅 메서드, 등록 함수만 바꾸면 됨.
index.js가 자동 등록하므로 별도 import 불필요.

**모든 args는 인덱스 배열**: `this.params[0]`, `this.params[1]`, ...
어드민에서 + arg 버튼으로 순서대로 추가.

---

## passive/ — 패시브 스탯 (ID 1~)

talent effects에서 id로 매핑.

```js
import { Effect, registerEffect, mapType } from '../../effectSystem';

class NewPassive extends Effect {
  static ID = 0;
  modifyStat(value, { owner, unit, stat }) {
    if (owner.id !== unit.id) return;
    if (stat !== 'atk') return;
    return Math.round(value * (1 + this.params[0]));
  }
}

registerEffect(NewPassive);
mapType('new_passive', 0);
```

---

## trigger/ — 트리거 (ID 101~)

talent effects에서 id로 매핑.

```js
import { Effect, registerEffect, mapType } from '../../effectSystem';

class NewTrigger extends Effect {
  static ID = 0;
  onCycleEnd({ owner, unit, party }) {
    if (owner.id !== unit.id) return;
    return {
      combatStackUpdates: { _myStacks: this.getStack(unit, '_myStacks') + 1 },
      log: `  [${unit.talent.name}] 스택 증가!`
    };
  }
}

registerEffect(NewTrigger);
mapType('new_trigger', 0);
```

---

## talent/ — SSR 특기 (ID 136~)

talent effects에서 id로 매핑.

```js
import { Effect, registerEffect, mapType } from '../../effectSystem';

class NewTalent extends Effect {
  static ID = 0;
  onSkillUsed({ owner, unit, skill, targets }) {
    if (owner.id !== unit.id) return;
    if (skill.type !== 'attack') return;
    return {
      partyHeal: [{ unitId: unit.id, amount: Math.round(unit.maxHp * this.params[0]) }],
      log: `  [${unit.talent.name}] 공격 후 HP 회복!`
    };
  }
}

registerEffect(NewTalent);
mapType('new_talent', 0);
```

---

## status/ — 상태이상 (ID 201~)

statusKey로 매핑. params는 인덱스 배열 (status 생성 시 params 필드 지정).

```js
import { Effect, registerEffect, mapStatus } from '../../effectSystem';

class StatusNewEffect extends Effect {
  static ID = 0;
  modifyStat(value, { owner, unit, stat }) {
    if (owner.id !== unit.id) return;
    if (stat !== 'def') return;
    return Math.round(value * (1 - (this.params[0] || 0.2)));
  }
}

registerEffect(StatusNewEffect);
mapStatus('new_status_key', 0);
```

---

## buff/ — 버프/디버프 동작 (ID 401~)

`addBuff(targetId, effectId, args, opts)`로 부여. 버프별 고유 ID.
- StatBuff(401): args `[stat, amount]` — 스탯 증감
- SalvationBuff(403): args `[회복량]` — 피격 시 HP 회복
- `label` 옵션: UI 표시용 이름

```js
import { Effect, registerEffect } from '../../effectSystem';

class StatBuff extends Effect {
  static ID = 401;
  modifyStat(value, { owner, unit, stat }) {
    if (owner.id !== unit.id) return;
    if (this.params[0] !== stat) return;
    return Math.round(value * (1 + this.params[1]));
  }
}

registerEffect(StatBuff);
```

---

## skill/ — 스킬 이펙트 (ID 301~)

스킬 effectIds에 ID 또는 { id: N, args: [값] } 추가.
버프/디버프 부여 시 `addBuff`/`addDebuff`를 직접 호출:
```js
import { addBuff } from '../../effectSystem';
addBuff(targetId, buffEffectId, args, { turns, skillId, skillName, casterId, label });
```

```js
import { Effect, registerEffect } from '../../effectSystem';

class NewSkillExtra extends Effect {
  static ID = 0;
  onPostAttack({ owner, unit, skill, modSkill }) {
    if (owner.id !== unit.id) return;
    if (!modSkill || skill.id !== modSkill.id) return;
    return {
      selfHeal: Math.round(unit.maxHp * (this.params[0] ?? 0.1)),
      log: `  ${unit.name}: HP 회복`
    };
  }
}

registerEffect(NewSkillExtra);
```
