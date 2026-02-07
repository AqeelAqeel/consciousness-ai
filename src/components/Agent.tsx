import { useRef, useMemo } from 'react'
import { useFrame } from '@react-three/fiber'
import * as THREE from 'three'
import { useStore } from '../store/useStore'

export function Agent() {
  const groupRef = useRef<THREE.Group>(null)
  const state = useStore((s) => s.state)
  const currentAction = useStore((s) => s.currentAction)
  const interpretation = useStore((s) => s.interpretation)
  const somaticSignals = useStore((s) => s.somaticSignals)

  const bodyMaterial = useMemo(() => new THREE.MeshStandardMaterial({
    color: '#c8d0e0',
    transparent: true,
    opacity: 0.85,
    roughness: 0.7,
    metalness: 0.1,
  }), [])

  // Somatic glow materials
  const chestGlow = useMemo(() => new THREE.MeshBasicMaterial({
    color: '#ff4444',
    transparent: true,
    opacity: 0,
    side: THREE.FrontSide,
  }), [])

  const gutGlow = useMemo(() => new THREE.MeshBasicMaterial({
    color: '#ff8800',
    transparent: true,
    opacity: 0,
    side: THREE.FrontSide,
  }), [])

  const limbGlow = useMemo(() => new THREE.MeshBasicMaterial({
    color: '#44aaff',
    transparent: true,
    opacity: 0,
    side: THREE.FrontSide,
  }), [])

  useFrame((_, delta) => {
    if (!groupRef.current) return

    const threat = interpretation?.perceivedThreat ?? 0
    const energy = state.energy

    // Posture based on action
    let targetRotX = 0
    let targetPosY = 0
    const jitter = threat > 0.5 ? (Math.random() - 0.5) * threat * 0.02 : 0

    switch (currentAction) {
      case 'flinch':
        targetRotX = -0.15
        targetPosY = -0.1
        break
      case 'withdraw':
        targetRotX = -0.08
        targetPosY = -0.05
        break
      case 'approach':
        targetRotX = 0.06
        targetPosY = 0.02
        break
      case 'observe':
        targetRotX = 0
        targetPosY = 0
        break
      case 'override':
        targetRotX = 0.03
        targetPosY = 0
        break
    }

    // Speed based on energy
    const lerpSpeed = 2 * (0.3 + energy * 0.7)
    groupRef.current.rotation.x = THREE.MathUtils.lerp(groupRef.current.rotation.x, targetRotX, delta * lerpSpeed)
    groupRef.current.position.y = THREE.MathUtils.lerp(groupRef.current.position.y, targetPosY, delta * lerpSpeed)
    groupRef.current.position.x = jitter

    // Body color: threat = redder, calm = bluer
    const r = 0.78 + threat * 0.22
    const g = 0.82 - threat * 0.4
    const b = 0.88 - threat * 0.5
    bodyMaterial.color.setRGB(r, g, b)
    bodyMaterial.opacity = 0.6 + energy * 0.35

    // Somatic signals
    let chestIntensity = 0
    let gutIntensity = 0
    let limbIntensity = 0
    for (const signal of somaticSignals) {
      if (signal.region === 'chest') chestIntensity = Math.max(chestIntensity, signal.intensity)
      if (signal.region === 'gut') gutIntensity = Math.max(gutIntensity, signal.intensity)
      if (signal.region === 'limbs') limbIntensity = Math.max(limbIntensity, signal.intensity)
    }
    chestGlow.opacity = chestIntensity * 0.4
    gutGlow.opacity = gutIntensity * 0.35
    limbGlow.opacity = limbIntensity * 0.3

    // Pulse effect on somatic glows
    const pulse = Math.sin(Date.now() * 0.005) * 0.5 + 0.5
    chestGlow.opacity *= 0.7 + pulse * 0.3
    gutGlow.opacity *= 0.7 + pulse * 0.3
  })

  return (
    <group ref={groupRef}>
      {/* Head */}
      <mesh position={[0, 1.65, 0]} material={bodyMaterial}>
        <sphereGeometry args={[0.14, 24, 24]} />
      </mesh>

      {/* Neck */}
      <mesh position={[0, 1.45, 0]} material={bodyMaterial}>
        <cylinderGeometry args={[0.05, 0.06, 0.12, 12]} />
      </mesh>

      {/* Torso */}
      <mesh position={[0, 1.1, 0]} material={bodyMaterial}>
        <capsuleGeometry args={[0.18, 0.5, 8, 16]} />
      </mesh>

      {/* Chest somatic glow */}
      <mesh position={[0, 1.2, 0.1]} material={chestGlow}>
        <sphereGeometry args={[0.22, 16, 16]} />
      </mesh>

      {/* Gut somatic glow */}
      <mesh position={[0, 0.95, 0.08]} material={gutGlow}>
        <sphereGeometry args={[0.18, 16, 16]} />
      </mesh>

      {/* Left arm */}
      <mesh position={[-0.3, 1.1, 0]} rotation={[0, 0, 0.15]} material={bodyMaterial}>
        <capsuleGeometry args={[0.05, 0.45, 6, 12]} />
      </mesh>

      {/* Right arm */}
      <mesh position={[0.3, 1.1, 0]} rotation={[0, 0, -0.15]} material={bodyMaterial}>
        <capsuleGeometry args={[0.05, 0.45, 6, 12]} />
      </mesh>

      {/* Left leg */}
      <mesh position={[-0.1, 0.45, 0]} material={bodyMaterial}>
        <capsuleGeometry args={[0.07, 0.5, 6, 12]} />
      </mesh>

      {/* Right leg */}
      <mesh position={[0.1, 0.45, 0]} material={bodyMaterial}>
        <capsuleGeometry args={[0.07, 0.5, 6, 12]} />
      </mesh>

      {/* Limb glow */}
      <mesh position={[-0.1, 0.45, 0]} material={limbGlow}>
        <capsuleGeometry args={[0.1, 0.5, 6, 12]} />
      </mesh>
      <mesh position={[0.1, 0.45, 0]} material={limbGlow}>
        <capsuleGeometry args={[0.1, 0.5, 6, 12]} />
      </mesh>
    </group>
  )
}
