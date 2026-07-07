import { Effect, registerEffect } from '../../effectSystem';

// 다음 사이클 개시 시 SPD 버프 예약 마커 이펙트
// args: [증가량, 턴수]  예) [0.15, 1]
class NextCycleSpeedBuff extends Effect {
  static ID = 325;
}

registerEffect(NextCycleSpeedBuff);
