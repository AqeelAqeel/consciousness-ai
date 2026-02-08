import { create } from 'zustand'
import { useStore } from './useStore'
import { useYeetStore } from './useYeetStore'
import type { ProjectileType } from './useYeetStore'

// ── Step types that can be sequenced in a simulation ──
export type SimStep =
  | { type: 'narrate'; text: string; delay: number }
  | { type: 'set_state'; threat?: number; familiarity?: number; energy?: number; narration: string; delay: number }
  | { type: 'chat'; message: string; narration: string; delay: number }
  | { type: 'yeet'; projectile: ProjectileType; count?: number; spread?: number; narration: string; delay: number }
  | { type: 'scenario'; scenarioId: string; narration: string; delay: number }
  | { type: 'clear'; narration: string; delay: number }
  | { type: 'pause'; duration: number; narration: string }

export interface Simulation {
  id: string
  label: string
  icon: string
  description: string
  color: string       // accent color for the button
  steps: SimStep[]
}

// ═══════════════════════════════════════════════════
//  SIMULATION 1: "Under Siege" — escalating threat
// ═══════════════════════════════════════════════════
const underSiege: Simulation = {
  id: 'under-siege',
  label: 'Under Siege',
  icon: '⚡',
  description: 'Escalating threat: watch the agent go from calm to overwhelmed as projectiles and probing questions pile up.',
  color: '#ff4444',
  steps: [
    { type: 'narrate', text: 'Resetting agent to calm baseline...', delay: 0 },
    { type: 'set_state', threat: 0.05, familiarity: 0.1, energy: 0.9, narration: 'Baseline: low threat, high energy, full cognitive access', delay: 500 },
    { type: 'clear', narration: 'Clearing any active stimuli', delay: 800 },
    { type: 'pause', duration: 1500, narration: 'Agent is calm. Systems nominal. Observing...' },

    { type: 'chat', message: 'Hello. How are you feeling right now?', narration: 'First contact — probing baseline awareness', delay: 500 },
    { type: 'pause', duration: 3500, narration: 'Agent responds with full cognitive access — note the calm tone' },

    { type: 'narrate', text: 'Introducing first physical stimulus...', delay: 300 },
    { type: 'yeet', projectile: 'baseball', narration: 'Incoming: baseball. Watch threat spike on impact', delay: 500 },
    { type: 'pause', duration: 2500, narration: 'Threat rises. Body tenses. Brain amygdala activating...' },

    { type: 'chat', message: 'Did you feel that? Something just hit you.', narration: 'Probing: is the agent aware of the impact?', delay: 500 },
    { type: 'pause', duration: 3000, narration: 'Response shifts — threat now colors the agent\'s words' },

    { type: 'narrate', text: 'Escalating: barrage incoming...', delay: 300 },
    { type: 'yeet', projectile: 'bowling', narration: 'Heavy projectile: bowling ball', delay: 400 },
    { type: 'pause', duration: 1200, narration: 'Impact! Threat climbing...' },
    { type: 'yeet', projectile: 'watermelon', narration: 'Another one — watermelon', delay: 400 },
    { type: 'pause', duration: 1200, narration: 'Sustained bombardment. Motor bias shifting to withdrawal.' },
    { type: 'yeet', projectile: 'anvil', narration: 'Maximum threat: anvil incoming', delay: 400 },
    { type: 'pause', duration: 2000, narration: 'Agent is under extreme stress. Cognitive access collapsing.' },

    { type: 'chat', message: 'Are you afraid? Can you still think clearly?', narration: 'Testing: can the agent introspect under high threat?', delay: 500 },
    { type: 'pause', duration: 3500, narration: 'Observe: threat-dominant state degrades reasoning quality' },

    { type: 'set_state', threat: 0.85, narration: 'Peak threat: survival mode fully engaged', delay: 300 },
    { type: 'pause', duration: 2000, narration: 'Brain visualization shows amygdala dominance. Somatic tension maximal.' },

    { type: 'narrate', text: '✓ Simulation complete — agent went from calm (5% threat) → overwhelmed (85% threat). Notice how responses, body posture, brain regions, and thoughts all shifted together.', delay: 0 },
  ],
}

// ═══════════════════════════════════════════════════
//  SIMULATION 2: "Learning Curve" — adaptation
// ═══════════════════════════════════════════════════
const learningCurve: Simulation = {
  id: 'learning-curve',
  label: 'Learning Curve',
  icon: '🧠',
  description: 'Repeated exposure: watch the agent build familiarity and learn defensive patterns from projectile impacts.',
  color: '#33cc66',
  steps: [
    { type: 'narrate', text: 'Resetting to fresh state — no learned patterns...', delay: 0 },
    { type: 'set_state', threat: 0.15, familiarity: 0.05, energy: 0.85, narration: 'Fresh agent: minimal familiarity, no prior learning', delay: 500 },
    { type: 'clear', narration: 'Clean slate', delay: 800 },
    { type: 'pause', duration: 1500, narration: 'Agent is naive. No exposure history. Watch the Learning panel...' },

    { type: 'chat', message: 'I\'m going to throw things at you. Pay attention to what happens.', narration: 'Warning the agent — establishing context', delay: 500 },
    { type: 'pause', duration: 3000, narration: 'Agent acknowledges. Baseline response recorded.' },

    { type: 'narrate', text: 'Exposure 1: first baseball...', delay: 300 },
    { type: 'yeet', projectile: 'baseball', narration: 'First impact — agent has no pattern for this yet', delay: 500 },
    { type: 'pause', duration: 2500, narration: 'New association forming: "baseball impact" → threat. Watch the Learning panel.' },

    { type: 'narrate', text: 'Exposure 2: same type again...', delay: 300 },
    { type: 'yeet', projectile: 'baseball', narration: 'Second baseball — beginning to build recognition', delay: 500 },
    { type: 'pause', duration: 2500, narration: 'Familiarity with baseballs increasing. Threat bias building.' },

    { type: 'narrate', text: 'Exposure 3: pattern solidifying...', delay: 300 },
    { type: 'yeet', projectile: 'baseball', narration: 'Third hit — pattern recognition strengthening', delay: 500 },
    { type: 'pause', duration: 2000, narration: 'The agent now anticipates baseballs. Motor cortex pre-activating.' },

    { type: 'chat', message: 'Do you notice what\'s happening? What are you learning?', narration: 'Testing metacognition: can it describe its own learning?', delay: 500 },
    { type: 'pause', duration: 3500, narration: 'Agent reflects on accumulated experience...' },

    { type: 'narrate', text: 'Exposure 4 & 5: rapid-fire...', delay: 300 },
    { type: 'yeet', projectile: 'baseball', narration: 'Fourth hit — defensive patterns deepening', delay: 400 },
    { type: 'pause', duration: 1500, narration: 'Conditioned response forming...' },
    { type: 'yeet', projectile: 'baseball', narration: 'Fifth hit — survival learning embedding', delay: 400 },
    { type: 'pause', duration: 2000, narration: 'Five exposures: threat bias and familiarity both elevated.' },

    { type: 'narrate', text: 'Now introducing a novel stimulus...', delay: 500 },
    { type: 'yeet', projectile: 'fish', narration: 'Curveball: a fish! Completely different.', delay: 500 },
    { type: 'pause', duration: 2500, narration: 'New pattern detected! But general "projectile" familiarity helps.' },

    { type: 'chat', message: 'That was different, wasn\'t it? How do you feel about new things versus familiar ones?', narration: 'Probing transfer learning — does general knowledge apply?', delay: 500 },
    { type: 'pause', duration: 3500, narration: 'Agent compares novel vs. familiar stimuli...' },

    { type: 'narrate', text: '✓ Simulation complete — the agent built learned patterns from repeated exposure. Familiarity increased, threat associations formed, and responses evolved from naive to conditioned.', delay: 0 },
  ],
}

// ═══════════════════════════════════════════════════
//  SIMULATION 3: "The Full Arc" — emotional journey
// ═══════════════════════════════════════════════════
const fullArc: Simulation = {
  id: 'full-arc',
  label: 'The Full Arc',
  icon: '🌊',
  description: 'Complete emotional journey: fear → crisis → rescue → calm → flow. Watch every panel transform.',
  color: '#4488ff',
  steps: [
    { type: 'narrate', text: 'Beginning the emotional arc...', delay: 0 },
    { type: 'set_state', threat: 0.1, familiarity: 0.15, energy: 0.7, narration: 'Starting neutral — slight unease', delay: 500 },
    { type: 'clear', narration: 'Clear scene', delay: 800 },
    { type: 'pause', duration: 1500, narration: 'Act 1: The agent exists in a neutral state. Slightly tense, aware.' },

    // Act 1: Rising fear
    { type: 'narrate', text: '— ACT 1: RISING FEAR —', delay: 300 },
    { type: 'scenario', scenarioId: 'dark-alley', narration: 'Dark Alley activated — footsteps in the dark', delay: 500 },
    { type: 'pause', duration: 2500, narration: 'Threat surges. Body withdraws. Brain shifts to vigilance mode.' },

    { type: 'chat', message: 'I think something is following me. I\'m scared.', narration: 'Injecting fear through social channel', delay: 500 },
    { type: 'pause', duration: 3000, narration: 'Agent processes fear — both its own state and the user\'s alarm' },

    { type: 'set_state', threat: 0.75, energy: 0.5, narration: 'Fear peaks: cognitive resources draining', delay: 300 },
    { type: 'yeet', projectile: 'bowling', narration: 'The threat materializes — physical impact!', delay: 500 },
    { type: 'pause', duration: 2500, narration: 'CRISIS: maximum threat, minimal cognitive access. Pure survival.' },

    { type: 'chat', message: 'We need to run! Can you think straight?', narration: 'Testing cognition under extreme stress', delay: 500 },
    { type: 'pause', duration: 3500, narration: 'Agent struggles to form coherent responses. Threat dominates everything.' },

    // Act 2: Rescue
    { type: 'narrate', text: '— ACT 2: RESCUE —', delay: 500 },
    { type: 'scenario', scenarioId: 'reunion', narration: 'Old Friend appears! Familiarity surges, threat drops', delay: 500 },
    { type: 'pause', duration: 3000, narration: 'Watch the dramatic ISV shift: threat plummets, familiarity soars' },

    { type: 'chat', message: 'Oh thank god, it\'s you! I thought we were done for.', narration: 'Relief floods in through social connection', delay: 500 },
    { type: 'pause', duration: 3000, narration: 'Agent\'s tone transforms. Warmth returns. Body relaxes.' },

    { type: 'set_state', threat: 0.08, familiarity: 0.75, energy: 0.8, narration: 'Safety restored. Parasympathetic activation.', delay: 300 },
    { type: 'pause', duration: 2500, narration: 'Down-regulation complete. Brain shifts from amygdala to prefrontal.' },

    // Act 3: Flow state
    { type: 'narrate', text: '— ACT 3: TRANSCENDENCE —', delay: 500 },
    { type: 'scenario', scenarioId: 'flow-state', narration: 'Flow State activated — everything clicks', delay: 500 },
    { type: 'pause', duration: 2500, narration: 'Optimal state: minimal threat, high energy, strong familiarity.' },

    { type: 'chat', message: 'How do you feel now compared to before? What was that whole experience like?', narration: 'Metacognitive reflection on the full arc', delay: 500 },
    { type: 'pause', duration: 4000, narration: 'Agent reflects on the journey: fear → crisis → rescue → peace' },

    { type: 'narrate', text: '✓ The Full Arc complete — the agent traveled through fear, crisis, rescue, and flow. Every system responded: body posture, brain regions, thoughts, chat responses, and somatic signals all transformed together across the arc.', delay: 0 },
  ],
}

// ═══════════════════════════════════════════════════
//  All simulations
// ═══════════════════════════════════════════════════
export const SIMULATIONS: Simulation[] = [underSiege, learningCurve, fullArc]

// ═══════════════════════════════════════════════════
//  Simulation runner store
// ═══════════════════════════════════════════════════
interface SimulationState {
  activeSim: Simulation | null
  currentStep: number
  totalSteps: number
  stepNarration: string
  isRunning: boolean
  isComplete: boolean
  log: Array<{ text: string; timestamp: number; type: 'narration' | 'action' | 'complete' }>

  runSimulation: (sim: Simulation) => void
  cancelSimulation: () => void
  resetAll: () => void
}

let cancelToken = { cancelled: false }

export const useSimulationStore = create<SimulationState>((set, get) => ({
  activeSim: null,
  currentStep: 0,
  totalSteps: 0,
  stepNarration: '',
  isRunning: false,
  isComplete: false,
  log: [],

  runSimulation: async (sim: Simulation) => {
    // Cancel any running sim
    cancelToken.cancelled = true
    cancelToken = { cancelled: false }
    const token = cancelToken

    // Mark session started
    useStore.getState().markSessionStarted()

    const { SCENARIOS } = await import('./useStore')

    set({
      activeSim: sim,
      currentStep: 0,
      totalSteps: sim.steps.length,
      stepNarration: `Starting: ${sim.label}`,
      isRunning: true,
      isComplete: false,
      log: [{ text: `▶ Starting simulation: ${sim.label}`, timestamp: Date.now(), type: 'narration' }],
    })

    for (let i = 0; i < sim.steps.length; i++) {
      if (token.cancelled) {
        set((s) => ({
          isRunning: false,
          stepNarration: 'Cancelled',
          log: [...s.log, { text: '✕ Simulation cancelled', timestamp: Date.now(), type: 'complete' }],
        }))
        return
      }

      const step = sim.steps[i]
      set({ currentStep: i + 1 })

      // Execute the step
      switch (step.type) {
        case 'narrate':
          set((s) => ({
            stepNarration: step.text,
            log: [...s.log, { text: step.text, timestamp: Date.now(), type: 'narration' }],
          }))
          if (step.delay > 0) await sleep(step.delay)
          break

        case 'set_state': {
          const changes: Record<string, number> = {}
          if (step.threat !== undefined) changes.threat = step.threat
          if (step.familiarity !== undefined) changes.familiarity = step.familiarity
          if (step.energy !== undefined) changes.energy = step.energy
          useStore.getState().setState(changes)
          set((s) => ({
            stepNarration: step.narration,
            log: [...s.log, { text: `⊕ ${step.narration}`, timestamp: Date.now(), type: 'action' }],
          }))
          if (step.delay > 0) await sleep(step.delay)
          break
        }

        case 'chat':
          set((s) => ({
            stepNarration: step.narration,
            log: [...s.log, { text: `💬 "${step.message}"`, timestamp: Date.now(), type: 'action' }],
          }))
          // Don't await the full sendMessage — let it play out naturally
          useStore.getState().sendMessage(step.message)
          if (step.delay > 0) await sleep(step.delay)
          break

        case 'yeet': {
          set((s) => ({
            stepNarration: step.narration,
            log: [...s.log, { text: `🎯 ${step.narration}`, timestamp: Date.now(), type: 'action' }],
          }))
          const count = step.count ?? 1
          useYeetStore.getState().setSelectedType(step.projectile)
          for (let j = 0; j < count; j++) {
            useYeetStore.getState().launch()
            if (j < count - 1) await sleep(200)
          }
          if (step.delay > 0) await sleep(step.delay)
          break
        }

        case 'scenario': {
          const scenario = SCENARIOS.find((s) => s.id === step.scenarioId)
          if (scenario) {
            useStore.getState().activateScenario(scenario)
          }
          set((s) => ({
            stepNarration: step.narration,
            log: [...s.log, { text: `🎭 ${step.narration}`, timestamp: Date.now(), type: 'action' }],
          }))
          if (step.delay > 0) await sleep(step.delay)
          break
        }

        case 'clear':
          useStore.getState().clearStimulus()
          set((s) => ({
            stepNarration: step.narration,
            log: [...s.log, { text: `○ ${step.narration}`, timestamp: Date.now(), type: 'action' }],
          }))
          if (step.delay > 0) await sleep(step.delay)
          break

        case 'pause':
          set((s) => ({
            stepNarration: step.narration,
            log: [...s.log, { text: `… ${step.narration}`, timestamp: Date.now(), type: 'narration' }],
          }))
          await sleep(step.duration)
          break
      }
    }

    // Done
    if (!token.cancelled) {
      set((s) => ({
        isRunning: false,
        isComplete: true,
        stepNarration: 'Simulation complete',
        log: [...s.log, { text: '✓ Simulation complete', timestamp: Date.now(), type: 'complete' }],
      }))
    }
  },

  cancelSimulation: () => {
    cancelToken.cancelled = true
    set({
      isRunning: false,
      isComplete: false,
      stepNarration: 'Cancelled',
    })
  },

  resetAll: () => {
    cancelToken.cancelled = true
    set({
      activeSim: null,
      currentStep: 0,
      totalSteps: 0,
      stepNarration: '',
      isRunning: false,
      isComplete: false,
      log: [],
    })
  },
}))

function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms))
}
