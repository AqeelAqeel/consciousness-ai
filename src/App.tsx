import { useEffect } from 'react'
import { Scene } from './components/Scene'
import { ChatPanel } from './components/ChatPanel'
import { BrainPanel } from './components/BrainPanel'
import { StatePanel } from './components/StatePanel'
import { ThoughtPanel } from './components/ThoughtPanel'
import { SimulationBar } from './components/SimulationBar'
import { YeetPanel } from './components/yeet/YeetPanel'
import { useStore } from './store/useStore'

export default function App() {
  const tick = useStore((s) => s.tick)
  const startThoughtLoop = useStore((s) => s.startThoughtLoop)
  const stopThoughtLoop = useStore((s) => s.stopThoughtLoop)

  useEffect(() => { tick() }, [tick])
  useEffect(() => {
    const interval = setInterval(() => tick(), 500)
    return () => clearInterval(interval)
  }, [tick])

  // Start the autonomous thought loop on mount
  useEffect(() => {
    startThoughtLoop()
    return () => stopThoughtLoop()
  }, [startThoughtLoop, stopThoughtLoop])

  return (
    <div className="w-screen h-screen bg-[#060610] overflow-hidden flex flex-col select-none">
      {/* ── TOP: Simulation Bar ── */}
      <SimulationBar />

      {/* ── MAIN CONTENT ── */}
      <div className="flex-1 min-h-0 flex">
        {/* ── LEFT: Chat Panel + Yeet Lab ── */}
        <div className="w-80 shrink-0 h-full flex flex-col">
          {/* Chat takes top portion */}
          <div className="flex-1 min-h-0">
            <ChatPanel />
          </div>
          {/* Yeet Lab takes bottom portion */}
          <div className="h-[48%] shrink-0">
            <YeetPanel />
          </div>
        </div>

        {/* ── CENTER ── */}
        <div className="flex-1 h-full flex flex-col min-w-0">
          {/* Top row: Scene + Brain Viz */}
          <div className="flex-1 min-h-0 flex">
            {/* 3D Scene */}
            <div className="relative flex-1 min-w-0">
              <Scene />
              <div className="absolute bottom-2 left-1/2 -translate-x-1/2 pointer-events-none">
                <div className="text-[11px] font-mono tracking-[0.5em] text-white/8 uppercase">
                  State-Conditioned Interpretation System
                </div>
              </div>
            </div>

            {/* Brain Visualization (top-right) */}
            <div className="w-72 shrink-0">
              <BrainPanel />
            </div>
          </div>

          {/* Bottom row: State + Thoughts */}
          <div className="h-[38%] shrink-0 border-t border-white/[0.05] flex">
            {/* State / Learning / Associations */}
            <div className="flex-1 min-w-0">
              <StatePanel />
            </div>
            {/* Internal Monologue / Thought stream */}
            <div className="w-80 shrink-0">
              <ThoughtPanel />
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
