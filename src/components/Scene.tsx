import { Canvas } from '@react-three/fiber'
import { OrbitControls } from '@react-three/drei'
import { EffectComposer, Bloom, Vignette, ChromaticAberration } from '@react-three/postprocessing'
import { BlendFunction } from 'postprocessing'
import { MechanicalAgent } from './MechanicalAgent'
import { Terrain } from './Terrain'
import { StimulusObject } from './StimulusObject'
import { CognitiveField } from './CognitiveField'
import { DragPlane } from './DragPlane'
import { Projectile } from './yeet/Projectile'
import { DebrisSystem } from './yeet/Debris'
import { useStore } from '../store/useStore'
import { useYeetStore } from '../store/useYeetStore'

function PostEffects() {
  const interpretation = useStore((s) => s.interpretation)
  const threat = interpretation?.perceivedThreat ?? 0

  return (
    <EffectComposer multisampling={0}>
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
      camera={{ position: [0, 2.0, 4.5], fov: 45 }}
      gl={{
        antialias: true,
        alpha: false,
        powerPreference: 'high-performance',
      }}
      dpr={[1, 2]}
      style={{ background: '#060610' }}
    >
      <Terrain />
      <MechanicalAgent />
      <StimulusObject />
      <CognitiveField />
      <DragPlane />
      <ProjectileManager />
      <DebrisSystem />
      <PostEffects />

      <OrbitControls
        enablePan={false}
        enableZoom={true}
        minDistance={2}
        maxDistance={10}
        minPolarAngle={Math.PI * 0.15}
        maxPolarAngle={Math.PI * 0.7}
        target={[0, 1.5, 0]}
        autoRotate={false}
        enableDamping
        dampingFactor={0.05}
      />
    </Canvas>
  )
}

function ProjectileManager() {
  const projectiles = useYeetStore((s) => s.projectiles)
  return (
    <>
      {projectiles.map((p) => (
        <Projectile key={p.id} data={p} />
      ))}
    </>
  )
}
