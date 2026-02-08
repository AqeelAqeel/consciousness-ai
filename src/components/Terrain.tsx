import { useRef, useMemo } from 'react'
import { useFrame } from '@react-three/fiber'
import * as THREE from 'three'
import { useStore } from '../store/useStore'

// ── Terrain ground with sine-based hills ──

function Ground() {
  const meshRef = useRef<THREE.Mesh>(null)
  const state = useStore((s) => s.state)

  const geometry = useMemo(() => {
    const geo = new THREE.PlaneGeometry(14, 14, 48, 48)
    const pos = geo.getAttribute('position')
    for (let i = 0; i < pos.count; i++) {
      const x = pos.getX(i)
      const y = pos.getY(i)
      const z =
        Math.sin(x * 0.8) * Math.cos(y * 0.6) * 0.15 +
        Math.sin(x * 1.5 + y * 1.2) * 0.08 +
        Math.cos(y * 0.9 + 1.0) * 0.1
      pos.setZ(i, z)
    }
    geo.computeVertexNormals()
    return geo
  }, [])

  const material = useMemo(() => new THREE.MeshStandardMaterial({
    color: '#0c0c18',
    roughness: 0.95,
    metalness: 0.05,
    transparent: true,
    opacity: 0.9,
  }), [])

  useFrame(() => {
    const threat = state.threat
    const r = 0.047 + threat * 0.04
    const g = 0.047 - threat * 0.02
    const b = 0.094 - threat * 0.04
    material.color.setRGB(r, g, b)
  })

  return (
    <mesh ref={meshRef} geometry={geometry} material={material} rotation={[-Math.PI / 2, 0, 0]} position={[0, -0.02, 0]} receiveShadow />
  )
}

// ── Grid overlay ──

function GridOverlay() {
  const wireGeo = useMemo(() => {
    const geo = new THREE.PlaneGeometry(14, 14, 28, 28)
    const pos = geo.getAttribute('position')
    for (let i = 0; i < pos.count; i++) {
      const x = pos.getX(i)
      const y = pos.getY(i)
      const z =
        Math.sin(x * 0.8) * Math.cos(y * 0.6) * 0.15 +
        Math.sin(x * 1.5 + y * 1.2) * 0.08 +
        Math.cos(y * 0.9 + 1.0) * 0.1
      pos.setZ(i, z + 0.005)
    }
    return geo
  }, [])

  return (
    <mesh geometry={wireGeo} rotation={[-Math.PI / 2, 0, 0]} position={[0, -0.01, 0]}>
      <meshBasicMaterial color="#223344" wireframe transparent opacity={0.12} />
    </mesh>
  )
}

// ── Monoliths ──

function Monoliths() {
  const groupRef = useRef<THREE.Group>(null)
  const stimulusActive = useStore((s) => s.stimulusActive)
  const state = useStore((s) => s.state)

  const monoliths = useMemo(() => [
    { pos: [-4, 0.8, -3] as const, scale: [0.15, 1.6, 0.08] as const },
    { pos: [5, 0.6, -2.5] as const, scale: [0.1, 1.2, 0.06] as const },
    { pos: [-2.5, 0.5, -5] as const, scale: [0.08, 1.0, 0.1] as const },
    { pos: [3, 0.7, -4.5] as const, scale: [0.12, 1.4, 0.07] as const },
  ], [])

  const material = useMemo(() => new THREE.MeshStandardMaterial({
    color: '#1a1a2e',
    metalness: 0.7,
    roughness: 0.3,
    emissive: '#111122',
    emissiveIntensity: 0,
  }), [])

  useFrame(() => {
    if (!stimulusActive) {
      material.emissiveIntensity = THREE.MathUtils.lerp(material.emissiveIntensity, 0, 0.05)
      return
    }
    const pulse = Math.sin(Date.now() * 0.002) * 0.5 + 0.5
    material.emissiveIntensity = pulse * 0.3 + state.threat * 0.2
    const t = state.threat
    material.emissive.setRGB(0.1 + t * 0.15, 0.1 - t * 0.05, 0.15 - t * 0.1)
  })

  return (
    <group ref={groupRef}>
      {monoliths.map((m, i) => (
        <mesh key={i} position={[m.pos[0], m.pos[1], m.pos[2]]} material={material}>
          <boxGeometry args={[m.scale[0], m.scale[1], m.scale[2]]} />
        </mesh>
      ))}
    </group>
  )
}

// ── Scatter objects (small icosahedrons on terrain) ──

function ScatterObjects() {
  const objects = useMemo(() => {
    const items: { pos: [number, number, number]; scale: number; color: string }[] = []
    for (let i = 0; i < 10; i++) {
      const x = (Math.random() - 0.5) * 10
      const z = (Math.random() - 0.5) * 10 - 1
      const y =
        Math.sin(x * 0.8) * Math.cos(z * 0.6) * 0.15 +
        Math.sin(x * 1.5 + z * 1.2) * 0.08 +
        Math.cos(z * 0.9 + 1.0) * 0.1
      items.push({
        pos: [x, y + 0.03, z],
        scale: 0.02 + Math.random() * 0.03,
        color: `hsl(${200 + Math.random() * 60}, 30%, ${15 + Math.random() * 10}%)`,
      })
    }
    return items
  }, [])

  return (
    <>
      {objects.map((obj, i) => (
        <mesh key={i} position={obj.pos}>
          <icosahedronGeometry args={[obj.scale, 0]} />
          <meshStandardMaterial color={obj.color} metalness={0.5} roughness={0.5} />
        </mesh>
      ))}
    </>
  )
}

// ── Particles ──

function Particles() {
  const state = useStore((s) => s.state)

  const { geometry, count } = useMemo(() => {
    const cnt = 300
    const positions = new Float32Array(cnt * 3)
    for (let i = 0; i < cnt; i++) {
      positions[i * 3] = (Math.random() - 0.5) * 16
      positions[i * 3 + 1] = Math.random() * 6
      positions[i * 3 + 2] = (Math.random() - 0.5) * 16
    }
    const geo = new THREE.BufferGeometry()
    geo.setAttribute('position', new THREE.BufferAttribute(positions, 3))
    return { geometry: geo, count: cnt }
  }, [])

  useFrame(() => {
    const posAttr = geometry.getAttribute('position') as THREE.BufferAttribute
    const energy = state.energy
    for (let i = 0; i < count; i++) {
      posAttr.array[i * 3 + 1] += 0.002 * (0.5 + energy * 0.5)
      if (posAttr.array[i * 3 + 1] > 6) posAttr.array[i * 3 + 1] = 0
    }
    posAttr.needsUpdate = true
  })

  return (
    <points geometry={geometry}>
      <pointsMaterial
        size={0.012}
        color="#6688bb"
        transparent
        opacity={0.2}
        sizeAttenuation
      />
    </points>
  )
}

// ── Lights (state-reactive) ──

function Lights() {
  const lightRef = useRef<THREE.PointLight>(null)
  const ambientRef = useRef<THREE.AmbientLight>(null)
  const state = useStore((s) => s.state)
  const interpretation = useStore((s) => s.interpretation)

  useFrame(() => {
    const threat = interpretation?.perceivedThreat ?? 0
    const energy = state.energy

    if (lightRef.current) {
      lightRef.current.color.setRGB(
        0.9 + threat * 0.1,
        0.85 - threat * 0.4,
        0.9 - threat * 0.5,
      )
      lightRef.current.intensity = 1.5 + threat * 2
    }

    if (ambientRef.current) {
      ambientRef.current.intensity = 0.15 + energy * 0.1 - threat * 0.05
      ambientRef.current.color.setRGB(
        0.3 + threat * 0.2,
        0.3 - threat * 0.1,
        0.4 - threat * 0.15,
      )
    }
  })

  return (
    <>
      <ambientLight ref={ambientRef} intensity={0.2} color="#445566" />
      <pointLight
        ref={lightRef}
        position={[2, 3, 2]}
        intensity={2}
        color="#dde0f0"
        distance={16}
        decay={2}
      />
      <pointLight
        position={[-3, 2.5, -1]}
        intensity={0.5}
        color="#4466aa"
        distance={12}
        decay={2}
      />
      <pointLight
        position={[0, 1, -4]}
        intensity={0.8}
        color="#6644aa"
        distance={10}
        decay={2}
      />
    </>
  )
}

// ── Main Terrain export ──

export function Terrain() {
  return (
    <>
      <Lights />
      <Ground />
      <GridOverlay />
      <Monoliths />
      <ScatterObjects />
      <Particles />
      <fog attach="fog" args={['#060610', 3, 18]} />
    </>
  )
}
