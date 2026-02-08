import { useState } from 'react'
import { useStore, type AssociationEntry, type LearnedPattern, type CognitionState, type CognitiveStrategy } from '../store/useStore'

const PHASE_COLORS: Record<CognitionState['phase'], string> = {
  dormant: '#555555',
  reactive: '#ff4444',
  adaptive: '#ff8833',
  predictive: '#ffcc00',
  integrated: '#44cc88',
  conscious: '#44ddff',
}

const STRATEGY_ICONS: Record<CognitiveStrategy['type'], string> = {
  defensive: '\u25B2',   // ▲
  exploratory: '\u25C6', // ◆
  integrative: '\u25CF', // ●
  predictive: '\u25BA',  // ►
}

export function StatePanel() {
  const state = useStore((s) => s.state)
  const setState = useStore((s) => s.setState)
  const stimulusActive = useStore((s) => s.stimulusActive)
  const clearStimulus = useStore((s) => s.clearStimulus)
  const somaticSignals = useStore((s) => s.somaticSignals)
  const associations = useStore((s) => s.associations)
  const learnedPatterns = useStore((s) => s.learnedPatterns)
  const cognition = useStore((s) => s.cognition)

  // Expand/collapse state for each bucket
  const [expandedBucket, setExpandedBucket] = useState<'events' | 'learning' | 'cognition' | null>('events')

  const toggleBucket = (bucket: 'events' | 'learning' | 'cognition') => {
    setExpandedBucket(prev => prev === bucket ? null : bucket)
  }

  // Bucket fill levels (0–1)
  const eventsFill = Math.min(1, associations.length / 15)
  const learningFill = learnedPatterns.length > 0
    ? Math.min(1, learnedPatterns.reduce((s, p) => s + p.familiarity, 0) / learnedPatterns.length)
    : 0
  const cognitionFill = cognition.awarenessLevel

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

        {/* Right column: Three Consciousness Buckets */}
        <div className="flex-1 min-w-0 flex flex-col gap-2 overflow-y-auto max-h-full scrollbar-thin">

          {/* ── Flow Pipeline Visual ── */}
          <div className="flex items-center gap-1 px-1">
            <BucketPill
              label="Events" count={associations.length} fill={eventsFill} color="#38bdf8"
              active={expandedBucket === 'events'} onClick={() => toggleBucket('events')}
            />
            <FlowArrow fill={eventsFill} />
            <BucketPill
              label="Learning" count={learnedPatterns.length} fill={learningFill} color="#4ade80"
              active={expandedBucket === 'learning'} onClick={() => toggleBucket('learning')}
            />
            <FlowArrow fill={learningFill} />
            <BucketPill
              label="Cognition" count={cognition.activeStrategies.length} fill={cognitionFill}
              color={PHASE_COLORS[cognition.phase]}
              active={expandedBucket === 'cognition'} onClick={() => toggleBucket('cognition')}
            />
          </div>

          {/* ── Bucket 1: Associations & Events ── */}
          {expandedBucket === 'events' && (
            <EventsBucket associations={associations} />
          )}

          {/* ── Bucket 2: Learned Patterns / Heuristics ── */}
          {expandedBucket === 'learning' && (
            <LearningBucket patterns={learnedPatterns} />
          )}

          {/* ── Bucket 3: Cognition / Consciousness ── */}
          {expandedBucket === 'cognition' && (
            <CognitionBucket cognition={cognition} />
          )}
        </div>
      </div>
    </div>
  )
}

// ── Flow Pipeline Components ──

function BucketPill({ label, count, fill, color, active, onClick }: {
  label: string; count: number; fill: number; color: string; active: boolean; onClick: () => void
}) {
  return (
    <button
      onClick={onClick}
      className={`
        flex-1 relative overflow-hidden rounded-md px-2 py-1.5 cursor-pointer
        transition-all duration-300 border
        ${active
          ? 'border-opacity-60 shadow-lg'
          : 'border-opacity-20 hover:border-opacity-40'
        }
      `}
      style={{
        borderColor: color + (active ? '99' : '33'),
        backgroundColor: color + '08',
        boxShadow: active ? `0 0 12px ${color}15` : 'none',
      }}
    >
      {/* Fill level */}
      <div
        className="absolute inset-y-0 left-0 transition-all duration-1000 ease-out"
        style={{
          width: `${fill * 100}%`,
          background: `linear-gradient(90deg, ${color}15, ${color}25)`,
        }}
      />
      <div className="relative flex items-center justify-between gap-1">
        <span className="text-[10px] font-mono tracking-wider uppercase" style={{ color: color + (active ? 'cc' : '60') }}>
          {label}
        </span>
        <span className="text-[10px] font-mono tabular-nums font-bold" style={{ color: color + '80' }}>
          {count}
        </span>
      </div>
    </button>
  )
}

function FlowArrow({ fill }: { fill: number }) {
  const opacity = 0.1 + fill * 0.4
  return (
    <div className="shrink-0 flex items-center" style={{ opacity }}>
      <svg width="16" height="10" viewBox="0 0 16 10" className="text-white">
        <path d="M0 5 L12 5 M9 2 L13 5 L9 8" stroke="currentColor" strokeWidth="1" fill="none" opacity={opacity} />
      </svg>
    </div>
  )
}

// ── Bucket 1: Events ──

function EventsBucket({ associations }: { associations: AssociationEntry[] }) {
  const recent = associations.slice(-10).reverse()

  return (
    <div className="bg-sky-500/[0.03] border border-sky-500/[0.08] rounded-lg p-3 flex-1 min-h-0 overflow-y-auto scrollbar-thin">
      <div className="text-[10px] font-mono tracking-[0.2em] text-sky-400/30 uppercase mb-2">
        Raw Perceptions &amp; Events
      </div>

      {recent.length > 0 ? (
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
                      <span key={c} className="text-[9px] font-mono text-sky-400/20 bg-sky-400/[0.05] px-1 rounded">
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
      ) : (
        <div className="text-[11px] font-mono text-white/10 italic py-3 text-center">
          No events yet. Throw something or trigger a scenario.
        </div>
      )}
    </div>
  )
}

// ── Bucket 2: Learning ──

function LearningBucket({ patterns }: { patterns: LearnedPattern[] }) {
  const sorted = [...patterns].sort((a, b) => b.exposureCount - a.exposureCount)

  return (
    <div className="bg-emerald-500/[0.03] border border-emerald-500/[0.08] rounded-lg p-3 flex-1 min-h-0 overflow-y-auto scrollbar-thin">
      <div className="text-[10px] font-mono tracking-[0.2em] text-emerald-400/30 uppercase mb-2">
        Learned Heuristics &amp; Perceptions
      </div>

      {sorted.length > 0 ? (
        <div className="space-y-2">
          {sorted.map((p) => {
            const recency = Math.max(0, 1 - (Date.now() - p.lastSeen) / 30000)
            return (
              <div key={p.id} className="bg-white/[0.02] rounded-md p-2 space-y-1">
                <div className="flex items-center gap-2">
                  <div
                    className="w-2 h-2 rounded-full shrink-0"
                    style={{
                      backgroundColor: p.survivalRelevance > 0.5 ? '#ff4444' : '#44cc88',
                      opacity: 0.4 + recency * 0.6,
                      boxShadow: recency > 0.5
                        ? `0 0 6px ${p.survivalRelevance > 0.5 ? '#ff444440' : '#44cc8840'}`
                        : 'none',
                    }}
                  />
                  <span className="text-[11px] font-mono text-white/40 font-bold">{p.label}</span>
                  <span className="text-[9px] font-mono text-white/15 ml-auto">{p.exposureCount}x</span>
                </div>
                {/* Mini bars */}
                <div className="grid grid-cols-3 gap-1.5">
                  <MiniBar label="Threat" value={Math.abs(p.threatBias)} color="#ff4444" />
                  <MiniBar label="Familiar" value={p.familiarity} color="#44cc88" />
                  <MiniBar label="Survival" value={p.survivalRelevance} color="#ffaa33" />
                </div>
                <div className="text-[10px] font-mono text-white/20 leading-snug italic">
                  {p.learnedResponse}
                </div>
                <div className="flex flex-wrap gap-1">
                  {p.connections.slice(0, 4).map((c) => (
                    <span key={c} className="text-[8px] font-mono text-emerald-400/20 bg-emerald-400/[0.04] px-1 rounded">
                      {c}
                    </span>
                  ))}
                </div>
              </div>
            )
          })}
        </div>
      ) : (
        <div className="text-[11px] font-mono text-white/10 italic py-3 text-center">
          No learned patterns yet. Repeated exposure builds heuristics.
        </div>
      )}
    </div>
  )
}

// ── Bucket 3: Cognition ──

function CognitionBucket({ cognition }: { cognition: CognitionState }) {
  const phaseColor = PHASE_COLORS[cognition.phase]

  return (
    <div
      className="border rounded-lg p-3 flex-1 min-h-0 overflow-y-auto scrollbar-thin"
      style={{
        backgroundColor: phaseColor + '06',
        borderColor: phaseColor + '18',
      }}
    >
      {/* Phase header */}
      <div className="flex items-center justify-between mb-2">
        <div className="text-[10px] font-mono tracking-[0.2em] uppercase" style={{ color: phaseColor + '50' }}>
          Consciousness
        </div>
        <div className="flex items-center gap-1.5">
          <div
            className="w-2 h-2 rounded-full"
            style={{
              backgroundColor: phaseColor,
              opacity: 0.4 + cognition.awarenessLevel * 0.6,
              boxShadow: cognition.awarenessLevel > 0.3 ? `0 0 8px ${phaseColor}60` : 'none',
              animation: cognition.awarenessLevel > 0.2 ? 'pulse-glow 2s infinite' : 'none',
            }}
          />
          <span className="text-[10px] font-mono font-bold tracking-wider uppercase" style={{ color: phaseColor + 'cc' }}>
            {cognition.phase}
          </span>
        </div>
      </div>

      {/* Phase description */}
      <div className="text-[10px] font-mono leading-snug mb-3" style={{ color: phaseColor + '50' }}>
        {cognition.phaseDescription}
      </div>

      {/* Awareness meter */}
      <div className="mb-3">
        <div className="flex items-center justify-between mb-1">
          <span className="text-[9px] font-mono text-white/15 tracking-wider uppercase">Awareness</span>
          <span className="text-[9px] font-mono tabular-nums" style={{ color: phaseColor + '80' }}>
            {(cognition.awarenessLevel * 100).toFixed(0)}%
          </span>
        </div>
        <div className="h-2 bg-white/[0.03] rounded-full overflow-hidden">
          <div
            className="h-full rounded-full transition-all duration-1000 ease-out relative overflow-hidden"
            style={{
              width: `${cognition.awarenessLevel * 100}%`,
              background: `linear-gradient(90deg, ${phaseColor}40, ${phaseColor}70)`,
              boxShadow: `0 0 8px ${phaseColor}30`,
            }}
          >
            {cognition.awarenessLevel > 0.1 && (
              <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/10 to-transparent animate-btn-shine" />
            )}
          </div>
        </div>
      </div>

      {/* Cognitive dimensions */}
      <div className="grid grid-cols-3 gap-2 mb-3">
        <CogDimension label="Integration" value={cognition.integrationCapacity} color={phaseColor} />
        <CogDimension label="Prediction" value={cognition.predictiveAccuracy} color={phaseColor} />
        <CogDimension label="Self-Model" value={cognition.selfModelDepth} color={phaseColor} />
      </div>

      {/* Active strategies */}
      {cognition.activeStrategies.length > 0 && (
        <div className="space-y-1.5">
          <div className="text-[9px] font-mono text-white/12 tracking-wider uppercase">
            Active Strategies
          </div>
          {cognition.activeStrategies.map((s) => (
            <div key={s.id} className="flex items-start gap-1.5 bg-white/[0.02] rounded-md p-1.5">
              <span className="text-[10px] shrink-0 mt-0.5" style={{ color: phaseColor + '60' }}>
                {STRATEGY_ICONS[s.type]}
              </span>
              <div className="min-w-0 flex-1">
                <div className="flex items-center justify-between">
                  <span className="text-[10px] font-mono text-white/35 font-bold">{s.label}</span>
                  <span className="text-[9px] font-mono tabular-nums" style={{ color: phaseColor + '50' }}>
                    {(s.strength * 100).toFixed(0)}%
                  </span>
                </div>
                <div className="text-[9px] font-mono text-white/15 leading-snug">
                  {s.description}
                </div>
                {/* Strength bar */}
                <div className="h-0.5 bg-white/[0.03] rounded-full overflow-hidden mt-1">
                  <div
                    className="h-full rounded-full transition-all duration-700"
                    style={{
                      width: `${s.strength * 100}%`,
                      backgroundColor: phaseColor + '50',
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

// ── Shared sub-components ──

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
