import type { BlockedZone, BlockedZoneId, WalkableZone, WalkableZoneId } from '../lib/types'

export const boutiqueShell = {
  roomWidth: 5.4,
  roomDepth: 7.1,
  wallHeight: 3.05,
  wallThickness: 0.18,
  doorWidth: 1.55,
  doorHeight: 2.28,
  beamCount: 5,
}

export const blockedZoneColors: Record<BlockedZoneId, string> = {
  leftShelving: '#7c3d25',
  rightBar: '#8d4b2d',
  doorwayBarrier: '#b16a3a',
  rearLounge: '#83543e',
  tastingPedestal: '#d08a4d',
}

export const walkableZoneColors: Record<WalkableZoneId, string> = {
  entranceLane: '#4c9c81',
  centralCorridor: '#55c1a7',
  backNook: '#8ed7c4',
}

export function createBlockedZone(
  id: BlockedZoneId,
  zone: Omit<BlockedZone, 'id' | 'label' | 'color'> & { label: string },
): BlockedZone {
  return {
    id,
    label: zone.label,
    x: zone.x,
    z: zone.z,
    width: zone.width,
    depth: zone.depth,
    color: blockedZoneColors[id],
  }
}

export function createWalkableZone(
  id: WalkableZoneId,
  zone: Omit<WalkableZone, 'id' | 'label' | 'color'> & { label: string },
): WalkableZone {
  return {
    id,
    label: zone.label,
    x: zone.x,
    z: zone.z,
    width: zone.width,
    depth: zone.depth,
    color: walkableZoneColors[id],
  }
}
