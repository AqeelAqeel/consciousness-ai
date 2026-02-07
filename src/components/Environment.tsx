import { useRef, useMemo } from 'react'
import { useFrame } from '@react-three/fiber'
import * as THREE from 'three'
import { useStore } from '../store/useStore'

export function Environment() {
  const lightRef = useRef<THREE.PointLight>(null)
  const ambientRef = useRef<THREE.AmbientLight>(null)
  const state = useStore((s) => s.state)
  const interpretation = useStore((s) => s.interpretation)

  // Particle system for atmosphere
  const particles = useMemo(() => {
    const count = 200
    const positions = new Float32Array(count * 3)
    const opacities = new Float32Array(count)
    for (let i = 0; i < count; i++) {
      positions[i * 3] = (Math.random() - 0.5) * 10
      positions[i * 3 + 1] = Math.random() * 5
      positions[i * 3 + 2] = (Math.random() - 0.5) * 10
      opacities[i] = Math.random() * 0.3
    }
    return { positions, opacities, count }
  }, [])

  const particleGeom = useMemo(() => {
    const geom = new THREE.BufferGeometry()
    geom.setAttribute('position', new THREE.BufferAttribute(particles.positions, 3))
    return geom
  }, [particles])

  useFrame(() => {
    const threat = interpretation?.perceivedThreat ?? 0
    const energy = state.energy

    // Dynamic lighting
    if (lightRef.current) {
      // Threat = warmer, redder light
      lightRef.current.color.setRGB(
        0.9 + threat * 0.1,
        0.85 - threat * 0.4,
        0.9 - threat * 0.5,
      )
      lightRef.current.intensity = 1.5 + threat * 2
    }

    if (ambientRef.current) {
      // Base ambient shifts with state
      ambientRef.current.intensity = 0.15 + energy * 0.1 - threat * 0.05
      ambientRef.current.color.setRGB(
        0.3 + threat * 0.2,
        0.3 - threat * 0.1,
        0.4 - threat * 0.15,
      )
    }

    // Animate particles
    const posAttr = particleGeom.getAttribute('position') as THREE.BufferAttribute
    for (let i = 0; i < particles.count; i++) {
      posAttr.array[i * 3 + 1] += 0.002 * (0.5 + energy * 0.5)
      if (posAttr.array[i * 3 + 1] > 5) posAttr.array[i * 3 + 1] = 0
    }
    posAttr.needsUpdate = true
  })

  return (
    <>
      {/* Ambient light */}
      <ambientLight ref={ambientRef} intensity={0.2} color="#445566" />

      {/* Key light */}
      <pointLight
        ref={lightRef}
        position={[2, 3, 2]}
        intensity={2}
        color="#dde0f0"
        distance={12}
        decay={2}
      />

      {/* Fill light */}
      <pointLight
        position={[-2, 2, -1]}
        intensity={0.5}
        color="#4466aa"
        distance={8}
        decay={2}
      />

      {/* Rim light */}
      <pointLight
        position={[0, 1, -3]}
        intensity={0.8}
        color="#6644aa"
        distance={6}
        decay={2}
      />

      {/* Ground plane */}
      <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, -0.01, 0]} receiveShadow>
        <circleGeometry args={[6, 64]} />
        <meshStandardMaterial
          color="#0a0a12"
          roughness={0.9}
          metalness={0.1}
          transparent
          opacity={0.8}
        />
      </mesh>

      {/* Ground ring */}
      <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, 0, 0]}>
        <ringGeometry args={[1.5, 1.55, 64]} />
        <meshBasicMaterial color="#223355" transparent opacity={0.2} />
      </mesh>

      {/* Particles */}
      <points geometry={particleGeom}>
        <pointsMaterial
          size={0.015}
          color="#6688bb"
          transparent
          opacity={0.25}
          sizeAttenuation
        />
      </points>

      {/* Fog */}
      <fog attach="fog" args={['#060610', 3, 12]} />
    </>
  )
}
