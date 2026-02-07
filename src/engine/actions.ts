import { Interpretation, Action, InternalState } from './types'

export interface ActionAvailability {
  action: Action
  available: boolean
  strength: number // 0–1, how strongly this action is suggested
}

export function selectAction(interp: Interpretation): Action {
  if (interp.perceivedThreat > 0.8) return 'flinch'
  if (interp.perceivedThreat > 0.6) return 'withdraw'
  if (interp.cognitiveAccess < 0.2) return 'observe'
  if (interp.motorBias === 'freeze') return 'observe'
  if (interp.cognitiveAccess > 0.7 && interp.perceivedThreat < 0.3) return 'approach'
  if (interp.cognitiveAccess > 0.5) return 'override'
  return 'observe'
}

export function getActionAvailability(interp: Interpretation, state: InternalState): ActionAvailability[] {
  const { perceivedThreat, cognitiveAccess } = interp

  return [
    {
      action: 'observe',
      available: true,
      strength: cognitiveAccess * 0.5,
    },
    {
      action: 'approach',
      available: perceivedThreat < 0.5 && cognitiveAccess > 0.4,
      strength: (1 - perceivedThreat) * cognitiveAccess,
    },
    {
      action: 'flinch',
      available: perceivedThreat > 0.5,
      strength: perceivedThreat,
    },
    {
      action: 'withdraw',
      available: perceivedThreat > 0.3,
      strength: perceivedThreat * 0.8,
    },
    {
      action: 'override',
      available: cognitiveAccess > 0.6 && state.energy > 0.5,
      strength: cognitiveAccess * state.energy * (1 - perceivedThreat * 0.5),
    },
  ]
}
