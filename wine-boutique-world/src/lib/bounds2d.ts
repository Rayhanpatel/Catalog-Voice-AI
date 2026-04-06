import { clamp, distanceSquared2D } from './math'
import type { BlockedZone, PlanarPoint, RoomBounds, WalkableZone } from './types'

export function clampPointToRoomBounds(point: PlanarPoint, bounds: RoomBounds, radius: number): PlanarPoint {
  return {
    x: clamp(point.x, bounds.minX + radius, bounds.maxX - radius),
    z: clamp(point.z, bounds.minZ + radius, bounds.maxZ - radius),
  }
}

export function circleIntersectsBlockedZone(point: PlanarPoint, radius: number, zone: BlockedZone) {
  const halfWidth = zone.width * 0.5
  const halfDepth = zone.depth * 0.5
  const closestPoint = {
    x: clamp(point.x, zone.x - halfWidth, zone.x + halfWidth),
    z: clamp(point.z, zone.z - halfDepth, zone.z + halfDepth),
  }

  return distanceSquared2D(point, closestPoint) < radius * radius
}

export function intersectsBlockedZones(point: PlanarPoint, radius: number, zones: BlockedZone[]) {
  return zones.some((zone) => circleIntersectsBlockedZone(point, radius, zone))
}

export function pointFitsInsideWalkableZone(point: PlanarPoint, radius: number, zone: WalkableZone) {
  const halfWidth = zone.width * 0.5
  const halfDepth = zone.depth * 0.5

  return (
    point.x >= zone.x - halfWidth + radius &&
    point.x <= zone.x + halfWidth - radius &&
    point.z >= zone.z - halfDepth + radius &&
    point.z <= zone.z + halfDepth - radius
  )
}

export function isPointInsideAnyWalkableZone(point: PlanarPoint, radius: number, zones: WalkableZone[]) {
  return zones.some((zone) => pointFitsInsideWalkableZone(point, radius, zone))
}
