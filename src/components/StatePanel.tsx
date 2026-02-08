import { useState, useMemo, useCallback } from 'react'
import { useStore, type AssociationEntry, type LearnedPattern, type CognitionState, type CognitiveStrategy, type VesselId, type VesselEntry } from '../store/useStore'

// ── Vessel Definitions ──

const VESSEL_DEFS: Record<VesselId, { label: string; color: string; description: string }> = {
  perception: { label: 'Percept', color: '#38bdf8', description: 'Raw sensory data and events' },
  learning: { label: 'Learn', color: '#4ade80', description: 'Accumulated heuristics and patterns' },
  memory: { label: 'Memory', color: '#c084fc', description: 'Crystallized long-term knowledge' },
  beliefs: { label: 'Beliefs', color: '#fbbf24', description: 'World model and convictions' },
  meta: { label: 'Meta', color: '#f472b6', description: 'Self-awareness & learning-to-learn' },
  consciousness: { label: 'Conscious', color: '#22d3ee', description: 'Integrated cognitive synthesis' },
}

const VESSEL_ORDER: VesselId[] = ['perception', 'learning', 'memory', 'beliefs', 'meta', 'consciousness']

const PHASE_COLORS: Record<CognitionState['phase'], string> = {
  dormant: '#555555',
  reactive: '#ff4444',
  adaptive: '#ff8833',
  predictive: '#ffcc00',
  integrated: '#44cc88',
  conscious: '#44ddff',
}

const STRATEGY_ICONS: Record<CognitiveStrategy['type'], string> = {
  defensive: '\u25B2',
  exploratory: '\u25C6',
  integrative: '\u25CF',
  predictive: '\u25BA',
}

// ── Main Component ──

export function StatePanel() {
  const state = useStore((s) => s.state)
  const setState = useStore((s) => s.setState)
  const stimulusActive = useStore((s) => s.stimulusActive)
  const clearStimulus = useStore((s) => s.clearStimulus)
  const somaticSignals = useStore((s) => s.somaticSignals)
  const associations = useStore((s) => s.associations)
  const learnedPatterns = useStore((s) => s.learnedPatterns)
  const cognition = useStore((s) => s.cognition)
  const crystalMemories = useStore((s) => s.crystalMemories)
  const beliefs = useStore((s) => s.beliefs)
  const metaInsights = useStore((s) => s.metaInsights)
  const vesselSummaries = useStore((s) => s.vesselSummaries)
  const vesselGenerating = useStore((s) => s.vesselGenerating)
  const synthesizeVesselSummary = useStore((s) => s.synthesizeVesselSummary)

  const [activeVessel, setActiveVessel] = useState<VesselId>('perception')

  // Compute vessel fill levels and counts
  const vesselData = useMemo(() => {
    const avgFamiliarity = learnedPatterns.length > 0
      ? learnedPatterns.reduce((s, p) => s + p.familiarity, 0) / learnedPatterns.length
      : 0

    return {
      perception: { fill: Math.min(1, associations.length / 15), count: associations.length },
      learning: { fill: avgFamiliarity, count: learnedPatterns.length },
      memory: { fill: Math.min(1, crystalMemories.length / 8), count: crystalMemories.length },
      beliefs: { fill: Math.min(1, beliefs.length / 6), count: beliefs.length },
      meta: { fill: Math.min(1, metaInsights.length / 5), count: metaInsights.length },
      consciousness: { fill: cognition.awarenessLevel, count: cognition.activeStrategies.length },
    }
  }, [associations.length, learnedPatterns, crystalMemories.length, beliefs.length, metaInsights.length, cognition])

  const handleVesselClick = useCallback((id: VesselId) => {
    setActiveVessel(id)
    // Trigger summary generation on click
    synthesizeVesselSummary(id)
  }, [synthesizeVesselSummary])

  return (
    <div className="h-full overflow-y-auto p-3 scrollbar-thin">
      <div className="flex gap-3 h-full min-h-0">
        {/* Left column: state + somatic */}
        <div className="w-64 shrink-0 space-y-3">
          {/* Internal state */}
          <div className="bg-white/[0.02] border border-white/[0.05] rounded-lg p-3 space-y-2.5">
            <div className="flex items-center justify-between">
              <span className="text-xs font-mono tracking-[0.25em] text-white/20 uppercase">
                Internal State
              </span>
              {stimulusActive && (
                <button
                  onClick={clearStimulus}
                  className="text-[11px] font-mono text-white/20 bg-white/[0.03] px-2 py-0.5 rounded
                    hover:bg-white/[0.06] hover:text-white/30 transition-all border border-white/[0.05]"
                >
                  CLEAR
                </button>
              )}
            </div>
            <StateSlider label="Threat" value={state.threat} color="#ff4444"
              onChange={(v) => setState({ threat: v })} />
            <StateSlider label="Familiarity" value={state.familiarity} color="#33cc66"
              onChange={(v) => setState({ familiarity: v })} />
            <StateSlider label="Energy" value={state.energy} color="#4488ff"
              onChange={(v) => setState({ energy: v })} />
          </div>

          {/* Somatic signals */}
          {somaticSignals.length > 0 && (
            <div className="bg-pink-500/[0.03] border border-pink-500/[0.08] rounded-lg p-3">
              <div className="text-xs font-mono tracking-[0.25em] text-pink-400/30 uppercase mb-2">
                Somatic Signals
              </div>
              <div className="space-y-2">
                {somaticSignals.map((s, i) => (
                  <div key={i} className="flex items-center gap-2">
                    <span className="text-[11px] font-mono text-pink-300/30 w-12">{s.region}</span>
                    <div className="flex-1 h-2 bg-white/[0.03] rounded-full overflow-hidden">
                      <div
                        className="h-full rounded-full transition-all duration-500"
                        style={{
                          width: `${s.intensity * 100}%`,
                          backgroundColor:
                            s.type === 'tension' ? '#ff444460' :
                            s.type === 'warmth' ? '#ffaa4460' :
                            s.type === 'cold' ? '#4488ff60' :
                            '#cc44ff60',
                        }}
                      />
                    </div>
                    <span className="text-[11px] font-mono text-white/15 w-12 text-right">{s.type}</span>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>

        {/* Right column: Consciousness Vessels */}
        <div className="flex-1 min-w-0 flex flex-col gap-2 overflow-y-auto max-h-full scrollbar-thin">

          {/* ── Vessel Row: 3D Cylinders ── */}
          <div className="flex items-end justify-between gap-1 px-1">
            {VESSEL_ORDER.map((id) => {
              const def = VESSEL_DEFS[id]
              const data = vesselData[id]
              return (
                <VesselCylinder
                  key={id}
                  id={id}
                  label={def.label}
                  color={id === 'consciousness' ? PHASE_COLORS[cognition.phase] : def.color}
                  fill={data.fill}
                  count={data.count}
                  active={activeVessel === id}
                  onClick={() => handleVesselClick(id)}
                  generating={vesselGenerating[id]}
                />
              )
            })}
          </div>

          {/* ── Vessel Content Dropdown ── */}
          <VesselDropdown
            vesselId={activeVessel}
            summary={vesselSummaries[activeVessel]}
            isGenerating={vesselGenerating[activeVessel]}
            associations={associations}
            learnedPatterns={learnedPatterns}
            cognition={cognition}
            crystalMemories={crystalMemories}
            beliefs={beliefs}
            metaInsights={metaInsights}
            onSynthesize={() => synthesizeVesselSummary(activeVessel)}
          />
        </div>
      </div>
    </div>
  )
}

// ── 3D SVG Cylinder ──

function VesselCylinder({ id, label, color, fill, count, active, onClick, generating }: {
  id: string
  label: string
  color: string
  fill: number
  count: number
  active: boolean
  onClick: () => void
  generating: boolean
}) {
  // Fill goes from bottom (66) to top (12), 54px range
  const fillY = 66 - (fill * 54)
  const uid = `vessel-${id}`

  return (
    <button
      onClick={onClick}
      className={`
        flex flex-col items-center gap-0.5 group cursor-pointer
        transition-all duration-300 rounded-lg px-1 py-1.5
        ${active ? 'bg-white/[0.03]' : 'hover:bg-white/[0.02]'}
      `}
      style={{
        boxShadow: active ? `0 0 20px ${color}15, inset 0 0 20px ${color}05` : 'none',
      }}
    >
      <svg
        viewBox="0 0 52 80"
        width="52"
        height="80"
        className="transition-transform duration-300 group-hover:scale-105"
        style={{ filter: active ? `drop-shadow(0 0 6px ${color}40)` : 'none' }}
      >
        <defs>
          {/* Clip to cylinder interior */}
          <clipPath id={`clip-${uid}`}>
            <rect x="6" y="12" width="40" height="54" />
            <ellipse cx="26" cy="66" rx="20" ry="7" />
          </clipPath>
          {/* Liquid gradient */}
          <linearGradient id={`grad-${uid}`} x1="0" y1="0" x2="0.3" y2="1">
            <stop offset="0%" stopColor={color} stopOpacity="0.5" />
            <stop offset="50%" stopColor={color} stopOpacity="0.25" />
            <stop offset="100%" stopColor={color} stopOpacity="0.15" />
          </linearGradient>
          {/* Surface shimmer */}
          <linearGradient id={`surface-${uid}`} x1="0" y1="0" x2="1" y2="0">
            <stop offset="0%" stopColor={color} stopOpacity="0.15" />
            <stop offset="40%" stopColor={color} stopOpacity="0.5" />
            <stop offset="60%" stopColor="white" stopOpacity="0.15" />
            <stop offset="100%" stopColor={color} stopOpacity="0.2" />
          </linearGradient>
        </defs>

        {/* Ambient glow when active */}
        {active && (
          <ellipse cx="26" cy="45" rx="28" ry="42" fill={color} fillOpacity="0.04">
            <animate attributeName="fillOpacity" values="0.04;0.08;0.04" dur="2s" repeatCount="indefinite" />
          </ellipse>
        )}

        {/* Bottom ellipse fill (base shadow) */}
        <ellipse cx="26" cy="66" rx="20" ry="7" fill={color} fillOpacity="0.06" />

        {/* ── Liquid Fill ── */}
        <g clipPath={`url(#clip-${uid})`}>
          {/* Liquid body */}
          {fill > 0.01 && (
            <>
              <rect
                x="6" y={fillY} width="40" height={80 - fillY}
                fill={`url(#grad-${uid})`}
              >
                {/* Subtle fill animation */}
                <animate attributeName="y" values={`${fillY};${fillY - 1};${fillY}`} dur="4s" repeatCount="indefinite" />
              </rect>

              {/* Liquid surface (top of liquid) */}
              <ellipse cx="26" cy={fillY} rx="20" ry="6" fill={`url(#surface-${uid})`}>
                <animate attributeName="ry" values="6;5.5;6" dur="3s" repeatCount="indefinite" />
              </ellipse>
            </>
          )}

          {/* Rising bubbles when generating or active */}
          {(generating || (active && fill > 0.1)) && (
            <>
              <circle cx="18" r="1.5" fill={color} opacity="0.25">
                <animate attributeName="cy" from="62" to={Math.max(fillY, 14)} dur="2.2s" repeatCount="indefinite" />
                <animate attributeName="opacity" values="0.3;0.1;0" dur="2.2s" repeatCount="indefinite" />
                <animate attributeName="r" values="1.5;1;0.5" dur="2.2s" repeatCount="indefinite" />
              </circle>
              <circle cx="32" r="1" fill={color} opacity="0.2">
                <animate attributeName="cy" from="58" to={Math.max(fillY, 14)} dur="2.8s" repeatCount="indefinite" begin="0.6s" />
                <animate attributeName="opacity" values="0.25;0.1;0" dur="2.8s" repeatCount="indefinite" begin="0.6s" />
              </circle>
              <circle cx="24" r="0.8" fill="white" opacity="0.1">
                <animate attributeName="cy" from="65" to={Math.max(fillY, 14)} dur="3.2s" repeatCount="indefinite" begin="1.2s" />
                <animate attributeName="opacity" values="0.15;0.05;0" dur="3.2s" repeatCount="indefinite" begin="1.2s" />
              </circle>
            </>
          )}
        </g>

        {/* ── Glass Outline ── */}
        {/* Top opening ellipse */}
        <ellipse
          cx="26" cy="12" rx="20" ry="7"
          fill="none" stroke={color}
          strokeWidth={active ? 1 : 0.7}
          opacity={active ? 0.5 : 0.2}
        />
        {/* Left wall */}
        <line
          x1="6" y1="12" x2="6" y2="66"
          stroke={color}
          strokeWidth={active ? 1 : 0.7}
          opacity={active ? 0.4 : 0.15}
        />
        {/* Right wall */}
        <line
          x1="46" y1="12" x2="46" y2="66"
          stroke={color}
          strokeWidth={active ? 1 : 0.7}
          opacity={active ? 0.4 : 0.15}
        />
        {/* Bottom ellipse */}
        <ellipse
          cx="26" cy="66" rx="20" ry="7"
          fill="none" stroke={color}
          strokeWidth={active ? 1 : 0.7}
          opacity={active ? 0.35 : 0.12}
        />

        {/* Glass highlight (left edge reflection) */}
        <line
          x1="11" y1="20" x2="11" y2="58"
          stroke="white" strokeWidth="1.5"
          opacity="0.04" strokeLinecap="round"
        />

        {/* Count display in center of cylinder */}
        <text
          x="26" y={fill > 0.4 ? 42 : 50}
          textAnchor="middle" dominantBaseline="central"
          fill={fill > 0.3 ? 'white' : color}
          fontSize="11" fontFamily="monospace" fontWeight="bold"
          opacity={fill > 0.3 ? 0.7 : 0.4}
        >
          {count}
        </text>

        {/* Generating spinner */}
        {generating && (
          <circle cx="26" cy="12" r="3" fill="none" stroke={color} strokeWidth="1" strokeDasharray="6 4" opacity="0.5">
            <animateTransform attributeName="transform" type="rotate" from="0 26 12" to="360 26 12" dur="1.5s" repeatCount="indefinite" />
          </circle>
        )}
      </svg>

      {/* Label */}
      <span
        className="text-[8px] font-mono tracking-wider uppercase whitespace-nowrap"
        style={{ color: color + (active ? 'cc' : '40') }}
      >
        {label}
      </span>
    </button>
  )
}

// ── Vessel Content Dropdown ──

function VesselDropdown({
  vesselId,
  summary,
  isGenerating,
  associations,
  learnedPatterns,
  cognition,
  crystalMemories,
  beliefs,
  metaInsights,
  onSynthesize,
}: {
  vesselId: VesselId
  summary: string
  isGenerating: boolean
  associations: AssociationEntry[]
  learnedPatterns: LearnedPattern[]
  cognition: CognitionState
  crystalMemories: VesselEntry[]
  beliefs: VesselEntry[]
  metaInsights: VesselEntry[]
  onSynthesize: () => void
}) {
  const def = VESSEL_DEFS[vesselId]
  const color = vesselId === 'consciousness' ? PHASE_COLORS[cognition.phase] : def.color

  return (
    <div
      className="border rounded-lg p-3 flex-1 min-h-0 overflow-y-auto scrollbar-thin transition-all duration-300"
      style={{
        backgroundColor: color + '06',
        borderColor: color + '18',
      }}
    >
      {/* Header */}
      <div className="flex items-center justify-between mb-2">
        <div className="flex items-center gap-2">
          <div
            className="w-2 h-2 rounded-full"
            style={{
              backgroundColor: color,
              opacity: 0.6,
              boxShadow: `0 0 6px ${color}50`,
            }}
          />
          <span
            className="text-[10px] font-mono tracking-[0.2em] uppercase font-bold"
            style={{ color: color + '80' }}
          >
            {def.label}
          </span>
        </div>
        <button
          onClick={onSynthesize}
          disabled={isGenerating}
          className="text-[9px] font-mono uppercase tracking-wider px-2 py-0.5 rounded
            border transition-all hover:bg-white/[0.04] disabled:opacity-30"
          style={{
            color: color + '60',
            borderColor: color + '20',
          }}
        >
          {isGenerating ? 'Synthesizing...' : 'Synthesize'}
        </button>
      </div>

      {/* Description */}
      <div className="text-[9px] font-mono mb-2" style={{ color: color + '35' }}>
        {def.description}
      </div>

      {/* LLM Summary */}
      {(summary || isGenerating) && (
        <div
          className="rounded-md p-2.5 mb-3 border"
          style={{
            backgroundColor: color + '08',
            borderColor: color + '12',
          }}
        >
          {isGenerating && !summary ? (
            <div className="flex items-center gap-2">
              <div
                className="w-1.5 h-1.5 rounded-full animate-pulse"
                style={{ backgroundColor: color }}
              />
              <span className="text-[10px] font-mono italic" style={{ color: color + '40' }}>
                Synthesizing consciousness stream...
              </span>
            </div>
          ) : (
            <div className="text-[11px] font-mono leading-relaxed" style={{ color: color + '70' }}>
              {summary}
            </div>
          )}
        </div>
      )}

      {/* Vessel-specific content */}
      {vesselId === 'perception' && <PerceptionContent associations={associations} color={color} />}
      {vesselId === 'learning' && <LearningContent patterns={learnedPatterns} color={color} />}
      {vesselId === 'memory' && <MemoryContent memories={crystalMemories} color={color} />}
      {vesselId === 'beliefs' && <BeliefsContent beliefs={beliefs} color={color} />}
      {vesselId === 'meta' && <MetaContent insights={metaInsights} color={color} />}
      {vesselId === 'consciousness' && <ConsciousnessContent cognition={cognition} color={color} />}
    </div>
  )
}

// ── Vessel Content Sub-Components ──

function PerceptionContent({ associations, color }: { associations: AssociationEntry[]; color: string }) {
  const recent = associations.slice(-10).reverse()

  if (recent.length === 0) {
    return (
      <div className="text-[11px] font-mono text-white/10 italic py-3 text-center">
        Perceptual field empty. Throw something or trigger a scenario.
      </div>
    )
  }

  return (
    <div className="space-y-1.5">
      {recent.map((a) => {
        const age = Math.round((Date.now() - a.timestamp) / 1000)
        const isFresh = age < 5
        return (
          <div
            key={a.id}
            className={`flex items-start gap-1.5 ${isFresh ? 'animate-thought-fade-in' : ''}`}
          >
            <div
              className="w-1.5 h-1.5 rounded-full mt-1.5 shrink-0"
              style={{
                backgroundColor:
                  a.valence === 'negative' ? '#ff4444' :
                  a.valence === 'positive' ? '#44cc88' :
                  '#ffcc00',
                opacity: isFresh ? 0.9 : 0.35,
                boxShadow: isFresh ? `0 0 6px ${a.valence === 'negative' ? '#ff444450' : '#44cc8850'}` : 'none',
              }}
            />
            <div className="min-w-0 flex-1">
              <div className="text-[11px] font-mono text-white/30 leading-snug truncate">
                {a.interpretation}
              </div>
              <div className="flex gap-1 mt-0.5 flex-wrap">
                {a.connections.slice(0, 3).map((c) => (
                  <span key={c} className="text-[9px] font-mono bg-white/[0.04] px-1 rounded"
                    style={{ color: color + '30' }}>
                    {c}
                  </span>
                ))}
                <span className="text-[8px] font-mono text-white/8 ml-auto">{age}s</span>
              </div>
            </div>
          </div>
        )
      })}
    </div>
  )
}

function LearningContent({ patterns, color }: { patterns: LearnedPattern[]; color: string }) {
  const sorted = [...patterns].sort((a, b) => b.exposureCount - a.exposureCount)

  if (sorted.length === 0) {
    return (
      <div className="text-[11px] font-mono text-white/10 italic py-3 text-center">
        No patterns learned yet. Repeated exposure builds heuristics.
      </div>
    )
  }

  return (
    <div className="space-y-2">
      {sorted.map((p) => {
        const recency = Math.max(0, 1 - (Date.now() - p.lastSeen) / 30000)
        return (
          <div key={p.id} className="bg-white/[0.02] rounded-md p-2 space-y-1">
            <div className="flex items-center gap-2">
              <div
                className="w-2 h-2 rounded-full shrink-0"
                style={{
                  backgroundColor: p.survivalRelevance > 0.5 ? '#ff4444' : color,
                  opacity: 0.4 + recency * 0.6,
                  boxShadow: recency > 0.5
                    ? `0 0 6px ${p.survivalRelevance > 0.5 ? '#ff444440' : color + '40'}`
                    : 'none',
                }}
              />
              <span className="text-[11px] font-mono text-white/40 font-bold">{p.label}</span>
              <span className="text-[9px] font-mono text-white/15 ml-auto">{p.exposureCount}x</span>
            </div>
            <div className="grid grid-cols-3 gap-1.5">
              <MiniBar label="Threat" value={Math.abs(p.threatBias)} color="#ff4444" />
              <MiniBar label="Familiar" value={p.familiarity} color={color} />
              <MiniBar label="Survival" value={p.survivalRelevance} color="#ffaa33" />
            </div>
            <div className="text-[10px] font-mono text-white/20 leading-snug italic">
              {p.learnedResponse}
            </div>
            <div className="flex flex-wrap gap-1">
              {p.connections.slice(0, 4).map((c) => (
                <span key={c} className="text-[8px] font-mono bg-white/[0.03] px-1 rounded"
                  style={{ color: color + '25' }}>
                  {c}
                </span>
              ))}
            </div>
          </div>
        )
      })}
    </div>
  )
}

function MemoryContent({ memories, color }: { memories: VesselEntry[]; color: string }) {
  if (memories.length === 0) {
    return (
      <div className="text-[11px] font-mono text-white/10 italic py-3 text-center">
        Memory vault empty. Significant experiences will crystallize here.
      </div>
    )
  }

  return (
    <div className="space-y-2">
      {[...memories].reverse().map((m) => {
        const age = Math.round((Date.now() - m.timestamp) / 1000)
        return (
          <div
            key={m.id}
            className="rounded-md p-2.5 border"
            style={{
              backgroundColor: color + '06',
              borderColor: color + '15',
            }}
          >
            <div className="flex items-start gap-2">
              <div className="text-[12px] mt-0.5" style={{ color: color + '50' }}>&#9671;</div>
              <div className="flex-1 min-w-0">
                <div className="text-[11px] font-mono leading-relaxed" style={{ color: color + '70' }}>
                  {m.content}
                </div>
                <div className="flex items-center gap-2 mt-1">
                  <div className="h-0.5 flex-1 rounded-full overflow-hidden bg-white/[0.03]">
                    <div
                      className="h-full rounded-full"
                      style={{
                        width: `${m.importance * 100}%`,
                        backgroundColor: color + '40',
                      }}
                    />
                  </div>
                  <span className="text-[8px] font-mono text-white/10">{age}s ago</span>
                </div>
              </div>
            </div>
          </div>
        )
      })}
    </div>
  )
}

function BeliefsContent({ beliefs, color }: { beliefs: VesselEntry[]; color: string }) {
  if (beliefs.length === 0) {
    return (
      <div className="text-[11px] font-mono text-white/10 italic py-3 text-center">
        No beliefs formed yet. Convictions emerge from repeated experience.
      </div>
    )
  }

  return (
    <div className="space-y-1.5">
      {[...beliefs].reverse().map((b) => {
        const age = Math.round((Date.now() - b.timestamp) / 1000)
        return (
          <div
            key={b.id}
            className="flex items-start gap-2 rounded-md p-2 border"
            style={{
              backgroundColor: color + '05',
              borderColor: color + '12',
            }}
          >
            <div className="text-[10px] mt-0.5 font-bold" style={{ color: color + '60' }}>&#8709;</div>
            <div className="flex-1 min-w-0">
              <div className="text-[11px] font-mono leading-relaxed" style={{ color: color + '65' }}>
                {b.content}
              </div>
              <div className="flex items-center justify-between mt-1">
                <span className="text-[8px] font-mono" style={{ color: color + '25' }}>
                  confidence: {(b.importance * 100).toFixed(0)}%
                </span>
                <span className="text-[8px] font-mono text-white/10">{age}s ago</span>
              </div>
            </div>
          </div>
        )
      })}
    </div>
  )
}

function MetaContent({ insights, color }: { insights: VesselEntry[]; color: string }) {
  if (insights.length === 0) {
    return (
      <div className="text-[11px] font-mono text-white/10 italic py-3 text-center">
        Meta-cognition inactive. Self-reflection emerges with accumulated experience.
      </div>
    )
  }

  return (
    <div className="space-y-1.5">
      {[...insights].reverse().map((i) => {
        const age = Math.round((Date.now() - i.timestamp) / 1000)
        return (
          <div
            key={i.id}
            className="flex items-start gap-2 rounded-md p-2"
            style={{ backgroundColor: color + '06' }}
          >
            <div className="text-[10px] mt-0.5" style={{ color: color + '50' }}>&#8734;</div>
            <div className="flex-1 min-w-0">
              <div className="text-[11px] font-mono leading-relaxed" style={{ color: color + '60' }}>
                {i.content}
              </div>
              <div className="flex items-center justify-between mt-1">
                <span className="text-[8px] font-mono" style={{ color: color + '20' }}>
                  {i.source}
                </span>
                <span className="text-[8px] font-mono text-white/10">{age}s ago</span>
              </div>
            </div>
          </div>
        )
      })}
    </div>
  )
}

function ConsciousnessContent({ cognition, color }: { cognition: CognitionState; color: string }) {
  return (
    <div className="space-y-3">
      {/* Phase header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-1.5">
          <div
            className="w-2 h-2 rounded-full"
            style={{
              backgroundColor: color,
              opacity: 0.4 + cognition.awarenessLevel * 0.6,
              boxShadow: cognition.awarenessLevel > 0.3 ? `0 0 8px ${color}60` : 'none',
              animation: cognition.awarenessLevel > 0.2 ? 'pulse-glow 2s infinite' : 'none',
            }}
          />
          <span className="text-[10px] font-mono font-bold tracking-wider uppercase" style={{ color: color + 'cc' }}>
            {cognition.phase}
          </span>
        </div>
      </div>

      <div className="text-[10px] font-mono leading-snug" style={{ color: color + '50' }}>
        {cognition.phaseDescription}
      </div>

      {/* Awareness meter */}
      <div>
        <div className="flex items-center justify-between mb-1">
          <span className="text-[9px] font-mono text-white/15 tracking-wider uppercase">Awareness</span>
          <span className="text-[9px] font-mono tabular-nums" style={{ color: color + '80' }}>
            {(cognition.awarenessLevel * 100).toFixed(0)}%
          </span>
        </div>
        <div className="h-2 bg-white/[0.03] rounded-full overflow-hidden">
          <div
            className="h-full rounded-full transition-all duration-1000 ease-out relative overflow-hidden"
            style={{
              width: `${cognition.awarenessLevel * 100}%`,
              background: `linear-gradient(90deg, ${color}40, ${color}70)`,
              boxShadow: `0 0 8px ${color}30`,
            }}
          >
            {cognition.awarenessLevel > 0.1 && (
              <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/10 to-transparent animate-btn-shine" />
            )}
          </div>
        </div>
      </div>

      {/* Cognitive dimensions */}
      <div className="grid grid-cols-3 gap-2">
        <CogDimension label="Integration" value={cognition.integrationCapacity} color={color} />
        <CogDimension label="Prediction" value={cognition.predictiveAccuracy} color={color} />
        <CogDimension label="Self-Model" value={cognition.selfModelDepth} color={color} />
      </div>

      {/* Active strategies */}
      {cognition.activeStrategies.length > 0 && (
        <div className="space-y-1.5">
          <div className="text-[9px] font-mono text-white/12 tracking-wider uppercase">
            Active Strategies
          </div>
          {cognition.activeStrategies.map((s) => (
            <div key={s.id} className="flex items-start gap-1.5 bg-white/[0.02] rounded-md p-1.5">
              <span className="text-[10px] shrink-0 mt-0.5" style={{ color: color + '60' }}>
                {STRATEGY_ICONS[s.type]}
              </span>
              <div className="min-w-0 flex-1">
                <div className="flex items-center justify-between">
                  <span className="text-[10px] font-mono text-white/35 font-bold">{s.label}</span>
                  <span className="text-[9px] font-mono tabular-nums" style={{ color: color + '50' }}>
                    {(s.strength * 100).toFixed(0)}%
                  </span>
                </div>
                <div className="text-[9px] font-mono text-white/15 leading-snug">
                  {s.description}
                </div>
                <div className="h-0.5 bg-white/[0.03] rounded-full overflow-hidden mt-1">
                  <div
                    className="h-full rounded-full transition-all duration-700"
                    style={{
                      width: `${s.strength * 100}%`,
                      backgroundColor: color + '50',
                    }}
                  />
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Empty state */}
      {cognition.activeStrategies.length === 0 && cognition.awarenessLevel < 0.05 && (
        <div className="text-[11px] font-mono text-white/10 italic py-2 text-center">
          Consciousness substrate dormant. Learning must accumulate first.
        </div>
      )}
    </div>
  )
}

// ── Shared Sub-Components ──

function CogDimension({ label, value, color }: { label: string; value: number; color: string }) {
  return (
    <div>
      <div className="text-[8px] font-mono text-white/15 mb-0.5 tracking-wider">{label}</div>
      <div className="h-1.5 bg-white/[0.03] rounded-full overflow-hidden">
        <div
          className="h-full rounded-full transition-all duration-1000"
          style={{
            width: `${Math.min(1, value) * 100}%`,
            backgroundColor: color + '50',
            boxShadow: value > 0.3 ? `0 0 4px ${color}30` : 'none',
          }}
        />
      </div>
      <div className="text-[8px] font-mono tabular-nums mt-0.5" style={{ color: color + '40' }}>
        {(value * 100).toFixed(0)}%
      </div>
    </div>
  )
}

function MiniBar({ label, value, color }: { label: string; value: number; color: string }) {
  return (
    <div>
      <div className="text-[8px] font-mono text-white/15 mb-0.5">{label}</div>
      <div className="h-1 bg-white/[0.03] rounded-full overflow-hidden">
        <div
          className="h-full rounded-full transition-all duration-700"
          style={{
            width: `${Math.min(1, value) * 100}%`,
            backgroundColor: color + '50',
            boxShadow: value > 0.5 ? `0 0 4px ${color}30` : 'none',
          }}
        />
      </div>
    </div>
  )
}

function StateSlider({ label, value, color, onChange }: {
  label: string; value: number; color: string; onChange: (v: number) => void
}) {
  return (
    <div className="flex items-center gap-2">
      <span className="text-xs font-mono text-white/25 w-20 shrink-0">{label}</span>
      <input
        type="range" min={0} max={1} step={0.01} value={value}
        onChange={(e) => onChange(parseFloat(e.target.value))}
        className="flex-1 h-1.5 appearance-none rounded-full cursor-pointer
          [&::-webkit-slider-thumb]:appearance-none [&::-webkit-slider-thumb]:w-3 [&::-webkit-slider-thumb]:h-3
          [&::-webkit-slider-thumb]:rounded-full [&::-webkit-slider-thumb]:cursor-pointer [&::-webkit-slider-thumb]:border-0"
        style={{
          background: `linear-gradient(to right, ${color}50 ${value * 100}%, rgba(255,255,255,0.04) ${value * 100}%)`,
        }}
      />
      <span className="text-xs font-mono tabular-nums w-8 text-right" style={{ color: color + '60' }}>
        {(value * 100).toFixed(0)}
      </span>
    </div>
  )
}
