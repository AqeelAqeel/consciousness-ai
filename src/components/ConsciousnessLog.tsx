import { useState, useEffect, useRef } from 'react'
import { useStore } from '../store/useStore'
import { SomaticSignal, BrainRegion } from '../engine/types'

interface LogEntry {
  id: string
  timestamp: number
  type: 'cognition' | 'somatic' | 'brain' | 'action'
  text: string
  intensity: number
  color: string
}

export function ConsciousnessLog() {
  const [entries, setEntries] = useState<LogEntry[]>([])
  const [visible, setVisible] = useState(true)
  const scrollRef = useRef<HTMLDivElement>(null)

  const cognitionFragments = useStore((s) => s.cognitionFragments)
  const somaticSignals = useStore((s) => s.somaticSignals)
  const brainRegions = useStore((s) => s.brainRegions)
  const currentAction = useStore((s) => s.currentAction)
  const stimulusActive = useStore((s) => s.stimulusActive)

  const lastUpdateRef = useRef(0)

  useEffect(() => {
    const now = Date.now()
    if (now - lastUpdateRef.current < 400) return
    lastUpdateRef.current = now

    if (!stimulusActive) return

    const newEntries: LogEntry[] = []

    // Cognition entries
    cognitionFragments.forEach((f) => {
      newEntries.push({
        id: `log-c-${f.id}`,
        timestamp: now,
        type: 'cognition',
        text: `thought: "${f.text}"`,
        intensity: f.intensity,
        color: f.intensity > 0.7 ? '#ff6644' : '#88aacc',
      })
    })

    // Top somatic signal
    const topSomatic = somaticSignals.reduce<SomaticSignal | null>(
      (best, s) => (!best || s.intensity > best.intensity ? s : best),
      null,
    )
    if (topSomatic && topSomatic.intensity > 0.3) {
      newEntries.push({
        id: `log-s-${now}`,
        timestamp: now,
        type: 'somatic',
        text: `${topSomatic.region}: ${topSomatic.type} [${(topSomatic.intensity * 100).toFixed(0)}%]`,
        intensity: topSomatic.intensity,
        color: topSomatic.type === 'tension' ? '#ff4444' : topSomatic.type === 'warmth' ? '#ffaa44' : '#4488ff',
      })
    }

    // Top brain region
    const topRegion = brainRegions.reduce<BrainRegion | null>(
      (best, r) => (!best || r.activation > best.activation ? r : best),
      null,
    )
    if (topRegion && topRegion.activation > 0.3) {
      newEntries.push({
        id: `log-b-${now}`,
        timestamp: now,
        type: 'brain',
        text: `${topRegion.label} active [${(topRegion.activation * 100).toFixed(0)}%]`,
        intensity: topRegion.activation,
        color: topRegion.color,
      })
    }

    // Action entry
    newEntries.push({
      id: `log-a-${now}`,
      timestamp: now,
      type: 'action',
      text: `→ ${currentAction}`,
      intensity: 0.5,
      color: '#ffffff',
    })

    setEntries((prev) => [...prev.slice(-30), ...newEntries])
  }, [cognitionFragments, somaticSignals, brainRegions, currentAction, stimulusActive])

  // Auto-scroll
  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight
    }
  }, [entries])

  // Fade out old entries
  const now = Date.now()

  return (
    <div className={`
      absolute top-0 right-0 h-full flex flex-col transition-all duration-500
      ${visible ? 'w-64' : 'w-0'}
    `}>
      {/* Toggle */}
      <button
        onClick={() => setVisible(!visible)}
        className="absolute top-4 left-0 -translate-x-full z-10 w-6 h-12
          bg-white/5 border border-white/10 rounded-l-md text-white/40 text-xs
          hover:bg-white/10 transition-colors flex items-center justify-center"
      >
        {visible ? '▶' : '◀'}
      </button>

      {visible && (
        <div className="flex-1 flex flex-col p-4 overflow-hidden">
          <h2 className="text-[9px] font-mono tracking-[0.3em] text-white/25 uppercase mb-3 shrink-0">
            Consciousness Stream
          </h2>

          <div ref={scrollRef} className="flex-1 overflow-y-auto space-y-1 scrollbar-thin">
            {entries.map((entry) => {
              const age = (now - entry.timestamp) / 1000
              const fadeOpacity = Math.max(0.05, 1 - age / 8)

              return (
                <div
                  key={entry.id}
                  className="flex items-start gap-2 transition-opacity duration-1000"
                  style={{ opacity: fadeOpacity }}
                >
                  {/* Type indicator */}
                  <div
                    className="w-1 h-1 rounded-full mt-1.5 shrink-0"
                    style={{
                      backgroundColor: entry.color,
                      boxShadow: `0 0 4px ${entry.color}60`,
                    }}
                  />
                  {/* Text */}
                  <span
                    className="text-[10px] font-mono leading-tight"
                    style={{ color: entry.color + '80' }}
                  >
                    {entry.text}
                  </span>
                </div>
              )
            })}

            {entries.length === 0 && (
              <div className="text-[9px] font-mono text-white/10 italic">
                awaiting stimulus...
              </div>
            )}
          </div>

          {/* Stream indicator */}
          {stimulusActive && (
            <div className="shrink-0 mt-2 flex items-center gap-2">
              <div className="w-1.5 h-1.5 rounded-full bg-green-400/60 animate-pulse" />
              <span className="text-[8px] font-mono text-white/20">STREAMING</span>
            </div>
          )}
        </div>
      )}
    </div>
  )
}
