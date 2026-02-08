import { useCallback, useEffect, useRef } from 'react'
import { useYeetStore, type ProjectileType } from '../../store/useYeetStore'

const OBJECTS: { type: ProjectileType; label: string; icon: React.ReactNode }[] = [
  { type: 'baseball',   label: 'Baseball',  icon: <BaseballIcon /> },
  { type: 'bowling',    label: 'Bowling',   icon: <BowlingIcon /> },
  { type: 'watermelon', label: 'Melon',     icon: <WatermelonIcon /> },
  { type: 'anvil',      label: 'Anvil',     icon: <AnvilIcon /> },
  { type: 'fish',       label: 'Fish',      icon: <FishIcon /> },
  { type: 'random',     label: 'Random',    icon: <RandomIcon /> },
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
    <div className="h-full flex flex-col bg-[#0a0a0f] border-t border-[#facc15]/10">
      {/* Header */}
      <div className="shrink-0 px-3 py-2 flex items-center justify-between border-b border-[#facc15]/[0.06]">
        <div className="flex items-center gap-2">
          <div className="w-1.5 h-1.5 rounded-full bg-[#facc15]/50 shadow-[0_0_6px_rgba(250,204,21,0.3)]" />
          <span className="text-[10px] font-mono tracking-[0.3em] text-[#facc15]/40 uppercase">
            Projectile Lab
          </span>
        </div>
        {combo >= 2 && (
          <span className="text-xs font-mono text-[#facc15] font-bold animate-pulse">
            {combo}x COMBO
          </span>
        )}
      </div>

      {/* Scrollable content */}
      <div className="flex-1 overflow-y-auto px-3 py-2.5 space-y-2.5 scrollbar-thin">
        {/* Stats row */}
        <div className="flex gap-1.5">
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
            w-full h-10 rounded-lg border-none cursor-pointer relative overflow-hidden
            bg-gradient-to-r from-[#facc15] via-[#f59e0b] to-[#ea580c]
            text-[#0a0a0f] font-mono text-lg font-bold tracking-[6px]
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
        <div className="text-[9px] font-mono text-white/15 text-center -mt-1">
          press Y or hold to rapid fire
        </div>

        {/* Projectile Type Selector with visual icons */}
        <div className="bg-white/[0.02] border border-white/[0.05] rounded-lg p-2">
          <div className="text-[9px] font-mono tracking-[0.25em] text-white/20 uppercase mb-2">
            Projectile Type
          </div>
          <div className="grid grid-cols-3 gap-1.5">
            {OBJECTS.map((obj) => (
              <button
                key={obj.type}
                onClick={() => setSelectedType(obj.type)}
                className={`
                  group relative rounded-lg px-1 py-2 flex flex-col items-center gap-1
                  transition-all duration-200 cursor-pointer
                  ${selectedType === obj.type
                    ? 'bg-[#facc15]/[0.12] border border-[#facc15]/50 text-[#facc15] shadow-[0_0_12px_rgba(250,204,21,0.1)]'
                    : 'bg-white/[0.02] border border-white/[0.06] text-white/30 hover:border-[#facc15]/25 hover:text-[#facc15]/50 hover:bg-[#facc15]/[0.03]'
                  }
                `}
              >
                {/* Icon */}
                <div className={`
                  w-8 h-8 flex items-center justify-center transition-transform duration-200
                  ${selectedType === obj.type ? 'scale-110' : 'group-hover:scale-105'}
                `}>
                  {obj.icon}
                </div>
                {/* Label */}
                <span className="text-[8px] font-mono tracking-wider uppercase leading-none">
                  {obj.label}
                </span>
              </button>
            ))}
          </div>
        </div>

        {/* Launch Config */}
        <div className="bg-white/[0.02] border border-white/[0.05] rounded-lg p-2 space-y-1.5">
          <div className="text-[9px] font-mono tracking-[0.25em] text-white/20 uppercase">
            Launch Config
          </div>
          <YeetSlider label="Power" value={power} min={10} max={100} display={String(power)} onChange={setPower} color="#facc15" />
          <YeetSlider label="Angle" value={angle} min={5} max={80} display={`${angle}\u00B0`} onChange={setAngle} color="#facc15" />
          <YeetSlider label="Gravity" value={gravity} min={1} max={30} display={gravity.toFixed(1)} onChange={setGravity} color="#facc15" />
          <YeetSlider label="Spin" value={spin} min={0} max={20} display={String(spin)} onChange={setSpin} color="#facc15" />
        </div>

        {/* Chaos mode */}
        <div className="bg-white/[0.02] border border-white/[0.05] rounded-lg p-2 space-y-1.5">
          <div className="flex items-center justify-between">
            <span className="text-[9px] font-mono tracking-[0.25em] text-white/20 uppercase">Chaos</span>
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
    </div>
  )
}

/* ── Projectile Icon Components ── */

function BaseballIcon() {
  return (
    <svg width="28" height="28" viewBox="0 0 28 28" fill="none">
      {/* Ball */}
      <circle cx="14" cy="14" r="11" fill="#f5f5dc" opacity="0.9" />
      <circle cx="14" cy="14" r="11" stroke="#cc0000" strokeWidth="0.5" opacity="0.4" fill="none" />
      {/* Stitching */}
      <path d="M8 6 Q6 14 8 22" stroke="#cc0000" strokeWidth="1.2" fill="none" strokeLinecap="round" opacity="0.8" />
      <path d="M20 6 Q22 14 20 22" stroke="#cc0000" strokeWidth="1.2" fill="none" strokeLinecap="round" opacity="0.8" />
      {/* Stitch marks */}
      <line x1="7" y1="8" x2="9" y2="8.5" stroke="#cc0000" strokeWidth="0.6" opacity="0.6" />
      <line x1="6.5" y1="11" x2="8.5" y2="11" stroke="#cc0000" strokeWidth="0.6" opacity="0.6" />
      <line x1="6.5" y1="14" x2="8.5" y2="14" stroke="#cc0000" strokeWidth="0.6" opacity="0.6" />
      <line x1="6.5" y1="17" x2="8.5" y2="17" stroke="#cc0000" strokeWidth="0.6" opacity="0.6" />
      <line x1="7" y1="20" x2="9" y2="19.5" stroke="#cc0000" strokeWidth="0.6" opacity="0.6" />
      <line x1="19" y1="8.5" x2="21" y2="8" stroke="#cc0000" strokeWidth="0.6" opacity="0.6" />
      <line x1="19.5" y1="11" x2="21.5" y2="11" stroke="#cc0000" strokeWidth="0.6" opacity="0.6" />
      <line x1="19.5" y1="14" x2="21.5" y2="14" stroke="#cc0000" strokeWidth="0.6" opacity="0.6" />
      <line x1="19.5" y1="17" x2="21.5" y2="17" stroke="#cc0000" strokeWidth="0.6" opacity="0.6" />
      <line x1="19" y1="19.5" x2="21" y2="20" stroke="#cc0000" strokeWidth="0.6" opacity="0.6" />
      {/* Highlight */}
      <ellipse cx="11" cy="9" rx="3" ry="2" fill="white" opacity="0.25" />
    </svg>
  )
}

function BowlingIcon() {
  return (
    <svg width="28" height="28" viewBox="0 0 28 28" fill="none">
      {/* Ball */}
      <circle cx="14" cy="14" r="11" fill="#1a1a2e" />
      <circle cx="14" cy="14" r="11" stroke="#444" strokeWidth="0.5" fill="none" />
      {/* Glossy highlight */}
      <ellipse cx="11" cy="10" rx="5" ry="4" fill="white" opacity="0.08" />
      {/* Finger holes */}
      <circle cx="10" cy="9" r="1.8" fill="#333" stroke="#555" strokeWidth="0.3" />
      <circle cx="14.5" cy="8" r="1.8" fill="#333" stroke="#555" strokeWidth="0.3" />
      <circle cx="12" cy="13" r="1.5" fill="#333" stroke="#555" strokeWidth="0.3" />
      {/* Metallic sheen */}
      <path d="M6 18 Q14 22 22 18" stroke="white" strokeWidth="0.3" opacity="0.1" fill="none" />
    </svg>
  )
}

function WatermelonIcon() {
  return (
    <svg width="28" height="28" viewBox="0 0 28 28" fill="none">
      {/* Outer rind */}
      <ellipse cx="14" cy="14" rx="12" ry="10" fill="#2d6a2d" />
      {/* Stripes */}
      <path d="M7 6 Q8 14 7 22" stroke="#1d4a1d" strokeWidth="1.5" fill="none" opacity="0.5" />
      <path d="M11 4.5 Q12 14 11 23.5" stroke="#1d4a1d" strokeWidth="1.5" fill="none" opacity="0.5" />
      <path d="M15 4 Q15.5 14 15 24" stroke="#1d4a1d" strokeWidth="1.5" fill="none" opacity="0.5" />
      <path d="M19 4.5 Q19 14 19 23.5" stroke="#1d4a1d" strokeWidth="1.5" fill="none" opacity="0.5" />
      <path d="M23 6 Q22 14 23 22" stroke="#1d4a1d" strokeWidth="1.5" fill="none" opacity="0.5" />
      {/* Highlight */}
      <ellipse cx="10" cy="9" rx="4" ry="2.5" fill="white" opacity="0.12" />
      {/* Slice preview: inner red peek */}
      <ellipse cx="14" cy="14" rx="8" ry="6" fill="#ff3355" opacity="0.15" />
    </svg>
  )
}

function AnvilIcon() {
  return (
    <svg width="28" height="28" viewBox="0 0 28 28" fill="none">
      {/* Base */}
      <rect x="4" y="18" width="20" height="4" rx="1" fill="#555" />
      {/* Body */}
      <rect x="6" y="12" width="16" height="6" rx="1" fill="#666" />
      {/* Horn (left side) */}
      <path d="M6 12 L2 14 L6 16" fill="#777" />
      {/* Top face */}
      <rect x="7" y="9" width="18" height="3" rx="1" fill="#888" />
      {/* Highlight */}
      <rect x="8" y="9.5" width="12" height="1" rx="0.5" fill="white" opacity="0.15" />
      {/* Shadow */}
      <rect x="5" y="22" width="18" height="1.5" rx="0.75" fill="black" opacity="0.2" />
      {/* Metal texture lines */}
      <line x1="8" y1="14" x2="20" y2="14" stroke="white" strokeWidth="0.3" opacity="0.08" />
      <line x1="8" y1="16" x2="20" y2="16" stroke="black" strokeWidth="0.3" opacity="0.15" />
    </svg>
  )
}

function FishIcon() {
  return (
    <svg width="28" height="28" viewBox="0 0 28 28" fill="none">
      {/* Body */}
      <ellipse cx="13" cy="14" rx="9" ry="5" fill="#4488cc" opacity="0.9" />
      {/* Tail */}
      <path d="M22 14 L27 9 L27 19 Z" fill="#3377bb" opacity="0.8" />
      {/* Belly */}
      <ellipse cx="12" cy="16" rx="6" ry="2.5" fill="#66aadd" opacity="0.4" />
      {/* Eye */}
      <circle cx="7" cy="12.5" r="2" fill="white" opacity="0.9" />
      <circle cx="6.5" cy="12.5" r="1" fill="#111" />
      <circle cx="6" cy="12" r="0.4" fill="white" />
      {/* Fin */}
      <path d="M12 9 L14 4 L17 9" fill="#3377bb" opacity="0.6" />
      {/* Scales hint */}
      <path d="M10 13 Q12 12 14 13" stroke="white" strokeWidth="0.3" opacity="0.15" fill="none" />
      <path d="M12 15 Q14 14 16 15" stroke="white" strokeWidth="0.3" opacity="0.15" fill="none" />
      {/* Mouth */}
      <path d="M4 14 Q5 14.5 4.5 15" stroke="#2266aa" strokeWidth="0.5" fill="none" />
    </svg>
  )
}

function RandomIcon() {
  return (
    <svg width="28" height="28" viewBox="0 0 28 28" fill="none">
      {/* Dice body */}
      <rect x="4" y="4" width="20" height="20" rx="3" fill="#2a2a3a" stroke="#facc15" strokeWidth="0.5" opacity="0.6" />
      {/* Dots */}
      <circle cx="9" cy="9" r="1.5" fill="#facc15" opacity="0.7" />
      <circle cx="19" cy="9" r="1.5" fill="#facc15" opacity="0.7" />
      <circle cx="14" cy="14" r="1.5" fill="#facc15" opacity="0.7" />
      <circle cx="9" cy="19" r="1.5" fill="#facc15" opacity="0.7" />
      <circle cx="19" cy="19" r="1.5" fill="#facc15" opacity="0.7" />
      {/* Question mark overlay */}
      <text x="14" y="17" textAnchor="middle" fill="#facc15" fontSize="12" fontFamily="monospace" opacity="0.25" fontWeight="bold">?</text>
      {/* Highlight */}
      <rect x="5" y="5" width="8" height="4" rx="1" fill="white" opacity="0.05" />
    </svg>
  )
}

/* ── Utility Components ── */

function MiniStat({ label, value, color }: { label: string; value: number; color: string }) {
  return (
    <div className="flex-1 bg-white/[0.02] border border-white/[0.05] rounded-md px-2 py-1.5">
      <div className="text-[8px] font-mono text-white/20 uppercase">{label}</div>
      <div className="font-mono text-sm font-bold tabular-nums" style={{ color }}>{value}</div>
    </div>
  )
}

function YeetSlider({ label, value, min, max, display, onChange, color }: {
  label: string; value: number; min: number; max: number; display: string; onChange: (v: number) => void; color: string
}) {
  return (
    <div className="flex items-center gap-2">
      <span className="text-[9px] font-mono text-white/25 w-12 shrink-0">{label}</span>
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
      <span className="text-[9px] font-mono tabular-nums w-8 text-right" style={{ color: color + '80' }}>
        {display}
      </span>
    </div>
  )
}
