import { useCallback, useEffect, useRef } from 'react'
import { useYeetStore, type ProjectileType } from '../../store/useYeetStore'

const OBJECTS: { type: ProjectileType; label: string }[] = [
  { type: 'baseball',   label: 'Pitch Ball' },
  { type: 'bowling',    label: 'Bowling' },
  { type: 'watermelon', label: 'Melon' },
  { type: 'anvil',      label: 'Anvil' },
  { type: 'fish',       label: 'Fish' },
  { type: 'random',     label: 'Random' },
]

export function YeetPanel() {
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
    <div className="h-full overflow-y-auto p-3 space-y-3 scrollbar-thin">
      {/* Header */}
      <div className="flex items-center justify-between">
        <span className="text-[8px] font-mono tracking-[0.25em] text-[#facc15]/40 uppercase">
          Projectile Lab
        </span>
        {combo >= 2 && (
          <span className="text-[9px] font-mono text-[#facc15] font-bold animate-pulse">
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
          w-full h-12 rounded-lg border-none cursor-pointer relative overflow-hidden
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
      <div className="text-[7px] font-mono text-white/15 text-center -mt-1">
        press Y or hold to rapid fire
      </div>

      {/* Object selector */}
      <div className="bg-white/[0.02] border border-white/[0.05] rounded-lg p-2.5">
        <div className="text-[8px] font-mono tracking-[0.25em] text-white/20 uppercase mb-2">
          Projectile Type
        </div>
        <div className="grid grid-cols-3 gap-1">
          {OBJECTS.map((obj) => (
            <button
              key={obj.type}
              onClick={() => setSelectedType(obj.type)}
              className={`
                rounded-md px-1.5 py-1.5 text-[8px] font-mono tracking-wider uppercase
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
        <div className="text-[8px] font-mono tracking-[0.25em] text-white/20 uppercase">
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
          <span className="text-[8px] font-mono tracking-[0.25em] text-white/20 uppercase">Chaos</span>
          <label className="relative w-8 h-4 cursor-pointer">
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
            <div className="absolute w-3 h-3 left-[2px] bottom-[2px] bg-white/30 rounded-full peer-checked:translate-x-4 peer-checked:bg-[#facc15] transition-all" />
          </label>
        </div>
        {chaosEnabled && (
          <YeetSlider label="Spread" value={chaosAmount} min={0} max={100} display={`${chaosAmount}%`} onChange={setChaosAmount} color="#facc15" />
        )}
      </div>
    </div>
  )
}

function MiniStat({ label, value, color }: { label: string; value: number; color: string }) {
  return (
    <div className="flex-1 bg-white/[0.02] border border-white/[0.05] rounded-md px-2 py-1.5">
      <div className="text-[7px] font-mono text-white/20 uppercase">{label}</div>
      <div className="font-mono text-sm font-bold" style={{ color }}>{value}</div>
    </div>
  )
}

function YeetSlider({ label, value, min, max, display, onChange, color }: {
  label: string; value: number; min: number; max: number; display: string; onChange: (v: number) => void; color: string
}) {
  return (
    <div className="flex items-center gap-2">
      <span className="text-[8px] font-mono text-white/25 w-12 shrink-0">{label}</span>
      <input
        type="range" min={min} max={max} value={value}
        onChange={(e) => onChange(Number(e.target.value))}
        className="flex-1 h-1 appearance-none rounded-full cursor-pointer
          [&::-webkit-slider-thumb]:appearance-none [&::-webkit-slider-thumb]:w-2.5 [&::-webkit-slider-thumb]:h-2.5
          [&::-webkit-slider-thumb]:rounded-full [&::-webkit-slider-thumb]:cursor-pointer [&::-webkit-slider-thumb]:border-0"
        style={{
          background: `linear-gradient(to right, ${color}50 ${((value - min) / (max - min)) * 100}%, rgba(255,255,255,0.04) ${((value - min) / (max - min)) * 100}%)`,
        }}
      />
      <span className="text-[8px] font-mono tabular-nums w-8 text-right" style={{ color: color + '80' }}>
        {display}
      </span>
    </div>
  )
}
