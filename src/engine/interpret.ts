import { InternalState, Stimulus, Interpretation } from './types'

export function interpret(stimulus: Stimulus, state: InternalState): Interpretation {
  const perceivedThreat = clamp(
    stimulus.intensity * (1 + state.threat) * (1 - state.familiarity * 0.8)
  )

  const salience = clamp(
    stimulus.intensity * (1 - state.familiarity * 0.5) + state.threat * 0.3
  )

  const cognitiveAccess = clamp(
    state.energy * (1 - state.threat * 0.7)
  )

  const motorBias: Interpretation['motorBias'] =
    perceivedThreat > 0.7
      ? 'withdraw'
      : cognitiveAccess < 0.3
        ? 'freeze'
        : 'approach'

  return { perceivedThreat, salience, cognitiveAccess, motorBias }
}

function clamp(v: number, min = 0, max = 1): number {
  return Math.max(min, Math.min(max, v))
}
