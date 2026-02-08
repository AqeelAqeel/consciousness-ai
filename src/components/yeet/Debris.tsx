import { useRef, useState } from 'react'
import { useFrame } from '@react-three/fiber'
import * as THREE from 'three'
import { useYeetStore } from '../../store/useYeetStore'

interface DebrisPiece {
  id: number
  position: THREE.Vector3
  velocity: THREE.Vector3
  rotSpeed: THREE.Vector3
  life: number
  size: number
  isBox: boolean
}

let debrisId = 0

export function DebrisSystem() {
  const [pieces, setPieces] = useState<DebrisPiece[]>([])
  const prevHitsRef = useRef(0)

  useFrame(() => {
    const { hits } = useYeetStore.getState()

    if (hits > prevHitsRef.current) {
      prevHitsRef.current = hits
      const count = 5 + Math.floor(Math.random() * 5)
      const newPieces: DebrisPiece[] = []
      for (let i = 0; i < count; i++) {
        newPieces.push({
          id: ++debrisId,
          position: new THREE.Vector3(
            (Math.random() - 0.5) * 0.5,
            1.5 + (Math.random() - 0.5) * 0.6,
            (Math.random() - 0.5) * 0.4
          ),
          velocity: new THREE.Vector3(
            (Math.random() - 0.5) * 2,
            Math.random() * 1.5 + 0.5,
            (Math.random() - 0.5) * 2
          ),
          rotSpeed: new THREE.Vector3(
            (Math.random() - 0.5) * 8,
            (Math.random() - 0.5) * 8,
            (Math.random() - 0.5) * 8
          ),
          life: 1.0 + Math.random() * 0.5,
          size: 0.02 + Math.random() * 0.04,
          isBox: Math.random() > 0.5,
        })
      }
      setPieces((prev) => [...prev, ...newPieces])
    }
  })

  return (
    <>
      {pieces.map((piece) => (
        <DebrisPieceMesh
          key={piece.id}
          piece={piece}
          onExpire={() => setPieces((prev) => prev.filter((p) => p.id !== piece.id))}
        />
      ))}
    </>
  )
}

function DebrisPieceMesh({ piece, onExpire }: { piece: DebrisPiece; onExpire: () => void }) {
  const ref = useRef<THREE.Mesh>(null)
  const lifeRef = useRef(piece.life)

  useFrame((_, delta) => {
    if (!ref.current) return
    const d = Math.min(delta, 0.05)

    piece.velocity.y -= 9.8 * d
    ref.current.position.add(piece.velocity.clone().multiplyScalar(d))
    ref.current.rotation.x += piece.rotSpeed.x * d
    ref.current.rotation.y += piece.rotSpeed.y * d

    if (ref.current.position.y < 0) {
      ref.current.position.y = 0
      piece.velocity.y = Math.abs(piece.velocity.y) * 0.15
      piece.velocity.x *= 0.4
      piece.velocity.z *= 0.4
    }

    lifeRef.current -= d
    const mat = ref.current.material as THREE.MeshStandardMaterial
    mat.opacity = Math.max(0, lifeRef.current / piece.life)

    if (lifeRef.current <= 0) onExpire()
  })

  return (
    <mesh ref={ref} position={piece.position}>
      {piece.isBox
        ? <boxGeometry args={[piece.size, piece.size, piece.size]} />
        : <tetrahedronGeometry args={[piece.size]} />
      }
      <meshStandardMaterial
        color="#facc15"
        emissive="#facc15"
        emissiveIntensity={0.5}
        roughness={0.5}
        transparent
        opacity={1}
      />
    </mesh>
  )
}
