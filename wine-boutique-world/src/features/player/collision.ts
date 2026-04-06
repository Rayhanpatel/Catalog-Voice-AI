import { clampPointToRoomBounds, intersectsBlockedZones, isPointInsideAnyWalkableZone } from '../../lib/bounds2d'
import type { BlockedZone, PlanarPoint, RoomBounds, WalkableZone } from '../../lib/types'

export function resolvePlanarMovement(
  current: PlanarPoint,
  delta: PlanarPoint,
  bounds: RoomBounds,
  walkableZones: WalkableZone[],
  blockedZones: BlockedZone[],
  radius: number,
): PlanarPoint {
  const xCandidate = clampPointToRoomBounds(
    {
      x: current.x + delta.x,
      z: current.z,
    },
    bounds,
    radius,
  )

  const resolvedX =
    isPointInsideAnyWalkableZone(xCandidate, radius, walkableZones) &&
    !intersectsBlockedZones(xCandidate, radius, blockedZones)
      ? xCandidate.x
      : current.x

  const zCandidate = clampPointToRoomBounds(
    {
      x: resolvedX,
      z: current.z + delta.z,
    },
    bounds,
    radius,
  )

  const resolvedZ =
    isPointInsideAnyWalkableZone(zCandidate, radius, walkableZones) &&
    !intersectsBlockedZones(zCandidate, radius, blockedZones)
      ? zCandidate.z
      : current.z

  return {
    x: resolvedX,
    z: resolvedZ,
  }
}
