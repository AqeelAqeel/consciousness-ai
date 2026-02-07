import { useStore } from '../store/useStore'

export function BrainRegionLabels() {
  const brainRegions = useStore((s) => s.brainRegions)
  const stimulusActive = useStore((s) => s.stimulusActive)

  if (!stimulusActive) return null

  // Only show regions with significant activation
  const activeRegions = brainRegions
    .filter((r) => r.activation > 0.3)
    .sort((a, b) => b.activation - a.activation)
    .slice(0, 4)

  return (
    <div className="absolute top-6 left-1/2 -translate-x-1/2 flex gap-3 pointer-events-none">
      {activeRegions.map((region) => (
        <div
          key={region.id}
          className="flex items-center gap-1.5 px-2.5 py-1 rounded-full
            bg-black/40 border border-white/[0.06] backdrop-blur-sm
            transition-all duration-500"
          style={{
            opacity: 0.3 + region.activation * 0.7,
            borderColor: region.color + '30',
          }}
        >
          <div
            className="w-1.5 h-1.5 rounded-full animate-pulse"
            style={{
              backgroundColor: region.color,
              boxShadow: `0 0 6px ${region.color}60`,
              animationDuration: `${1.5 - region.activation}s`,
            }}
          />
          <span className="text-[8px] font-mono tracking-[0.15em] text-white/40 uppercase">
            {region.label}
          </span>
          <span
            className="text-[8px] font-mono tabular-nums"
            style={{ color: region.color + '80' }}
          >
            {(region.activation * 100).toFixed(0)}
          </span>
        </div>
      ))}
    </div>
  )
}
