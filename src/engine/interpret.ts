import { InternalState, Stimulus, Interpretation } from './types'

/** Learned context that influences interpretation */
export interface LearnedContext {
  /** Overall threat bias from accumulated experience (-1 to 1) */
  threatBias: number
  /** Overall familiarity from learned patterns (0-1) */
  learnedFamiliarity: number
  /** Total number of impacts experienced */
  totalExposures: number
  /** Survival relevance — how much the agent has learned about threats */
  survivalRelevance: number
}

export function interpret(
  stimulus: Stimulus,
  state: InternalState,
  learned?: LearnedContext,
): Interpretation {
  // Base threat perception
  let perceivedThreat = clamp(
    stimulus.intensity * (1 + state.threat) * (1 - state.familiarity * 0.8)
  )

  // Learned threat amplification: past experience makes threat detection faster/stronger
  // This is the "survival trait" — recognizing danger from prior hits
  if (learned) {
    // Threat bias from accumulated experience (the agent KNOWS this is dangerous)
    perceivedThreat = clamp(perceivedThreat + learned.threatBias * 0.3)

    // High survival relevance → heightened baseline vigilance
    perceivedThreat = clamp(perceivedThreat + learned.survivalRelevance * 0.15)

    // But learned familiarity also helps — you can handle it better
    // (counterbalances pure threat with competence)
    if (learned.learnedFamiliarity > 0.3 && learned.totalExposures > 5) {
      perceivedThreat = clamp(perceivedThreat * (1 - learned.learnedFamiliarity * 0.2))
    }
  }

  // Salience: how much attention this demands
  let salience = clamp(
    stimulus.intensity * (1 - state.familiarity * 0.5) + state.threat * 0.3
  )

  // Learned patterns increase salience for recognized threats
  if (learned && learned.totalExposures > 0) {
    salience = clamp(salience + learned.survivalRelevance * 0.2)
  }

  // Cognitive access: how much reasoning capacity is available
  let cognitiveAccess = clamp(
    state.energy * (1 - state.threat * 0.7)
  )

  // Learning improves cognitive access for familiar patterns (practiced response)
  if (learned && learned.learnedFamiliarity > 0.3) {
    cognitiveAccess = clamp(cognitiveAccess + learned.learnedFamiliarity * 0.15)
  }

  // Motor bias: approach/freeze/withdraw
  // Learned experience shifts thresholds — an experienced agent withdraws faster
  const withdrawThreshold = learned && learned.totalExposures > 3
    ? 0.5  // lower threshold after learning = faster defensive response
    : 0.7

  const motorBias: Interpretation['motorBias'] =
    perceivedThreat > withdrawThreshold
      ? 'withdraw'
      : cognitiveAccess < 0.3
        ? 'freeze'
        : 'approach'

  return { perceivedThreat, salience, cognitiveAccess, motorBias }
}

function clamp(v: number, min = 0, max = 1): number {
  return Math.max(min, Math.min(max, v))
}
