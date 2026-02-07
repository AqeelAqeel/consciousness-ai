import { useRef, useMemo } from 'react'
import { useFrame } from '@react-three/fiber'
import * as THREE from 'three'
import { useStore } from '../store/useStore'

export function BrainOverlay() {
  const brainRef = useRef<THREE.Group>(null)
  const brainRegions = useStore((s) => s.brainRegions)
  const state = useStore((s) => s.state)

  // Brain shell material
  const shellMaterial = useMemo(() => new THREE.MeshPhysicalMaterial({
    color: '#8899bb',
    transparent: true,
    opacity: 0.08,
    roughness: 0.3,
    metalness: 0.1,
    transmission: 0.9,
    thickness: 0.5,
    side: THREE.DoubleSide,
  }), [])

  // Region materials
  const regionMaterials = useMemo(() =>
    brainRegions.map((region) => new THREE.MeshBasicMaterial({
      color: region.color,
      transparent: true,
      opacity: 0,
    }))
  , []) // eslint-disable-line react-hooks/exhaustive-deps

  useFrame(() => {
    if (!brainRef.current) return

    // Subtle rotation
    brainRef.current.rotation.y += 0.001

    // Update region activations
    brainRegions.forEach((region, i) => {
      if (regionMaterials[i]) {
        const pulse = Math.sin(Date.now() * (0.003 + region.activation * 0.004) + i * 1.5) * 0.5 + 0.5
        regionMaterials[i].opacity = region.activation * (0.3 + pulse * 0.5)
        regionMaterials[i].color.set(region.color)
      }
    })

    // Shell opacity reacts to overall activation
    const totalActivation = brainRegions.reduce((sum, r) => sum + r.activation, 0) / brainRegions.length
    shellMaterial.opacity = 0.04 + totalActivation * 0.1
  })

  return (
    <group ref={brainRef} position={[0, 2.1, 0]}>
      {/* Brain shell - elongated sphere */}
      <mesh material={shellMaterial}>
        <sphereGeometry args={[0.35, 32, 32]} />
      </mesh>

      {/* Sulcus lines for brain texture */}
      <mesh>
        <torusGeometry args={[0.3, 0.005, 8, 48]} />
        <meshBasicMaterial color="#667799" transparent opacity={0.15} />
      </mesh>
      <mesh rotation={[Math.PI / 2, 0, 0]}>
        <torusGeometry args={[0.28, 0.005, 8, 48]} />
        <meshBasicMaterial color="#667799" transparent opacity={0.12} />
      </mesh>
      <mesh rotation={[0, 0, Math.PI / 2]}>
        <torusGeometry args={[0.26, 0.005, 8, 48]} />
        <meshBasicMaterial color="#667799" transparent opacity={0.1} />
      </mesh>

      {/* Brain regions as glowing orbs */}
      {brainRegions.map((region, i) => (
        <mesh key={region.id} position={region.position} material={regionMaterials[i]}>
          <sphereGeometry args={[0.06 + region.activation * 0.06, 16, 16]} />
        </mesh>
      ))}

      {/* Neural connection lines */}
      <NeuralConnections regions={brainRegions} />
    </group>
  )
}

function NeuralConnections({ regions }: { regions: ReturnType<typeof useStore.getState>['brainRegions'] }) {
  const linesRef = useRef<THREE.Group>(null)

  const connections = useMemo(() => {
    const conns: { from: number; to: number }[] = []
    for (let i = 0; i < regions.length; i++) {
      for (let j = i + 1; j < regions.length; j++) {
        conns.push({ from: i, to: j })
      }
    }
    return conns
  }, [regions.length])

  useFrame(() => {
    if (!linesRef.current) return
    linesRef.current.children.forEach((child, idx) => {
      const conn = connections[idx]
      if (!conn) return
      const fromRegion = regions[conn.from]
      const toRegion = regions[conn.to]
      const strength = Math.min(fromRegion.activation, toRegion.activation)
      const mat = (child as THREE.Line).material as THREE.LineBasicMaterial
      mat.opacity = strength * 0.3
    })
  })

  const lineObjects = useMemo(() => {
    return connections.map((conn) => {
      const from = regions[conn.from].position
      const to = regions[conn.to].position
      const points = [new THREE.Vector3(...from), new THREE.Vector3(...to)]
      const geometry = new THREE.BufferGeometry().setFromPoints(points)
      const material = new THREE.LineBasicMaterial({ color: '#6688cc', transparent: true, opacity: 0.1 })
      return new THREE.Line(geometry, material)
    })
  }, [connections, regions])

  return (
    <group ref={linesRef}>
      {lineObjects.map((obj, i) => (
        <primitive key={i} object={obj} />
      ))}
    </group>
  )
}
