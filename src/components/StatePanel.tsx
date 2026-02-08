import { useStore } from '../store/useStore'

export function StatePanel() {
  const state = useStore((s) => s.state)
  const setState = useStore((s) => s.setState)
  const stimulusActive = useStore((s) => s.stimulusActive)
  const clearStimulus = useStore((s) => s.clearStimulus)
  const somaticSignals = useStore((s) => s.somaticSignals)
  const associations = useStore((s) => s.associations)
  const learnedPatterns = useStore((s) => s.learnedPatterns)

  const recentAssociations = associations.slice(-8)

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

        {/* Right column: associations / learning / baggage */}
        <div className="flex-1 min-w-0 space-y-3 overflow-y-auto max-h-full scrollbar-thin">
          {/* Learned Patterns (adaptive knowledge) */}
          {learnedPatterns.length > 0 && (
            <div className="bg-emerald-500/[0.03] border border-emerald-500/[0.08] rounded-lg p-3">
              <div className="flex items-center justify-between mb-2">
                <span className="text-xs font-mono tracking-[0.25em] text-emerald-400/30 uppercase">
                  Learned Patterns
                </span>
                <span className="text-[10px] font-mono text-emerald-400/20">
                  {learnedPatterns.reduce((s, p) => s + p.exposureCount, 0)} total exposures
                </span>
              </div>
              <div className="space-y-2">
                {learnedPatterns.map((p) => {
                  const recency = Math.max(0, 1 - (Date.now() - p.lastSeen) / 30000)
                  return (
                    <div key={p.id} className="bg-white/[0.02] rounded-md p-2 space-y-1">
                      <div className="flex items-center gap-2">
                        <div
                          className="w-2 h-2 rounded-full shrink-0"
                          style={{
                            backgroundColor: p.survivalRelevance > 0.5 ? '#ff4444' : '#44cc88',
                            opacity: 0.4 + recency * 0.6,
                            boxShadow: recency > 0.5 ? `0 0 6px ${p.survivalRelevance > 0.5 ? '#ff444440' : '#44cc8840'}` : 'none',
                          }}
                        />
                        <span className="text-[12px] font-mono text-white/40 font-bold">{p.label}</span>
                        <span className="text-[10px] font-mono text-white/15 ml-auto">{p.exposureCount}x</span>
                      </div>
                      {/* Learning bars */}
                      <div className="grid grid-cols-3 gap-1.5">
                        <LearningBar label="Threat" value={Math.abs(p.threatBias)} color="#ff4444" />
                        <LearningBar label="Familiar" value={p.familiarity} color="#44cc88" />
                        <LearningBar label="Survival" value={p.survivalRelevance} color="#ffaa33" />
                      </div>
                      <div className="text-[10px] font-mono text-white/20 leading-snug italic">
                        {p.learnedResponse}
                      </div>
                      <div className="flex flex-wrap gap-1 mt-0.5">
                        {p.connections.slice(0, 4).map((c) => (
                          <span
                            key={c}
                            className="text-[9px] font-mono text-emerald-400/20 bg-emerald-400/[0.04] px-1 rounded"
                          >
                            {c}
                          </span>
                        ))}
                      </div>
                    </div>
                  )
                })}
              </div>
            </div>
          )}

          {/* Recent Associations (real-time event log) */}
          <div className="bg-cyan-500/[0.03] border border-cyan-500/[0.08] rounded-lg p-3">
            <div className="text-xs font-mono tracking-[0.25em] text-cyan-400/30 uppercase mb-2">
              Associations &amp; Events
            </div>

            {recentAssociations.length > 0 ? (
              <div className="space-y-2">
                {recentAssociations.map((a) => {
                  const age = Math.round((Date.now() - a.timestamp) / 1000)
                  const isFresh = age < 5
                  return (
                    <div key={a.id} className={`space-y-0.5 ${isFresh ? 'animate-thought-fade-in' : ''}`}>
                      <div className="flex items-start gap-2">
                        <div
                          className="w-2 h-2 rounded-full mt-1 shrink-0"
                          style={{
                            backgroundColor:
                              a.valence === 'negative' ? '#ff4444' :
                              a.valence === 'positive' ? '#44cc88' :
                              '#ffcc00',
                            opacity: isFresh ? 0.8 : 0.4,
                            boxShadow: isFresh ? `0 0 8px ${a.valence === 'negative' ? '#ff444440' : '#44cc8840'}` : 'none',
                          }}
                        />
                        <div className="min-w-0 flex-1">
                          <div className="text-[12px] font-mono text-white/35 leading-snug">
                            {a.interpretation}
                          </div>
                          <div className="flex flex-wrap gap-1 mt-1">
                            {a.connections.slice(0, 5).map((c) => (
                              <span
                                key={c}
                                className="text-[10px] font-mono text-cyan-400/25 bg-cyan-400/[0.05] px-1 rounded"
                              >
                                {c}
                              </span>
                            ))}
                          </div>
                          <div className="flex gap-3 mt-0.5">
                            <span className="text-[9px] font-mono text-white/10">
                              {a.trigger}
                            </span>
                            <span className="text-[9px] font-mono text-white/10">
                              {(a.intensity * 100).toFixed(0)}%
                            </span>
                            <span className="text-[9px] font-mono text-white/8 ml-auto">
                              {age}s ago
                            </span>
                          </div>
                        </div>
                      </div>
                    </div>
                  )
                })}
              </div>
            ) : (
              <div className="text-[12px] font-mono text-white/10 italic py-3 text-center">
                No associations yet. Yeet something or trigger a scenario.
              </div>
            )}
          </div>
        </div>
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

function LearningBar({ label, value, color }: { label: string; value: number; color: string }) {
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
