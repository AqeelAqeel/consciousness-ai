import { InternalState, Stimulus, Action, Interpretation, CognitionFragment, SomaticSignal, BrainRegion } from './types'

let fragmentCounter = 0

export function explain(state: InternalState, stimulus: Stimulus | null, action: Action): string {
  if (!stimulus) return 'Awaiting stimulus. Systems idle.'

  if (state.threat > 0.7) {
    return `Threat dominant. Cognition bypassed. ${action === 'flinch' ? 'Reflexive withdrawal triggered.' : 'Motor override engaged.'}`
  }

  if (state.energy < 0.3) {
    return `Energy depleted. Cognitive access restricted. ${action === 'observe' ? 'Passive observation only.' : 'Forced action under fatigue.'}`
  }

  if (state.familiarity > 0.7) {
    return `Stimulus recognized. Threat suppressed. ${action === 'approach' ? 'Exploration safe.' : 'Monitoring continues.'}`
  }

  if (state.threat > 0.4) {
    return `Elevated threat. Attention narrowed. ${action === 'withdraw' ? 'Retreat initiated.' : 'Assessing options.'}`
  }

  return `Systems nominal. Stimulus processed. Action: ${action}.`
}

export function generateCognitionFragments(
  state: InternalState,
  interp: Interpretation,
  stimulus: Stimulus | null,
): CognitionFragment[] {
  const fragments: CognitionFragment[] = []
  const now = Date.now()

  if (!stimulus) {
    fragments.push({ id: `cf-${++fragmentCounter}`, text: 'waiting...', intensity: 0.2, timestamp: now })
    return fragments
  }

  // Threat-driven fragments
  if (interp.perceivedThreat > 0.7) {
    fragments.push({ id: `cf-${++fragmentCounter}`, text: 'DANGER', intensity: 1, timestamp: now })
    fragments.push({ id: `cf-${++fragmentCounter}`, text: 'move', intensity: 0.9, timestamp: now })
  } else if (interp.perceivedThreat > 0.4) {
    fragments.push({ id: `cf-${++fragmentCounter}`, text: 'uncertain', intensity: 0.6, timestamp: now })
    fragments.push({ id: `cf-${++fragmentCounter}`, text: 'assess', intensity: 0.5, timestamp: now })
  }

  // Familiarity-driven
  if (state.familiarity > 0.6) {
    fragments.push({ id: `cf-${++fragmentCounter}`, text: 'recognized', intensity: 0.4, timestamp: now })
  } else if (state.familiarity < 0.3) {
    fragments.push({ id: `cf-${++fragmentCounter}`, text: 'unknown', intensity: 0.7, timestamp: now })
  }

  // Energy-driven
  if (state.energy < 0.3) {
    fragments.push({ id: `cf-${++fragmentCounter}`, text: 'exhausted', intensity: 0.8, timestamp: now })
  } else if (state.energy > 0.7 && interp.perceivedThreat < 0.3) {
    fragments.push({ id: `cf-${++fragmentCounter}`, text: 'safe enough', intensity: 0.3, timestamp: now })
  }

  // Cognitive access
  if (interp.cognitiveAccess < 0.3) {
    fragments.push({ id: `cf-${++fragmentCounter}`, text: 'overload', intensity: 0.9, timestamp: now })
  }

  return fragments
}

export function generateSomaticSignals(
  state: InternalState,
  interp: Interpretation,
): SomaticSignal[] {
  const signals: SomaticSignal[] = []

  // Chest tightness from threat
  if (interp.perceivedThreat > 0.4) {
    signals.push({ region: 'chest', intensity: interp.perceivedThreat, type: 'tension' })
  }

  // Gut tension from uncertainty
  if (state.familiarity < 0.4 && interp.salience > 0.5) {
    signals.push({ region: 'gut', intensity: 1 - state.familiarity, type: 'tension' })
  }

  // Limb readiness from motor bias
  if (interp.motorBias === 'approach') {
    signals.push({ region: 'limbs', intensity: 0.6, type: 'warmth' })
  } else if (interp.motorBias === 'withdraw') {
    signals.push({ region: 'limbs', intensity: 0.8, type: 'cold' })
  }

  // Head pulse from salience
  if (interp.salience > 0.6) {
    signals.push({ region: 'head', intensity: interp.salience, type: 'pulse' })
  }

  return signals
}

export function generateBrainRegions(
  state: InternalState,
  interp: Interpretation,
): BrainRegion[] {
  return [
    {
      id: 'amygdala',
      label: 'Threat Detection',
      activation: interp.perceivedThreat,
      color: '#ff3333',
      position: [0.3, 0.1, 0.2],
    },
    {
      id: 'prefrontal',
      label: 'Executive Control',
      activation: interp.cognitiveAccess,
      color: '#3388ff',
      position: [0, 0.5, 0.3],
    },
    {
      id: 'hippocampus',
      label: 'Recognition',
      activation: state.familiarity,
      color: '#33cc66',
      position: [-0.3, 0.1, 0.1],
    },
    {
      id: 'salience-network',
      label: 'Salience',
      activation: interp.salience,
      color: '#ffcc00',
      position: [0, 0.35, -0.1],
    },
    {
      id: 'motor-cortex',
      label: 'Motor Planning',
      activation: interp.motorBias === 'approach' ? 0.8 : interp.motorBias === 'withdraw' ? 0.9 : 0.2,
      color: '#ff8833',
      position: [0, 0.5, -0.2],
    },
    {
      id: 'insula',
      label: 'Interoception',
      activation: (1 - state.energy) * 0.5 + interp.perceivedThreat * 0.5,
      color: '#cc33ff',
      position: [0.25, 0.3, 0],
    },
  ]
}
