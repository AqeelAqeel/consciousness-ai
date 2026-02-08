import { useStore } from '../store/useStore'
import { useRef, useEffect, useCallback } from 'react'
import type { BrainRegion } from '../engine/types'

// ── Anatomical coordinates for brain regions (percentage of canvas, lateral/sagittal view) ──
// Organized from front (prefrontal) → back (occipital) → deep → brainstem
const REGION_MAP: Record<string, {
  cx: number; cy: number; rx: number; ry: number; label: string; layer: 'cortex' | 'deep' | 'stem'
}> = {
  // Frontal Lobe (front-top)
  prefrontal:          { cx: 22, cy: 28, rx: 10, ry: 8,  label: 'PFC',            layer: 'cortex' },
  orbitofrontal:       { cx: 16, cy: 40, rx: 7,  ry: 6,  label: 'OFC',            layer: 'cortex' },
  dlpfc:               { cx: 28, cy: 22, rx: 8,  ry: 6,  label: 'dlPFC',          layer: 'cortex' },
  broca:               { cx: 18, cy: 50, rx: 7,  ry: 5,  label: 'Broca',          layer: 'cortex' },
  'motor-cortex':      { cx: 42, cy: 16, rx: 9,  ry: 6,  label: 'Motor',          layer: 'cortex' },
  premotor:            { cx: 36, cy: 20, rx: 7,  ry: 5,  label: 'Premotor',       layer: 'cortex' },
  sma:                 { cx: 44, cy: 12, rx: 6,  ry: 4,  label: 'SMA',            layer: 'cortex' },
  acc:                 { cx: 34, cy: 34, rx: 7,  ry: 5,  label: 'ACC',            layer: 'deep' },
  // Parietal Lobe (top-middle)
  somatosensory:       { cx: 52, cy: 16, rx: 9,  ry: 6,  label: 'Somato.',        layer: 'cortex' },
  'posterior-parietal': { cx: 60, cy: 22, rx: 8,  ry: 6,  label: 'Post. Par.',     layer: 'cortex' },
  // Temporal Lobe (side-bottom)
  'auditory-cortex':   { cx: 40, cy: 58, rx: 8,  ry: 5,  label: 'Auditory',       layer: 'cortex' },
  wernicke:            { cx: 54, cy: 52, rx: 7,  ry: 5,  label: 'Wernicke',       layer: 'cortex' },
  fusiform:            { cx: 46, cy: 64, rx: 7,  ry: 4,  label: 'Fusiform',       layer: 'cortex' },
  // Occipital Lobe (back)
  'visual-cortex':     { cx: 78, cy: 32, rx: 8,  ry: 7,  label: 'V1',             layer: 'cortex' },
  'visual-association': { cx: 72, cy: 26, rx: 7,  ry: 5,  label: 'V2/V3',         layer: 'cortex' },
  // Deep structures (center)
  amygdala:            { cx: 40, cy: 52, rx: 6,  ry: 5,  label: 'Amygdala',       layer: 'deep' },
  hippocampus:         { cx: 50, cy: 56, rx: 8,  ry: 4,  label: 'Hippocampus',    layer: 'deep' },
  thalamus:            { cx: 48, cy: 40, rx: 7,  ry: 6,  label: 'Thalamus',       layer: 'deep' },
  hypothalamus:        { cx: 38, cy: 48, rx: 5,  ry: 4,  label: 'Hypothal.',      layer: 'deep' },
  'basal-ganglia':     { cx: 44, cy: 36, rx: 6,  ry: 5,  label: 'Basal Gang.',    layer: 'deep' },
  insula:              { cx: 34, cy: 46, rx: 6,  ry: 5,  label: 'Insula',         layer: 'deep' },
  'salience-network':  { cx: 42, cy: 32, rx: 7,  ry: 5,  label: 'Salience',       layer: 'deep' },
  // Brainstem & Cerebellum
  cerebellum:          { cx: 76, cy: 60, rx: 12, ry: 10, label: 'Cerebellum',     layer: 'stem' },
  brainstem:           { cx: 56, cy: 72, rx: 5,  ry: 8,  label: 'Brainstem',      layer: 'stem' },
  vta:                 { cx: 52, cy: 66, rx: 4,  ry: 3,  label: 'VTA',            layer: 'stem' },
  'locus-coeruleus':   { cx: 58, cy: 68, rx: 4,  ry: 3,  label: 'LC',             layer: 'stem' },
  'raphe-nuclei':      { cx: 54, cy: 74, rx: 4,  ry: 3,  label: 'Raphe',          layer: 'stem' },
}

// ── Neural pathways (anatomically meaningful connections) ──
const NEURAL_PATHWAYS: [string, string][] = [
  // Thalamocortical projections
  ['thalamus', 'prefrontal'],
  ['thalamus', 'somatosensory'],
  ['thalamus', 'visual-cortex'],
  ['thalamus', 'auditory-cortex'],
  ['thalamus', 'motor-cortex'],
  // Limbic circuit
  ['amygdala', 'hippocampus'],
  ['amygdala', 'prefrontal'],
  ['amygdala', 'acc'],
  ['amygdala', 'hypothalamus'],
  ['amygdala', 'insula'],
  ['hippocampus', 'prefrontal'],
  ['hippocampus', 'thalamus'],
  // Motor pathways
  ['motor-cortex', 'basal-ganglia'],
  ['motor-cortex', 'cerebellum'],
  ['motor-cortex', 'brainstem'],
  ['premotor', 'motor-cortex'],
  ['sma', 'motor-cortex'],
  ['basal-ganglia', 'thalamus'],
  ['cerebellum', 'thalamus'],
  // Language
  ['broca', 'wernicke'],
  ['wernicke', 'auditory-cortex'],
  ['broca', 'prefrontal'],
  // Visual pathway
  ['visual-cortex', 'visual-association'],
  ['visual-association', 'fusiform'],
  ['visual-association', 'posterior-parietal'],
  // Salience / attention
  ['salience-network', 'acc'],
  ['salience-network', 'insula'],
  ['salience-network', 'dlpfc'],
  // Neuromodulatory
  ['vta', 'prefrontal'],
  ['vta', 'basal-ganglia'],
  ['locus-coeruleus', 'amygdala'],
  ['locus-coeruleus', 'prefrontal'],
  ['raphe-nuclei', 'hippocampus'],
  ['raphe-nuclei', 'prefrontal'],
  // Interoception
  ['insula', 'acc'],
  ['hypothalamus', 'brainstem'],
  ['brainstem', 'locus-coeruleus'],
  ['brainstem', 'raphe-nuclei'],
  // Dorsal / somatosensory → motor planning
  ['somatosensory', 'posterior-parietal'],
  ['posterior-parietal', 'premotor'],
  // Orbitofrontal (valuation)
  ['orbitofrontal', 'amygdala'],
  ['orbitofrontal', 'vta'],
]

export function BrainCenter() {
  const brainRegions = useStore((s) => s.brainRegions)
  const state = useStore((s) => s.state)
  const interpretation = useStore((s) => s.interpretation)
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const animRef = useRef<number>(0)

  // Build a lookup for current activations
  const regionLookup = useRef<Map<string, BrainRegion>>(new Map())
  regionLookup.current.clear()
  for (const r of brainRegions) regionLookup.current.set(r.id, r)

  const draw = useCallback(() => {
    const canvas = canvasRef.current
    if (!canvas) return
    const ctx = canvas.getContext('2d')
    if (!ctx) return

    const w = canvas.width
    const h = canvas.height
    const now = Date.now()

    ctx.clearRect(0, 0, w, h)

    // ── Brain silhouette (lateral / sagittal view) ──
    drawBrainSilhouette(ctx, w, h, now)

    // ── Neural pathways (draw before regions so regions appear on top) ──
    drawNeuralPathways(ctx, w, h, now, regionLookup.current)

    // ── Draw all regions ──
    for (const region of brainRegions) {
      const mapEntry = REGION_MAP[region.id]
      if (!mapEntry) continue
      drawRegionNode(ctx, w, h, now, region, mapEntry)
    }

    // ── Propagation pulse effects ──
    drawPropagationPulses(ctx, w, h, now, brainRegions)

    animRef.current = requestAnimationFrame(draw)
  }, [brainRegions])

  useEffect(() => {
    const canvas = canvasRef.current
    if (!canvas) return

    const resize = () => {
      const rect = canvas.parentElement!.getBoundingClientRect()
      canvas.width = rect.width * 2
      canvas.height = rect.width * 1.6 // slightly taller than wide
      canvas.style.width = rect.width + 'px'
      canvas.style.height = rect.width * 0.8 + 'px'
    }
    resize()
    window.addEventListener('resize', resize)

    animRef.current = requestAnimationFrame(draw)
    return () => {
      cancelAnimationFrame(animRef.current)
      window.removeEventListener('resize', resize)
    }
  }, [draw])

  // Split regions by layer for display
  const cortexRegions = brainRegions.filter((r) => REGION_MAP[r.id]?.layer === 'cortex')
  const deepRegions = brainRegions.filter((r) => REGION_MAP[r.id]?.layer === 'deep')
  const stemRegions = brainRegions.filter((r) => REGION_MAP[r.id]?.layer === 'stem')

  return (
    <div className="h-full flex flex-col bg-[#080810] border-l border-blue-900/20 overflow-y-auto scrollbar-thin">
      {/* Header */}
      <div className="shrink-0 px-4 py-3 border-b border-blue-900/15">
        <div className="flex items-center gap-2">
          <div className="w-2 h-2 rounded-full bg-blue-500/50 animate-pulse" />
          <span className="text-[10px] font-mono tracking-[0.3em] text-blue-400/40 uppercase">
            Neural Activity
          </span>
          <span className="text-[8px] font-mono text-white/10 ml-auto">
            {brainRegions.length} regions
          </span>
        </div>
      </div>

      {/* Brain visualization */}
      <div className="relative px-2 py-1">
        <canvas ref={canvasRef} className="w-full" />
      </div>

      {/* Cortical regions */}
      <RegionGroup label="Cortical Regions" regions={cortexRegions} />

      {/* Deep structures */}
      <RegionGroup label="Deep Structures" regions={deepRegions} />

      {/* Brainstem & Cerebellum */}
      <RegionGroup label="Brainstem / Cerebellum" regions={stemRegions} />

      {/* Neural metrics */}
      <div className="px-4 py-3 mt-auto border-t border-blue-900/10 space-y-2">
        <div className="text-[8px] font-mono tracking-[0.2em] text-white/15 uppercase mb-1">
          Neural Metrics
        </div>

        <MetricRow
          label="Cortical Activity"
          value={avgActivation(cortexRegions)}
          color="#6688cc"
        />
        <MetricRow
          label="Limbic Activity"
          value={avgActivation(deepRegions)}
          color="#ff6688"
        />
        <MetricRow
          label="Threat Response"
          value={interpretation?.perceivedThreat ?? 0}
          color="#ff4444"
        />
        <MetricRow
          label="Cognitive Load"
          value={1 - (interpretation?.cognitiveAccess ?? 0.8)}
          color="#ffaa44"
        />
        <MetricRow
          label="Motor Output"
          value={interpretation?.motorBias === 'approach' ? 0.7 : interpretation?.motorBias === 'withdraw' ? 0.9 : 0.15}
          color="#ff8833"
        />
        <MetricRow
          label="Arousal Level"
          value={(state.threat * 0.4 + (1 - state.energy) * 0.3 + (interpretation?.salience ?? 0) * 0.3)}
          color="#cc44ff"
        />

        {/* EEG-style waveform */}
        <div className="mt-2">
          <div className="text-[7px] font-mono text-white/10 uppercase tracking-wider mb-1">
            Neural Oscillation
          </div>
          <EEGWave threat={state.threat} energy={state.energy} />
        </div>
      </div>
    </div>
  )
}

// ── Brain silhouette ──

function drawBrainSilhouette(ctx: CanvasRenderingContext2D, w: number, h: number, now: number) {
  ctx.save()

  // Main cerebrum (large lateral shape)
  ctx.strokeStyle = 'rgba(100, 130, 180, 0.10)'
  ctx.lineWidth = 1.5

  ctx.beginPath()
  ctx.moveTo(w * 0.12, h * 0.55)
  ctx.bezierCurveTo(w * 0.08, h * 0.40, w * 0.10, h * 0.15, w * 0.30, h * 0.08)
  ctx.bezierCurveTo(w * 0.45, h * 0.04, w * 0.60, h * 0.04, w * 0.72, h * 0.10)
  ctx.bezierCurveTo(w * 0.85, h * 0.17, w * 0.90, h * 0.30, w * 0.88, h * 0.42)
  ctx.bezierCurveTo(w * 0.86, h * 0.50, w * 0.82, h * 0.55, w * 0.78, h * 0.55)
  // Occipital notch → cerebellum boundary
  ctx.bezierCurveTo(w * 0.74, h * 0.56, w * 0.70, h * 0.54, w * 0.66, h * 0.58)
  // Temporal lobe underside
  ctx.bezierCurveTo(w * 0.58, h * 0.64, w * 0.45, h * 0.68, w * 0.32, h * 0.66)
  ctx.bezierCurveTo(w * 0.22, h * 0.64, w * 0.15, h * 0.62, w * 0.12, h * 0.55)
  ctx.stroke()

  // Cerebellum
  ctx.strokeStyle = 'rgba(100, 130, 180, 0.08)'
  ctx.lineWidth = 1.2
  ctx.beginPath()
  ctx.ellipse(w * 0.78, h * 0.62, w * 0.10, h * 0.08, 0.15, 0, Math.PI * 2)
  ctx.stroke()

  // Cerebellum folia (ridges)
  ctx.strokeStyle = 'rgba(100, 130, 180, 0.04)'
  ctx.lineWidth = 0.6
  for (let i = 0; i < 4; i++) {
    const yOff = h * (0.57 + i * 0.03)
    ctx.beginPath()
    ctx.moveTo(w * 0.70, yOff)
    ctx.quadraticCurveTo(w * 0.78, yOff + h * 0.015 * Math.sin(i), w * 0.86, yOff)
    ctx.stroke()
  }

  // Brainstem
  ctx.strokeStyle = 'rgba(100, 130, 180, 0.08)'
  ctx.lineWidth = 1
  ctx.beginPath()
  ctx.moveTo(w * 0.54, h * 0.64)
  ctx.bezierCurveTo(w * 0.55, h * 0.72, w * 0.56, h * 0.80, w * 0.55, h * 0.88)
  ctx.stroke()
  ctx.beginPath()
  ctx.moveTo(w * 0.58, h * 0.64)
  ctx.bezierCurveTo(w * 0.59, h * 0.72, w * 0.60, h * 0.80, w * 0.59, h * 0.88)
  ctx.stroke()

  // Sulci (cortical folds)
  ctx.strokeStyle = 'rgba(100, 130, 180, 0.04)'
  ctx.lineWidth = 0.7
  // Central sulcus
  ctx.beginPath()
  ctx.moveTo(w * 0.48, h * 0.06)
  ctx.bezierCurveTo(w * 0.46, h * 0.20, w * 0.44, h * 0.35, w * 0.40, h * 0.52)
  ctx.stroke()
  // Lateral (Sylvian) fissure
  ctx.beginPath()
  ctx.moveTo(w * 0.30, h * 0.48)
  ctx.bezierCurveTo(w * 0.40, h * 0.46, w * 0.55, h * 0.44, w * 0.65, h * 0.50)
  ctx.stroke()
  // Parieto-occipital sulcus
  ctx.beginPath()
  ctx.moveTo(w * 0.68, h * 0.12)
  ctx.bezierCurveTo(w * 0.70, h * 0.25, w * 0.72, h * 0.38, w * 0.74, h * 0.50)
  ctx.stroke()
  // Additional gyri
  for (let i = 0; i < 6; i++) {
    const xStart = 0.18 + i * 0.09
    const yBase = 0.15 + Math.sin(i * 0.9) * 0.08
    ctx.beginPath()
    ctx.moveTo(w * xStart, h * yBase)
    ctx.quadraticCurveTo(
      w * (xStart + 0.04), h * (yBase + 0.06 + Math.cos(i) * 0.02),
      w * (xStart + 0.08), h * (yBase + 0.02)
    )
    ctx.stroke()
  }

  // Corpus callosum (deep white matter)
  ctx.strokeStyle = 'rgba(130, 150, 200, 0.05)'
  ctx.lineWidth = 2.5
  ctx.beginPath()
  ctx.moveTo(w * 0.28, h * 0.36)
  ctx.bezierCurveTo(w * 0.40, h * 0.30, w * 0.55, h * 0.30, w * 0.68, h * 0.36)
  ctx.stroke()

  ctx.restore()
}

// ── Neural pathways ──

function drawNeuralPathways(
  ctx: CanvasRenderingContext2D,
  w: number,
  h: number,
  now: number,
  lookup: Map<string, BrainRegion>,
) {
  for (const [fromId, toId] of NEURAL_PATHWAYS) {
    const fromMap = REGION_MAP[fromId]
    const toMap = REGION_MAP[toId]
    if (!fromMap || !toMap) continue

    const fromRegion = lookup.get(fromId)
    const toRegion = lookup.get(toId)
    const fromAct = fromRegion?.activation ?? 0
    const toAct = toRegion?.activation ?? 0
    const strength = Math.min(fromAct, toAct)

    if (strength < 0.05) continue

    const x1 = w * fromMap.cx / 100
    const y1 = h * fromMap.cy / 100
    const x2 = w * toMap.cx / 100
    const y2 = h * toMap.cy / 100

    // Connection line
    const alpha = strength * 0.2
    const color = fromRegion?.color || '#6688aa'
    ctx.strokeStyle = color + Math.floor(alpha * 255).toString(16).padStart(2, '0')
    ctx.lineWidth = 0.5 + strength * 1.5
    ctx.beginPath()
    ctx.moveTo(x1, y1)

    // Slightly curved connections
    const midX = (x1 + x2) / 2 + (y2 - y1) * 0.1
    const midY = (y1 + y2) / 2 - (x2 - x1) * 0.1
    ctx.quadraticCurveTo(midX, midY, x2, y2)
    ctx.stroke()

    // Traveling pulse along active pathways
    if (strength > 0.3) {
      const speed = 0.001 + strength * 0.002
      const phase = (now * speed + fromId.length * 0.3) % 1
      const px = x1 + (x2 - x1) * phase + (midX - (x1 + x2) / 2) * 4 * phase * (1 - phase)
      const py = y1 + (y2 - y1) * phase + (midY - (y1 + y2) / 2) * 4 * phase * (1 - phase)

      const pulseAlpha = strength * (1 - Math.abs(phase - 0.5) * 2) * 0.6
      const grad = ctx.createRadialGradient(px, py, 0, px, py, 4 + strength * 6)
      grad.addColorStop(0, color + Math.floor(pulseAlpha * 255).toString(16).padStart(2, '0'))
      grad.addColorStop(1, 'transparent')
      ctx.fillStyle = grad
      ctx.beginPath()
      ctx.arc(px, py, 4 + strength * 6, 0, Math.PI * 2)
      ctx.fill()
    }
  }
}

// ── Individual region node ──

function drawRegionNode(
  ctx: CanvasRenderingContext2D,
  w: number,
  h: number,
  now: number,
  region: BrainRegion,
  mapEntry: typeof REGION_MAP[string],
) {
  const pulse = Math.sin(now * 0.003 + region.activation * 3) * 0.5 + 0.5
  const alpha = region.activation * (0.15 + pulse * 0.55)

  const cx = w * mapEntry.cx / 100
  const cy = h * mapEntry.cy / 100
  const rx = w * mapEntry.rx / 100
  const ry = h * mapEntry.ry / 100

  // Outer glow (larger for more active regions)
  if (region.activation > 0.1) {
    const gradient = ctx.createRadialGradient(cx, cy, 0, cx, cy, Math.max(rx, ry) * 2.5)
    gradient.addColorStop(0, region.color + Math.floor(alpha * 140).toString(16).padStart(2, '0'))
    gradient.addColorStop(0.4, region.color + Math.floor(alpha * 50).toString(16).padStart(2, '0'))
    gradient.addColorStop(1, 'transparent')
    ctx.fillStyle = gradient
    ctx.beginPath()
    ctx.ellipse(cx, cy, rx * 2.5, ry * 2.5, 0, 0, Math.PI * 2)
    ctx.fill()
  }

  // Core region
  ctx.fillStyle = region.color + Math.floor(alpha * 255).toString(16).padStart(2, '0')
  ctx.beginPath()
  ctx.ellipse(cx, cy, rx, ry, 0, 0, Math.PI * 2)
  ctx.fill()

  // Bright center dot
  if (region.activation > 0.2) {
    const dotAlpha = region.activation * (0.3 + pulse * 0.5)
    ctx.fillStyle = '#ffffff' + Math.floor(dotAlpha * 200).toString(16).padStart(2, '0')
    ctx.beginPath()
    ctx.arc(cx, cy, 1.5 + region.activation * 2, 0, Math.PI * 2)
    ctx.fill()
  }

  // Expanding pulse ring when highly active
  if (region.activation > 0.5) {
    const ringPhase = (now % 1800) / 1800
    const ringAlpha = (1 - ringPhase) * region.activation * 0.25
    ctx.strokeStyle = region.color + Math.floor(ringAlpha * 255).toString(16).padStart(2, '0')
    ctx.lineWidth = 0.8
    ctx.beginPath()
    ctx.ellipse(cx, cy, rx * (1 + ringPhase * 0.8), ry * (1 + ringPhase * 0.8), 0, 0, Math.PI * 2)
    ctx.stroke()
  }

  // Second ring offset for very high activation
  if (region.activation > 0.75) {
    const ringPhase2 = ((now + 900) % 1800) / 1800
    const ringAlpha2 = (1 - ringPhase2) * region.activation * 0.15
    ctx.strokeStyle = region.color + Math.floor(ringAlpha2 * 255).toString(16).padStart(2, '0')
    ctx.lineWidth = 0.6
    ctx.beginPath()
    ctx.ellipse(cx, cy, rx * (1 + ringPhase2 * 1.2), ry * (1 + ringPhase2 * 1.2), 0, 0, Math.PI * 2)
    ctx.stroke()
  }

  // Label (only show for somewhat active regions to reduce clutter)
  if (region.activation > 0.15) {
    ctx.font = `${Math.round(w * 0.018)}px monospace`
    ctx.fillStyle = `rgba(255,255,255,${0.15 + region.activation * 0.35})`
    ctx.textAlign = 'center'
    ctx.fillText(mapEntry.label, cx, cy + ry + w * 0.025)
  }
}

// ── Propagation pulse effects (cascading activation visualization) ──

function drawPropagationPulses(
  ctx: CanvasRenderingContext2D,
  w: number,
  h: number,
  now: number,
  regions: BrainRegion[],
) {
  // For highly active regions, draw a spreading wave
  for (const region of regions) {
    if (region.activation < 0.7) continue
    const mapEntry = REGION_MAP[region.id]
    if (!mapEntry) continue

    const cx = w * mapEntry.cx / 100
    const cy = h * mapEntry.cy / 100

    // Slow expanding wave from high-activation centers
    const wavePhase = ((now * 0.5 + region.id.length * 100) % 3000) / 3000
    const waveRadius = wavePhase * w * 0.15
    const waveAlpha = (1 - wavePhase) * region.activation * 0.06

    ctx.strokeStyle = region.color + Math.floor(waveAlpha * 255).toString(16).padStart(2, '0')
    ctx.lineWidth = 0.5
    ctx.beginPath()
    ctx.arc(cx, cy, waveRadius, 0, Math.PI * 2)
    ctx.stroke()
  }
}

// ── Region group display ──

function RegionGroup({ label, regions }: { label: string; regions: BrainRegion[] }) {
  if (regions.length === 0) return null

  return (
    <div className="px-4 py-1.5">
      <div className="text-[7px] font-mono tracking-[0.2em] text-white/12 uppercase mb-1">
        {label}
      </div>
      <div className="space-y-0.5">
        {regions.map((region) => {
          const mapEntry = REGION_MAP[region.id]
          return (
            <div key={region.id} className="flex items-center gap-1.5">
              <div
                className="w-1.5 h-1.5 rounded-full shrink-0"
                style={{
                  backgroundColor: region.color,
                  opacity: 0.3 + region.activation * 0.7,
                  boxShadow: region.activation > 0.5 ? `0 0 4px ${region.color}40` : 'none',
                }}
              />
              <span className="text-[7px] font-mono text-white/20 w-16 shrink-0 truncate">
                {mapEntry?.label || region.id}
              </span>
              <div className="flex-1 h-1 bg-white/[0.03] rounded-full overflow-hidden">
                <div
                  className="h-full rounded-full transition-all duration-500"
                  style={{
                    width: `${region.activation * 100}%`,
                    background: `linear-gradient(90deg, ${region.color}25, ${region.color}60)`,
                    boxShadow: `0 0 6px ${region.color}15`,
                  }}
                />
              </div>
              <span
                className="text-[7px] font-mono tabular-nums w-5 text-right"
                style={{ color: region.color + '40' }}
              >
                {(region.activation * 100).toFixed(0)}
              </span>
            </div>
          )
        })}
      </div>
    </div>
  )
}

// ── Helpers ──

function avgActivation(regions: BrainRegion[]): number {
  if (regions.length === 0) return 0
  return regions.reduce((sum, r) => sum + r.activation, 0) / regions.length
}

function MetricRow({ label, value, color }: { label: string; value: number; color: string }) {
  return (
    <div className="flex items-center gap-2">
      <span className="text-[7px] font-mono text-white/20 w-24 shrink-0">{label}</span>
      <div className="flex-1 h-1 bg-white/[0.03] rounded-full overflow-hidden">
        <div
          className="h-full rounded-full transition-all duration-700"
          style={{
            width: `${Math.min(1, value) * 100}%`,
            backgroundColor: color + '50',
          }}
        />
      </div>
      <span className="text-[7px] font-mono tabular-nums text-white/15 w-6 text-right">
        {(Math.min(1, value) * 100).toFixed(0)}
      </span>
    </div>
  )
}

function EEGWave({ threat, energy }: { threat: number; energy: number }) {
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const animRef = useRef<number>(0)

  useEffect(() => {
    const canvas = canvasRef.current
    if (!canvas) return
    const ctx = canvas.getContext('2d')
    if (!ctx) return

    canvas.width = canvas.offsetWidth * 2
    canvas.height = 40

    const draw = () => {
      ctx.clearRect(0, 0, canvas.width, canvas.height)
      const now = Date.now()
      const w = canvas.width
      const h = canvas.height
      const mid = h / 2

      // Alpha wave (calm / energy)
      ctx.strokeStyle = `rgba(68, 136, 255, ${0.1 + energy * 0.2})`
      ctx.lineWidth = 1
      ctx.beginPath()
      for (let x = 0; x < w; x++) {
        const t = x / w * Math.PI * 8
        const y = mid + Math.sin(t + now * 0.002) * (mid * 0.4 * energy)
        x === 0 ? ctx.moveTo(x, y) : ctx.lineTo(x, y)
      }
      ctx.stroke()

      // Beta wave (threat / arousal)
      ctx.strokeStyle = `rgba(255, 68, 68, ${threat * 0.3})`
      ctx.lineWidth = 0.8
      ctx.beginPath()
      for (let x = 0; x < w; x++) {
        const t = x / w * Math.PI * 20
        const y = mid + Math.sin(t + now * 0.005) * (mid * 0.6 * threat)
          + Math.sin(t * 2.3 + now * 0.003) * (mid * 0.2 * threat)
        x === 0 ? ctx.moveTo(x, y) : ctx.lineTo(x, y)
      }
      ctx.stroke()

      // Gamma bursts (high activation spikes)
      if (threat > 0.5 || energy > 0.7) {
        ctx.strokeStyle = `rgba(255, 200, 50, ${0.15})`
        ctx.lineWidth = 0.5
        ctx.beginPath()
        for (let x = 0; x < w; x++) {
          const t = x / w * Math.PI * 40
          const burst = Math.max(0, Math.sin(now * 0.001 + x * 0.02) - 0.7) * 3
          const y = mid + Math.sin(t + now * 0.008) * (mid * 0.3 * burst)
          x === 0 ? ctx.moveTo(x, y) : ctx.lineTo(x, y)
        }
        ctx.stroke()
      }

      animRef.current = requestAnimationFrame(draw)
    }

    animRef.current = requestAnimationFrame(draw)
    return () => cancelAnimationFrame(animRef.current)
  }, [threat, energy])

  return <canvas ref={canvasRef} className="w-full h-5 rounded" />
}
