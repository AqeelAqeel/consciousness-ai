import { useRef, useMemo, useCallback } from 'react'
import { useFrame, useThree } from '@react-three/fiber'
import * as THREE from 'three'
import { useStore } from '../store/useStore'

const tempPlane = new THREE.Plane(new THREE.Vector3(0, 0, 1), 0)
const tempIntersection = new THREE.Vector3()
const tempRaycaster = new THREE.Raycaster()

export function StimulusObject() {
  const meshRef = useRef<THREE.Mesh>(null)
  const groupRef = useRef<THREE.Group>(null)
  const stimulusActive = useStore((s) => s.stimulusActive)
  const stimulus = useStore((s) => s.stimulus)
  const interpretation = useStore((s) => s.interpretation)
  const setProximity = useStore((s) => s.setProximity)
  const isDragging = useRef(false)
  const targetPos = useRef(new THREE.Vector3(2.5, 1.2, 0))
  const currentPos = useRef(new THREE.Vector3(2.5, 1.2, 0))
  const { camera } = useThree()

  const material = useMemo(() => new THREE.MeshStandardMaterial({
    color: '#ff6633',
    emissive: '#ff3300',
    emissiveIntensity: 0.3,
    roughness: 0.4,
    metalness: 0.6,
    transparent: true,
    opacity: 0,
  }), [])

  const glowMaterial = useMemo(() => new THREE.MeshBasicMaterial({
    color: '#ff4400',
    transparent: true,
    opacity: 0,
    side: THREE.BackSide,
  }), [])

  // Trail particles
  const trailRef = useRef<THREE.Points>(null)
  const trailPositions = useMemo(() => new Float32Array(30 * 3), [])
  const trailGeom = useMemo(() => {
    const g = new THREE.BufferGeometry()
    g.setAttribute('position', new THREE.BufferAttribute(trailPositions, 3))
    return g
  }, [trailPositions])

  useFrame((_, delta) => {
    if (!groupRef.current) return

    // Smooth position
    currentPos.current.lerp(targetPos.current, delta * 8)
    groupRef.current.position.copy(currentPos.current)

    // Visibility fade
    const targetOpacity = stimulusActive ? 0.95 : 0
    material.opacity = THREE.MathUtils.lerp(material.opacity, targetOpacity, 0.08)
    glowMaterial.opacity = THREE.MathUtils.lerp(glowMaterial.opacity, stimulusActive ? 0.25 : 0, 0.08)

    // Pulsing + color
    if (stimulusActive && stimulus && meshRef.current) {
      const pulse = Math.sin(Date.now() * 0.004) * 0.5 + 0.5
      material.emissiveIntensity = 0.2 + stimulus.intensity * pulse * 0.6

      const threat = interpretation?.perceivedThreat ?? 0
      material.emissive.setRGB(1, 0.4 - threat * 0.3, 0.2 - threat * 0.2)

      // Rotation speed affected by threat
      meshRef.current.rotation.y += 0.01 + threat * 0.02
      meshRef.current.rotation.x += 0.005 + threat * 0.01

      // Scale pulse
      const scaleBase = 1 + threat * 0.15
      const scalePulse = scaleBase + pulse * 0.05 * (1 + threat)
      meshRef.current.scale.setScalar(scalePulse)
    }

    // Proximity
    const pos = currentPos.current
    const dist = Math.sqrt(pos.x ** 2 + (pos.y - 1.1) ** 2 + pos.z ** 2)
    const proximity = Math.max(0, 1 - dist / 3)
    setProximity(proximity)

    // Update trail
    if (trailRef.current && stimulusActive) {
      const posArr = trailGeom.getAttribute('position') as THREE.BufferAttribute
      // Shift all positions back
      for (let i = 29; i > 0; i--) {
        posArr.array[i * 3] = posArr.array[(i - 1) * 3]
        posArr.array[i * 3 + 1] = posArr.array[(i - 1) * 3 + 1]
        posArr.array[i * 3 + 2] = posArr.array[(i - 1) * 3 + 2]
      }
      posArr.array[0] = pos.x
      posArr.array[1] = pos.y
      posArr.array[2] = pos.z
      posArr.needsUpdate = true
    }
  })

  const handlePointerDown = useCallback((e: any) => {
    e.stopPropagation()
    isDragging.current = true
    document.body.style.cursor = 'grabbing'
  }, [])

  const handlePointerUp = useCallback(() => {
    isDragging.current = false
    document.body.style.cursor = ''
  }, [])

  // Global pointer move handler for dragging
  useFrame(({ pointer }) => {
    if (!isDragging.current || !stimulusActive) return

    tempRaycaster.setFromCamera(pointer, camera)
    // Project onto plane facing camera at current depth
    tempPlane.setFromNormalAndCoplanarPoint(
      camera.getWorldDirection(new THREE.Vector3()).negate(),
      currentPos.current,
    )

    if (tempRaycaster.ray.intersectPlane(tempPlane, tempIntersection)) {
      targetPos.current.set(
        THREE.MathUtils.clamp(tempIntersection.x, -3, 3),
        THREE.MathUtils.clamp(tempIntersection.y, 0.2, 3),
        THREE.MathUtils.clamp(tempIntersection.z, -2, 2),
      )
    }
  })

  // Reset position when new stimulus
  useFrame(() => {
    if (stimulusActive && material.opacity < 0.1) {
      targetPos.current.set(2.5, 1.2, 0)
      currentPos.current.set(2.5, 1.2, 0)
    }
  })

  const geometryNode = useMemo(() => {
    if (!stimulus) return <icosahedronGeometry args={[0.18, 2]} />
    switch (stimulus.type) {
      case 'object': return <icosahedronGeometry args={[0.15 + stimulus.intensity * 0.08, 2]} />
      case 'sound': return <octahedronGeometry args={[0.15 + stimulus.intensity * 0.08, 1]} />
      case 'social': return <dodecahedronGeometry args={[0.15 + stimulus.intensity * 0.08, 1]} />
      default: return <icosahedronGeometry args={[0.18, 2]} />
    }
  }, [stimulus])

  return (
    <>
      <group ref={groupRef}>
        <mesh
          ref={meshRef}
          material={material}
          onPointerDown={handlePointerDown}
          onPointerUp={handlePointerUp}
          onPointerLeave={handlePointerUp}
          onPointerOver={() => { if (stimulusActive) document.body.style.cursor = 'grab' }}
          onPointerOut={() => { if (!isDragging.current) document.body.style.cursor = '' }}
        >
          {geometryNode}
        </mesh>
        {/* Glow shell */}
        <mesh material={glowMaterial} scale={1.5}>
          {geometryNode}
        </mesh>
      </group>

      {/* Trail */}
      <points ref={trailRef} geometry={trailGeom}>
        <pointsMaterial
          size={0.02}
          color="#ff6633"
          transparent
          opacity={stimulusActive ? 0.15 : 0}
          sizeAttenuation
        />
      </points>
    </>
  )
}
