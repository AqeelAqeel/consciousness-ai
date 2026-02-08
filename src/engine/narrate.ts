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

export interface BrainContext {
  recentImpact?: { intensity: number; timestamp: number; source: 'projectile' | 'chat' | 'scenario' } | null
  chatActivity?: number  // 0-1
}

export function generateBrainRegions(
  state: InternalState,
  interp: Interpretation,
  context?: BrainContext,
): BrainRegion[] {
  const threat = interp.perceivedThreat
  const salience = interp.salience
  const cognitive = interp.cognitiveAccess
  const motorActive = interp.motorBias === 'approach' ? 0.8 : interp.motorBias === 'withdraw' ? 0.9 : 0.2
  const arousal = threat * 0.4 + salience * 0.3 + (1 - state.energy) * 0.3

  // Reactive boosts from recent events
  const impactAge = context?.recentImpact ? Math.max(0, 1 - (Date.now() - context.recentImpact.timestamp) / 3000) : 0
  const impactBoost = (context?.recentImpact?.intensity ?? 0) * impactAge
  const chatBoost = context?.chatActivity ?? 0

  return [
    // ── Frontal Lobe ──
    {
      id: 'prefrontal',
      label: 'Prefrontal Cortex',
      activation: Math.min(1, cognitive + chatBoost * 0.3),
      color: '#3388ff',
      position: [0, 0.5, 0.3],
    },
    {
      id: 'orbitofrontal',
      label: 'Orbitofrontal',
      activation: Math.min(1, cognitive * 0.7 + state.familiarity * 0.3 + chatBoost * 0.2),
      color: '#4499ee',
      position: [-0.1, 0.45, 0.35],
    },
    {
      id: 'dlpfc',
      label: 'Dorsolateral PFC',
      activation: Math.min(1, cognitive * 0.8 + (1 - threat) * 0.2 + chatBoost * 0.25),
      color: '#2277dd',
      position: [0.12, 0.52, 0.25],
    },
    {
      id: 'broca',
      label: "Broca's Area",
      activation: Math.min(1, cognitive * 0.4 + chatBoost * 0.55 + salience * 0.1),
      color: '#55aaff',
      position: [-0.25, 0.4, 0.2],
    },
    {
      id: 'motor-cortex',
      label: 'Primary Motor',
      activation: Math.min(1, motorActive + impactBoost * 0.6),
      color: '#ff8833',
      position: [0, 0.55, -0.05],
    },
    {
      id: 'premotor',
      label: 'Premotor Cortex',
      activation: Math.min(1, motorActive * 0.7 + threat * 0.3 + impactBoost * 0.4),
      color: '#ee7722',
      position: [0.1, 0.52, 0.05],
    },
    {
      id: 'sma',
      label: 'Supplementary Motor',
      activation: Math.min(1, motorActive * 0.5 + arousal * 0.3 + impactBoost * 0.3),
      color: '#dd6611',
      position: [-0.05, 0.56, -0.02],
    },
    {
      id: 'acc',
      label: 'Anterior Cingulate',
      activation: Math.min(1, salience * 0.5 + threat * 0.3 + (1 - cognitive) * 0.2 + impactBoost * 0.3 + chatBoost * 0.2),
      color: '#ff6688',
      position: [0, 0.4, 0.1],
    },

    // ── Parietal Lobe ──
    {
      id: 'somatosensory',
      label: 'Somatosensory',
      activation: Math.min(1, arousal * 0.4 + threat * 0.3 + impactBoost * 0.7),
      color: '#ffaa44',
      position: [0, 0.5, -0.15],
    },
    {
      id: 'posterior-parietal',
      label: 'Posterior Parietal',
      activation: Math.min(1, salience * 0.5 + cognitive * 0.3 + state.familiarity * 0.2 + impactBoost * 0.2),
      color: '#ddbb33',
      position: [0.15, 0.4, -0.25],
    },

    // ── Temporal Lobe ──
    {
      id: 'auditory-cortex',
      label: 'Auditory Cortex',
      activation: Math.min(1, salience * 0.3 + state.familiarity * 0.15 + 0.1 + chatBoost * 0.4 + impactBoost * 0.3),
      color: '#88cc44',
      position: [-0.35, 0.25, 0.1],
    },
    {
      id: 'wernicke',
      label: "Wernicke's Area",
      activation: Math.min(1, cognitive * 0.35 + state.familiarity * 0.2 + chatBoost * 0.5),
      color: '#66bb55',
      position: [-0.3, 0.3, -0.1],
    },
    {
      id: 'fusiform',
      label: 'Fusiform Gyrus',
      activation: Math.min(1, state.familiarity * 0.6 + salience * 0.3 + impactBoost * 0.15),
      color: '#44aa66',
      position: [-0.25, 0.15, 0.05],
    },

    // ── Occipital Lobe ──
    {
      id: 'visual-cortex',
      label: 'Visual Cortex (V1)',
      activation: Math.min(1, salience * 0.4 + 0.2 + threat * 0.2 + impactBoost * 0.4),
      color: '#33ddaa',
      position: [0, 0.25, -0.4],
    },
    {
      id: 'visual-association',
      label: 'Visual Association',
      activation: Math.min(1, salience * 0.35 + state.familiarity * 0.25 + 0.1 + impactBoost * 0.25),
      color: '#22ccbb',
      position: [0.1, 0.3, -0.35],
    },

    // ── Deep Structures ──
    {
      id: 'amygdala',
      label: 'Amygdala',
      activation: Math.min(1, threat + impactBoost * 0.8),
      color: '#ff3333',
      position: [0.3, 0.1, 0.2],
    },
    {
      id: 'hippocampus',
      label: 'Hippocampus',
      activation: Math.min(1, state.familiarity + chatBoost * 0.2),
      color: '#33cc66',
      position: [-0.3, 0.1, 0.1],
    },
    {
      id: 'thalamus',
      label: 'Thalamus',
      activation: Math.min(1, arousal * 0.4 + salience * 0.25 + 0.15 + impactBoost * 0.5 + chatBoost * 0.2),
      color: '#bb88ff',
      position: [0, 0.25, 0.05],
    },
    {
      id: 'hypothalamus',
      label: 'Hypothalamus',
      activation: Math.min(1, (1 - state.energy) * 0.4 + threat * 0.3 + 0.1 + impactBoost * 0.4),
      color: '#ff44aa',
      position: [0, 0.18, 0.15],
    },
    {
      id: 'basal-ganglia',
      label: 'Basal Ganglia',
      activation: Math.min(1, motorActive * 0.5 + state.familiarity * 0.15 + 0.1 + impactBoost * 0.35),
      color: '#cc8844',
      position: [0.15, 0.22, 0.08],
    },
    {
      id: 'insula',
      label: 'Insula',
      activation: Math.min(1, (1 - state.energy) * 0.3 + threat * 0.35 + arousal * 0.15 + impactBoost * 0.4),
      color: '#cc33ff',
      position: [0.25, 0.3, 0],
    },
    {
      id: 'salience-network',
      label: 'Salience Network',
      activation: Math.min(1, salience + impactBoost * 0.5 + chatBoost * 0.3),
      color: '#ffcc00',
      position: [0, 0.35, -0.1],
    },

    // ── Brainstem & Cerebellum ──
    {
      id: 'cerebellum',
      label: 'Cerebellum',
      activation: Math.min(1, motorActive * 0.4 + 0.15 + state.energy * 0.15 + impactBoost * 0.35),
      color: '#aa66dd',
      position: [0, 0.05, -0.3],
    },
    {
      id: 'brainstem',
      label: 'Brainstem',
      activation: Math.min(1, arousal * 0.35 + 0.2 + threat * 0.25 + impactBoost * 0.5),
      color: '#ff6677',
      position: [0, -0.05, 0],
    },
    {
      id: 'vta',
      label: 'VTA (Reward)',
      activation: Math.min(1, (1 - threat) * 0.4 + state.familiarity * 0.3 + state.energy * 0.2),
      color: '#ffdd44',
      position: [0.08, 0.05, 0.05],
    },
    {
      id: 'locus-coeruleus',
      label: 'Locus Coeruleus',
      activation: Math.min(1, arousal * 0.5 + threat * 0.25 + impactBoost * 0.6),
      color: '#ff5566',
      position: [-0.05, 0, -0.1],
    },
    {
      id: 'raphe-nuclei',
      label: 'Raphe Nuclei',
      activation: Math.min(1, (1 - threat) * 0.3 + state.energy * 0.3 + 0.1),
      color: '#44ddff',
      position: [0.05, -0.02, -0.05],
    },
  ]
}
