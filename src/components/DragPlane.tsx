/**
 * An invisible plane that catches pointer events for dragging the stimulus.
 * When the stimulus is being dragged, this plane intercepts raycasts so
 * the user can move the object smoothly across 3D space.
 */
export function DragPlane() {
  return (
    <mesh
      rotation={[-Math.PI / 2, 0, 0]}
      position={[0, 1.2, 0]}
      visible={false}
    >
      <planeGeometry args={[20, 20]} />
      <meshBasicMaterial transparent opacity={0} />
    </mesh>
  )
}
