import { useCallback, useEffect, useRef } from 'react'
import { useStore } from '../store/useStore'
import { useYeetStore, type ProjectileType } from '../store/useYeetStore'

const OBJECTS: { type: ProjectileType; label: string }[] = [
  { type: 'baseball',   label: 'Pitch Ball' },
  { type: 'bowling',    label: 'Bowling' },
  { type: 'watermelon', label: 'Melon' },
  { type: 'anvil',      label: 'Anvil' },
  { type: 'fish',       label: 'Fish' },
  { type: 'random',     label: 'Random' },
]

export function StatePanel() {
  const state = useStore((s) => s.state)
  const setState = useStore((s) => s.setState)
  const stimulusActive = useStore((s) => s.stimulusActive)
  const clearStimulus = useStore((s) => s.clearStimulus)
  const somaticSignals = useStore((s) => s.somaticSignals)
  const associations = useStore((s) => s.associations)

  // Yeet state
  const hits = useYeetStore((s) => s.hits)
  const thrown = useYeetStore((s) => s.thrown)
  const combo = useYeetStore((s) => s.combo)
  const lastVelocity = useYeetStore((s) => s.lastVelocity)
  const selectedType = useYeetStore((s) => s.selectedType)
  const setSelectedType = useYeetStore((s) => s.setSelectedType)
  const power = useYeetStore((s) => s.power)
  const angle = useYeetStore((s) => s.angle)
  const gravity = useYeetStore((s) => s.gravity)
  const spin = useYeetStore((s) => s.spin)
  const chaosEnabled = useYeetStore((s) => s.chaosEnabled)
  const chaosAmount = useYeetStore((s) => s.chaosAmount)
  const setPower = useYeetStore((s) => s.setPower)
  const setAngle = useYeetStore((s) => s.setAngle)
  const setGravity = useYeetStore((s) => s.setGravity)
  const setSpin = useYeetStore((s) => s.setSpin)
  const setChaosEnabled = useYeetStore((s) => s.setChaosEnabled)
  const setChaosAmount = useYeetStore((s) => s.setChaosAmount)
  const launch = useYeetStore((s) => s.launch)

  const recentAssociations = associations.slice(-8)

  // Rapid fire on hold
  const rapidRef = useRef<ReturnType<typeof setTimeout> | null>(null)
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null)

  const startRapid = useCallback(() => {
    launch()
    rapidRef.current = setTimeout(() => {
      intervalRef.current = setInterval(launch, 200)
    }, 400)
  }, [launch])

  const stopRapid = useCallback(() => {
    if (rapidRef.current) clearTimeout(rapidRef.current)
    if (intervalRef.current) clearInterval(intervalRef.current)
  }, [])

  // Keyboard shortcut: Y to yeet
  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if (e.code === 'KeyY' && !e.metaKey && !e.ctrlKey) {
        const active = document.activeElement
        if (active && (active.tagName === 'INPUT' || active.tagName === 'TEXTAREA')) return
        launch()
      }
    }
    window.addEventListener('keydown', handler)
    return () => window.removeEventListener('keydown', handler)
  }, [launch])

  return (
    <div className="h-full overflow-y-auto p-3 scrollbar-thin">
      <div className="flex gap-3 h-full min-h-0">
        {/* Left column: Projectile Lab (embedded) */}
        <div className="w-56 shrink-0 space-y-3">
          {/* Projectile Lab Header */}
          <div className="flex items-center justify-between">
            <span className="text-xs font-mono tracking-[0.25em] text-[#facc15]/40 uppercase">
              Projectile Lab
            </span>
            {combo >= 2 && (
              <span className="text-sm font-mono text-[#facc15] font-bold animate-pulse">
                {combo}x
              </span>
            )}
          </div>

          {/* Stats row */}
          <div className="flex gap-2">
            <MiniStat label="Hits" value={hits} color="#facc15" />
            <MiniStat label="Thrown" value={thrown} color="#888" />
            <MiniStat label="Vel" value={lastVelocity} color="#38bdf8" />
          </div>

          {/* YEET button */}
          <button
            onMouseDown={startRapid}
            onMouseUp={stopRapid}
            onMouseLeave={stopRapid}
            className="
              w-full h-11 rounded-lg border-none cursor-pointer relative overflow-hidden
              bg-gradient-to-r from-[#facc15] via-[#f59e0b] to-[#ea580c]
              text-[#0a0a0f] font-mono text-xl font-bold tracking-[6px]
              shadow-[0_2px_12px_rgba(250,204,21,0.25)]
              hover:shadow-[0_4px_20px_rgba(250,204,21,0.4)]
              hover:scale-[1.02]
              active:scale-[0.97]
              transition-all duration-100
            "
          >
            <div className="absolute -top-1/2 -left-[60%] w-[40%] h-[200%] bg-gradient-to-r from-transparent via-white/25 to-transparent -skew-x-[20deg] animate-btn-shine" />
            YEET
          </button>
          <div className="text-[11px] font-mono text-white/15 text-center -mt-1">
            press Y or hold to rapid fire
          </div>

          {/* Object selector */}
          <div className="bg-white/[0.02] border border-white/[0.05] rounded-lg p-2.5">
            <div className="text-xs font-mono tracking-[0.25em] text-white/20 uppercase mb-2">
              Projectile Type
            </div>
            <div className="grid grid-cols-3 gap-1">
              {OBJECTS.map((obj) => (
                <button
                  key={obj.type}
                  onClick={() => setSelectedType(obj.type)}
                  className={`
                    rounded-md px-1.5 py-1.5 text-[11px] font-mono tracking-wider uppercase
                    transition-all duration-150 cursor-pointer
                    ${selectedType === obj.type
                      ? 'bg-[#facc15]/[0.15] border border-[#facc15]/60 text-[#facc15]'
                      : 'bg-white/[0.02] border border-white/[0.06] text-white/30 hover:border-[#facc15]/30 hover:text-[#facc15]/60'
                    }
                  `}
                >
                  {obj.label}
                </button>
              ))}
            </div>
          </div>

          {/* Launch params */}
          <div className="bg-white/[0.02] border border-white/[0.05] rounded-lg p-2.5 space-y-2">
            <div className="text-xs font-mono tracking-[0.25em] text-white/20 uppercase">
              Launch Config
            </div>
            <YeetSlider label="Power" value={power} min={10} max={100} display={String(power)} onChange={setPower} color="#facc15" />
            <YeetSlider label="Angle" value={angle} min={5} max={80} display={`${angle}\u00B0`} onChange={setAngle} color="#facc15" />
            <YeetSlider label="Gravity" value={gravity} min={1} max={30} display={gravity.toFixed(1)} onChange={setGravity} color="#facc15" />
            <YeetSlider label="Spin" value={spin} min={0} max={20} display={String(spin)} onChange={setSpin} color="#facc15" />
          </div>

          {/* Chaos mode */}
          <div className="bg-white/[0.02] border border-white/[0.05] rounded-lg p-2.5 space-y-2">
            <div className="flex items-center justify-between">
              <span className="text-xs font-mono tracking-[0.25em] text-white/20 uppercase">Chaos</span>
              <label className="relative w-9 h-5 cursor-pointer">
                <input
                  type="checkbox"
                  checked={chaosEnabled}
                  onChange={(e) => {
                    setChaosEnabled(e.target.checked)
                    if (e.target.checked && chaosAmount === 0) setChaosAmount(50)
                  }}
                  className="sr-only peer"
                />
                <div className="absolute inset-0 bg-white/[0.06] rounded-full peer-checked:bg-[#facc15]/30 transition-colors" />
                <div className="absolute w-3.5 h-3.5 left-[3px] bottom-[3px] bg-white/30 rounded-full peer-checked:translate-x-4 peer-checked:bg-[#facc15] transition-all" />
              </label>
            </div>
            {chaosEnabled && (
              <YeetSlider label="Spread" value={chaosAmount} min={0} max={100} display={`${chaosAmount}%`} onChange={setChaosAmount} color="#facc15" />
            )}
          </div>
        </div>

        {/* Middle column: state + somatic */}
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
        <div className="flex-1 min-w-0 space-y-3">
          <div className="bg-cyan-500/[0.03] border border-cyan-500/[0.08] rounded-lg p-3">
            <div className="text-xs font-mono tracking-[0.25em] text-cyan-400/30 uppercase mb-2">
              Learning &amp; Associations
            </div>

            {recentAssociations.length > 0 ? (
              <div className="space-y-2.5">
                {recentAssociations.map((a) => (
                  <div key={a.id} className="space-y-0.5">
                    <div className="flex items-start gap-2">
                      <div
                        className="w-2 h-2 rounded-full mt-1 shrink-0"
                        style={{
                          backgroundColor:
                            a.valence === 'negative' ? '#ff4444' :
                            a.valence === 'positive' ? '#44cc88' :
                            '#ffcc00',
                          opacity: 0.5,
                        }}
                      />
                      <div className="min-w-0">
                        <div className="text-[13px] font-mono text-white/35 leading-snug">
                          {a.interpretation}
                        </div>
                        <div className="flex flex-wrap gap-1.5 mt-1">
                          {a.connections.map((c) => (
                            <span
                              key={c}
                              className="text-[11px] font-mono text-cyan-400/25 bg-cyan-400/[0.05] px-1.5 rounded"
                            >
                              {c}
                            </span>
                          ))}
                        </div>
                        <div className="flex gap-3 mt-1">
                          <span className="text-[10px] font-mono text-white/10">
                            {a.trigger}
                          </span>
                          <span className="text-[10px] font-mono text-white/10">
                            strength: {(a.intensity * 100).toFixed(0)}%
                          </span>
                        </div>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <div className="text-[13px] font-mono text-white/10 italic py-4 text-center">
                No associations formed yet. Introduce a stimulus or scenario to begin learning.
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

function MiniStat({ label, value, color }: { label: string; value: number; color: string }) {
  return (
    <div className="flex-1 bg-white/[0.02] border border-white/[0.05] rounded-md px-2 py-1.5">
      <div className="text-[11px] font-mono text-white/20 uppercase">{label}</div>
      <div className="font-mono text-base font-bold" style={{ color }}>{value}</div>
    </div>
  )
}

function YeetSlider({ label, value, min, max, display, onChange, color }: {
  label: string; value: number; min: number; max: number; display: string; onChange: (v: number) => void; color: string
}) {
  return (
    <div className="flex items-center gap-2">
      <span className="text-[11px] font-mono text-white/25 w-14 shrink-0">{label}</span>
      <input
        type="range" min={min} max={max} value={value}
        onChange={(e) => onChange(Number(e.target.value))}
        className="flex-1 h-1.5 appearance-none rounded-full cursor-pointer
          [&::-webkit-slider-thumb]:appearance-none [&::-webkit-slider-thumb]:w-3 [&::-webkit-slider-thumb]:h-3
          [&::-webkit-slider-thumb]:rounded-full [&::-webkit-slider-thumb]:cursor-pointer [&::-webkit-slider-thumb]:border-0"
        style={{
          background: `linear-gradient(to right, ${color}50 ${((value - min) / (max - min)) * 100}%, rgba(255,255,255,0.04) ${((value - min) / (max - min)) * 100}%)`,
        }}
      />
      <span className="text-[11px] font-mono tabular-nums w-10 text-right" style={{ color: color + '80' }}>
        {display}
      </span>
    </div>
  )
}
