import { useCallback, useState } from 'react'
import { useStore } from '../store/useStore'
import { Stimulus } from '../engine/types'

const PRESET_STIMULI: Stimulus[] = [
  { id: 'threat-obj', type: 'object', intensity: 0.8, label: 'Unknown Object' },
  { id: 'sound-pulse', type: 'sound', intensity: 0.6, label: 'Sharp Sound' },
  { id: 'social-figure', type: 'social', intensity: 0.5, label: 'Approaching Figure' },
]

export function StateControls() {
  const state = useStore((s) => s.state)
  const setState = useStore((s) => s.setState)
  const introduceStimulus = useStore((s) => s.introduceStimulus)
  const clearStimulus = useStore((s) => s.clearStimulus)
  const stimulusActive = useStore((s) => s.stimulusActive)
  const currentAction = useStore((s) => s.currentAction)
  const narration = useStore((s) => s.narration)
  const interpretation = useStore((s) => s.interpretation)
  const exposureCount = useStore((s) => s.exposureCount)
  const [collapsed, setCollapsed] = useState(false)

  const handleSlider = useCallback((key: string, value: number) => {
    setState({ [key]: value })
  }, [setState])

  return (
    <div className={`
      absolute top-0 left-0 h-full flex flex-col transition-all duration-500
      ${collapsed ? 'w-12' : 'w-72'}
    `}>
      {/* Collapse toggle */}
      <button
        onClick={() => setCollapsed(!collapsed)}
        className="absolute top-4 right-0 translate-x-full z-10 w-6 h-12
          bg-white/5 border border-white/10 rounded-r-md text-white/40 text-xs
          hover:bg-white/10 transition-colors flex items-center justify-center"
      >
        {collapsed ? '▶' : '◀'}
      </button>

      {!collapsed && (
        <div className="flex-1 overflow-y-auto p-5 space-y-6">
          {/* Title */}
          <div>
            <h2 className="text-[10px] font-mono tracking-[0.3em] text-white/30 uppercase mb-1">
              Internal State
            </h2>
            <div className="w-8 h-px bg-white/10" />
          </div>

          {/* Sliders */}
          <SliderControl
            label="THREAT"
            value={state.threat}
            onChange={(v) => handleSlider('threat', v)}
            color="#ff4444"
            description="Perceived danger level"
          />

          <SliderControl
            label="FAMILIARITY"
            value={state.familiarity}
            onChange={(v) => handleSlider('familiarity', v)}
            color="#33cc66"
            description="Recognition / pattern match"
          />

          <SliderControl
            label="ENERGY"
            value={state.energy}
            onChange={(v) => handleSlider('energy', v)}
            color="#4488ff"
            description="Available cognitive resources"
          />

          {/* Stimulus controls */}
          <div className="space-y-2">
            <h3 className="text-[9px] font-mono tracking-[0.25em] text-white/25 uppercase">
              Stimulus
            </h3>
            <div className="space-y-1.5">
              {PRESET_STIMULI.map((s) => (
                <button
                  key={s.id}
                  onClick={() => introduceStimulus(s)}
                  className="w-full text-left px-3 py-2 rounded-md bg-white/[0.03]
                    border border-white/[0.06] hover:bg-white/[0.07] hover:border-white/[0.12]
                    transition-all duration-200 group"
                >
                  <div className="text-[10px] font-mono text-white/50 group-hover:text-white/70 tracking-wide">
                    {s.label}
                  </div>
                  <div className="text-[8px] font-mono text-white/20 mt-0.5">
                    {s.type} · intensity {(s.intensity * 100).toFixed(0)}%
                  </div>
                </button>
              ))}
            </div>

            {stimulusActive && (
              <button
                onClick={clearStimulus}
                className="w-full px-3 py-1.5 rounded-md bg-white/[0.02]
                  border border-white/[0.05] text-[9px] font-mono text-white/30
                  hover:text-white/50 hover:border-white/[0.1] transition-all"
              >
                CLEAR STIMULUS
              </button>
            )}
          </div>

          {/* Exposure counter */}
          <div className="text-[8px] font-mono text-white/15">
            exposures: {exposureCount}
          </div>

          {/* Interpretation readout */}
          {interpretation && (
            <div className="space-y-2 pt-2 border-t border-white/[0.05]">
              <h3 className="text-[9px] font-mono tracking-[0.25em] text-white/25 uppercase">
                Interpretation
              </h3>
              <ReadoutBar label="THREAT" value={interpretation.perceivedThreat} color="#ff4444" />
              <ReadoutBar label="SALIENCE" value={interpretation.salience} color="#ffcc00" />
              <ReadoutBar label="COGNITION" value={interpretation.cognitiveAccess} color="#4488ff" />
              <div className="flex items-center gap-2 mt-1">
                <span className="text-[8px] font-mono text-white/20">MOTOR</span>
                <span className="text-[9px] font-mono text-white/40 tracking-wider">
                  {interpretation.motorBias.toUpperCase()}
                </span>
              </div>
            </div>
          )}

          {/* Current action */}
          <div className="space-y-1 pt-2 border-t border-white/[0.05]">
            <div className="text-[9px] font-mono tracking-[0.25em] text-white/25 uppercase">
              Action
            </div>
            <div className="text-sm font-mono text-white/60 tracking-wider">
              {currentAction.toUpperCase()}
            </div>
          </div>

          {/* Narration */}
          <div className="space-y-1 pt-2 border-t border-white/[0.05]">
            <div className="text-[9px] font-mono tracking-[0.25em] text-white/25 uppercase">
              Narration
            </div>
            <p className="text-[11px] leading-relaxed text-white/35 font-mono">
              {narration}
            </p>
          </div>
        </div>
      )}
    </div>
  )
}

function SliderControl({
  label,
  value,
  onChange,
  color,
  description,
}: {
  label: string
  value: number
  onChange: (v: number) => void
  color: string
  description: string
}) {
  return (
    <div className="space-y-1.5">
      <div className="flex justify-between items-baseline">
        <span className="text-[9px] font-mono tracking-[0.2em] text-white/35">{label}</span>
        <span className="text-[10px] font-mono tabular-nums" style={{ color: color + '80' }}>
          {(value * 100).toFixed(0)}
        </span>
      </div>
      <div className="relative">
        <input
          type="range"
          min={0}
          max={1}
          step={0.01}
          value={value}
          onChange={(e) => onChange(parseFloat(e.target.value))}
          className="w-full h-1 appearance-none rounded-full cursor-pointer
            [&::-webkit-slider-thumb]:appearance-none [&::-webkit-slider-thumb]:w-3 [&::-webkit-slider-thumb]:h-3
            [&::-webkit-slider-thumb]:rounded-full [&::-webkit-slider-thumb]:cursor-pointer
            [&::-webkit-slider-thumb]:border-0 [&::-webkit-slider-thumb]:shadow-[0_0_8px_rgba(255,255,255,0.15)]"
          style={{
            background: `linear-gradient(to right, ${color}60 ${value * 100}%, rgba(255,255,255,0.05) ${value * 100}%)`,
            // @ts-expect-error -- custom property for thumb
            '--thumb-color': color,
          }}
        />
      </div>
      <div className="text-[7px] font-mono text-white/15 tracking-wide">{description}</div>
    </div>
  )
}

function ReadoutBar({ label, value, color }: { label: string; value: number; color: string }) {
  return (
    <div className="flex items-center gap-2">
      <span className="text-[8px] font-mono text-white/20 w-14 shrink-0">{label}</span>
      <div className="flex-1 h-1 bg-white/[0.03] rounded-full overflow-hidden">
        <div
          className="h-full rounded-full transition-all duration-500"
          style={{
            width: `${value * 100}%`,
            backgroundColor: color + '80',
            boxShadow: `0 0 6px ${color}40`,
          }}
        />
      </div>
      <span className="text-[8px] font-mono tabular-nums text-white/20 w-6 text-right">
        {(value * 100).toFixed(0)}
      </span>
    </div>
  )
}
