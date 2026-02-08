import { useRef, useMemo } from 'react'
import { useFrame } from '@react-three/fiber'
import * as THREE from 'three'
import { useYeetStore, type ProjectileData } from '../../store/useYeetStore'
import { useStore } from '../../store/useStore'

interface ProjectileProps {
  data: ProjectileData
}

const HIT_RADIUS = 0.55

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

    // Get actual agent position from shared store (updated by MechanicalAgent each frame)
    const agentPos = useYeetStore.getState().agentPosition
    const agentCenter = new THREE.Vector3(agentPos[0], agentPos[1], agentPos[2])

    // Collision with Agent (using actual dodge position)
    if (!hasHitRef.current) {
      const pos = groupRef.current.position
      const dist = pos.distanceTo(agentCenter)

      if (dist < HIT_RADIUS + data.radius) {
        hasHitRef.current = true
        registerHit()

        const consciousnessState = useStore.getState()
        const impactIntensity = Math.min(1, 0.2 + data.mass * 0.1)

        // Register impact for brain region chain reaction
        consciousnessState.registerImpact(impactIntensity, 'projectile')

        // Register learning — handles ISV push, learned patterns, associations, and LLM thoughts
        consciousnessState.registerProjectileHit(data.type, data.mass)

        // Set impact direction + mass for physical recoil
        const dir = pos.clone().sub(agentCenter).normalize()
        useYeetStore.setState({ 
          impactDirection: [dir.x, dir.y, dir.z],
          lastImpactMass: data.mass,
        })

        // Deflect — heavier objects bounce less
        const bounceFactor = Math.max(0.05, 0.3 - data.mass * 0.03)
        velRef.current.multiplyScalar(-bounceFactor)
        velRef.current.y = Math.abs(velRef.current.y) + 0.3
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
      {/* Glow aura so projectile is visible in dark scene */}
      <mesh>
        <sphereGeometry args={[0.35, 8, 8]} />
        <meshBasicMaterial
          color={PROJECTILE_GLOW[data.type] || '#ffaa33'}
          transparent
          opacity={0.15}
          side={THREE.BackSide}
        />
      </mesh>
      {/* Point light on projectile */}
      <pointLight
        color={PROJECTILE_GLOW[data.type] || '#ffaa33'}
        intensity={1.5}
        distance={3}
        decay={2}
      />
    </group>
  )
}

const PROJECTILE_GLOW: Record<string, string> = {
  baseball: '#ffffcc',
  bowling: '#8866ff',
  watermelon: '#44ff66',
  anvil: '#ff6644',
  fish: '#44ccff',
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
        <sphereGeometry args={[0.22, 14, 14]} />
        <meshStandardMaterial color="#f5f5dc" roughness={0.5} emissive="#f5f5dc" emissiveIntensity={0.15} />
      </mesh>
      <mesh>
        <torusGeometry args={[0.18, 0.018, 4, 16]} />
        <meshStandardMaterial color="#cc0000" roughness={0.4} emissive="#cc0000" emissiveIntensity={0.2} />
      </mesh>
    </group>
  )
}

function BowlingMesh() {
  const holes = useMemo(() => [0, 1, 2].map((i) => ({
    pos: [Math.cos(i * 0.8) * 0.22, 0.4, Math.sin(i * 0.8) * 0.22] as [number, number, number],
  })), [])

  return (
    <group>
      <mesh castShadow>
        <sphereGeometry args={[0.45, 16, 16]} />
        <meshStandardMaterial color="#2a1a3e" roughness={0.15} metalness={0.8} emissive="#4422aa" emissiveIntensity={0.2} />
      </mesh>
      {holes.map((h, i) => (
        <mesh key={i} position={h.pos} rotation={[Math.PI * 0.1, 0, 0]}>
          <cylinderGeometry args={[0.06, 0.06, 0.1, 8]} />
          <meshStandardMaterial color="#111111" />
        </mesh>
      ))}
    </group>
  )
}

function WatermelonMesh() {
  return (
    <group>
      <mesh castShadow scale={[1, 0.8, 1]}>
        <sphereGeometry args={[0.5, 14, 14]} />
        <meshStandardMaterial color="#2d7a2d" roughness={0.6} emissive="#227722" emissiveIntensity={0.15} />
      </mesh>
      {/* Inner red hint */}
      <mesh scale={[0.85, 0.65, 0.85]}>
        <sphereGeometry args={[0.5, 10, 10]} />
        <meshBasicMaterial color="#ff3355" transparent opacity={0.08} />
      </mesh>
    </group>
  )
}

function AnvilMesh() {
  return (
    <group>
      <mesh castShadow>
        <boxGeometry args={[0.8, 0.35, 0.5]} />
        <meshStandardMaterial color="#555555" roughness={0.35} metalness={0.9} emissive="#ff4400" emissiveIntensity={0.1} />
      </mesh>
      <mesh position={[0, 0.28, 0]} castShadow>
        <boxGeometry args={[1.0, 0.22, 0.4]} />
        <meshStandardMaterial color="#666666" roughness={0.3} metalness={0.9} emissive="#ff4400" emissiveIntensity={0.08} />
      </mesh>
      {/* Horn */}
      <mesh position={[-0.6, 0.1, 0]} rotation={[0, 0, 0.3]}>
        <coneGeometry args={[0.12, 0.4, 6]} />
        <meshStandardMaterial color="#555555" metalness={0.9} roughness={0.3} />
      </mesh>
    </group>
  )
}

function FishMesh() {
  return (
    <group>
      <mesh castShadow rotation={[0, 0, Math.PI / 2]}>
        <capsuleGeometry args={[0.18, 0.6, 4, 10]} />
        <meshStandardMaterial color="#4499dd" roughness={0.35} metalness={0.3} emissive="#2266cc" emissiveIntensity={0.2} />
      </mesh>
      {/* Tail */}
      <mesh rotation={[0, 0, Math.PI / 2]} position={[-0.5, 0, 0]}>
        <coneGeometry args={[0.28, 0.35, 4]} />
        <meshStandardMaterial color="#3388cc" roughness={0.4} emissive="#2266aa" emissiveIntensity={0.15} />
      </mesh>
      {/* Eye */}
      <mesh position={[0.15, 0.1, 0.17]}>
        <sphereGeometry args={[0.04, 8, 8]} />
        <meshBasicMaterial color="#ffffff" />
      </mesh>
    </group>
  )
}
