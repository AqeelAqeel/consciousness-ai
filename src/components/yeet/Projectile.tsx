import { useRef, useMemo } from 'react'
import { useFrame } from '@react-three/fiber'
import * as THREE from 'three'
import { useYeetStore, type ProjectileData } from '../../store/useYeetStore'
import { useStore } from '../../store/useStore'

interface ProjectileProps {
  data: ProjectileData
}

// Agent scaled 1.5x: torso at y=1.65, head at y=2.5, overall center ~y=1.5
const AGENT_CENTER = new THREE.Vector3(0, 1.5, 0)
const HIT_RADIUS = 0.65

export function Projectile({ data }: ProjectileProps) {
  const groupRef = useRef<THREE.Group>(null)
  const velRef = useRef(new THREE.Vector3(...data.velocity))
  const hasHitRef = useRef(false)
  const lifeRef = useRef(6)

  const removeProjectile = useYeetStore((s) => s.removeProjectile)
  const registerHit = useYeetStore((s) => s.registerHit)

  useFrame((_, delta) => {
    if (!groupRef.current) return
    const d = Math.min(delta, 0.05)

    // Gravity
    velRef.current.y -= data.gravity * d

    // Move
    groupRef.current.position.x += velRef.current.x * d
    groupRef.current.position.y += velRef.current.y * d
    groupRef.current.position.z += velRef.current.z * d

    // Spin
    if (data.spin > 0) {
      groupRef.current.rotation.x += data.spin * d
      groupRef.current.rotation.z += data.spin * d * 0.7
    }

    // Collision with Agent (centered at y=1.0, radius ~0.45)
    if (!hasHitRef.current) {
      const pos = groupRef.current.position
      const dist = pos.distanceTo(AGENT_CENTER)

      if (dist < HIT_RADIUS + data.radius) {
        hasHitRef.current = true
        registerHit()

        // Spike threat in the consciousness store
        const consciousnessState = useStore.getState()
        const impactIntensity = Math.min(1, 0.3 + data.mass * 0.1)

        // Learned threat bias makes the agent more reactive over time
        const learnedBias = consciousnessState.getLearnedThreatBias()
        const threatSpike = 0.15 * data.mass * (1 + learnedBias * 0.5) // learned amplification

        consciousnessState.setState({
          threat: Math.min(1, consciousnessState.state.threat + threatSpike),
        })

        // Register impact for brain region chain reaction
        consciousnessState.registerImpact(impactIntensity, 'projectile')

        // Register learning — the agent accumulates knowledge about this projectile type
        consciousnessState.registerProjectileHit(data.type, data.mass)

        // Set impact direction
        const dir = pos.clone().sub(AGENT_CENTER).normalize()
        useYeetStore.setState({ impactDirection: [dir.x, dir.y, dir.z] })

        // Deflect
        velRef.current.multiplyScalar(-0.2)
        velRef.current.y = Math.abs(velRef.current.y) + 0.5
      }
    }

    // Ground
    if (groupRef.current.position.y < 0) {
      groupRef.current.position.y = 0
      velRef.current.y = Math.abs(velRef.current.y) * 0.2
      velRef.current.x *= 0.6
      velRef.current.z *= 0.6
      if (Math.abs(velRef.current.y) < 0.05) velRef.current.y = 0
    }

    // Out of bounds
    if (Math.abs(groupRef.current.position.x) > 10 || Math.abs(groupRef.current.position.z) > 10) {
      removeProjectile(data.id)
      return
    }

    lifeRef.current -= d
    if (lifeRef.current <= 0) {
      removeProjectile(data.id)
    }
  })

  return (
    <group ref={groupRef} position={data.position} scale={data.scale}>
      <ProjectileMesh type={data.type} />
    </group>
  )
}

function ProjectileMesh({ type }: { type: ProjectileData['type'] }) {
  switch (type) {
    case 'baseball':
      return <BaseballMesh />
    case 'bowling':
      return <BowlingMesh />
    case 'watermelon':
      return <WatermelonMesh />
    case 'anvil':
      return <AnvilMesh />
    case 'fish':
      return <FishMesh />
  }
}

function BaseballMesh() {
  return (
    <group>
      <mesh castShadow>
        <sphereGeometry args={[0.18, 12, 12]} />
        <meshStandardMaterial color="#f5f5dc" roughness={0.6} />
      </mesh>
      <mesh>
        <torusGeometry args={[0.15, 0.015, 4, 16]} />
        <meshStandardMaterial color="#cc0000" roughness={0.5} />
      </mesh>
    </group>
  )
}

function BowlingMesh() {
  const holes = useMemo(() => [0, 1, 2].map((i) => ({
    pos: [Math.cos(i * 0.8) * 0.2, 0.38, Math.sin(i * 0.8) * 0.2] as [number, number, number],
  })), [])

  return (
    <group>
      <mesh castShadow>
        <sphereGeometry args={[0.45, 16, 16]} />
        <meshStandardMaterial color="#1a1a1a" roughness={0.15} metalness={0.7} />
      </mesh>
      {holes.map((h, i) => (
        <mesh key={i} position={h.pos} rotation={[Math.PI * 0.1, 0, 0]}>
          <cylinderGeometry args={[0.06, 0.06, 0.1, 8]} />
          <meshStandardMaterial color="#333333" />
        </mesh>
      ))}
    </group>
  )
}

function WatermelonMesh() {
  return (
    <group>
      <mesh castShadow scale={[1, 0.8, 1]}>
        <sphereGeometry args={[0.5, 12, 12]} />
        <meshStandardMaterial color="#2d6a2d" roughness={0.7} />
      </mesh>
    </group>
  )
}

function AnvilMesh() {
  return (
    <group>
      <mesh castShadow>
        <boxGeometry args={[0.8, 0.3, 0.5]} />
        <meshStandardMaterial color="#444444" roughness={0.4} metalness={0.9} />
      </mesh>
      <mesh position={[0, 0.25, 0]} castShadow>
        <boxGeometry args={[1.0, 0.2, 0.4]} />
        <meshStandardMaterial color="#555555" roughness={0.3} metalness={0.9} />
      </mesh>
    </group>
  )
}

function FishMesh() {
  return (
    <group>
      <mesh castShadow rotation={[0, 0, Math.PI / 2]}>
        <capsuleGeometry args={[0.15, 0.6, 4, 8]} />
        <meshStandardMaterial color="#4488cc" roughness={0.4} metalness={0.3} />
      </mesh>
      <mesh rotation={[0, 0, Math.PI / 2]} position={[-0.5, 0, 0]}>
        <coneGeometry args={[0.25, 0.3, 4]} />
        <meshStandardMaterial color="#3377bb" roughness={0.4} />
      </mesh>
    </group>
  )
}
