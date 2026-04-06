import { useMemo } from 'react'
import { degToRad } from '../../lib/math'
import { useTuningStore } from '../debug/tuningStore'

export function CollisionDebug() {
  const showDebugHelpers = useTuningStore((state) => state.runtime.showDebugHelpers)
  const roomBounds = useTuningStore((state) => state.roomBounds)
  const walkableZonesMap = useTuningStore((state) => state.walkableZones)
  const blockedZonesMap = useTuningStore((state) => state.blockedZones)
  const spawn = useTuningStore((state) => state.spawn)
  const npc = useTuningStore((state) => state.npc)

  const walkableZones = useMemo(() => Object.values(walkableZonesMap), [walkableZonesMap])
  const blockedZones = useMemo(() => Object.values(blockedZonesMap), [blockedZonesMap])

  if (!showDebugHelpers) {
    return null
  }

  const roomWidth = roomBounds.maxX - roomBounds.minX
  const roomDepth = roomBounds.maxZ - roomBounds.minZ
  const roomCenterX = (roomBounds.maxX + roomBounds.minX) * 0.5
  const roomCenterZ = (roomBounds.maxZ + roomBounds.minZ) * 0.5

  return (
    <group>
      <mesh position={[roomCenterX, 0.03, roomCenterZ]}>
        <boxGeometry args={[roomWidth, 0.06, roomDepth]} />
        <meshBasicMaterial color="#55e0a1" transparent opacity={0.12} wireframe />
      </mesh>

      {walkableZones.map((zone) => (
        <mesh key={zone.id} position={[zone.x, 0.05, zone.z]}>
          <boxGeometry args={[zone.width, 0.1, zone.depth]} />
          <meshBasicMaterial color={zone.color} transparent opacity={0.2} />
        </mesh>
      ))}

      {blockedZones.map((zone) => (
        <mesh key={zone.id} position={[zone.x, 0.15, zone.z]}>
          <boxGeometry args={[zone.width, 0.3, zone.depth]} />
          <meshBasicMaterial color={zone.color} transparent opacity={0.24} />
        </mesh>
      ))}

      <group position={[spawn.x, 0.06, spawn.z]} rotation={[0, degToRad(spawn.yawDegrees), 0]}>
        <mesh>
          <cylinderGeometry args={[0.1, 0.1, 0.12, 18]} />
          <meshBasicMaterial color="#5ae3ac" />
        </mesh>
        <mesh position={[0, 0.03, 0.22]}>
          <boxGeometry args={[0.08, 0.04, 0.34]} />
          <meshBasicMaterial color="#9ff5cf" />
        </mesh>
      </group>

      <mesh position={[npc.x, 0.04, npc.z]} rotation={[-Math.PI * 0.5, 0, 0]}>
        <ringGeometry args={[npc.interactionRadius - 0.04, npc.interactionRadius, 48]} />
        <meshBasicMaterial color="#f7cb93" transparent opacity={0.7} />
      </mesh>
    </group>
  )
}
