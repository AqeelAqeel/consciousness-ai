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
import { interpret, type LearnedContext } from '../engine/interpret'
import { selectAction, getActionAvailability, ActionAvailability } from '../engine/actions'
import {
  explain,
  generateCognitionFragments,
  generateSomaticSignals,
  generateBrainRegions,
  type BrainContext,
  type LearningContext,
} from '../engine/narrate'
import { BodyState, createDefaultBodyState } from '../engine/bodyTypes'
import { computeBodyState } from '../engine/body'
import { LLMService } from '../services/llm'

// ── Chat ──
export interface ChatMessage {
  id: string
  role: 'user' | 'agent'
  text: string
  timestamp: number
  stateSnapshot?: InternalState
  fallback?: boolean
}

// ── Thought ──
export interface ThoughtEntry {
  id: string
  text: string
  timestamp: number
  source: 'autonomous' | 'reactive'
}

// ── Association / Interpretation Log ──
export interface AssociationEntry {
  id: string
  timestamp: number
  trigger: string
  interpretation: string
  valence: 'positive' | 'negative' | 'neutral'
  connections: string[]
  intensity: number
  category?: 'impact' | 'social' | 'environment' | 'internal' | 'learning'
}

// ── Learned Patterns (accumulated knowledge from experience) ──
export interface LearnedPattern {
  id: string
  category: string               // e.g. 'projectile-baseball', 'social-threat', 'environment-dark'
  label: string                  // human-readable label
  exposureCount: number          // how many times experienced
  totalIntensity: number         // accumulated intensity across exposures
  lastSeen: number               // timestamp
  firstSeen: number              // timestamp
  threatBias: number             // -1 to 1: how much this pattern biases threat perception
  familiarity: number            // 0-1: how familiar the agent is with this pattern
  survivalRelevance: number      // 0-1: how relevant to survival
  learnedResponse: string        // what the agent has learned to do
  connections: string[]          // related brain systems
}

// ── Scenario ──
export interface Scenario {
  id: string
  label: string
  description: string
  stateModifier: Partial<InternalState>
  stimulus: Stimulus
}

export const SCENARIOS: Scenario[] = [
  {
    id: 'dark-alley',
    label: 'Dark Alley',
    description: 'Walking alone at night, footsteps behind you',
    stateModifier: { threat: 0.7, energy: 0.6 },
    stimulus: { id: 'footsteps', type: 'sound', intensity: 0.75, label: 'Footsteps' },
  },
  {
    id: 'reunion',
    label: 'Old Friend',
    description: 'Unexpected encounter with a childhood friend',
    stateModifier: { threat: 0.05, familiarity: 0.8, energy: 0.9 },
    stimulus: { id: 'friend', type: 'social', intensity: 0.5, label: 'Familiar Face' },
  },
  {
    id: 'presentation',
    label: 'Big Stage',
    description: 'Speaking to 500 people, spotlight on you',
    stateModifier: { threat: 0.5, familiarity: 0.2, energy: 0.7 },
    stimulus: { id: 'crowd', type: 'social', intensity: 0.7, label: 'Watching Crowd' },
  },
  {
    id: 'hunger',
    label: 'Starving',
    description: 'Haven\'t eaten in 36 hours, smell of food nearby',
    stateModifier: { threat: 0.1, energy: 0.25 },
    stimulus: { id: 'food-smell', type: 'object', intensity: 0.6, label: 'Food Scent' },
  },
  {
    id: 'flow-state',
    label: 'Flow State',
    description: 'Deep in creative work, everything clicking',
    stateModifier: { threat: 0.02, familiarity: 0.6, energy: 0.95 },
    stimulus: { id: 'creation', type: 'object', intensity: 0.3, label: 'Creative Work' },
  },
]

interface EngineStore {
  // Internal state
  state: InternalState
  setState: (partial: Partial<InternalState>) => void

  // Chat
  chatMessages: ChatMessage[]
  sendMessage: (text: string) => Promise<void>
  isChatting: boolean

  // Thought stream
  thoughts: ThoughtEntry[]
  isThinking: boolean
  thoughtLoopActive: boolean
  startThoughtLoop: () => void
  stopThoughtLoop: () => void
  generateThought: () => Promise<void>

  // Scenarios
  activeScenario: Scenario | null
  activateScenario: (scenario: Scenario) => void

  // Associations & Learning
  associations: AssociationEntry[]
  learnedPatterns: LearnedPattern[]
  registerProjectileHit: (projectileType: string, mass: number) => void
  getLearnedThreatBias: () => number
  getLearnedFamiliarity: (category: string) => number

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
  bodyState: BodyState

  // Stimulus proximity
  stimulusProximity: number
  setProximity: (p: number) => void

  exposureCount: number

  // Reactive events (impacts, chat reactions, etc.)
  recentImpact: { intensity: number; timestamp: number; source: 'projectile' | 'chat' | 'scenario' } | null
  registerImpact: (intensity: number, source: 'projectile' | 'chat' | 'scenario') => void
  recentChatActivity: number  // 0-1, decays over time — how recently a chat exchange happened
  registerChatActivity: () => void

  // Session tracking
  sessionStartedAt: number   // timestamp of first meaningful action (0 = pristine)
  markSessionStarted: () => void

  // Full reset
  resetAll: () => void

  tick: () => void
}

const defaultState: InternalState = {
  threat: 0.2,
  familiarity: 0.1,
  energy: 0.8,
}

let msgCounter = 0
let assocCounter = 0
let thoughtCounter = 0
let thoughtTimerId: ReturnType<typeof setTimeout> | null = null

function getSceneContext(
  state: InternalState,
  interp: Interpretation | null,
  associations?: AssociationEntry[],
  learnedPatterns?: LearnedPattern[],
  extra?: string,
): string {
  const lines = [
    `Threat: ${(state.threat * 100).toFixed(0)}% | Familiarity: ${(state.familiarity * 100).toFixed(0)}% | Energy: ${(state.energy * 100).toFixed(0)}%`,
    `Perceived threat: ${interp ? (interp.perceivedThreat * 100).toFixed(0) + '%' : 'unknown'}`,
    `Cognitive access: ${interp ? (interp.cognitiveAccess * 100).toFixed(0) + '%' : 'unknown'}`,
    `Motor bias: ${interp?.motorBias || 'none'}`,
    `Dominant heuristic: ${getDominantHeuristic(state)}`,
  ]

  // Include recent learning/associations for consciousness context
  if (associations && associations.length > 0) {
    const recent = associations.slice(-5)
    lines.push('')
    lines.push('Recent experiences & associations:')
    for (const a of recent) {
      const age = Math.round((Date.now() - a.timestamp) / 1000)
      lines.push(`  - [${age}s ago] ${a.interpretation} (${a.valence}, intensity: ${(a.intensity * 100).toFixed(0)}%)`)
    }
  }

  // Include accumulated learned patterns
  if (learnedPatterns && learnedPatterns.length > 0) {
    const significant = learnedPatterns.filter((p) => p.exposureCount >= 1).sort((a, b) => b.exposureCount - a.exposureCount).slice(0, 6)
    if (significant.length > 0) {
      lines.push('')
      lines.push('Learned patterns (from accumulated experience):')
      for (const p of significant) {
        const recency = Math.round((Date.now() - p.lastSeen) / 1000)
        lines.push(`  - "${p.label}": experienced ${p.exposureCount}x, threat bias: ${p.threatBias > 0 ? '+' : ''}${(p.threatBias * 100).toFixed(0)}%, familiarity: ${(p.familiarity * 100).toFixed(0)}%, last: ${recency}s ago`)
        lines.push(`    Learned: ${p.learnedResponse}`)
      }
    }
  }

  if (extra) lines.push(extra)
  return lines.join('\n')
}

/** Determine which ISV dimension is currently dominating the agent's behavior */
function getDominantHeuristic(state: InternalState): string {
  if (state.threat > 0.6) return 'threat-dominant (survival mode)'
  if (state.energy < 0.3) return 'energy-depleted (conservation mode)'
  if (state.familiarity > 0.7) return 'familiarity-high (exploration mode)'
  if (state.threat > 0.35) return 'threat-elevated (vigilance mode)'
  if (state.energy > 0.7 && state.threat < 0.2) return 'optimal (full cognitive access)'
  return 'balanced (monitoring)'
}

// ── Agent response generation (state-conditioned by ISV heuristics) ──
function generateAgentResponse(text: string, state: InternalState, interp: Interpretation | null): { response: string; associations: AssociationEntry[] } {
  const threat = interp?.perceivedThreat ?? state.threat
  const cognitive = interp?.cognitiveAccess ?? state.energy
  const associations: AssociationEntry[] = []

  let response: string

  if (threat > 0.7) {
    response = "I can't focus on that right now. Something feels wrong. Every signal is telling me to be careful."
    associations.push({
      id: `assoc-${++assocCounter}`, timestamp: Date.now(),
      trigger: text, interpretation: 'Threat overrides cognitive processing',
      valence: 'negative', connections: ['amygdala', 'fight-or-flight', 'survival'],
      intensity: threat,
    })
  } else if (cognitive < 0.3) {
    response = "I'm... having trouble thinking clearly. Too depleted. The words are there but I can't reach them."
    associations.push({
      id: `assoc-${++assocCounter}`, timestamp: Date.now(),
      trigger: text, interpretation: 'Cognitive resources depleted',
      valence: 'negative', connections: ['fatigue', 'executive-function', 'prefrontal'],
      intensity: 0.8,
    })
  } else if (state.energy < 0.3) {
    response = "It's hard to engage right now. My resources are too low. Everything filters through exhaustion."
    associations.push({
      id: `assoc-${++assocCounter}`, timestamp: Date.now(),
      trigger: text, interpretation: 'Energy depletion dominating attention',
      valence: 'negative', connections: ['fatigue', 'conservation', 'hypothalamus'],
      intensity: 0.7,
    })
  } else if (threat > 0.4) {
    response = "I hear you, but part of me is scanning for threats. It's like trying to read while someone's watching you."
    associations.push({
      id: `assoc-${++assocCounter}`, timestamp: Date.now(),
      trigger: text, interpretation: 'Elevated threat fragmenting attention',
      valence: 'negative', connections: ['vigilance', 'amygdala', 'cortisol'],
      intensity: 0.6,
    })
  } else if (state.familiarity > 0.7) {
    response = "Yes, I recognize this pattern. It maps to something I've seen before. I can engage with it more freely now."
    associations.push({
      id: `assoc-${++assocCounter}`, timestamp: Date.now(),
      trigger: text, interpretation: 'Pattern recognized — familiarity enables exploration',
      valence: 'positive', connections: ['hippocampus', 'pattern-matching', 'memory'],
      intensity: 0.5,
    })
  } else if (cognitive > 0.7 && threat < 0.2) {
    response = "I'm tracking clearly. Full cognitive access. I can hold multiple threads and see how they connect."
    associations.push({
      id: `assoc-${++assocCounter}`, timestamp: Date.now(),
      trigger: text, interpretation: 'Optimal processing — high cognitive access, low threat',
      valence: 'positive', connections: ['prefrontal', 'working-memory', 'integration'],
      intensity: 0.4,
    })
  } else {
    response = "Processing... I'm weighing this against what I know. There's enough bandwidth to engage, but I'm staying alert."
    associations.push({
      id: `assoc-${++assocCounter}`, timestamp: Date.now(),
      trigger: text, interpretation: 'Balanced processing with moderate vigilance',
      valence: 'neutral', connections: ['attention', 'salience-network', 'evaluation'],
      intensity: 0.5,
    })
  }

  // Add context about what the user said
  const lowerText = text.toLowerCase()
  if (lowerText.includes('afraid') || lowerText.includes('fear') || lowerText.includes('scared')) {
    associations.push({
      id: `assoc-${++assocCounter}`, timestamp: Date.now(),
      trigger: 'fear keyword', interpretation: 'Emotional resonance detected — fear circuits activating',
      valence: 'negative', connections: ['amygdala', 'fear-conditioning', 'arousal'],
      intensity: 0.7,
    })
  }
  if (lowerText.includes('safe') || lowerText.includes('calm') || lowerText.includes('peace')) {
    associations.push({
      id: `assoc-${++assocCounter}`, timestamp: Date.now(),
      trigger: 'safety keyword', interpretation: 'Down-regulation signal — parasympathetic activation',
      valence: 'positive', connections: ['vagus-nerve', 'prefrontal', 'serotonin'],
      intensity: 0.4,
    })
  }

  return { response, associations }
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

  // ── Chat ──
  chatMessages: [],
  isChatting: false,
  sendMessage: async (text) => {
    const store = get()
    if (store.isChatting) return
    get().markSessionStarted()

    const userMsg: ChatMessage = {
      id: `msg-${++msgCounter}`,
      role: 'user',
      text,
      timestamp: Date.now(),
    }

    // Analyze text for state influence (keep keyword-based state mutations)
    const lower = text.toLowerCase()
    const stateChanges: Partial<InternalState> = {}
    if (lower.includes('threat') || lower.includes('danger') || lower.includes('attack') || lower.includes('fear')) {
      stateChanges.threat = Math.min(1, store.state.threat + 0.15)
    }
    if (lower.includes('safe') || lower.includes('calm') || lower.includes('relax') || lower.includes('peace')) {
      stateChanges.threat = Math.max(0, store.state.threat - 0.15)
    }
    if (lower.includes('friend') || lower.includes('know') || lower.includes('remember') || lower.includes('familiar')) {
      stateChanges.familiarity = Math.min(1, store.state.familiarity + 0.1)
    }
    if (lower.includes('tired') || lower.includes('exhaust') || lower.includes('sleep') || lower.includes('drain')) {
      stateChanges.energy = Math.max(0, store.state.energy - 0.15)
    }
    if (lower.includes('energy') || lower.includes('awake') || lower.includes('alert') || lower.includes('focus')) {
      stateChanges.energy = Math.min(1, store.state.energy + 0.1)
    }

    const newState = { ...store.state, ...stateChanges }

    set((s) => ({
      state: newState,
      chatMessages: [...s.chatMessages, userMsg],
      isChatting: true,
      recentChatActivity: 1.0,
    }))

    // Build history for LLM
    const history = store.chatMessages.slice(-10).map((m) => ({
      role: m.role === 'user' ? 'user' as const : 'assistant' as const,
      content: m.text,
    }))

    const ctx = getSceneContext(newState, store.interpretation, store.associations, store.learnedPatterns)

    try {
      const response = await LLMService.chat(text, history, ctx)

      const agentMsg: ChatMessage = {
        id: `msg-${++msgCounter}`,
        role: 'agent',
        text: response,
        timestamp: Date.now(),
        stateSnapshot: { ...get().state },
      }
      set((s) => ({ chatMessages: [...s.chatMessages, agentMsg], isChatting: false }))

      // Generate reactive thought about this exchange
      const currentStore = get()
      const reactiveCtx = getSceneContext(currentStore.state, currentStore.interpretation, currentStore.associations, currentStore.learnedPatterns)
      LLMService.reactToChat(text, response, reactiveCtx).then((thought) => {
        if (thought) {
          set((s) => ({
            thoughts: [...s.thoughts.slice(-50), {
              id: `thought-${++thoughtCounter}`,
              text: thought,
              timestamp: Date.now(),
              source: 'reactive' as const,
            }],
          }))
        }
      }).catch(() => {})
    } catch (err) {
      console.warn('[Chat] LLM API failed, using fallback:', err)
      // Fallback to rule-based response
      const currentStore = get()
      const { response, associations: newAssocs } = generateAgentResponse(
        text, currentStore.state, currentStore.interpretation,
      )
      const agentMsg: ChatMessage = {
        id: `msg-${++msgCounter}`,
        role: 'agent',
        text: response,
        timestamp: Date.now(),
        stateSnapshot: { ...currentStore.state },
        fallback: true,
      }
      set((s) => ({
        chatMessages: [...s.chatMessages, agentMsg],
        associations: [...s.associations.slice(-20), ...newAssocs],
        isChatting: false,
      }))
    }

    get().tick()
  },

  // ── Thought stream ──
  thoughts: [],
  isThinking: false,
  thoughtLoopActive: false,

  generateThought: async () => {
    const store = get()
    if (store.isThinking) return

    set({ isThinking: true })
    const ctx = getSceneContext(
      store.state,
      store.interpretation,
      store.associations,
      store.learnedPatterns,
      store.activeScenario ? `Active scenario: ${store.activeScenario.label} — ${store.activeScenario.description}` : undefined,
    )

    try {
      const thought = await LLMService.think(ctx)
      if (thought) {
        set((s) => ({
          thoughts: [...s.thoughts.slice(-50), {
            id: `thought-${++thoughtCounter}`,
            text: thought,
            timestamp: Date.now(),
            source: 'autonomous' as const,
          }],
          isThinking: false,
        }))
      } else {
        set({ isThinking: false })
      }
    } catch {
      set({ isThinking: false })
    }
  },

  startThoughtLoop: () => {
    const store = get()
    if (store.thoughtLoopActive) return
    set({ thoughtLoopActive: true })

    function scheduleNext() {
      const delay = 8000 + Math.random() * 7000 // 8-15 seconds
      thoughtTimerId = setTimeout(async () => {
        const s = get()
        if (!s.thoughtLoopActive) return
        await s.generateThought()
        if (get().thoughtLoopActive) scheduleNext()
      }, delay)
    }
    // Generate first thought quickly
    get().generateThought()
    scheduleNext()
  },

  stopThoughtLoop: () => {
    set({ thoughtLoopActive: false })
    if (thoughtTimerId) {
      clearTimeout(thoughtTimerId)
      thoughtTimerId = null
    }
  },

  // ── Scenarios ──
  activeScenario: null,
  activateScenario: (scenario) => {
    const store = get()
    get().markSessionStarted()

    // Apply state modifier directly to ISV
    const newState = { ...store.state, ...scenario.stateModifier }

    set({
      activeScenario: scenario,
      state: {
        threat: clamp(newState.threat),
        familiarity: clamp(newState.familiarity),
        energy: clamp(newState.energy),
      },
      stimulus: scenario.stimulus,
      stimulusActive: true,
      exposureCount: store.exposureCount + 1,
    })

    // Log association
    set((s) => ({
      associations: [...s.associations, {
        id: `assoc-${++assocCounter}`,
        timestamp: Date.now(),
        trigger: scenario.label,
        interpretation: scenario.description,
        valence: (scenario.stateModifier.threat ?? 0) > 0.4 ? 'negative' as const : 'neutral' as const,
        connections: ['scenario', 'context-shift', scenario.stimulus.type],
        intensity: scenario.stimulus.intensity,
      }],
    }))

    // Register scenario as an impact event for brain activation
    get().registerImpact(scenario.stimulus.intensity, 'scenario')
    get().tick()
  },

  // ── Associations & Learning ──
  associations: [],
  learnedPatterns: [],

  registerProjectileHit: (projectileType, mass) => {
    const store = get()
    get().markSessionStarted()
    const category = `projectile-${projectileType}`
    const now = Date.now()

    // Update or create learned pattern
    const existingIdx = store.learnedPatterns.findIndex((p) => p.category === category)
    const newPatterns = [...store.learnedPatterns]

    if (existingIdx >= 0) {
      const existing = newPatterns[existingIdx]
      const newCount = existing.exposureCount + 1
      const newFamiliarity = Math.min(1, existing.familiarity + 0.1)
      const newThreatBias = Math.min(1, existing.threatBias + 0.05 * (1 - existing.familiarity))
      const newSurvival = Math.min(1, existing.survivalRelevance + 0.08)

      // Evolved learned response based on exposure count
      let learnedResponse = existing.learnedResponse
      if (newCount >= 5 && newCount < 10) {
        learnedResponse = `Recognize incoming ${projectileType} — brace and protect vital areas`
      } else if (newCount >= 10 && newCount < 20) {
        learnedResponse = `Anticipate ${projectileType} trajectory — pre-activate defensive motor sequence`
      } else if (newCount >= 20) {
        learnedResponse = `Fully conditioned: ${projectileType} triggers automatic evasion reflex. Survival instinct embedded.`
      }

      newPatterns[existingIdx] = {
        ...existing,
        exposureCount: newCount,
        totalIntensity: existing.totalIntensity + mass,
        lastSeen: now,
        threatBias: newThreatBias,
        familiarity: newFamiliarity,
        survivalRelevance: newSurvival,
        learnedResponse,
      }
    } else {
      newPatterns.push({
        id: `pattern-${category}`,
        category,
        label: `${projectileType} impact`,
        exposureCount: 1,
        totalIntensity: mass,
        firstSeen: now,
        lastSeen: now,
        threatBias: 0.2,
        familiarity: 0.05,
        survivalRelevance: 0.3,
        learnedResponse: `New stimulus: ${projectileType} caused physical impact — cataloging as potential threat`,
        connections: ['amygdala', 'somatosensory', 'motor-cortex', 'hippocampus'],
      })
    }

    // Also create a general "projectile" pattern for cross-type learning
    const generalIdx = newPatterns.findIndex((p) => p.category === 'projectile-general')
    if (generalIdx >= 0) {
      const gen = newPatterns[generalIdx]
      const count = gen.exposureCount + 1
      newPatterns[generalIdx] = {
        ...gen,
        exposureCount: count,
        totalIntensity: gen.totalIntensity + mass,
        lastSeen: now,
        threatBias: Math.min(1, gen.threatBias + 0.03),
        familiarity: Math.min(1, gen.familiarity + 0.06),
        survivalRelevance: Math.min(1, gen.survivalRelevance + 0.05),
        learnedResponse: count > 10
          ? 'Objects approaching at velocity = danger. Core survival pattern: dodge, brace, protect.'
          : count > 3
            ? 'Incoming objects are consistently harmful — elevated baseline vigilance for aerial threats'
            : 'Projectile impacts detected — monitoring for patterns',
      }
    } else {
      newPatterns.push({
        id: 'pattern-projectile-general',
        category: 'projectile-general',
        label: 'Incoming projectiles',
        exposureCount: 1,
        totalIntensity: mass,
        firstSeen: now,
        lastSeen: now,
        threatBias: 0.15,
        familiarity: 0.05,
        survivalRelevance: 0.25,
        learnedResponse: 'First projectile impact detected — cataloging as potential environmental hazard',
        connections: ['visual-cortex', 'amygdala', 'motor-cortex', 'cerebellum'],
      })
    }

    // Create real-time association entry
    const pattern = newPatterns.find((p) => p.category === category)!
    const assocInterpretation = pattern.exposureCount <= 1
      ? `First encounter: ${projectileType} struck body — threat registered, pain signal processed`
      : pattern.exposureCount <= 3
        ? `Repeated ${projectileType} impact — building threat association. Learning defensive posture.`
        : pattern.exposureCount <= 8
          ? `Pattern recognized: ${projectileType} is a recurring threat (${pattern.exposureCount}x). Motor cortex pre-activating flinch sequence.`
          : `Conditioned response: ${projectileType} detected → automatic defensive cascade. Survival learning embedded (${pattern.exposureCount}x exposure).`

    const newAssociation: AssociationEntry = {
      id: `assoc-${++assocCounter}`,
      timestamp: now,
      trigger: `${projectileType} impact (mass: ${mass.toFixed(1)})`,
      interpretation: assocInterpretation,
      valence: 'negative',
      connections: ['amygdala', 'somatosensory', 'motor-cortex', 'hippocampus', 'cerebellum'],
      intensity: Math.min(1, 0.4 + mass * 0.1),
      category: 'impact',
    }

    // Learning also increases familiarity over time (you know what to expect)
    const learnedFam = store.learnedPatterns.reduce(
      (sum, p) => sum + p.familiarity * 0.05, 0
    )

    set({
      learnedPatterns: newPatterns,
      associations: [...store.associations.slice(-30), newAssociation],
    })

    // Boost familiarity slightly from learning (you know what's coming)
    if (learnedFam > 0.02) {
      store.setState({
        familiarity: Math.min(1, store.state.familiarity + learnedFam),
      })
    }
  },

  getLearnedThreatBias: () => {
    const patterns = get().learnedPatterns
    if (patterns.length === 0) return 0
    // Weighted average of threat biases, weighted by exposure and recency
    const now = Date.now()
    let totalWeight = 0
    let totalBias = 0
    for (const p of patterns) {
      const recency = Math.max(0, 1 - (now - p.lastSeen) / 60000) // decay over 1 minute
      const weight = p.exposureCount * (0.3 + recency * 0.7) * p.survivalRelevance
      totalWeight += weight
      totalBias += p.threatBias * weight
    }
    return totalWeight > 0 ? totalBias / totalWeight : 0
  },

  getLearnedFamiliarity: (category) => {
    const pattern = get().learnedPatterns.find((p) => p.category === category)
    return pattern?.familiarity ?? 0
  },

  // ── Stimulus ──
  stimulus: null,
  stimulusActive: false,
  introduceStimulus: (stimulus) => {
    set((s) => ({
      stimulus,
      stimulusActive: true,
      exposureCount: s.exposureCount + 1,
    }))
    const store = get()
    store.setState({
      familiarity: Math.min(1, store.state.familiarity + 0.05),
    })
  },
  clearStimulus: () => {
    set({ stimulus: null, stimulusActive: false, activeScenario: null })
    get().tick()
  },

  // ── Derived ──
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
  bodyState: createDefaultBodyState(),

  stimulusProximity: 0,
  setProximity: (p) => {
    set({ stimulusProximity: clamp(p) })
    const store = get()
    if (store.stimulusActive) {
      store.setState({ threat: clamp(store.state.threat * 0.7 + p * 0.3) })
    }
  },

  exposureCount: 0,

  recentImpact: null,
  registerImpact: (intensity, source) => {
    set({ recentImpact: { intensity: clamp(intensity), timestamp: Date.now(), source } })
    get().tick()
  },

  recentChatActivity: 0,
  registerChatActivity: () => {
    set({ recentChatActivity: 1.0 })
    get().tick()
  },

  // ── Session tracking ──
  sessionStartedAt: 0,
  markSessionStarted: () => {
    const store = get()
    if (store.sessionStartedAt === 0) {
      set({ sessionStartedAt: Date.now() })
    }
  },

  // ── Full reset (back to time 0) ──
  resetAll: () => {
    // Stop thought loop before resetting
    const store = get()
    store.stopThoughtLoop()

    // Reset counters
    msgCounter = 0
    assocCounter = 0
    thoughtCounter = 0

    set({
      state: { ...defaultState },
      chatMessages: [],
      isChatting: false,
      thoughts: [],
      isThinking: false,
      thoughtLoopActive: false,
      activeScenario: null,
      associations: [],
      learnedPatterns: [],
      stimulus: null,
      stimulusActive: false,
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
      bodyState: createDefaultBodyState(),
      stimulusProximity: 0,
      exposureCount: 0,
      recentImpact: null,
      recentChatActivity: 0,
      sessionStartedAt: 0,
    })

    // Restart thought loop
    get().startThoughtLoop()
    get().tick()
  },

  tick: () => {
    const { state, stimulus, stimulusActive, recentImpact, recentChatActivity, learnedPatterns } = get()

    // Decay chat activity
    if (recentChatActivity > 0) {
      set({ recentChatActivity: Math.max(0, recentChatActivity - 0.02) })
    }

    // Build brain context from recent events
    const brainCtx: BrainContext = {
      recentImpact,
      chatActivity: recentChatActivity,
    }

    // Build learned context for interpretation pipeline
    const learnedCtx: LearnedContext = {
      threatBias: get().getLearnedThreatBias(),
      learnedFamiliarity: learnedPatterns.reduce((max, p) => Math.max(max, p.familiarity), 0),
      totalExposures: learnedPatterns.reduce((sum, p) => sum + p.exposureCount, 0),
      survivalRelevance: learnedPatterns.reduce((max, p) => Math.max(max, p.survivalRelevance), 0),
    }

    // Build learning context for cognition fragments
    const learningCtx: LearningContext = {
      totalExposures: learnedCtx.totalExposures,
      survivalRelevance: learnedCtx.survivalRelevance,
      learnedFamiliarity: learnedCtx.learnedFamiliarity,
      recentHit: recentImpact !== null && (Date.now() - recentImpact.timestamp) < 2000 && recentImpact.source === 'projectile',
    }

    if (!stimulus || !stimulusActive) {
      const idleInterp: Interpretation = {
        perceivedThreat: state.threat * 0.3,
        salience: 0.1,
        cognitiveAccess: state.energy * (1 - state.threat * 0.3),
        motorBias: 'approach',
      }
      const idleSomatic = generateSomaticSignals(state, idleInterp)
      const idleRegions = generateBrainRegions(state, idleInterp, brainCtx)
      set({
        interpretation: idleInterp,
        currentAction: 'observe',
        actionAvailability: getActionAvailability(idleInterp, state),
        narration: explain(state, null, 'observe'),
        cognitionFragments: generateCognitionFragments(state, idleInterp, null, learningCtx),
        somaticSignals: idleSomatic,
        brainRegions: idleRegions,
        bodyState: computeBodyState(state, idleInterp, 'observe', idleSomatic, idleRegions),
      })
      return
    }

    const interp = interpret(stimulus, state, learnedCtx)
    const action = selectAction(interp)
    const availability = getActionAvailability(interp, state)
    const narration = explain(state, stimulus, action)
    const fragments = generateCognitionFragments(state, interp, stimulus, learningCtx)
    const somatic = generateSomaticSignals(state, interp)
    const regions = generateBrainRegions(state, interp, brainCtx)

    set({
      interpretation: interp,
      currentAction: action,
      actionAvailability: availability,
      narration,
      cognitionFragments: fragments,
      somaticSignals: somatic,
      brainRegions: regions,
      bodyState: computeBodyState(state, interp, action, somatic, regions),
    })
  },
}))

function clamp(v: number, min = 0, max = 1): number {
  return Math.max(min, Math.min(max, v))
}
