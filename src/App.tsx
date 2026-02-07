import { useEffect } from 'react'
import { Scene } from './components/Scene'
import { StateControls } from './components/StateControls'
import { RadialMenu } from './components/RadialMenu'
import { ConsciousnessLog } from './components/ConsciousnessLog'
import { BrainRegionLabels } from './components/BrainRegionLabels'
import { useStore } from './store/useStore'

export default function App() {
  const tick = useStore((s) => s.tick)

  // Initial tick
  useEffect(() => {
    tick()
  }, [tick])

  // Periodic tick for continuous updates
  useEffect(() => {
    const interval = setInterval(() => tick(), 500)
    return () => clearInterval(interval)
  }, [tick])

  return (
    <div className="w-screen h-screen bg-[#060610] overflow-hidden relative select-none">
      {/* 3D Canvas - full screen */}
      <div className="absolute inset-0">
        <Scene />
      </div>

      {/* UI Overlays */}
      <div className="absolute inset-0 pointer-events-none">
        {/* State controls - left panel */}
        <div className="pointer-events-auto">
          <StateControls />
        </div>

        {/* Consciousness log - right panel */}
        <div className="pointer-events-auto">
          <ConsciousnessLog />
        </div>

        {/* Brain region labels - top center */}
        <BrainRegionLabels />

        {/* Radial action menu - bottom center */}
        <RadialMenu />

        {/* Title watermark */}
        <div className="absolute bottom-4 left-1/2 -translate-x-1/2 text-center pointer-events-none">
          <div className="text-[8px] font-mono tracking-[0.5em] text-white/10 uppercase">
            State-Conditioned Interpretation System
          </div>
        </div>
      </div>
    </div>
  )
}
