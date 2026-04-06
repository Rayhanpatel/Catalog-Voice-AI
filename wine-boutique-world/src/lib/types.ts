export type BlockedZoneId =
  | 'leftShelving'
  | 'rightBar'
  | 'doorwayBarrier'
  | 'rearLounge'
  | 'tastingPedestal'

export type WalkableZoneId = 'entranceLane' | 'centralCorridor' | 'backNook'

export interface PlanarPoint {
  x: number
  z: number
}

export interface RoomBounds {
  minX: number
  maxX: number
  minZ: number
  maxZ: number
}

export interface BlockedZone extends PlanarPoint {
  id: BlockedZoneId
  label: string
  width: number
  depth: number
  color: string
}

export interface WalkableZone extends PlanarPoint {
  id: WalkableZoneId
  label: string
  width: number
  depth: number
  color: string
}

export interface SpawnConfig extends PlanarPoint {
  yawDegrees: number
}

export interface LookLimits {
  minDegrees: number
  maxDegrees: number
  sensitivity: number
}

export interface NpcConfig extends PlanarPoint {
  interactionRadius: number
}

export interface WorldAssetConfig {
  enabled: boolean
  showPlaceholderShell: boolean
  scale: number
  offsetX: number
  offsetY: number
  offsetZ: number
  yawDegrees: number
}

export interface BoutiqueTuning {
  spawn: SpawnConfig
  eyeHeight: number
  movementSpeed: number
  playerRadius: number
  lookLimits: LookLimits
  roomBounds: RoomBounds
  walkableZones: Record<WalkableZoneId, WalkableZone>
  blockedZones: Record<BlockedZoneId, BlockedZone>
  npc: NpcConfig
  worldAsset: WorldAssetConfig
}

export type WorldAssetStatus = 'idle' | 'loading' | 'loaded' | 'fallback' | 'error'
