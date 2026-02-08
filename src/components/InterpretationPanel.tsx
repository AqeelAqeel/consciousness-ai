import { useStore } from '../store/useStore'

export function InterpretationPanel() {
  const interpretation = useStore((s) => s.interpretation)
  const currentAction = useStore((s) => s.currentAction)
  const narration = useStore((s) => s.narration)
  const associations = useStore((s) => s.associations)
  const cognitionFragments = useStore((s) => s.cognitionFragments)
  const somaticSignals = useStore((s) => s.somaticSignals)
  const actionAvailability = useStore((s) => s.actionAvailability)
  const stimulusActive = useStore((s) => s.stimulusActive)
  const stimulus = useStore((s) => s.stimulus)
  const state = useStore((s) => s.state)
  const setState = useStore((s) => s.setState)
  const clearStimulus = useStore((s) => s.clearStimulus)

  const recentAssociations = associations.slice(-5)

  return (
    <div className="h-full overflow-y-auto space-y-4 p-3 scrollbar-thin">
      {/* State controls */}
      <div className="bg-white/[0.02] border border-white/[0.05] rounded-lg p-3 space-y-2">
        <div className="flex items-center justify-between">
          <span className="text-[8px] font-mono tracking-[0.25em] text-white/20 uppercase">
            Internal State
          </span>
          {stimulusActive && (
            <button
              onClick={clearStimulus}
              className="text-[7px] font-mono text-white/20 bg-white/[0.03] px-2 py-0.5 rounded
                hover:bg-white/[0.06] hover:text-white/30 transition-all border border-white/[0.05]"
            >
              CLEAR STIMULUS
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

      {/* Narration */}
      <div className="bg-white/[0.02] border border-white/[0.05] rounded-lg p-3">
        <div className="text-[8px] font-mono tracking-[0.25em] text-white/20 uppercase mb-1.5">
          System Narration
        </div>
        <p className="text-[11px] font-mono text-white/45 leading-relaxed italic">
          "{narration}"
        </p>
      </div>

      {/* Active stimulus */}
      {stimulusActive && stimulus && (
        <div className="bg-orange-500/[0.04] border border-orange-500/10 rounded-lg p-3">
          <div className="text-[8px] font-mono tracking-[0.25em] text-orange-400/40 uppercase mb-1">
            Active Stimulus
          </div>
          <div className="flex items-center gap-2">
            <div className="w-2 h-2 rounded-full bg-orange-400/50 animate-pulse" />
            <span className="text-[10px] font-mono text-orange-300/60">{stimulus.label}</span>
            <span className="text-[8px] font-mono text-orange-400/30">
              {stimulus.type} · {(stimulus.intensity * 100).toFixed(0)}%
            </span>
          </div>
        </div>
      )}

      {/* Interpretation readout */}
      {interpretation && (
        <div className="bg-white/[0.02] border border-white/[0.05] rounded-lg p-3 space-y-2">
          <div className="text-[8px] font-mono tracking-[0.25em] text-white/20 uppercase mb-1">
            Interpretation Vector
          </div>
          <InterpBar label="Perceived Threat" value={interpretation.perceivedThreat} color="#ff4444" />
          <InterpBar label="Salience" value={interpretation.salience} color="#ffcc00" />
          <InterpBar label="Cognitive Access" value={interpretation.cognitiveAccess} color="#4488ff" />
          <div className="flex items-center gap-2 pt-1">
            <span className="text-[8px] font-mono text-white/20">Motor Bias:</span>
            <span className={`text-[9px] font-mono tracking-wider uppercase ${
              interpretation.motorBias === 'withdraw' ? 'text-red-400/60' :
              interpretation.motorBias === 'freeze' ? 'text-yellow-400/60' :
              'text-green-400/60'
            }`}>
              {interpretation.motorBias}
            </span>
          </div>
        </div>
      )}

      {/* Current Action */}
      <div className="bg-white/[0.02] border border-white/[0.05] rounded-lg p-3">
        <div className="text-[8px] font-mono tracking-[0.25em] text-white/20 uppercase mb-2">
          Action Selection
        </div>
        <div className="flex items-center gap-3 mb-2">
          <div className={`
            px-3 py-1.5 rounded-md text-[11px] font-mono tracking-wider uppercase
            ${currentAction === 'flinch' || currentAction === 'withdraw'
              ? 'bg-red-500/15 text-red-400/70 border border-red-500/20'
              : currentAction === 'approach'
                ? 'bg-green-500/15 text-green-400/70 border border-green-500/20'
                : 'bg-blue-500/10 text-blue-400/50 border border-blue-500/15'
            }
          `}>
            {currentAction}
          </div>
        </div>
        {/* Availability */}
        <div className="flex flex-wrap gap-1">
          {actionAvailability.map((aa) => (
            <div
              key={aa.action}
              className={`
                px-1.5 py-0.5 rounded text-[7px] font-mono tracking-wider uppercase
                transition-all duration-300
                ${aa.available
                  ? aa.action === currentAction
                    ? 'bg-white/10 text-white/50'
                    : 'bg-white/[0.03] text-white/25'
                  : 'bg-white/[0.01] text-white/10 line-through'
                }
              `}
            >
              {aa.action}
            </div>
          ))}
        </div>
      </div>

      {/* Cognition Fragments */}
      {cognitionFragments.length > 0 && (
        <div className="bg-purple-500/[0.03] border border-purple-500/10 rounded-lg p-3">
          <div className="text-[8px] font-mono tracking-[0.25em] text-purple-400/30 uppercase mb-1.5">
            Cognitive Fragments
          </div>
          <div className="flex flex-wrap gap-1.5">
            {cognitionFragments.map((f) => (
              <span
                key={f.id}
                className="px-2 py-0.5 rounded-full text-[9px] font-mono"
                style={{
                  backgroundColor: f.intensity > 0.7 ? 'rgba(255,68,68,0.1)' : 'rgba(136,170,204,0.08)',
                  color: f.intensity > 0.7 ? '#ff666680' : '#88aacc60',
                  border: `1px solid ${f.intensity > 0.7 ? 'rgba(255,68,68,0.15)' : 'rgba(136,170,204,0.1)'}`,
                }}
              >
                {f.text}
              </span>
            ))}
          </div>
        </div>
      )}

      {/* Somatic Signals */}
      {somaticSignals.length > 0 && (
        <div className="bg-pink-500/[0.03] border border-pink-500/10 rounded-lg p-3">
          <div className="text-[8px] font-mono tracking-[0.25em] text-pink-400/30 uppercase mb-1.5">
            Somatic Signals
          </div>
          <div className="space-y-1">
            {somaticSignals.map((s, i) => (
              <div key={i} className="flex items-center gap-2">
                <span className="text-[8px] font-mono text-pink-300/30 w-10">{s.region}</span>
                <div className="flex-1 h-1 bg-white/[0.03] rounded-full overflow-hidden">
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
                <span className="text-[7px] font-mono text-white/15">{s.type}</span>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Associations */}
      {recentAssociations.length > 0 && (
        <div className="bg-cyan-500/[0.03] border border-cyan-500/10 rounded-lg p-3">
          <div className="text-[8px] font-mono tracking-[0.25em] text-cyan-400/30 uppercase mb-1.5">
            Associations
          </div>
          <div className="space-y-2">
            {recentAssociations.map((a) => (
              <div key={a.id} className="space-y-0.5">
                <div className="flex items-start gap-1.5">
                  <div
                    className="w-1.5 h-1.5 rounded-full mt-1 shrink-0"
                    style={{
                      backgroundColor:
                        a.valence === 'negative' ? '#ff4444' :
                        a.valence === 'positive' ? '#44cc88' :
                        '#ffcc00',
                      opacity: 0.5,
                    }}
                  />
                  <div>
                    <div className="text-[9px] font-mono text-white/35">{a.interpretation}</div>
                    <div className="flex flex-wrap gap-1 mt-0.5">
                      {a.connections.map((c) => (
                        <span
                          key={c}
                          className="text-[7px] font-mono text-cyan-400/25 bg-cyan-400/[0.05] px-1 rounded"
                        >
                          {c}
                        </span>
                      ))}
                    </div>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  )
}

function StateSlider({ label, value, color, onChange }: {
  label: string; value: number; color: string; onChange: (v: number) => void
}) {
  return (
    <div className="flex items-center gap-2">
      <span className="text-[8px] font-mono text-white/25 w-16 shrink-0">{label}</span>
      <input
        type="range" min={0} max={1} step={0.01} value={value}
        onChange={(e) => onChange(parseFloat(e.target.value))}
        className="flex-1 h-1 appearance-none rounded-full cursor-pointer
          [&::-webkit-slider-thumb]:appearance-none [&::-webkit-slider-thumb]:w-2.5 [&::-webkit-slider-thumb]:h-2.5
          [&::-webkit-slider-thumb]:rounded-full [&::-webkit-slider-thumb]:cursor-pointer [&::-webkit-slider-thumb]:border-0"
        style={{
          background: `linear-gradient(to right, ${color}50 ${value * 100}%, rgba(255,255,255,0.04) ${value * 100}%)`,
        }}
      />
      <span className="text-[8px] font-mono tabular-nums w-6 text-right" style={{ color: color + '60' }}>
        {(value * 100).toFixed(0)}
      </span>
    </div>
  )
}

function InterpBar({ label, value, color }: { label: string; value: number; color: string }) {
  return (
    <div className="flex items-center gap-2">
      <span className="text-[8px] font-mono text-white/20 w-24 shrink-0">{label}</span>
      <div className="flex-1 h-1.5 bg-white/[0.03] rounded-full overflow-hidden">
        <div
          className="h-full rounded-full transition-all duration-500"
          style={{
            width: `${value * 100}%`,
            background: `linear-gradient(90deg, ${color}40, ${color}70)`,
            boxShadow: `0 0 8px ${color}20`,
          }}
        />
      </div>
      <span className="text-[8px] font-mono tabular-nums text-white/20 w-6 text-right">
        {(value * 100).toFixed(0)}
      </span>
    </div>
  )
}
