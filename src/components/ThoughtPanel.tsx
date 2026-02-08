import { useRef, useEffect } from 'react'
import { useStore } from '../store/useStore'

export function ThoughtPanel() {
  const thoughts = useStore((s) => s.thoughts)
  const isThinking = useStore((s) => s.isThinking)
  const thoughtLoopActive = useStore((s) => s.thoughtLoopActive)
  const scrollRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight
    }
  }, [thoughts])

  const formatTime = (ts: number) => {
    const d = new Date(ts)
    return d.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' })
  }

  return (
    <div className="h-full flex flex-col bg-[#08080f] border-l border-indigo-900/20">
      {/* Header */}
      <div className="shrink-0 px-4 py-3 border-b border-indigo-900/15">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div
              className={`w-2.5 h-2.5 rounded-full transition-all duration-500 ${
                thoughtLoopActive
                  ? isThinking
                    ? 'bg-indigo-400 shadow-[0_0_8px_rgba(129,140,248,0.6)] animate-pulse'
                    : 'bg-indigo-500/60 shadow-[0_0_4px_rgba(129,140,248,0.3)]'
                  : 'bg-white/10'
              }`}
            />
            <span className="text-sm font-mono tracking-[0.3em] text-indigo-400/50 uppercase">
              Internal Monologue
            </span>
          </div>
          {isThinking && (
            <span className="text-xs font-mono text-indigo-500/30 tracking-wider animate-pulse">
              thinking...
            </span>
          )}
        </div>
      </div>

      {/* Thought stream */}
      <div ref={scrollRef} className="flex-1 overflow-y-auto px-3 py-3 space-y-3 scrollbar-thin">
        {thoughts.length === 0 && (
          <div className="text-center py-12">
            <div className="text-indigo-500/15 text-sm font-mono leading-relaxed">
              <div className="mb-2 text-indigo-400/20">~ awaiting consciousness ~</div>
              <div>The agent's private internal</div>
              <div>experience will appear here.</div>
              <div className="mt-3 text-indigo-500/10">No human interface. Observation only.</div>
            </div>
          </div>
        )}

        {thoughts.map((thought) => (
          <div
            key={thought.id}
            className="thought-entry"
          >
            <div
              className={`
                text-sm font-mono leading-relaxed italic
                pl-3 border-l-2 transition-colors duration-300
                ${thought.source === 'reactive'
                  ? 'text-purple-300/50 border-purple-500/20'
                  : 'text-indigo-300/45 border-indigo-500/15'
                }
              `}
            >
              <div className="relative">
                {thought.source === 'reactive' && (
                  <span className="text-[11px] not-italic tracking-widest text-purple-500/25 uppercase block mb-1">
                    reflexive
                  </span>
                )}
                <span>{thought.text}</span>
              </div>
              <div className="text-xs not-italic text-white/10 mt-2 tracking-wider">
                {formatTime(thought.timestamp)}
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}
