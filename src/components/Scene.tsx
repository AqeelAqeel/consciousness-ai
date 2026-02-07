import { Canvas } from '@react-three/fiber'
import { OrbitControls } from '@react-three/drei'
import { EffectComposer, Bloom, Vignette, ChromaticAberration } from '@react-three/postprocessing'
import { BlendFunction } from 'postprocessing'
import { Agent } from './Agent'
import { BrainOverlay } from './BrainOverlay'
import { StimulusObject } from './StimulusObject'
import { Environment } from './Environment'
import { CognitiveField } from './CognitiveField'
import { DragPlane } from './DragPlane'
import { useStore } from '../store/useStore'

function PostEffects() {
  const interpretation = useStore((s) => s.interpretation)
  const threat = interpretation?.perceivedThreat ?? 0

  return (
    <EffectComposer>
      <Bloom
        luminanceThreshold={0.3}
        luminanceSmoothing={0.9}
        intensity={0.8 + threat * 1.2}
        mipmapBlur
      />
      <Vignette
        offset={0.3}
        darkness={0.6 + threat * 0.4}
        blendFunction={BlendFunction.NORMAL}
      />
      <ChromaticAberration
        offset={[threat * 0.002, threat * 0.001]}
        blendFunction={BlendFunction.NORMAL}
        radialModulation={false}
        modulationOffset={0}
      />
    </EffectComposer>
  )
}

export function Scene() {
  return (
    <Canvas
      camera={{ position: [0, 1.5, 3.5], fov: 50 }}
      gl={{
        antialias: true,
        alpha: false,
        powerPreference: 'high-performance',
      }}
      dpr={[1, 2]}
      style={{ background: '#060610' }}
    >
      <Environment />
      <Agent />
      <BrainOverlay />
      <StimulusObject />
      <CognitiveField />
      <DragPlane />
      <PostEffects />

      <OrbitControls
        enablePan={false}
        enableZoom={true}
        minDistance={2}
        maxDistance={7}
        minPolarAngle={Math.PI * 0.2}
        maxPolarAngle={Math.PI * 0.7}
        target={[0, 1.2, 0]}
        autoRotate={false}
        enableDamping
        dampingFactor={0.05}
      />
    </Canvas>
  )
}
