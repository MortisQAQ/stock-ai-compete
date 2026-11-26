import type { RunState } from '../types'
import { reduceLiveAction } from './runLiveReducer'
import { reduceTrainingAction } from './runTrainingReducer'
import type { RunAction } from './runTypes'

/** 统一运行状态机纯 reducer：按动作域分派至训练场或实战镜像账本处理器 */
export function runReducer(state: RunState, action: RunAction): RunState {
  switch (action.type) {
    case 'recordLiveFill':
    case 'upsertHolding':
    case 'removeHolding':
    case 'setCash':
      return reduceLiveAction(state, action)
    default:
      return reduceTrainingAction(state, action)
  }
}
