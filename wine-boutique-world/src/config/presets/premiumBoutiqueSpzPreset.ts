import { createBlockedZone, createWalkableZone } from '../boutiqueLayout'
import type { BoutiqueTuning } from '../../lib/types'

export const premiumBoutiqueSpzPreset: BoutiqueTuning = {
  spawn: {
    x: 0,
    z: -5.72,
    yawDegrees: -180,
  },
  eyeHeight: 1.67,
  movementSpeed: 2.5,
  playerRadius: 0.24,
  lookLimits: {
    minDegrees: -34,
    maxDegrees: 26,
    sensitivity: 0.0016,
  },
  roomBounds: {
    minX: -1.2,
    maxX: 1.92,
    minZ: -6.2,
    maxZ: 1.02,
  },
  walkableZones: {
    entranceLane: createWalkableZone('entranceLane', {
      label: 'Entrance lane',
      x: 0.03,
      z: -5.08,
      width: 2.05,
      depth: 2.28,
    }),
    centralCorridor: createWalkableZone('centralCorridor', {
      label: 'Central corridor',
      x: 0.22,
      z: -1.8,
      width: 3,
      depth: 6,
    }),
    backNook: createWalkableZone('backNook', {
      label: 'Back nook',
      x: 1.66,
      z: -5.2,
      width: 0.2,
      depth: 0.2,
    }),
  },
  blockedZones: {
    leftShelving: createBlockedZone('leftShelving', {
      label: 'Left shelving',
      x: -1.5,
      z: -2.2,
      width: 0.52,
      depth: 7.96,
    }),
    rightBar: createBlockedZone('rightBar', {
      label: 'Right bar',
      x: 2.13,
      z: -0.8,
      width: 0.38,
      depth: 5.43,
    }),
    doorwayBarrier: createBlockedZone('doorwayBarrier', {
      label: 'Doorway barrier',
      x: 1.47,
      z: -6.6,
      width: 0.2,
      depth: 0.2,
    }),
    rearLounge: createBlockedZone('rearLounge', {
      label: 'Front seating',
      x: 1.28,
      z: -5.3,
      width: 0.2,
      depth: 0.2,
    }),
    tastingPedestal: createBlockedZone('tastingPedestal', {
      label: 'Tasting pedestal',
      x: 0,
      z: -0.3,
      width: 0.38,
      depth: 1,
    }),
  },
  npc: {
    x: 0,
    z: -0.1,
    interactionRadius: 3,
  },
  worldAsset: {
    enabled: true,
    showPlaceholderShell: false,
    scale: 1,
    offsetX: 0,
    offsetY: 0,
    offsetZ: 0,
    yawDegrees: 0,
  },
}
