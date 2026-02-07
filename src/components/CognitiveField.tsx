import { useRef, useState, useEffect } from 'react'
import { useFrame } from '@react-three/fiber'
import { Text } from '@react-three/drei'
import * as THREE from 'three'
import { useStore } from '../store/useStore'
import { CognitionFragment } from '../engine/types'

interface FloatingFragment extends CognitionFragment {
  position: [number, number, number]
  velocity: [number, number, number]
  opacity: number
  scale: number
  lifetime: number
}

export function CognitiveField() {
  const groupRef = useRef<THREE.Group>(null)
  const [fragments, setFragments] = useState<FloatingFragment[]>([])
  const cognitionFragments = useStore((s) => s.cognitionFragments)
  const lastFragmentsRef = useRef<string>('')

  // Spawn new fragments when cognition changes
  useEffect(() => {
    const key = cognitionFragments.map((f) => f.id).join(',')
    if (key === lastFragmentsRef.current) return
    lastFragmentsRef.current = key

    const newFloating: FloatingFragment[] = cognitionFragments.map((f, i) => ({
      ...f,
      position: [
        (Math.random() - 0.5) * 0.6,
        1.9 + Math.random() * 0.4 + i * 0.15,
        (Math.random() - 0.5) * 0.3,
      ],
      velocity: [
        (Math.random() - 0.5) * 0.1,
        0.05 + Math.random() * 0.08,
        (Math.random() - 0.5) * 0.05,
      ],
      opacity: 0,
      scale: 0.3 + f.intensity * 0.5,
      lifetime: 3 + Math.random() * 2,
    }))

    setFragments((prev) => [...prev.slice(-8), ...newFloating])
  }, [cognitionFragments])

  useFrame((_, delta) => {
    setFragments((prev) =>
      prev
        .map((f) => {
          const age = (Date.now() - f.timestamp) / 1000
          const lifeFraction = age / f.lifetime

          // Fade in then out
          let opacity: number
          if (lifeFraction < 0.15) {
            opacity = (lifeFraction / 0.15) * f.intensity * 0.9
          } else if (lifeFraction > 0.7) {
            opacity = (1 - (lifeFraction - 0.7) / 0.3) * f.intensity * 0.9
          } else {
            opacity = f.intensity * 0.9
          }

          return {
            ...f,
            position: [
              f.position[0] + f.velocity[0] * delta,
              f.position[1] + f.velocity[1] * delta,
              f.position[2] + f.velocity[2] * delta,
            ] as [number, number, number],
            opacity: Math.max(0, opacity),
          }
        })
        .filter((f) => {
          const age = (Date.now() - f.timestamp) / 1000
          return age < f.lifetime
        })
    )
  })

  return (
    <group ref={groupRef}>
      {fragments.map((f) => (
        <Text
          key={f.id}
          position={f.position}
          fontSize={0.06 * f.scale}
          color={f.intensity > 0.7 ? '#ff4444' : f.intensity > 0.4 ? '#ffaa44' : '#88aacc'}
          anchorX="center"
          anchorY="middle"
          fillOpacity={f.opacity}
          font={undefined}
        >
          {f.text}
        </Text>
      ))}
    </group>
  )
}
