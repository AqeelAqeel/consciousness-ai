import { useRef, useMemo } from 'react'
import { useFrame } from '@react-three/fiber'
import * as THREE from 'three'
import { useStore } from '../store/useStore'
import { useYeetStore } from '../store/useYeetStore'
import { BodyPartId, PartState } from '../engine/bodyTypes'

// ── Geometry constants ──

const METALNESS = 0.6
const ROUGHNESS = 0.4
const JOINT_RADIUS = 0.025
const JOINT_COLOR = '#667788'

// Rest offsets: position of each child group relative to its parent
// These define the skeleton hierarchy spacing
const REST = {
  pelvis:    [0, 0.7, 0] as const,
  spine:     [0, 0.15, 0] as const,
  chest:     [0, 0.2, 0] as const,
  neck:      [0, 0.15, 0] as const,
  head:      [0, 0.12, 0] as const,
  headCrown: [0, 0.14, 0] as const,
  shoulderL: [-0.2, 0.05, 0] as const,
  shoulderR: [0.2, 0.05, 0] as const,
  upperArmL: [0, -0.12, 0] as const,
  upperArmR: [0, -0.12, 0] as const,
  forearmL:  [0, -0.2, 0] as const,
  forearmR:  [0, -0.2, 0] as const,
  handL:     [0, -0.18, 0] as const,
  handR:     [0, -0.18, 0] as const,
  hipL:      [-0.1, 0, 0] as const,
  hipR:      [0.1, 0, 0] as const,
  thighL:    [0, -0.12, 0] as const,
  thighR:    [0, -0.12, 0] as const,
  shinL:     [0, -0.25, 0] as const,
  shinR:     [0, -0.25, 0] as const,
  footL:     [0, -0.22, 0] as const,
  footR:     [0, -0.22, 0] as const,
}

// ── Helper: create materials per-part ──

function makeBodyMaterial() {
  return new THREE.MeshStandardMaterial({
    color: '#8899aa',
    metalness: METALNESS,
    roughness: ROUGHNESS,
  })
}

function makeGlowMaterial() {
  return new THREE.MeshBasicMaterial({
    color: '#4488ff',
    transparent: true,
    opacity: 0,
    side: THREE.BackSide,
  })
}

// ── Component ──

// Agent center matches what Projectile.tsx uses for collision
const AGENT_CENTER_Y = 1.5

export function MechanicalAgent() {
  // Root group ref for whole-body translation (dodge + recoil)
  const rootRef = useRef<THREE.Group>(null)

  // Dodge/evasion state
  const dodgeOffset = useRef(new THREE.Vector3(0, 0, 0))
  const dodgeTarget = useRef(new THREE.Vector3(0, 0, 0))
  const recoilVel = useRef(new THREE.Vector3(0, 0, 0))
  const lastDodgeTime = useRef(0)
  const isRecovering = useRef(false)

  // Refs for each group in the hierarchy
  const refs = useRef<Record<string, THREE.Group | null>>({})
  // Materials for each part
  const materials = useMemo(() => {
    const m: Record<string, { body: THREE.MeshStandardMaterial; glow: THREE.MeshBasicMaterial }> = {}
    const parts: BodyPartId[] = [
      'pelvis', 'spine', 'chest', 'neck', 'head', 'headCrown',
      'shoulderL', 'shoulderR', 'upperArmL', 'upperArmR',
      'forearmL', 'forearmR', 'handL', 'handR',
      'hipL', 'hipR', 'thighL', 'thighR',
      'shinL', 'shinR', 'footL', 'footR',
    ]
    for (const id of parts) {
      m[id] = { body: makeBodyMaterial(), glow: makeGlowMaterial() }
    }
    return m
  }, [])

  // Joint material (shared)
  const jointMat = useMemo(() => new THREE.MeshStandardMaterial({
    color: JOINT_COLOR,
    metalness: 0.8,
    roughness: 0.3,
  }), [])

  // Antenna tip materials
  const antennaMats = useMemo(() => [
    new THREE.MeshBasicMaterial({ color: '#44ddff', transparent: true, opacity: 0.8 }),
    new THREE.MeshBasicMaterial({ color: '#ff4488', transparent: true, opacity: 0.8 }),
    new THREE.MeshBasicMaterial({ color: '#44ff88', transparent: true, opacity: 0.8 }),
  ], [])

  const setRef = (id: string) => (el: THREE.Group | null) => { refs.current[id] = el }

  // Muscle fiber materials (additional visual layer for musculoskeletal activation)
  const muscleMats = useMemo(() => {
    const m: Record<string, THREE.MeshBasicMaterial> = {}
    const parts: BodyPartId[] = [
      'pelvis', 'spine', 'chest', 'neck', 'head', 'headCrown',
      'shoulderL', 'shoulderR', 'upperArmL', 'upperArmR',
      'forearmL', 'forearmR', 'handL', 'handR',
      'hipL', 'hipR', 'thighL', 'thighR',
      'shinL', 'shinR', 'footL', 'footR',
    ]
    for (const id of parts) {
      m[id] = new THREE.MeshBasicMaterial({
        color: '#ff4400',
        transparent: true,
        opacity: 0,
        wireframe: true,
        side: THREE.FrontSide,
      })
    }
    return m
  }, [])

  // ── Animation loop ──
  useFrame(() => {
    const bodyState = useStore.getState().bodyState
    const time = Date.now() * 0.001

    for (const partId of Object.keys(bodyState) as BodyPartId[]) {
      const group = refs.current[partId]
      if (!group) continue

      const ps: PartState = bodyState[partId]
      const rest = REST[partId]
      const speed = 3 + ps.tension * 8

      // Target position = rest + offset
      const tx = rest[0] + ps.offset[0]
      const ty = rest[1] + ps.offset[1]
      const tz = rest[2] + ps.offset[2]

      // Lerp position
      group.position.x = THREE.MathUtils.lerp(group.position.x, tx, 0.05 * speed)
      group.position.y = THREE.MathUtils.lerp(group.position.y, ty, 0.05 * speed)
      group.position.z = THREE.MathUtils.lerp(group.position.z, tz, 0.05 * speed)

      // Lerp rotation + tremor
      const tremor = ps.tremor * Math.sin(time * (8 + Math.random() * 2)) * 0.03
      group.rotation.x = THREE.MathUtils.lerp(group.rotation.x, ps.rotation[0] + tremor, 0.05 * speed)
      group.rotation.y = THREE.MathUtils.lerp(group.rotation.y, ps.rotation[1], 0.05 * speed)
      group.rotation.z = THREE.MathUtils.lerp(group.rotation.z, ps.rotation[2] + tremor * 0.5, 0.05 * speed)

      // Update materials
      const mat = materials[partId]
      if (mat) {
        mat.body.color.lerp(new THREE.Color(ps.color), 0.08)
        mat.glow.opacity = THREE.MathUtils.lerp(mat.glow.opacity, ps.glow * 0.5, 0.08)
        mat.glow.color.set(ps.glowColor)
      }

      // Update muscle fiber overlay (shows musculoskeletal activation)
      const muscleMat = muscleMats[partId]
      if (muscleMat) {
        // Muscle activation visible when tension + glow combine
        const muscleActivation = ps.tension * 0.4 + ps.glow * 0.6
        const pulse = Math.sin(time * 4 + partId.length) * 0.3 + 0.7
        const targetOpacity = muscleActivation > 0.2 ? muscleActivation * 0.35 * pulse : 0
        muscleMat.opacity = THREE.MathUtils.lerp(muscleMat.opacity, targetOpacity, 0.1)

        // Color shifts: red for tension, blue for cognitive glow, orange for motor
        if (ps.tension > 0.5) {
          muscleMat.color.lerp(new THREE.Color('#ff3322'), 0.1)
        } else if (ps.glow > 0.3) {
          muscleMat.color.lerp(new THREE.Color(ps.glowColor), 0.08)
        } else {
          muscleMat.color.lerp(new THREE.Color('#ff6644'), 0.05)
        }
      }
    }

    // Antenna tip pulse
    const crownState = bodyState.headCrown
    for (let i = 0; i < antennaMats.length; i++) {
      const pulse = Math.sin(time * 3 + i * 2.1) * 0.5 + 0.5
      antennaMats[i].opacity = 0.3 + crownState.glow * pulse * 0.7
      antennaMats[i].color.set(crownState.glowColor)
    }
  })

  // ── JSX hierarchy matching skeleton ──
  // pelvis → spine → chest → neck → head → headCrown
  //                        → shoulderL → upperArmL → forearmL → handL
  //                        → shoulderR → upperArmR → forearmR → handR
  //        → hipL → thighL → shinL → footL
  //        → hipR → thighR → shinR → footR

  return (
    <group scale={1.5}>
    <group ref={setRef('pelvis')} position={[REST.pelvis[0], REST.pelvis[1], REST.pelvis[2]]}>
      {/* Pelvis geometry */}
      <mesh material={materials.pelvis.body}>
        <boxGeometry args={[0.24, 0.1, 0.14]} />
      </mesh>
      <mesh material={materials.pelvis.glow} scale={1.15}>
        <boxGeometry args={[0.24, 0.1, 0.14]} />
      </mesh>
      <mesh material={muscleMats.pelvis} scale={1.08}>
        <boxGeometry args={[0.24, 0.1, 0.14]} />
      </mesh>

      {/* ── Spine ── */}
      <group ref={setRef('spine')} position={[REST.spine[0], REST.spine[1], REST.spine[2]]}>
        <mesh material={materials.spine.body}>
          <cylinderGeometry args={[0.06, 0.08, 0.14, 6]} />
        </mesh>
        <mesh material={materials.spine.glow} scale={1.2}>
          <cylinderGeometry args={[0.06, 0.08, 0.14, 6]} />
        </mesh>
        <mesh material={muscleMats.spine} scale={1.12}>
          <cylinderGeometry args={[0.06, 0.08, 0.14, 6]} />
        </mesh>

        {/* ── Chest ── */}
        <group ref={setRef('chest')} position={[REST.chest[0], REST.chest[1], REST.chest[2]]}>
          <mesh material={materials.chest.body}>
            <boxGeometry args={[0.3, 0.22, 0.16]} />
          </mesh>
          <mesh material={materials.chest.glow} scale={1.1}>
            <boxGeometry args={[0.3, 0.22, 0.16]} />
          </mesh>
          <mesh material={muscleMats.chest} scale={1.06}>
            <boxGeometry args={[0.3, 0.22, 0.16]} />
          </mesh>
          {/* Chest detail: center plate */}
          <mesh position={[0, 0, 0.082]}>
            <boxGeometry args={[0.12, 0.14, 0.005]} />
            <meshStandardMaterial color="#556677" metalness={0.9} roughness={0.2} />
          </mesh>

          {/* ── Neck ── */}
          <group ref={setRef('neck')} position={[REST.neck[0], REST.neck[1], REST.neck[2]]}>
            <mesh material={materials.neck.body}>
              <cylinderGeometry args={[0.04, 0.05, 0.1, 6]} />
            </mesh>
            <mesh material={muscleMats.neck} scale={1.15}>
              <cylinderGeometry args={[0.04, 0.05, 0.1, 6]} />
            </mesh>
            {/* Neck joint ring */}
            <mesh rotation={[Math.PI / 2, 0, 0]}>
              <torusGeometry args={[0.05, 0.008, 8, 16]} />
              <meshStandardMaterial color={JOINT_COLOR} metalness={0.8} roughness={0.3} />
            </mesh>

            {/* ── Head ── */}
            <group ref={setRef('head')} position={[REST.head[0], REST.head[1], REST.head[2]]}>
              <mesh material={materials.head.body}>
                <icosahedronGeometry args={[0.12, 1]} />
              </mesh>
              <mesh material={materials.head.glow} scale={1.15}>
                <icosahedronGeometry args={[0.12, 1]} />
              </mesh>
              <mesh material={muscleMats.head} scale={1.1}>
                <icosahedronGeometry args={[0.12, 1]} />
              </mesh>
              {/* Visor */}
              <mesh position={[0, 0.01, 0.09]} rotation={[0.1, 0, 0]}>
                <boxGeometry args={[0.16, 0.045, 0.02]} />
                <meshBasicMaterial color="#44ddff" transparent opacity={0.6} />
              </mesh>
              {/* Left eye */}
              <mesh position={[-0.04, 0.015, 0.11]}>
                <sphereGeometry args={[0.015, 8, 8]} />
                <meshBasicMaterial color="#ffffff" transparent opacity={0.9} />
              </mesh>
              {/* Right eye */}
              <mesh position={[0.04, 0.015, 0.11]}>
                <sphereGeometry args={[0.015, 8, 8]} />
                <meshBasicMaterial color="#ffffff" transparent opacity={0.9} />
              </mesh>
              {/* Jaw / chin plate */}
              <mesh position={[0, -0.06, 0.07]} rotation={[0.3, 0, 0]}>
                <boxGeometry args={[0.09, 0.025, 0.04]} />
                <meshStandardMaterial color="#667788" metalness={0.8} roughness={0.3} />
              </mesh>
              {/* Cheek plates */}
              <mesh position={[-0.08, -0.01, 0.06]} rotation={[0, 0.3, 0]}>
                <boxGeometry args={[0.03, 0.04, 0.02]} />
                <meshStandardMaterial color="#778899" metalness={0.7} roughness={0.4} />
              </mesh>
              <mesh position={[0.08, -0.01, 0.06]} rotation={[0, -0.3, 0]}>
                <boxGeometry args={[0.03, 0.04, 0.02]} />
                <meshStandardMaterial color="#778899" metalness={0.7} roughness={0.4} />
              </mesh>

              {/* ── HeadCrown (antennae array) ── */}
              <group ref={setRef('headCrown')} position={[REST.headCrown[0], REST.headCrown[1], REST.headCrown[2]]}>
                {/* Base ring */}
                <mesh rotation={[Math.PI / 2, 0, 0]}>
                  <torusGeometry args={[0.06, 0.008, 8, 16]} />
                  <meshStandardMaterial color="#667788" metalness={0.9} roughness={0.2} />
                </mesh>
                {/* Antenna 1 — center */}
                <group position={[0, 0, 0]}>
                  <mesh position={[0, 0.06, 0]}>
                    <coneGeometry args={[0.008, 0.12, 6]} />
                    <meshStandardMaterial color="#778899" metalness={0.7} roughness={0.3} />
                  </mesh>
                  <mesh position={[0, 0.125, 0]} material={antennaMats[0]}>
                    <sphereGeometry args={[0.015, 12, 12]} />
                  </mesh>
                </group>
                {/* Antenna 2 — left */}
                <group position={[-0.04, 0, 0]} rotation={[0, 0, 0.2]}>
                  <mesh position={[0, 0.05, 0]}>
                    <coneGeometry args={[0.006, 0.1, 6]} />
                    <meshStandardMaterial color="#778899" metalness={0.7} roughness={0.3} />
                  </mesh>
                  <mesh position={[0, 0.105, 0]} material={antennaMats[1]}>
                    <sphereGeometry args={[0.012, 12, 12]} />
                  </mesh>
                </group>
                {/* Antenna 3 — right */}
                <group position={[0.04, 0, 0]} rotation={[0, 0, -0.2]}>
                  <mesh position={[0, 0.05, 0]}>
                    <coneGeometry args={[0.006, 0.1, 6]} />
                    <meshStandardMaterial color="#778899" metalness={0.7} roughness={0.3} />
                  </mesh>
                  <mesh position={[0, 0.105, 0]} material={antennaMats[2]}>
                    <sphereGeometry args={[0.012, 12, 12]} />
                  </mesh>
                </group>
              </group>
            </group>
          </group>

          {/* ── Left Shoulder → Arm chain ── */}
          <group ref={setRef('shoulderL')} position={[REST.shoulderL[0], REST.shoulderL[1], REST.shoulderL[2]]}>
            <mesh material={jointMat}>
              <sphereGeometry args={[JOINT_RADIUS, 12, 12]} />
            </mesh>
            <group ref={setRef('upperArmL')} position={[REST.upperArmL[0], REST.upperArmL[1], REST.upperArmL[2]]}>
              <mesh material={materials.upperArmL.body}>
                <cylinderGeometry args={[0.035, 0.03, 0.2, 6]} />
              </mesh>
              <mesh material={materials.upperArmL.glow} scale={1.3}>
                <cylinderGeometry args={[0.035, 0.03, 0.2, 6]} />
              </mesh>
              <mesh material={muscleMats.upperArmL} scale={1.15}>
                <cylinderGeometry args={[0.035, 0.03, 0.2, 6]} />
              </mesh>
              {/* Elbow joint */}
              <group ref={setRef('forearmL')} position={[REST.forearmL[0], REST.forearmL[1], REST.forearmL[2]]}>
                <mesh material={jointMat} position={[0, 0.1, 0]}>
                  <torusGeometry args={[0.03, 0.006, 8, 12]} />
                </mesh>
                <mesh material={materials.forearmL.body}>
                  <cylinderGeometry args={[0.03, 0.025, 0.18, 6]} />
                </mesh>
                <mesh material={materials.forearmL.glow} scale={1.3}>
                  <cylinderGeometry args={[0.03, 0.025, 0.18, 6]} />
                </mesh>
                <mesh material={muscleMats.forearmL} scale={1.15}>
                  <cylinderGeometry args={[0.03, 0.025, 0.18, 6]} />
                </mesh>
                <group ref={setRef('handL')} position={[REST.handL[0], REST.handL[1], REST.handL[2]]}>
                  <mesh material={materials.handL.body}>
                    <boxGeometry args={[0.05, 0.06, 0.03]} />
                  </mesh>
                  <mesh material={materials.handL.glow} scale={1.2}>
                    <boxGeometry args={[0.05, 0.06, 0.03]} />
                  </mesh>
                  <mesh material={muscleMats.handL} scale={1.1}>
                    <boxGeometry args={[0.05, 0.06, 0.03]} />
                  </mesh>
                </group>
              </group>
            </group>
          </group>

          {/* ── Right Shoulder → Arm chain ── */}
          <group ref={setRef('shoulderR')} position={[REST.shoulderR[0], REST.shoulderR[1], REST.shoulderR[2]]}>
            <mesh material={jointMat}>
              <sphereGeometry args={[JOINT_RADIUS, 12, 12]} />
            </mesh>
            <group ref={setRef('upperArmR')} position={[REST.upperArmR[0], REST.upperArmR[1], REST.upperArmR[2]]}>
              <mesh material={materials.upperArmR.body}>
                <cylinderGeometry args={[0.035, 0.03, 0.2, 6]} />
              </mesh>
              <mesh material={materials.upperArmR.glow} scale={1.3}>
                <cylinderGeometry args={[0.035, 0.03, 0.2, 6]} />
              </mesh>
              <mesh material={muscleMats.upperArmR} scale={1.15}>
                <cylinderGeometry args={[0.035, 0.03, 0.2, 6]} />
              </mesh>
              <group ref={setRef('forearmR')} position={[REST.forearmR[0], REST.forearmR[1], REST.forearmR[2]]}>
                <mesh material={jointMat} position={[0, 0.1, 0]}>
                  <torusGeometry args={[0.03, 0.006, 8, 12]} />
                </mesh>
                <mesh material={materials.forearmR.body}>
                  <cylinderGeometry args={[0.03, 0.025, 0.18, 6]} />
                </mesh>
                <mesh material={materials.forearmR.glow} scale={1.3}>
                  <cylinderGeometry args={[0.03, 0.025, 0.18, 6]} />
                </mesh>
                <mesh material={muscleMats.forearmR} scale={1.15}>
                  <cylinderGeometry args={[0.03, 0.025, 0.18, 6]} />
                </mesh>
                <group ref={setRef('handR')} position={[REST.handR[0], REST.handR[1], REST.handR[2]]}>
                  <mesh material={materials.handR.body}>
                    <boxGeometry args={[0.05, 0.06, 0.03]} />
                  </mesh>
                  <mesh material={materials.handR.glow} scale={1.2}>
                    <boxGeometry args={[0.05, 0.06, 0.03]} />
                  </mesh>
                  <mesh material={muscleMats.handR} scale={1.1}>
                    <boxGeometry args={[0.05, 0.06, 0.03]} />
                  </mesh>
                </group>
              </group>
            </group>
          </group>
        </group>
      </group>

      {/* ── Left Hip → Leg chain ── */}
      <group ref={setRef('hipL')} position={[REST.hipL[0], REST.hipL[1], REST.hipL[2]]}>
        <mesh material={jointMat}>
          <sphereGeometry args={[JOINT_RADIUS, 12, 12]} />
        </mesh>
        <group ref={setRef('thighL')} position={[REST.thighL[0], REST.thighL[1], REST.thighL[2]]}>
          <mesh material={materials.thighL.body}>
            <cylinderGeometry args={[0.045, 0.04, 0.25, 6]} />
          </mesh>
          <mesh material={materials.thighL.glow} scale={1.2}>
            <cylinderGeometry args={[0.045, 0.04, 0.25, 6]} />
          </mesh>
          <mesh material={muscleMats.thighL} scale={1.1}>
            <cylinderGeometry args={[0.045, 0.04, 0.25, 6]} />
          </mesh>
          <group ref={setRef('shinL')} position={[REST.shinL[0], REST.shinL[1], REST.shinL[2]]}>
            {/* Knee joint */}
            <mesh material={jointMat} position={[0, 0.12, 0]}>
              <torusGeometry args={[0.035, 0.006, 8, 12]} />
            </mesh>
            <mesh material={materials.shinL.body}>
              <cylinderGeometry args={[0.035, 0.03, 0.22, 6]} />
            </mesh>
            <mesh material={materials.shinL.glow} scale={1.2}>
              <cylinderGeometry args={[0.035, 0.03, 0.22, 6]} />
            </mesh>
            <mesh material={muscleMats.shinL} scale={1.1}>
              <cylinderGeometry args={[0.035, 0.03, 0.22, 6]} />
            </mesh>
            <group ref={setRef('footL')} position={[REST.footL[0], REST.footL[1], REST.footL[2]]}>
              <mesh material={materials.footL.body} position={[0, 0, 0.02]}>
                <boxGeometry args={[0.06, 0.03, 0.1]} />
              </mesh>
              <mesh material={materials.footL.glow} scale={1.2} position={[0, 0, 0.02]}>
                <boxGeometry args={[0.06, 0.03, 0.1]} />
              </mesh>
              <mesh material={muscleMats.footL} scale={1.1} position={[0, 0, 0.02]}>
                <boxGeometry args={[0.06, 0.03, 0.1]} />
              </mesh>
            </group>
          </group>
        </group>
      </group>

      {/* ── Right Hip → Leg chain ── */}
      <group ref={setRef('hipR')} position={[REST.hipR[0], REST.hipR[1], REST.hipR[2]]}>
        <mesh material={jointMat}>
          <sphereGeometry args={[JOINT_RADIUS, 12, 12]} />
        </mesh>
        <group ref={setRef('thighR')} position={[REST.thighR[0], REST.thighR[1], REST.thighR[2]]}>
          <mesh material={materials.thighR.body}>
            <cylinderGeometry args={[0.045, 0.04, 0.25, 6]} />
          </mesh>
          <mesh material={materials.thighR.glow} scale={1.2}>
            <cylinderGeometry args={[0.045, 0.04, 0.25, 6]} />
          </mesh>
          <mesh material={muscleMats.thighR} scale={1.1}>
            <cylinderGeometry args={[0.045, 0.04, 0.25, 6]} />
          </mesh>
          <group ref={setRef('shinR')} position={[REST.shinR[0], REST.shinR[1], REST.shinR[2]]}>
            <mesh material={jointMat} position={[0, 0.12, 0]}>
              <torusGeometry args={[0.035, 0.006, 8, 12]} />
            </mesh>
            <mesh material={materials.shinR.body}>
              <cylinderGeometry args={[0.035, 0.03, 0.22, 6]} />
            </mesh>
            <mesh material={materials.shinR.glow} scale={1.2}>
              <cylinderGeometry args={[0.035, 0.03, 0.22, 6]} />
            </mesh>
            <mesh material={muscleMats.shinR} scale={1.1}>
              <cylinderGeometry args={[0.035, 0.03, 0.22, 6]} />
            </mesh>
            <group ref={setRef('footR')} position={[REST.footR[0], REST.footR[1], REST.footR[2]]}>
              <mesh material={materials.footR.body} position={[0, 0, 0.02]}>
                <boxGeometry args={[0.06, 0.03, 0.1]} />
              </mesh>
              <mesh material={materials.footR.glow} scale={1.2} position={[0, 0, 0.02]}>
                <boxGeometry args={[0.06, 0.03, 0.1]} />
              </mesh>
              <mesh material={muscleMats.footR} scale={1.1} position={[0, 0, 0.02]}>
                <boxGeometry args={[0.06, 0.03, 0.1]} />
              </mesh>
            </group>
          </group>
        </group>
      </group>
    </group>
    </group>
  )
}
