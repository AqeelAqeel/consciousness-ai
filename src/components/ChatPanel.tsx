import { useState, useRef, useEffect } from 'react'
import { useStore } from '../store/useStore'
import { SCENARIOS } from '../store/useStore'

export function ChatPanel() {
  const [input, setInput] = useState('')
  const chatMessages = useStore((s) => s.chatMessages)
  const sendMessage = useStore((s) => s.sendMessage)
  const isChatting = useStore((s) => s.isChatting)
  const activateScenario = useStore((s) => s.activateScenario)
  const activeScenario = useStore((s) => s.activeScenario)
  const state = useStore((s) => s.state)
  const scrollRef = useRef<HTMLDivElement>(null)
  const inputRef = useRef<HTMLInputElement>(null)

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

  return (
    <div className="h-full flex flex-col bg-[#0a0f0a] border-r border-green-900/30">
      {/* Header */}
      <div className="shrink-0 px-4 py-3 border-b border-green-900/20">
        <div className="flex items-center gap-2">
          <div className="w-2.5 h-2.5 rounded-full bg-green-500 animate-pulse" />
          <span className="text-sm font-mono tracking-[0.3em] text-green-500/60 uppercase">
            Agent Interface
          </span>
        </div>
        {/* State micro-display */}
        <div className="flex gap-4 mt-2">
          <StatePill label="THR" value={state.threat} color="#ff4444" />
          <StatePill label="FAM" value={state.familiarity} color="#33cc66" />
          <StatePill label="NRG" value={state.energy} color="#4488ff" />
        </div>
      </div>

      {/* Scenarios */}
      <div className="shrink-0 px-3 py-2 border-b border-green-900/15 overflow-x-auto">
        <div className="text-xs font-mono text-green-600/30 tracking-widest uppercase mb-1.5">
          Scenarios
        </div>
        <div className="flex gap-1.5 flex-wrap">
          {SCENARIOS.map((s) => (
            <button
              key={s.id}
              onClick={() => activateScenario(s)}
              className={`
                px-2.5 py-1.5 rounded text-xs font-mono transition-all duration-200
                ${activeScenario?.id === s.id
                  ? 'bg-green-500/20 text-green-400 border border-green-500/40'
                  : 'bg-green-900/10 text-green-600/40 border border-green-900/20 hover:bg-green-900/20 hover:text-green-500/60'
                }
              `}
            >
              {s.label}
            </button>
          ))}
        </div>
        {activeScenario && (
          <div className="text-xs font-mono text-green-600/25 mt-1 italic">
            {activeScenario.description}
          </div>
        )}
      </div>

      {/* Messages */}
      <div ref={scrollRef} className="flex-1 overflow-y-auto px-3 py-3 space-y-3 scrollbar-thin">
        {chatMessages.length === 0 && (
          <div className="text-center py-8">
            <div className="text-green-600/20 text-sm font-mono leading-relaxed">
              <div className="mb-2 text-green-500/30">{'>'} SYSTEM READY</div>
              <div>Type a message to interact with the agent.</div>
              <div className="mt-1">The agent's responses are conditioned</div>
              <div>on its current internal state.</div>
              <div className="mt-3 text-green-600/15">Try: "I'm afraid" or "Everything is calm"</div>
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
                max-w-[85%] px-3 py-2 rounded-lg text-sm font-mono leading-relaxed
                ${msg.role === 'user'
                  ? 'bg-green-500/10 text-green-400/80 border border-green-500/20'
                  : 'bg-green-900/15 text-green-300/60 border border-green-900/25'
                }
              `}
            >
              {msg.role === 'agent' && (
                <div className="text-[11px] text-green-600/30 tracking-widest uppercase mb-1">
                  AGENT
                </div>
              )}
              <div>{msg.text}</div>
              {msg.stateSnapshot && (
                <div className="flex gap-3 mt-1.5 pt-1.5 border-t border-green-900/15">
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
            <div className="flex gap-1.5 px-3 py-2">
              <span className="w-2 h-2 rounded-full bg-green-500/40 animate-bounce" style={{ animationDelay: '0ms' }} />
              <span className="w-2 h-2 rounded-full bg-green-500/40 animate-bounce" style={{ animationDelay: '150ms' }} />
              <span className="w-2 h-2 rounded-full bg-green-500/40 animate-bounce" style={{ animationDelay: '300ms' }} />
            </div>
          </div>
        )}
      </div>

      {/* Input */}
      <div className="shrink-0 px-3 py-3 border-t border-green-900/20">
        <div className="flex gap-2">
          <div className="flex-1 relative">
            <span className="absolute left-3 top-1/2 -translate-y-1/2 text-green-500/30 text-sm font-mono">
              {'>'}
            </span>
            <input
              ref={inputRef}
              type="text"
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onKeyDown={handleKeyDown}
              placeholder="speak to the agent..."
              className="w-full bg-green-900/10 border border-green-900/25 rounded-md
                px-8 py-2.5 text-sm font-mono text-green-400/80
                placeholder:text-green-700/20
                focus:outline-none focus:border-green-500/30 focus:bg-green-900/15
                transition-all duration-200"
            />
          </div>
          <button
            onClick={handleSend}
            className="px-4 py-2.5 rounded-md bg-green-500/15 border border-green-500/25
              text-green-500/60 text-sm font-mono tracking-wider uppercase
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

function StatePill({ label, value, color }: { label: string; value: number; color: string }) {
  return (
    <div className="flex items-center gap-2">
      <span className="text-[11px] font-mono text-white/20">{label}</span>
      <div className="w-16 h-1.5 bg-white/5 rounded-full overflow-hidden">
        <div
          className="h-full rounded-full transition-all duration-500"
          style={{
            width: `${value * 100}%`,
            backgroundColor: color + '60',
            boxShadow: `0 0 4px ${color}30`,
          }}
        />
      </div>
      <span className="text-[11px] font-mono tabular-nums" style={{ color: color + '50' }}>
        {(value * 100).toFixed(0)}
      </span>
    </div>
  )
}

function MicroBar({ label, value, color }: { label: string; value: number; color: string }) {
  return (
    <div className="flex items-center gap-1.5">
      <span className="text-[11px] font-mono" style={{ color: color + '40' }}>{label}</span>
      <div className="w-10 h-1 bg-white/5 rounded-full overflow-hidden">
        <div
          className="h-full rounded-full"
          style={{
            width: `${value * 100}%`,
            backgroundColor: color + '50',
          }}
        />
      </div>
    </div>
  )
}
