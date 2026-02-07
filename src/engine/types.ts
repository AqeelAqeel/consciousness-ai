export interface InternalState {
  threat: number       // 0.0 → 1.0
  familiarity: number  // 0.0 → 1.0
  energy: number       // 0.0 → 1.0
}

export interface Stimulus {
  id: string
  type: 'object' | 'sound' | 'social'
  intensity: number    // 0.0 → 1.0
  label: string
}

export interface Interpretation {
  perceivedThreat: number
  salience: number
  cognitiveAccess: number
  motorBias: 'approach' | 'freeze' | 'withdraw'
}

export type Action = 'observe' | 'approach' | 'flinch' | 'withdraw' | 'override'

export interface BrainRegion {
  id: string
  label: string
  activation: number   // 0.0 → 1.0
  color: string
  position: [number, number, number]
}

export interface CognitionFragment {
  id: string
  text: string
  intensity: number
  timestamp: number
}

export interface SomaticSignal {
  region: 'chest' | 'gut' | 'limbs' | 'head'
  intensity: number
  type: 'tension' | 'warmth' | 'cold' | 'pulse'
}
