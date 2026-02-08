import { useState, useRef, useEffect } from 'react'
import { useStore } from '../store/useStore'
import { SCENARIOS } from '../store/useStore'
import { useSimulationStore, SIMULATIONS } from '../store/useSimulationStore'
import { useYeetStore } from '../store/useYeetStore'

export function ChatPanel() {
  const [input, setInput] = useState('')
  const [drawerOpen, setDrawerOpen] = useState(false)
  const chatMessages = useStore((s) => s.chatMessages)
  const sendMessage = useStore((s) => s.sendMessage)
  const isChatting = useStore((s) => s.isChatting)
  const activateScenario = useStore((s) => s.activateScenario)
  const activeScenario = useStore((s) => s.activeScenario)
  const sessionStartedAt = useStore((s) => s.sessionStartedAt)
  const resetAllEngine = useStore((s) => s.resetAll)
  const scrollRef = useRef<HTMLDivElement>(null)
  const inputRef = useRef<HTMLInputElement>(null)

  const activeSim = useSimulationStore((s) => s.activeSim)
  const currentStep = useSimulationStore((s) => s.currentStep)
  const totalSteps = useSimulationStore((s) => s.totalSteps)
  const stepNarration = useSimulationStore((s) => s.stepNarration)
  const isRunning = useSimulationStore((s) => s.isRunning)
  const isComplete = useSimulationStore((s) => s.isComplete)
  const runSimulation = useSimulationStore((s) => s.runSimulation)
  const cancelSimulation = useSimulationStore((s) => s.cancelSimulation)
  const resetAllSim = useSimulationStore((s) => s.resetAll)
  const resetAllYeet = useYeetStore((s) => s.resetAll)

  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight
    }
  }, [chatMessages])

  const handleSend = () => {
    const text = input.trim()
    if (!text) return
    sendMessage(text)
    setInput('')
    inputRef.current?.focus()
  }

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault()
      handleSend()
    }
  }

  const handleReset = () => {
    cancelSimulation()
    resetAllSim()
    resetAllYeet()
    resetAllEngine()
    setDrawerOpen(false)
  }

  const isPastTimeZero = sessionStartedAt > 0
  const hasContent = isPastTimeZero || chatMessages.length > 0 || activeScenario !== null || activeSim !== null
  const progress = totalSteps > 0 ? (currentStep / totalSteps) * 100 : 0

  return (
    <div className="h-full flex flex-col bg-[#0a0f0a] border-r border-green-900/30 relative">
      {/* ── Compact button row: Sims + Scenarios + Reset + Chevron ── */}

      {/* ── Compact button row: Sims + Scenarios + Reset + Chevron ── */}
      <div className="shrink-0 px-2 py-1.5 border-b border-green-900/15 flex items-center gap-1 flex-wrap">
        {/* Simulation buttons */}
        {SIMULATIONS.map((sim) => {
          const isActive = activeSim?.id === sim.id && isRunning
          const wasRun = activeSim?.id === sim.id && isComplete
          return (
            <button
              key={sim.id}
              onClick={() => isActive ? cancelSimulation() : runSimulation(sim)}
              disabled={isRunning && !isActive}
              title={sim.description}
              className={`
                px-2 py-1 rounded text-[11px] font-mono transition-all duration-150 border flex items-center gap-1
                ${isActive
                  ? 'border-amber-500/50 bg-amber-500/15 text-amber-300'
                  : wasRun
                    ? 'border-emerald-500/25 bg-emerald-500/5 text-emerald-400/50'
                    : isRunning
                      ? 'border-white/[0.03] bg-transparent text-white/15 cursor-not-allowed'
                      : 'border-white/[0.06] bg-white/[0.02] text-white/30 hover:border-white/15 hover:text-white/50'
                }
              `}
            >
              <span className="text-xs">{sim.icon}</span>
              <span className="tracking-wide uppercase">{sim.label}</span>
              {isActive && <span className="w-1.5 h-1.5 rounded-full bg-amber-400 animate-pulse" />}
              {wasRun && <span className="text-[9px]">✓</span>}
            </button>
          )
        })}

        {/* Divider dot */}
        <span className="text-white/10 text-[8px] mx-0.5">●</span>

        {/* Scenario buttons */}
        {SCENARIOS.map((s) => (
          <button
            key={s.id}
            onClick={() => activateScenario(s)}
            title={s.description}
            className={`
              px-1.5 py-1 rounded text-[10px] font-mono transition-all duration-150 border
              ${activeScenario?.id === s.id
                ? 'bg-green-500/20 text-green-400 border-green-500/40'
                : 'bg-green-900/10 text-green-600/35 border-green-900/20 hover:bg-green-900/20 hover:text-green-500/60'
              }
            `}
          >
            {s.label}
          </button>
        ))}

        {/* Spacer */}
        <div className="flex-1" />

        {/* Reset (when there's any content/state) */}
        {hasContent && (
          <button
            onClick={handleReset}
            title="Reset everything to T=0"
            className="px-2 py-1 rounded text-[10px] font-mono tracking-wider uppercase
              border border-red-500/20 text-red-400/50 bg-red-900/10
              hover:border-red-500/35 hover:text-red-300/70 hover:bg-red-900/20
              transition-all duration-150"
          >
            ↺ RESET
          </button>
        )}

        {/* Chevron toggle */}
        {(isRunning || isComplete || activeSim) && (
          <button
            onClick={() => setDrawerOpen(!drawerOpen)}
            className="w-5 h-5 rounded flex items-center justify-center
              text-white/20 hover:text-white/40 hover:bg-white/[0.04]
              transition-all duration-150"
            title={drawerOpen ? 'Hide details' : 'Show details'}
          >
            <span className={`text-[10px] transition-transform duration-200 inline-block ${drawerOpen ? 'rotate-180' : ''}`}>
              ▼
            </span>
          </button>
        )}
      </div>

      {/* ── Slide-down drawer (details/progress) ── */}
      {drawerOpen && (isRunning || isComplete || activeSim) && (
        <div className="shrink-0 bg-black/40 border-b border-white/[0.05] overflow-hidden sim-drawer-enter">
          {/* Sim progress bar */}
          {(isRunning || isComplete) && activeSim && (
            <div className="h-1 bg-white/[0.03]">
              <div
                className="h-full transition-all duration-500 ease-out"
                style={{
                  width: `${progress}%`,
                  backgroundColor: isComplete ? '#34d399' : activeSim.color + '80',
                }}
              />
            </div>
          )}
          <div className="px-3 py-2 space-y-1.5">
            {/* Active sim info */}
            {activeSim && (
              <div className="flex items-start gap-2">
                {isRunning && <span className="sim-typing-dot shrink-0 mt-0.5" />}
                <div className="min-w-0 flex-1">
                  <div className="text-[11px] font-mono text-white/25 flex items-center gap-2">
                    <span>{activeSim.icon} {activeSim.label}</span>
                    {(isRunning || isComplete) && (
                      <span className="tabular-nums text-white/12">{currentStep}/{totalSteps}</span>
                    )}
                  </div>
                  <div className={`text-[11px] font-mono leading-snug mt-0.5 ${
                    isComplete ? 'text-emerald-400/40' : isRunning ? 'text-amber-300/40' : 'text-white/15'
                  }`}>
                    {stepNarration || activeSim.description}
                  </div>
                </div>
                <button
                  onClick={() => setDrawerOpen(false)}
                  className="text-white/15 hover:text-white/30 text-xs shrink-0"
                >✕</button>
              </div>
            )}
            {/* Active scenario info */}
            {activeScenario && !activeSim && (
              <div className="flex items-center justify-between">
                <div className="text-[11px] font-mono text-green-400/35">
                  {activeScenario.label}: {activeScenario.description}
                </div>
                <button
                  onClick={() => setDrawerOpen(false)}
                  className="text-white/15 hover:text-white/30 text-xs shrink-0"
                >✕</button>
              </div>
            )}
          </div>
        </div>
      )}

      {/* ── Messages ── */}
      <div ref={scrollRef} className="flex-1 overflow-y-auto px-3 py-2 space-y-2.5 scrollbar-thin">
        {chatMessages.length === 0 && (
          <div className="text-center py-6">
            <div className="text-green-600/20 text-[12px] font-mono leading-relaxed">
              <div className="mb-1 text-green-500/25">{'>'} READY</div>
              <div>Run a sim or type a message.</div>
            </div>
          </div>
        )}

        {chatMessages.map((msg) => (
          <div
            key={msg.id}
            className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}
          >
            <div
              className={`
                max-w-[85%] px-2.5 py-1.5 rounded-lg text-[13px] font-mono leading-relaxed
                ${msg.role === 'user'
                  ? 'bg-green-500/10 text-green-400/80 border border-green-500/20'
                  : msg.role === 'agent' && msg.fallback
                    ? 'bg-yellow-900/10 text-yellow-300/50 border border-yellow-900/20'
                    : 'bg-green-900/15 text-green-300/60 border border-green-900/25'
                }
              `}
            >
              {msg.role === 'agent' && (
                <div className="text-[10px] text-green-600/30 tracking-widest uppercase mb-0.5">
                  {msg.fallback ? 'AGENT (offline)' : 'AGENT'}
                </div>
              )}
              <div>{msg.text}</div>
              {msg.stateSnapshot && (
                <div className="flex gap-3 mt-1 pt-1 border-t border-green-900/15">
                  <MicroBar label="T" value={msg.stateSnapshot.threat} color="#ff4444" />
                  <MicroBar label="F" value={msg.stateSnapshot.familiarity} color="#33cc66" />
                  <MicroBar label="E" value={msg.stateSnapshot.energy} color="#4488ff" />
                </div>
              )}
            </div>
          </div>
        ))}

        {isChatting && (
          <div className="flex justify-start">
            <div className="flex gap-1.5 px-3 py-1.5">
              <span className="w-1.5 h-1.5 rounded-full bg-green-500/40 animate-bounce" style={{ animationDelay: '0ms' }} />
              <span className="w-1.5 h-1.5 rounded-full bg-green-500/40 animate-bounce" style={{ animationDelay: '150ms' }} />
              <span className="w-1.5 h-1.5 rounded-full bg-green-500/40 animate-bounce" style={{ animationDelay: '300ms' }} />
            </div>
          </div>
        )}
      </div>

      {/* ── Input ── */}
      <div className="shrink-0 px-2.5 py-2 border-t border-green-900/20">
        <div className="flex gap-1.5">
          <div className="flex-1 relative">
            <span className="absolute left-2.5 top-1/2 -translate-y-1/2 text-green-500/30 text-xs font-mono">{'>'}</span>
            <input
              ref={inputRef}
              type="text"
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onKeyDown={handleKeyDown}
              placeholder="speak to the agent..."
              className="w-full bg-green-900/10 border border-green-900/25 rounded-md
                pl-6 pr-2 py-2 text-[13px] font-mono text-green-400/80
                placeholder:text-green-700/20
                focus:outline-none focus:border-green-500/30 focus:bg-green-900/15
                transition-all duration-200"
            />
          </div>
          <button
            onClick={handleSend}
            className="px-3 py-2 rounded-md bg-green-500/15 border border-green-500/25
              text-green-500/60 text-xs font-mono tracking-wider uppercase
              hover:bg-green-500/25 hover:text-green-400 transition-all duration-200
              disabled:opacity-30 disabled:cursor-not-allowed"
            disabled={!input.trim() || isChatting}
          >
            Send
          </button>
        </div>
      </div>
    </div>
  )
}

function MicroBar({ label, value, color }: { label: string; value: number; color: string }) {
  return (
    <div className="flex items-center gap-1">
      <span className="text-[10px] font-mono" style={{ color: color + '40' }}>{label}</span>
      <div className="w-8 h-1 bg-white/5 rounded-full overflow-hidden">
        <div className="h-full rounded-full" style={{ width: `${value * 100}%`, backgroundColor: color + '50' }} />
      </div>
    </div>
  )
}
