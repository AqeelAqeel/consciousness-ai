import { create } from 'zustand'
import {
  InternalState,
  Stimulus,
  Interpretation,
  Action,
  CognitionFragment,
  SomaticSignal,
  BrainRegion,
} from '../engine/types'
import { interpret } from '../engine/interpret'
import { selectAction, getActionAvailability, ActionAvailability } from '../engine/actions'
import {
  explain,
  generateCognitionFragments,
  generateSomaticSignals,
  generateBrainRegions,
} from '../engine/narrate'

interface EngineStore {
  // Internal state
  state: InternalState
  setState: (partial: Partial<InternalState>) => void

  // Stimulus
  stimulus: Stimulus | null
  stimulusActive: boolean
  introduceStimulus: (stimulus: Stimulus) => void
  clearStimulus: () => void

  // Derived
  interpretation: Interpretation | null
  currentAction: Action
  actionAvailability: ActionAvailability[]
  narration: string
  cognitionFragments: CognitionFragment[]
  somaticSignals: SomaticSignal[]
  brainRegions: BrainRegion[]

  // Stimulus proximity (0–1, 1 = touching agent)
  stimulusProximity: number
  setProximity: (p: number) => void

  // Exposure counter for familiarity
  exposureCount: number

  // Recompute all derived state
  tick: () => void
}

const defaultState: InternalState = {
  threat: 0.2,
  familiarity: 0.1,
  energy: 0.8,
}

export const useStore = create<EngineStore>((set, get) => ({
  state: { ...defaultState },
  setState: (partial) => {
    set((s) => ({
      state: {
        threat: clamp(partial.threat ?? s.state.threat),
        familiarity: clamp(partial.familiarity ?? s.state.familiarity),
        energy: clamp(partial.energy ?? s.state.energy),
      },
    }))
    get().tick()
  },

  stimulus: null,
  stimulusActive: false,
  introduceStimulus: (stimulus) => {
    set((s) => ({
      stimulus,
      stimulusActive: true,
      exposureCount: s.exposureCount + 1,
    }))
    // Auto-increase familiarity slightly with each exposure
    const store = get()
    store.setState({
      familiarity: Math.min(1, store.state.familiarity + 0.05),
    })
  },
  clearStimulus: () => {
    set({ stimulus: null, stimulusActive: false })
    get().tick()
  },

  interpretation: null,
  currentAction: 'observe',
  actionAvailability: [],
  narration: 'Awaiting stimulus. Systems idle.',
  cognitionFragments: [],
  somaticSignals: [],
  brainRegions: generateBrainRegions(defaultState, {
    perceivedThreat: 0,
    salience: 0,
    cognitiveAccess: 0.8,
    motorBias: 'approach',
  }),

  stimulusProximity: 0,
  setProximity: (p) => {
    set({ stimulusProximity: clamp(p) })
    // Proximity affects threat
    const store = get()
    if (store.stimulusActive) {
      store.setState({ threat: clamp(store.state.threat * 0.7 + p * 0.3) })
    }
  },

  exposureCount: 0,

  tick: () => {
    const { state, stimulus, stimulusActive } = get()

    if (!stimulus || !stimulusActive) {
      const idleInterp: Interpretation = {
        perceivedThreat: state.threat * 0.3,
        salience: 0.1,
        cognitiveAccess: state.energy * (1 - state.threat * 0.3),
        motorBias: 'approach',
      }
      set({
        interpretation: idleInterp,
        currentAction: 'observe',
        actionAvailability: getActionAvailability(idleInterp, state),
        narration: explain(state, null, 'observe'),
        cognitionFragments: generateCognitionFragments(state, idleInterp, null),
        somaticSignals: generateSomaticSignals(state, idleInterp),
        brainRegions: generateBrainRegions(state, idleInterp),
      })
      return
    }

    const interp = interpret(stimulus, state)
    const action = selectAction(interp)
    const availability = getActionAvailability(interp, state)
    const narration = explain(state, stimulus, action)
    const fragments = generateCognitionFragments(state, interp, stimulus)
    const somatic = generateSomaticSignals(state, interp)
    const regions = generateBrainRegions(state, interp)

    set({
      interpretation: interp,
      currentAction: action,
      actionAvailability: availability,
      narration,
      cognitionFragments: fragments,
      somaticSignals: somatic,
      brainRegions: regions,
    })
  },
}))

function clamp(v: number, min = 0, max = 1): number {
  return Math.max(min, Math.min(max, v))
}
