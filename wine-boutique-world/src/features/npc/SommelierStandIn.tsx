import { Float } from '@react-three/drei'

export function SommelierStandIn() {
  return (
    <Float speed={1.9} rotationIntensity={0.08} floatIntensity={0.16}>
      <mesh position={[0, 1.48, 0]} castShadow>
        <sphereGeometry args={[0.16, 20, 20]} />
        <meshStandardMaterial color="#f3d7bb" roughness={0.75} />
      </mesh>
      <mesh position={[0, 0.86, 0]} castShadow receiveShadow>
        <cylinderGeometry args={[0.2, 0.25, 0.86, 18]} />
        <meshStandardMaterial color="#2d0f16" roughness={0.64} />
      </mesh>
      <mesh position={[0, 0.06, 0]} rotation={[-Math.PI * 0.5, 0, 0]}>
        <ringGeometry args={[0.18, 0.28, 32]} />
        <meshBasicMaterial color="#f6cb92" transparent opacity={0.78} />
      </mesh>
    </Float>
  )
}
