import { useRef, useEffect } from 'react'
import { useSimulationStore, SIMULATIONS } from '../store/useSimulationStore'

export function SimulationBar() {
  const activeSim = useSimulationStore((s) => s.activeSim)
  const currentStep = useSimulationStore((s) => s.currentStep)
  const totalSteps = useSimulationStore((s) => s.totalSteps)
  const stepNarration = useSimulationStore((s) => s.stepNarration)
  const isRunning = useSimulationStore((s) => s.isRunning)
  const isComplete = useSimulationStore((s) => s.isComplete)
  const log = useSimulationStore((s) => s.log)
  const runSimulation = useSimulationStore((s) => s.runSimulation)
  const cancelSimulation = useSimulationStore((s) => s.cancelSimulation)
  const logRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    if (logRef.current) {
      logRef.current.scrollTop = logRef.current.scrollHeight
    }
  }, [log])

  const progress = totalSteps > 0 ? (currentStep / totalSteps) * 100 : 0

  return (
    <div className="shrink-0 border-b border-white/[0.06] bg-[#07070e]">
      {/* Top: simulation buttons + status */}
      <div className="flex items-center gap-3 px-4 py-2.5">
        {/* Label */}
        <div className="flex items-center gap-2 shrink-0">
          <div className={`w-2 h-2 rounded-full transition-all duration-500 ${
            isRunning
              ? 'bg-amber-400 shadow-[0_0_8px_rgba(251,191,36,0.6)] animate-pulse'
              : isComplete
                ? 'bg-emerald-400 shadow-[0_0_6px_rgba(52,211,153,0.4)]'
                : 'bg-white/15'
          }`} />
          <span className="text-xs font-mono tracking-[0.35em] text-white/25 uppercase">
            Simulations
          </span>
        </div>

        {/* Sim buttons */}
        <div className="flex gap-2">
          {SIMULATIONS.map((sim) => {
            const isActive = activeSim?.id === sim.id && isRunning
            return (
              <button
                key={sim.id}
                onClick={() => {
                  if (isActive) {
                    cancelSimulation()
                  } else {
                    runSimulation(sim)
                  }
                }}
                className="group relative overflow-hidden"
                title={sim.description}
              >
                <div
                  className={`
                    flex items-center gap-1.5 px-3 py-1.5 rounded-md text-xs font-mono
                    transition-all duration-200 border
                    ${isActive
                      ? 'border-amber-500/50 text-amber-300 bg-amber-500/15 shadow-[0_0_12px_rgba(251,191,36,0.15)]'
                      : `border-white/[0.08] text-white/30 bg-white/[0.02]
                         hover:border-white/20 hover:text-white/50 hover:bg-white/[0.04]`
                    }
                  `}
                >
                  <span className="text-sm">{sim.icon}</span>
                  <span className="tracking-wider uppercase">{sim.label}</span>
                  {isActive && (
                    <span className="text-[10px] text-amber-400/60 ml-1 tracking-widest">STOP</span>
                  )}
                </div>
                {/* Glow effect on hover */}
                {!isActive && (
                  <div
                    className="absolute inset-0 rounded-md opacity-0 group-hover:opacity-100 transition-opacity duration-300 pointer-events-none"
                    style={{
                      background: `radial-gradient(circle at 50% 100%, ${sim.color}10, transparent 70%)`,
                    }}
                  />
                )}
              </button>
            )
          })}
        </div>

        {/* Spacer */}
        <div className="flex-1" />

        {/* Progress indicator */}
        {(isRunning || isComplete) && activeSim && (
          <div className="flex items-center gap-3 shrink-0">
            {/* Step counter */}
            <span className="text-[11px] font-mono tabular-nums text-white/20">
              {currentStep}/{totalSteps}
            </span>
            {/* Progress bar */}
            <div className="w-24 h-1.5 bg-white/[0.04] rounded-full overflow-hidden">
              <div
                className="h-full rounded-full transition-all duration-500 ease-out"
                style={{
                  width: `${progress}%`,
                  backgroundColor: isComplete ? '#34d399' : activeSim.color + '80',
                  boxShadow: isComplete ? '0 0 6px #34d39960' : `0 0 6px ${activeSim.color}30`,
                }}
              />
            </div>
          </div>
        )}
      </div>

      {/* Bottom: narration + scrolling log (only when active) */}
      {(isRunning || isComplete || log.length > 0) && (
        <div className="border-t border-white/[0.04]">
          {/* Current step narration */}
          <div className="px-4 py-1.5 flex items-center gap-2">
            {isRunning && (
              <span className="sim-typing-dot shrink-0" />
            )}
            <span className={`text-xs font-mono leading-relaxed transition-all duration-300 ${
              isComplete
                ? 'text-emerald-400/50'
                : isRunning
                  ? 'text-amber-300/50'
                  : 'text-white/20'
            }`}>
              {stepNarration}
            </span>
          </div>

          {/* Scrollable log */}
          <div
            ref={logRef}
            className="max-h-20 overflow-y-auto px-4 pb-2 scrollbar-thin"
          >
            <div className="space-y-0.5">
              {log.slice(-12).map((entry, i) => (
                <div
                  key={i}
                  className={`text-[11px] font-mono leading-snug sim-log-entry ${
                    entry.type === 'complete'
                      ? 'text-emerald-400/40'
                      : entry.type === 'action'
                        ? 'text-white/25'
                        : 'text-white/15'
                  }`}
                >
                  {entry.text}
                </div>
              ))}
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
