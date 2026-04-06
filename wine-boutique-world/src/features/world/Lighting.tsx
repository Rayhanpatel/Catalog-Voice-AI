export function Lighting() {
  return (
    <>
      <fog attach="fog" args={['#120907', 8, 20]} />
      <ambientLight intensity={0.55} color="#f3d0a5" />
      <hemisphereLight intensity={0.24} color="#f8dec0" groundColor="#34170d" />
      <directionalLight
        castShadow
        position={[2.4, 4.8, 1.2]}
        intensity={1}
        color="#ffd6a8"
        shadow-mapSize-width={1024}
        shadow-mapSize-height={1024}
      />
      <pointLight position={[-1.85, 2.32, 1.75]} intensity={28} color="#ffb566" distance={6} decay={2} />
      <pointLight position={[1.2, 2.32, 2.45]} intensity={26} color="#ffad61" distance={6} decay={2} />
      <pointLight position={[0.35, 2.2, 4.95]} intensity={18} color="#ffbf80" distance={5} decay={2} />
    </>
  )
}
