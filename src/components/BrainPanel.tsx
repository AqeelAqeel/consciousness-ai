import { useStore } from '../store/useStore'
import { BrainCenter } from './BrainCenter'

export function BrainPanel() {
  const interpretation = useStore((s) => s.interpretation)
  const stimulus = useStore((s) => s.stimulus)
  const stimulusActive = useStore((s) => s.stimulusActive)
  const narration = useStore((s) => s.narration)
  const currentAction = useStore((s) => s.currentAction)
  const cognitionFragments = useStore((s) => s.cognitionFragments)

  return (
    <div className="h-full flex flex-col bg-[#060612] border-l border-white/[0.05] overflow-hidden">
      {/* Brain Center — full visualization + region bars */}
      <BrainCenter />

      <div className="shrink-0 overflow-y-auto p-3 space-y-3 scrollbar-thin max-h-[45%]">
        {/* Active stimulus */}
        {stimulusActive && stimulus && (
          <div className="bg-orange-500/[0.06] border border-orange-500/15 rounded-lg p-2">
            <div className="text-[9px] font-mono tracking-[0.2em] text-orange-400/40 uppercase mb-1">
              Active Stimulus
            </div>
            <div className="flex items-center gap-2">
              <div className="w-2 h-2 rounded-full bg-orange-400/60 animate-pulse" />
              <span className="text-[11px] font-mono text-orange-300/70">{stimulus.label}</span>
              <span className="text-[9px] font-mono text-orange-400/30 ml-auto">{(stimulus.intensity * 100).toFixed(0)}%</span>
            </div>
          </div>
        )}

        {/* Interpretation vector */}
        {interpretation && (
          <div className="bg-white/[0.02] border border-white/[0.05] rounded-lg p-2 space-y-1.5">
            <div className="text-[9px] font-mono tracking-[0.2em] text-white/20 uppercase mb-1">
              Interpretation
            </div>
            <InterpBar label="Threat" value={interpretation.perceivedThreat} color="#ff3333" />
            <InterpBar label="Salience" value={interpretation.salience} color="#ffcc00" />
            <InterpBar label="Cog. Access" value={interpretation.cognitiveAccess} color="#3388ff" />
            <div className="flex items-center gap-2 pt-0.5">
              <span className="text-[9px] font-mono text-white/15">Motor:</span>
              <span className={`text-[10px] font-mono tracking-wider uppercase ${
                interpretation.motorBias === 'withdraw' ? 'text-red-400/50' :
                interpretation.motorBias === 'freeze' ? 'text-yellow-400/50' :
                'text-green-400/50'
              }`}>
                {interpretation.motorBias}
              </span>
              <span className="text-[9px] font-mono text-white/15 ml-auto">Action:</span>
              <span className="text-[10px] font-mono text-white/40 uppercase">{currentAction}</span>
            </div>
          </div>
        )}

        {/* Cognition fragments */}
        {cognitionFragments.length > 0 && (
          <div className="bg-purple-500/[0.03] border border-purple-500/[0.08] rounded-lg p-2">
            <div className="text-[9px] font-mono tracking-[0.2em] text-purple-400/30 uppercase mb-1">
              Active Thoughts
            </div>
            <div className="flex flex-wrap gap-1">
              {cognitionFragments.map((f) => (
                <span
                  key={f.id}
                  className="px-1.5 py-0.5 rounded-full text-[10px] font-mono"
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

        {/* Narration */}
        <div className="bg-white/[0.015] border border-white/[0.04] rounded-lg p-2">
          <div className="text-[9px] font-mono tracking-[0.2em] text-white/15 uppercase mb-1">
            System Narration
          </div>
          <p className="text-[11px] font-mono text-white/35 leading-relaxed italic">
            "{narration}"
          </p>
        </div>
      </div>
    </div>
  )
}

function InterpBar({ label, value, color }: { label: string; value: number; color: string }) {
  return (
    <div className="flex items-center gap-2">
      <span className="text-[9px] font-mono text-white/20 w-16 shrink-0">{label}</span>
      <div className="flex-1 h-1.5 bg-white/[0.03] rounded-full overflow-hidden">
        <div
          className="h-full rounded-full transition-all duration-500"
          style={{
            width: `${value * 100}%`,
            background: `linear-gradient(90deg, ${color}40, ${color}80)`,
          }}
        />
      </div>
      <span className="text-[9px] font-mono text-white/15 w-6 text-right tabular-nums">
        {(value * 100).toFixed(0)}
      </span>
    </div>
  )
}
