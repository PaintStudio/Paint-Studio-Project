import { Effect, registerEffect } from '../../effectSystem';

// 대상에게 폭풍 스택 부여 마커 이펙트
// args: [스택수]  예) [2]
class StormStackGrant extends Effect {
  static ID = 320;
}

registerEffect(StormStackGrant);
