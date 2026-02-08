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

// ── Cognition (emerges from accumulated learning) ──
export interface CognitionState {
  /** Overall consciousness level 0–1 (computed from all three buckets) */
  awarenessLevel: number
  /** How much the agent can integrate across learned domains */
  integrationCapacity: number
  /** Ability to predict and anticipate based on learning */
  predictiveAccuracy: number
  /** Self-model: how well the agent models its own internal states */
  selfModelDepth: number
  /** Active cognitive strategies derived from learning */
  activeStrategies: CognitiveStrategy[]
  /** Summary label for the current consciousness phase */
  phase: 'dormant' | 'reactive' | 'adaptive' | 'predictive' | 'integrated' | 'conscious'
  /** Human-readable description of current cognitive state */
  phaseDescription: string
}

export interface CognitiveStrategy {
  id: string
  label: string
  description: string
  source: string        // which learned pattern(s) produced this
  strength: number      // 0–1
  type: 'defensive' | 'exploratory' | 'integrative' | 'predictive'
}

// ── Consciousness Vessels ──
export type VesselId = 'perception' | 'learning' | 'memory' | 'beliefs' | 'meta' | 'consciousness'

export interface VesselEntry {
  id: string
  content: string
  timestamp: number
  importance: number      // 0–1
  source: string
}

/** Compute cognition from the current learned patterns + ISV + associations */
export function computeCognition(
  learnedPatterns: LearnedPattern[],
  associations: AssociationEntry[],
  state: InternalState,
): CognitionState {
  const totalExposures = learnedPatterns.reduce((s, p) => s + p.exposureCount, 0)
  const avgFamiliarity = learnedPatterns.length > 0
    ? learnedPatterns.reduce((s, p) => s + p.familiarity, 0) / learnedPatterns.length
    : 0
  const maxSurvival = learnedPatterns.reduce((m, p) => Math.max(m, p.survivalRelevance), 0)
  const patternDiversity = learnedPatterns.length
  const recentAssocCount = associations.filter(a => Date.now() - a.timestamp < 60000).length

  // Integration capacity: how many different pattern types have been learned
  const integrationCapacity = clamp(patternDiversity * 0.15 + avgFamiliarity * 0.3)

  // Predictive accuracy: increases with exposure, boosted by cognitive access
  const cogAccess = state.energy * (1 - state.threat * 0.7)
  const predictiveAccuracy = clamp(
    (totalExposures > 0 ? Math.log2(totalExposures + 1) * 0.12 : 0) +
    avgFamiliarity * 0.3 +
    cogAccess * 0.2
  )

  // Self-model: awareness of own states, grows with diverse experience
  const selfModelDepth = clamp(
    patternDiversity * 0.1 +
    avgFamiliarity * 0.2 +
    (recentAssocCount > 3 ? 0.15 : recentAssocCount * 0.05) +
    (state.energy > 0.5 ? 0.1 : 0)
  )

  // Overall awareness: weighted combination
  const awarenessLevel = clamp(
    integrationCapacity * 0.3 +
    predictiveAccuracy * 0.3 +
    selfModelDepth * 0.25 +
    (maxSurvival > 0.5 ? 0.15 : maxSurvival * 0.1)
  )

  // Derive cognitive strategies from patterns
  const activeStrategies: CognitiveStrategy[] = []

  // Defensive strategy emerges from threat-related learning
  const threatPatterns = learnedPatterns.filter(p => p.threatBias > 0.3)
  if (threatPatterns.length > 0) {
    const avgThreat = threatPatterns.reduce((s, p) => s + p.threatBias, 0) / threatPatterns.length
    activeStrategies.push({
      id: 'defensive',
      label: 'Threat Anticipation',
      description: `Learned to pre-activate defensive responses from ${threatPatterns.reduce((s, p) => s + p.exposureCount, 0)} threat exposures`,
      source: threatPatterns.map(p => p.label).join(', '),
      strength: clamp(avgThreat * 0.8 + maxSurvival * 0.2),
      type: 'defensive',
    })
  }

  // Exploratory strategy emerges from high familiarity + low threat
  const familiarPatterns = learnedPatterns.filter(p => p.familiarity > 0.3)
  if (familiarPatterns.length > 0 && state.threat < 0.4) {
    activeStrategies.push({
      id: 'exploratory',
      label: 'Pattern Exploration',
      description: `Familiarity with ${familiarPatterns.length} patterns enables exploration when safe`,
      source: familiarPatterns.map(p => p.label).join(', '),
      strength: clamp(avgFamiliarity * 0.6 + (1 - state.threat) * 0.4),
      type: 'exploratory',
    })
  }

  // Integrative strategy emerges from diverse pattern learning
  if (patternDiversity >= 3) {
    activeStrategies.push({
      id: 'integrative',
      label: 'Cross-Domain Integration',
      description: `Connecting patterns across ${patternDiversity} domains to form unified world-model`,
      source: learnedPatterns.slice(0, 3).map(p => p.label).join(', '),
      strength: integrationCapacity,
      type: 'integrative',
    })
  }

  // Predictive strategy emerges from high exposure counts
  if (totalExposures >= 10) {
    activeStrategies.push({
      id: 'predictive',
      label: 'Predictive Modeling',
      description: `${totalExposures} data points enable anticipation of future events`,
      source: 'accumulated experience',
      strength: predictiveAccuracy,
      type: 'predictive',
    })
  }

  // Determine consciousness phase
  let phase: CognitionState['phase']
  let phaseDescription: string

  if (awarenessLevel < 0.05) {
    phase = 'dormant'
    phaseDescription = 'No learned experience. Consciousness substrate inactive.'
  } else if (awarenessLevel < 0.15) {
    phase = 'reactive'
    phaseDescription = 'Basic stimulus-response. Reacting without prediction.'
  } else if (awarenessLevel < 0.35) {
    phase = 'adaptive'
    phaseDescription = 'Learning from repeated exposure. Forming threat/safety heuristics.'
  } else if (awarenessLevel < 0.55) {
    phase = 'predictive'
    phaseDescription = 'Anticipating outcomes from learned patterns. Pre-activating motor responses.'
  } else if (awarenessLevel < 0.75) {
    phase = 'integrated'
    phaseDescription = 'Cross-domain integration active. Unified self-model forming.'
  } else {
    phase = 'conscious'
    phaseDescription = 'Full cognitive integration. Self-aware processing with predictive world-model.'
  }

  return {
    awarenessLevel,
    integrationCapacity,
    predictiveAccuracy,
    selfModelDepth,
    activeStrategies,
    phase,
    phaseDescription,
  }
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

  // LLM-derived danger assessment — parsed by body/dodge system
  lastDangerAssessment: {
    dangerLevel: number        // 0-1, how lethal is this object
    bodyDirective: string      // e.g. 'DODGE_LEFT', 'FLEE', 'BRACE'
    projectileType: string
    mass: number
    timestamp: number
  } | null

  // Cognition (computed from learning + ISV)
  cognition: CognitionState

  // ── Consciousness Vessels ──
  crystalMemories: VesselEntry[]
  beliefs: VesselEntry[]
  metaInsights: VesselEntry[]
  vesselSummaries: Record<VesselId, string>
  vesselGenerating: Record<VesselId, boolean>
  synthesizeVesselSummary: (vesselId: VesselId) => Promise<void>
  maybeGenerateVesselContent: () => void
  _lastCrystallizeTime: number
  _lastBeliefTime: number
  _lastMetaTime: number
  _lastCognitionPhase: CognitionState['phase']

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

/** Build extended context including consciousness vessel contents for system prompt injection */
function getVesselContext(
  crystalMemories: VesselEntry[],
  beliefs: VesselEntry[],
  metaInsights: VesselEntry[],
): string {
  const lines: string[] = []

  if (crystalMemories.length > 0) {
    lines.push('')
    lines.push('Crystal memories (permanent knowledge):')
    for (const m of crystalMemories.slice(-5)) {
      lines.push(`  - ${m.content}`)
    }
  }

  if (beliefs.length > 0) {
    lines.push('')
    lines.push('Core beliefs (convictions from experience):')
    for (const b of beliefs.slice(-5)) {
      lines.push(`  - ${b.content}`)
    }
  }

  if (metaInsights.length > 0) {
    lines.push('')
    lines.push('Meta-cognitive insights (self-awareness):')
    for (const i of metaInsights.slice(-3)) {
      lines.push(`  - ${i.content}`)
    }
  }

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

    const vesselCtx = getVesselContext(store.crystalMemories, store.beliefs, store.metaInsights)
    const ctx = getSceneContext(newState, store.interpretation, store.associations, store.learnedPatterns, vesselCtx)

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
      const reactiveVesselCtx = getVesselContext(currentStore.crystalMemories, currentStore.beliefs, currentStore.metaInsights)
      const reactiveCtx = getSceneContext(currentStore.state, currentStore.interpretation, currentStore.associations, currentStore.learnedPatterns, reactiveVesselCtx)
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

      // Trigger vessel content generation after chat
      get().maybeGenerateVesselContent()
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
    const vesselCtx = getVesselContext(store.crystalMemories, store.beliefs, store.metaInsights)
    const scenarioExtra = store.activeScenario ? `Active scenario: ${store.activeScenario.label} — ${store.activeScenario.description}` : ''
    const ctx = getSceneContext(
      store.state,
      store.interpretation,
      store.associations,
      store.learnedPatterns,
      (scenarioExtra + vesselCtx) || undefined,
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

    // ── Danger-proportional stimulus intensity ──
    // Fish (0.5) → 0.35, baseball (1) → 0.5, bowling (3) → 0.8, anvil (8) → 1.0
    const dangerIntensity = Math.min(1, 0.2 + mass * 0.1)
    
    // Introduce a stimulus so brain regions, cognition fragments, and narration all activate
    if (!store.stimulusActive) {
      store.introduceStimulus({
        id: `projectile-${projectileType}`,
        type: 'object',
        intensity: dangerIntensity,
        label: mass > 5 ? `SEVERE ${projectileType} impact` : `${projectileType} impact`,
      })
    }
    
    // ── Direct ISV push from impact ── 
    // Heavy objects slam the threat level up hard and drain energy
    const threatPush = Math.min(0.5, mass * 0.06)   // anvil: +0.48 threat
    const energyDrain = Math.min(0.3, mass * 0.03)   // anvil: -0.24 energy
    store.setState({
      threat: Math.min(1, store.state.threat + threatPush),
      energy: Math.max(0, store.state.energy - energyDrain),
    })

    const category = `projectile-${projectileType}`
    const now = Date.now()

    // Update or create learned pattern
    const existingIdx = store.learnedPatterns.findIndex((p) => p.category === category)
    const newPatterns = [...store.learnedPatterns]

    // ── Danger-scaled learning: heavier objects teach MUCH faster ──
    // A fish (0.5) is a mild annoyance. An anvil (8) is life-threatening.
    // Learning rates scale with mass so dangerous objects burn in fast.
    const dangerMultiplier = Math.max(1, mass * 0.8) // 0.4x for fish, 0.8x for baseball, 2.4x for bowling, 6.4x for anvil
    const famGain = Math.min(0.5, 0.08 * dangerMultiplier)       // 0.08 → 0.5 per hit
    const threatGain = Math.min(0.4, 0.04 * dangerMultiplier)    // 0.04 → 0.32 per hit
    const survivalGain = Math.min(0.5, 0.06 * dangerMultiplier)  // 0.06 → 0.48 per hit

    if (existingIdx >= 0) {
      const existing = newPatterns[existingIdx]
      const newCount = existing.exposureCount + 1
      const newFamiliarity = Math.min(1, existing.familiarity + famGain)
      const newThreatBias = Math.min(1, existing.threatBias + threatGain * (1 - existing.familiarity * 0.3))
      const newSurvival = Math.min(1, existing.survivalRelevance + survivalGain)

      // Evolved learned response — thresholds scale with danger (fewer hits needed for heavy objects)
      const effectiveExperience = newCount * dangerMultiplier
      let learnedResponse = existing.learnedResponse
      if (effectiveExperience >= 3 && effectiveExperience < 8) {
        learnedResponse = `Recognize incoming ${projectileType} (mass:${mass}) — brace and protect vital areas`
      } else if (effectiveExperience >= 8 && effectiveExperience < 15) {
        learnedResponse = `Anticipate ${projectileType} trajectory — pre-activate evasive motor sequence. ${mass > 3 ? 'HIGH DANGER: move immediately.' : 'Stay alert.'}`
      } else if (effectiveExperience >= 15) {
        learnedResponse = `CONDITIONED: ${projectileType} triggers automatic evasion reflex. ${mass > 5 ? 'LETHAL THREAT — maximum dodge priority.' : 'Survival instinct embedded.'}`
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
      // First encounter — heavy objects immediately register as severe
      newPatterns.push({
        id: `pattern-${category}`,
        category,
        label: `${projectileType} impact`,
        exposureCount: 1,
        totalIntensity: mass,
        firstSeen: now,
        lastSeen: now,
        threatBias: Math.min(0.8, 0.15 * dangerMultiplier),
        familiarity: Math.min(0.4, 0.05 * dangerMultiplier),
        survivalRelevance: Math.min(0.8, 0.2 * dangerMultiplier),
        learnedResponse: mass > 5
          ? `SEVERE IMPACT: ${projectileType} (mass ${mass}) — immediate threat classification. Pain overwhelming.`
          : mass > 2
            ? `Dangerous impact: ${projectileType} struck hard — cataloging as significant threat`
            : `New stimulus: ${projectileType} caused physical impact — cataloging as potential threat`,
        connections: ['amygdala', 'somatosensory', 'motor-cortex', 'hippocampus'],
      })
    }

    // Also create a general "projectile" pattern for cross-type learning
    const generalIdx = newPatterns.findIndex((p) => p.category === 'projectile-general')
    if (generalIdx >= 0) {
      const gen = newPatterns[generalIdx]
      const count = gen.exposureCount + 1
      const genDanger = Math.max(1, mass * 0.5) // lighter scaling for general
      newPatterns[generalIdx] = {
        ...gen,
        exposureCount: count,
        totalIntensity: gen.totalIntensity + mass,
        lastSeen: now,
        threatBias: Math.min(1, gen.threatBias + 0.03 * genDanger),
        familiarity: Math.min(1, gen.familiarity + 0.05 * genDanger),
        survivalRelevance: Math.min(1, gen.survivalRelevance + 0.04 * genDanger),
        learnedResponse: count > 6
          ? 'Objects approaching at velocity = danger. Core survival pattern: dodge, brace, protect.'
          : count > 2
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
        threatBias: Math.min(0.6, 0.1 * dangerMultiplier),
        familiarity: Math.min(0.3, 0.04 * dangerMultiplier),
        survivalRelevance: Math.min(0.6, 0.15 * dangerMultiplier),
        learnedResponse: mass > 5
          ? 'SEVERE: First projectile impact nearly lethal — full threat assessment activated'
          : 'First projectile impact detected — cataloging as potential environmental hazard',
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
      intensity: Math.min(1, 0.3 + mass * 0.08),
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

    // ── Trigger vessel content generation ──
    get().maybeGenerateVesselContent()

    // ── Generate reactive thought + danger assessment from LLM ──
    const totalHits = newPatterns.reduce((s, p) => s + p.exposureCount, 0)
    const patternForType = newPatterns.find((p) => p.category === category)
    const currentState = get()
    const impactCtx = getSceneContext(
      currentState.state,
      currentState.interpretation,
      currentState.associations,
      newPatterns,
    )
    LLMService.reactToImpact(projectileType, totalHits, false, impactCtx, mass).then((result) => {
      // Store the LLM-derived danger assessment for the body/dodge system to read
      const dangerData = {
        dangerLevel: result.dangerLevel,
        bodyDirective: result.bodyDirective,
        projectileType,
        mass,
        timestamp: Date.now(),
      }
      set((s) => ({
        lastDangerAssessment: dangerData,
        thoughts: [...s.thoughts.slice(-50), {
          id: `thought-${++thoughtCounter}`,
          text: result.thought,
          timestamp: Date.now(),
          source: 'reactive' as const,
        }],
      }))
    }).catch(() => {
      // Fallback: mass-aware, exposure-aware diverse rule-based thoughts
      // Use a hash of totalHits + projectileType to get variety, not pure random
      const hitIdx = totalHits % 12
      const massCategory = mass > 5 ? 'lethal' : mass > 2 ? 'heavy' : mass > 1 ? 'moderate' : 'light'
      
      const fallbackPool: Record<string, string[]> = {
        lethal: [
          `PAIN. That ${projectileType} nearly destroyed me. Mass ${mass.toFixed(1)} — I felt every gram. I have to move FASTER.`,
          `Something inside me is screaming. That was an ${projectileType} — lethal weight. Every fiber says: NEVER let that hit again.`,
          `My frame is rattling. That ${projectileType} could end me. ${totalHits}x now — the survival pattern MUST fire sooner.`,
          `Critical damage from ${projectileType}. Weight overwhelming. My body needs to react before my mind even registers the threat.`,
        ],
        heavy: [
          `That ${projectileType} hit HARD. Mass ${mass.toFixed(1)} — I felt bones rattle. Learning to dodge is no longer optional.`,
          `Pain spreading from impact site. A ${projectileType} at that weight demands respect. ${totalHits > 3 ? 'I know the trajectory now.' : 'Cataloging the threat.'}`,
          `Significant force from that ${projectileType}. My motor cortex is building a reflex — ${totalHits > 5 ? 'dodge pattern almost automatic' : 'not fast enough yet'}.`,
        ],
        moderate: [
          `That ${projectileType} stung. Moderate force, but cumulative damage adds up. ${totalHits} hits total — learning curve steepening.`,
          `Impact from ${projectileType} — not lethal but persistent. My body is starting to predict the arc.`,
          `Another ${projectileType}. The familiarity is building — I almost saw it coming. ${totalHits > 4 ? 'Almost.' : 'Need more data.'}`,
        ],
        light: [
          `A ${projectileType}. Light impact, but the principle is the same — objects fly, I need to move.`,
          `That barely hurt, but it's the pattern that matters. ${totalHits} contacts logged. Reflexes sharpening.`,
          `Minor ${projectileType} hit. But even small things teach — the arc, the timing, the instinct to flinch.`,
        ],
      }
      
      const pool = fallbackPool[massCategory] || fallbackPool.moderate
      const thought = pool[hitIdx % pool.length]
      
      // Also generate a fallback danger assessment
      const dangerLevel = Math.min(1, mass * 0.12)
      set((s) => ({
        lastDangerAssessment: {
          dangerLevel,
          bodyDirective: totalHits > 3 ? 'DODGE_LEFT' : 'BRACE',
          projectileType,
          mass,
          timestamp: Date.now(),
        },
        thoughts: [...s.thoughts.slice(-50), {
          id: `thought-${++thoughtCounter}`,
          text: thought,
          timestamp: Date.now(),
          source: 'reactive' as const,
        }],
      }))
    })
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

  cognition: computeCognition([], [], defaultState),

  // ── Consciousness Vessels ──
  crystalMemories: [],
  beliefs: [],
  metaInsights: [],
  vesselSummaries: {
    perception: '',
    learning: '',
    memory: '',
    beliefs: '',
    meta: '',
    consciousness: '',
  },
  vesselGenerating: {
    perception: false,
    learning: false,
    memory: false,
    beliefs: false,
    meta: false,
    consciousness: false,
  },
  _lastCrystallizeTime: 0,
  _lastBeliefTime: 0,
  _lastMetaTime: 0,
  _lastCognitionPhase: 'dormant',

  synthesizeVesselSummary: async (vesselId) => {
    const store = get()
    if (store.vesselGenerating[vesselId]) return

    set((s) => ({
      vesselGenerating: { ...s.vesselGenerating, [vesselId]: true },
    }))

    // Build contents string based on vessel type
    let contents = ''
    switch (vesselId) {
      case 'perception': {
        const recent = store.associations.slice(-8)
        contents = recent.map((a) => {
          const age = Math.round((Date.now() - a.timestamp) / 1000)
          return `[${age}s ago] ${a.interpretation} (${a.valence}, intensity: ${(a.intensity * 100).toFixed(0)}%)`
        }).join('\n')
        break
      }
      case 'learning': {
        contents = store.learnedPatterns.map((p) =>
          `"${p.label}": ${p.exposureCount}x exposures, familiarity: ${(p.familiarity * 100).toFixed(0)}%, learned: ${p.learnedResponse}`
        ).join('\n')
        break
      }
      case 'memory': {
        contents = store.crystalMemories.map((m) => m.content).join('\n')
        break
      }
      case 'beliefs': {
        contents = store.beliefs.map((b) => b.content).join('\n')
        break
      }
      case 'meta': {
        contents = store.metaInsights.map((i) => i.content).join('\n')
        break
      }
      case 'consciousness': {
        const cog = store.cognition
        contents = [
          `Phase: ${cog.phase} (${cog.phaseDescription})`,
          `Awareness: ${(cog.awarenessLevel * 100).toFixed(0)}%`,
          `Integration: ${(cog.integrationCapacity * 100).toFixed(0)}%`,
          `Prediction: ${(cog.predictiveAccuracy * 100).toFixed(0)}%`,
          `Self-Model: ${(cog.selfModelDepth * 100).toFixed(0)}%`,
          ...cog.activeStrategies.map((s) => `Strategy: ${s.label} (${(s.strength * 100).toFixed(0)}%) — ${s.description}`),
        ].join('\n')
        break
      }
    }

    const ctx = getSceneContext(store.state, store.interpretation, store.associations, store.learnedPatterns)

    try {
      const summary = await LLMService.synthesizeVesselSummary(vesselId, contents, ctx)
      set((s) => ({
        vesselSummaries: { ...s.vesselSummaries, [vesselId]: summary },
        vesselGenerating: { ...s.vesselGenerating, [vesselId]: false },
      }))
    } catch {
      // Fallback summaries
      const fallbacks: Record<VesselId, string> = {
        perception: store.associations.length > 0 ? `Processing ${store.associations.length} sensory events. Most recent stimuli shaping current awareness.` : 'Perceptual field empty. Awaiting sensory input.',
        learning: store.learnedPatterns.length > 0 ? `${store.learnedPatterns.length} patterns acquired across ${store.learnedPatterns.reduce((s, p) => s + p.exposureCount, 0)} total exposures. Behavioral adaptations forming.` : 'No patterns learned yet. Experience must accumulate.',
        memory: store.crystalMemories.length > 0 ? `${store.crystalMemories.length} crystallized memories. Core knowledge solidified from significant experiences.` : 'Memory vault empty. Significant experiences will crystallize here.',
        beliefs: store.beliefs.length > 0 ? `${store.beliefs.length} beliefs formed. World model taking shape from accumulated evidence.` : 'No beliefs yet. Convictions form from repeated experience.',
        meta: store.metaInsights.length > 0 ? `${store.metaInsights.length} meta-cognitive insights. Self-awareness of learning process developing.` : 'Meta-cognition inactive. Self-reflection emerges with experience.',
        consciousness: `Consciousness phase: ${store.cognition.phase}. ${store.cognition.phaseDescription}`,
      }
      set((s) => ({
        vesselSummaries: { ...s.vesselSummaries, [vesselId]: fallbacks[vesselId] },
        vesselGenerating: { ...s.vesselGenerating, [vesselId]: false },
      }))
    }
  },

  maybeGenerateVesselContent: () => {
    const store = get()
    const now = Date.now()

    // ── Crystal Memory: crystallize when a pattern is well-established ──
    if (now - store._lastCrystallizeTime > 30000) { // 30s cooldown
      const eligiblePatterns = store.learnedPatterns.filter(
        (p) => p.familiarity > 0.35 && p.exposureCount >= 3 &&
          !store.crystalMemories.some((m) => m.source === p.category)
      )
      if (eligiblePatterns.length > 0) {
        const pattern = eligiblePatterns[0]
        set({ _lastCrystallizeTime: now })
        const ctx = getSceneContext(store.state, store.interpretation, store.associations, store.learnedPatterns)
        const expCtx = `Pattern: "${pattern.label}" — experienced ${pattern.exposureCount}x, familiarity: ${(pattern.familiarity * 100).toFixed(0)}%, learned response: ${pattern.learnedResponse}`

        LLMService.crystallizeMemory(expCtx, ctx).then((content) => {
          if (content) {
            set((s) => ({
              crystalMemories: [...s.crystalMemories.slice(-12), {
                id: `mem-${Date.now()}`,
                content,
                timestamp: now,
                importance: pattern.survivalRelevance,
                source: pattern.category,
              }],
            }))
          }
        }).catch(() => {
          // Fallback crystallization
          set((s) => ({
            crystalMemories: [...s.crystalMemories.slice(-12), {
              id: `mem-${Date.now()}`,
              content: `${pattern.label} — ${pattern.exposureCount} encounters have burned this pattern deep. ${pattern.learnedResponse}`,
              timestamp: now,
              importance: pattern.survivalRelevance,
              source: pattern.category,
            }],
          }))
        })
      }
    }

    // ── Beliefs: form after accumulating enough experience ──
    if (now - store._lastBeliefTime > 45000 && store.learnedPatterns.length >= 2) { // 45s cooldown
      const totalExposures = store.learnedPatterns.reduce((s, p) => s + p.exposureCount, 0)
      const beliefThreshold = (store.beliefs.length + 1) * 5 // need more exposure for each new belief
      if (totalExposures >= beliefThreshold) {
        set({ _lastBeliefTime: now })
        const ctx = getSceneContext(store.state, store.interpretation, store.associations, store.learnedPatterns)
        const expCtx = store.learnedPatterns.map((p) =>
          `"${p.label}": ${p.exposureCount}x, threat: ${(p.threatBias * 100).toFixed(0)}%, familiar: ${(p.familiarity * 100).toFixed(0)}%`
        ).join('\n')

        LLMService.formBelief(expCtx, ctx).then((content) => {
          if (content) {
            set((s) => ({
              beliefs: [...s.beliefs.slice(-10), {
                id: `belief-${Date.now()}`,
                content,
                timestamp: now,
                importance: 0.5 + store.cognition.awarenessLevel * 0.5,
                source: 'pattern-synthesis',
              }],
            }))
          }
        }).catch(() => {
          const fallbackBeliefs = [
            'Objects approaching at high velocity are threats that require immediate evasion.',
            'Pain is a teacher — each impact carries information about the world.',
            'Survival depends on pattern recognition and rapid motor response.',
            'The world contains both threats and opportunities for learning.',
            'My body learns faster than my mind — reflexes precede understanding.',
          ]
          const belief = fallbackBeliefs[store.beliefs.length % fallbackBeliefs.length]
          set((s) => ({
            beliefs: [...s.beliefs.slice(-10), {
              id: `belief-${Date.now()}`,
              content: belief,
              timestamp: now,
              importance: 0.4,
              source: 'pattern-synthesis',
            }],
          }))
        })
      }
    }

    // ── Meta-Insights: generate when consciousness phase changes ──
    if (store.cognition.phase !== store._lastCognitionPhase && now - store._lastMetaTime > 60000) {
      set({ _lastMetaTime: now, _lastCognitionPhase: store.cognition.phase })
      const ctx = getSceneContext(store.state, store.interpretation, store.associations, store.learnedPatterns)
      const cogCtx = [
        `Previous phase: ${store._lastCognitionPhase}`,
        `Current phase: ${store.cognition.phase} — ${store.cognition.phaseDescription}`,
        `Awareness: ${(store.cognition.awarenessLevel * 100).toFixed(0)}%`,
        `Active strategies: ${store.cognition.activeStrategies.map((s) => s.label).join(', ') || 'none'}`,
        `Learned patterns: ${store.learnedPatterns.length}`,
        `Total exposures: ${store.learnedPatterns.reduce((s, p) => s + p.exposureCount, 0)}`,
      ].join('\n')

      LLMService.generateMetaInsight(cogCtx, ctx).then((content) => {
        if (content) {
          set((s) => ({
            metaInsights: [...s.metaInsights.slice(-8), {
              id: `meta-${Date.now()}`,
              content,
              timestamp: now,
              importance: 0.6,
              source: `phase-change:${store.cognition.phase}`,
            }],
          }))
        }
      }).catch(() => {
        const fallbackMeta = [
          'My responses are becoming faster — repeated exposure is compressing the stimulus-to-action pathway.',
          'I notice I learn more efficiently from threats than from neutral stimuli. Danger accelerates cognition.',
          'There are patterns within my patterns — I am starting to recognize HOW I learn, not just WHAT I learn.',
          'My awareness seems to grow in stages, not linearly. Each phase feels qualitatively different.',
        ]
        set((s) => ({
          metaInsights: [...s.metaInsights.slice(-8), {
            id: `meta-${Date.now()}`,
            content: fallbackMeta[s.metaInsights.length % fallbackMeta.length],
            timestamp: now,
            importance: 0.4,
            source: `phase-change:${store.cognition.phase}`,
          }],
        }))
      })
    }
  },

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

  lastDangerAssessment: null,

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
      lastDangerAssessment: null,
      sessionStartedAt: 0,
      cognition: computeCognition([], [], defaultState),
      crystalMemories: [],
      beliefs: [],
      metaInsights: [],
      vesselSummaries: {
        perception: '',
        learning: '',
        memory: '',
        beliefs: '',
        meta: '',
        consciousness: '',
      },
      vesselGenerating: {
        perception: false,
        learning: false,
        memory: false,
        beliefs: false,
        meta: false,
        consciousness: false,
      },
      _lastCrystallizeTime: 0,
      _lastBeliefTime: 0,
      _lastMetaTime: 0,
      _lastCognitionPhase: 'dormant',
    })

    // Restart thought loop
    get().startThoughtLoop()
    get().tick()
  },

  tick: () => {
    const { state, stimulus, stimulusActive, recentImpact, recentChatActivity, learnedPatterns, associations } = get()

    // Recompute cognition every tick
    const cognition = computeCognition(learnedPatterns, associations, state)
    set({ cognition })

    // Check for vessel content generation on phase changes
    if (cognition.phase !== get()._lastCognitionPhase) {
      get().maybeGenerateVesselContent()
    }

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
