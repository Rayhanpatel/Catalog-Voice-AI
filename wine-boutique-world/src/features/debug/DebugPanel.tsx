import { button, folder, useControls } from 'leva'
import { useTuningStore } from './tuningStore'

export function DebugPanel() {
  const spawn = useTuningStore((state) => state.spawn)
  const eyeHeight = useTuningStore((state) => state.eyeHeight)
  const movementSpeed = useTuningStore((state) => state.movementSpeed)
  const playerRadius = useTuningStore((state) => state.playerRadius)
  const lookLimits = useTuningStore((state) => state.lookLimits)
  const roomBounds = useTuningStore((state) => state.roomBounds)
  const walkableZones = useTuningStore((state) => state.walkableZones)
  const blockedZones = useTuningStore((state) => state.blockedZones)
  const npc = useTuningStore((state) => state.npc)
  const worldAsset = useTuningStore((state) => state.worldAsset)
  const showDebugHelpers = useTuningStore((state) => state.runtime.showDebugHelpers)
  const showCalibrationMap = useTuningStore((state) => state.runtime.showCalibrationMap)
  const setSpawn = useTuningStore((state) => state.setSpawn)
  const setEyeHeight = useTuningStore((state) => state.setEyeHeight)
  const setMovementSpeed = useTuningStore((state) => state.setMovementSpeed)
  const setPlayerRadius = useTuningStore((state) => state.setPlayerRadius)
  const setLookLimits = useTuningStore((state) => state.setLookLimits)
  const setRoomBounds = useTuningStore((state) => state.setRoomBounds)
  const setWalkableZone = useTuningStore((state) => state.setWalkableZone)
  const setBlockedZone = useTuningStore((state) => state.setBlockedZone)
  const setNpc = useTuningStore((state) => state.setNpc)
  const setWorldAsset = useTuningStore((state) => state.setWorldAsset)
  const setShowDebugHelpers = useTuningStore((state) => state.setShowDebugHelpers)
  const setShowCalibrationMap = useTuningStore((state) => state.setShowCalibrationMap)
  const resetTuning = useTuningStore((state) => state.resetTuning)
  const triggerRespawn = useTuningStore((state) => state.triggerRespawn)

  useControls(() => ({
    Scene: folder({
      useSpzAsset: {
        label: 'Use SPZ (exp)',
        value: worldAsset.enabled,
        onChange: (value: boolean) => setWorldAsset({ enabled: value }),
      },
      showPlaceholderShell: {
        label: 'Show fallback shell',
        value: worldAsset.showPlaceholderShell,
        onChange: (value: boolean) => setWorldAsset({ showPlaceholderShell: value }),
      },
      assetScale: {
        label: 'Asset scale',
        value: worldAsset.scale,
        min: 0.1,
        max: 5,
        step: 0.01,
        onChange: (value: number) => setWorldAsset({ scale: value }),
      },
      assetYawDegrees: {
        label: 'Asset yaw',
        value: worldAsset.yawDegrees,
        min: -180,
        max: 180,
        step: 1,
        onChange: (value: number) => setWorldAsset({ yawDegrees: value }),
      },
      assetOffsetX: {
        label: 'Asset offset X',
        value: worldAsset.offsetX,
        min: -10,
        max: 10,
        step: 0.01,
        onChange: (value: number) => setWorldAsset({ offsetX: value }),
      },
      assetOffsetY: {
        label: 'Asset offset Y',
        value: worldAsset.offsetY,
        min: -10,
        max: 10,
        step: 0.01,
        onChange: (value: number) => setWorldAsset({ offsetY: value }),
      },
      assetOffsetZ: {
        label: 'Asset offset Z',
        value: worldAsset.offsetZ,
        min: -10,
        max: 10,
        step: 0.01,
        onChange: (value: number) => setWorldAsset({ offsetZ: value }),
      },
      showDebugHelpers: {
        label: 'Show debug helpers',
        value: showDebugHelpers,
        onChange: (value: boolean) => setShowDebugHelpers(value),
      },
      showCalibrationMap: {
        label: 'Show calibration map',
        value: showCalibrationMap,
        onChange: (value: boolean) => setShowCalibrationMap(value),
      },
      resetTuning: button(() => resetTuning()),
    }),
    Spawn: folder({
      spawnX: {
        value: spawn.x,
        min: -3,
        max: 3,
        step: 0.01,
        onChange: (value: number) => setSpawn({ x: value }),
      },
      spawnZ: {
        value: spawn.z,
        min: -8,
        max: 3,
        step: 0.01,
        onChange: (value: number) => setSpawn({ z: value }),
      },
      spawnYawDegrees: {
        label: 'Spawn yaw',
        value: spawn.yawDegrees,
        min: -180,
        max: 180,
        step: 1,
        onChange: (value: number) => setSpawn({ yawDegrees: value }),
      },
      respawnNow: button(() => triggerRespawn()),
    }),
    Player: folder({
      eyeHeight: {
        value: eyeHeight,
        min: 1.4,
        max: 1.85,
        step: 0.01,
        onChange: (value: number) => setEyeHeight(value),
      },
      movementSpeed: {
        label: 'Move speed',
        value: movementSpeed,
        min: 0.5,
        max: 3.5,
        step: 0.05,
        onChange: (value: number) => setMovementSpeed(value),
      },
      playerRadius: {
        label: 'Body radius',
        value: playerRadius,
        min: 0.1,
        max: 0.4,
        step: 0.01,
        onChange: (value: number) => setPlayerRadius(value),
      },
    }),
    Look: folder({
      lookMinDegrees: {
        label: 'Min pitch',
        value: lookLimits.minDegrees,
        min: -85,
        max: 0,
        step: 1,
        onChange: (value: number) => setLookLimits({ minDegrees: value }),
      },
      lookMaxDegrees: {
        label: 'Max pitch',
        value: lookLimits.maxDegrees,
        min: 0,
        max: 85,
        step: 1,
        onChange: (value: number) => setLookLimits({ maxDegrees: value }),
      },
      lookSensitivity: {
        label: 'Sensitivity',
        value: lookLimits.sensitivity,
        min: 0.0008,
        max: 0.005,
        step: 0.0001,
        onChange: (value: number) => setLookLimits({ sensitivity: value }),
      },
    }),
    RoomBounds: folder({
      roomMinX: {
        value: roomBounds.minX,
        min: -4,
        max: 0,
        step: 0.01,
        onChange: (value: number) => setRoomBounds({ minX: value }),
      },
      roomMaxX: {
        value: roomBounds.maxX,
        min: 0,
        max: 4,
        step: 0.01,
        onChange: (value: number) => setRoomBounds({ maxX: value }),
      },
      roomMinZ: {
        value: roomBounds.minZ,
        min: -10,
        max: 2,
        step: 0.01,
        onChange: (value: number) => setRoomBounds({ minZ: value }),
      },
      roomMaxZ: {
        value: roomBounds.maxZ,
        min: -4,
        max: 4,
        step: 0.01,
        onChange: (value: number) => setRoomBounds({ maxZ: value }),
      },
    }),
    WalkableZones: folder({
      entranceLaneX: {
        label: 'Entrance X',
        value: walkableZones.entranceLane.x,
        min: -4,
        max: 4,
        step: 0.01,
        onChange: (value: number) => setWalkableZone('entranceLane', { x: value }),
      },
      entranceLaneZ: {
        label: 'Entrance Z',
        value: walkableZones.entranceLane.z,
        min: -8,
        max: 4,
        step: 0.01,
        onChange: (value: number) => setWalkableZone('entranceLane', { z: value }),
      },
      entranceLaneWidth: {
        label: 'Entrance width',
        value: walkableZones.entranceLane.width,
        min: 0.2,
        max: 3,
        step: 0.01,
        onChange: (value: number) => setWalkableZone('entranceLane', { width: value }),
      },
      entranceLaneDepth: {
        label: 'Entrance depth',
        value: walkableZones.entranceLane.depth,
        min: 0.2,
        max: 3,
        step: 0.01,
        onChange: (value: number) => setWalkableZone('entranceLane', { depth: value }),
      },
      centralCorridorX: {
        label: 'Corridor X',
        value: walkableZones.centralCorridor.x,
        min: -4,
        max: 4,
        step: 0.01,
        onChange: (value: number) => setWalkableZone('centralCorridor', { x: value }),
      },
      centralCorridorZ: {
        label: 'Corridor Z',
        value: walkableZones.centralCorridor.z,
        min: -8,
        max: 4,
        step: 0.01,
        onChange: (value: number) => setWalkableZone('centralCorridor', { z: value }),
      },
      centralCorridorWidth: {
        label: 'Corridor width',
        value: walkableZones.centralCorridor.width,
        min: 0.2,
        max: 3,
        step: 0.01,
        onChange: (value: number) => setWalkableZone('centralCorridor', { width: value }),
      },
      centralCorridorDepth: {
        label: 'Corridor depth',
        value: walkableZones.centralCorridor.depth,
        min: 0.2,
        max: 6,
        step: 0.01,
        onChange: (value: number) => setWalkableZone('centralCorridor', { depth: value }),
      },
      backNookX: {
        label: 'Back nook X',
        value: walkableZones.backNook.x,
        min: -4,
        max: 4,
        step: 0.01,
        onChange: (value: number) => setWalkableZone('backNook', { x: value }),
      },
      backNookZ: {
        label: 'Back nook Z',
        value: walkableZones.backNook.z,
        min: -8,
        max: 4,
        step: 0.01,
        onChange: (value: number) => setWalkableZone('backNook', { z: value }),
      },
      backNookWidth: {
        label: 'Back nook width',
        value: walkableZones.backNook.width,
        min: 0.2,
        max: 3,
        step: 0.01,
        onChange: (value: number) => setWalkableZone('backNook', { width: value }),
      },
      backNookDepth: {
        label: 'Back nook depth',
        value: walkableZones.backNook.depth,
        min: 0.2,
        max: 4,
        step: 0.01,
        onChange: (value: number) => setWalkableZone('backNook', { depth: value }),
      },
    }),
    BlockedZones: folder({
      leftShelvingX: {
        label: 'Shelving X',
        value: blockedZones.leftShelving.x,
        min: -4,
        max: 4,
        step: 0.01,
        onChange: (value: number) => setBlockedZone('leftShelving', { x: value }),
      },
      leftShelvingZ: {
        label: 'Shelving Z',
        value: blockedZones.leftShelving.z,
        min: -8,
        max: 4,
        step: 0.01,
        onChange: (value: number) => setBlockedZone('leftShelving', { z: value }),
      },
      leftShelvingWidth: {
        label: 'Shelving width',
        value: blockedZones.leftShelving.width,
        min: 0.2,
        max: 3,
        step: 0.01,
        onChange: (value: number) => setBlockedZone('leftShelving', { width: value }),
      },
      leftShelvingDepth: {
        label: 'Shelving depth',
        value: blockedZones.leftShelving.depth,
        min: 0.2,
        max: 8,
        step: 0.01,
        onChange: (value: number) => setBlockedZone('leftShelving', { depth: value }),
      },
      rightBarX: {
        label: 'Bar X',
        value: blockedZones.rightBar.x,
        min: -4,
        max: 4,
        step: 0.01,
        onChange: (value: number) => setBlockedZone('rightBar', { x: value }),
      },
      rightBarZ: {
        label: 'Bar Z',
        value: blockedZones.rightBar.z,
        min: -8,
        max: 4,
        step: 0.01,
        onChange: (value: number) => setBlockedZone('rightBar', { z: value }),
      },
      rightBarWidth: {
        label: 'Bar width',
        value: blockedZones.rightBar.width,
        min: 0.2,
        max: 3,
        step: 0.01,
        onChange: (value: number) => setBlockedZone('rightBar', { width: value }),
      },
      rightBarDepth: {
        label: 'Bar depth',
        value: blockedZones.rightBar.depth,
        min: 0.2,
        max: 8,
        step: 0.01,
        onChange: (value: number) => setBlockedZone('rightBar', { depth: value }),
      },
      doorwayBarrierX: {
        label: 'Door block X',
        value: blockedZones.doorwayBarrier.x,
        min: -4,
        max: 4,
        step: 0.01,
        onChange: (value: number) => setBlockedZone('doorwayBarrier', { x: value }),
      },
      doorwayBarrierZ: {
        label: 'Door block Z',
        value: blockedZones.doorwayBarrier.z,
        min: -8,
        max: 4,
        step: 0.01,
        onChange: (value: number) => setBlockedZone('doorwayBarrier', { z: value }),
      },
      doorwayBarrierWidth: {
        label: 'Door block width',
        value: blockedZones.doorwayBarrier.width,
        min: 0.2,
        max: 3,
        step: 0.01,
        onChange: (value: number) => setBlockedZone('doorwayBarrier', { width: value }),
      },
      doorwayBarrierDepth: {
        label: 'Door block depth',
        value: blockedZones.doorwayBarrier.depth,
        min: 0.2,
        max: 3,
        step: 0.01,
        onChange: (value: number) => setBlockedZone('doorwayBarrier', { depth: value }),
      },
      rearLoungeX: {
        label: 'Rear lounge X',
        value: blockedZones.rearLounge.x,
        min: -4,
        max: 4,
        step: 0.01,
        onChange: (value: number) => setBlockedZone('rearLounge', { x: value }),
      },
      rearLoungeZ: {
        label: 'Rear lounge Z',
        value: blockedZones.rearLounge.z,
        min: -8,
        max: 4,
        step: 0.01,
        onChange: (value: number) => setBlockedZone('rearLounge', { z: value }),
      },
      rearLoungeWidth: {
        label: 'Rear lounge width',
        value: blockedZones.rearLounge.width,
        min: 0.2,
        max: 3,
        step: 0.01,
        onChange: (value: number) => setBlockedZone('rearLounge', { width: value }),
      },
      rearLoungeDepth: {
        label: 'Rear lounge depth',
        value: blockedZones.rearLounge.depth,
        min: 0.2,
        max: 3,
        step: 0.01,
        onChange: (value: number) => setBlockedZone('rearLounge', { depth: value }),
      },
      tastingPedestalX: {
        label: 'Pedestal X',
        value: blockedZones.tastingPedestal.x,
        min: -4,
        max: 4,
        step: 0.01,
        onChange: (value: number) => setBlockedZone('tastingPedestal', { x: value }),
      },
      tastingPedestalZ: {
        label: 'Pedestal Z',
        value: blockedZones.tastingPedestal.z,
        min: -8,
        max: 4,
        step: 0.01,
        onChange: (value: number) => setBlockedZone('tastingPedestal', { z: value }),
      },
      tastingPedestalWidth: {
        label: 'Pedestal width',
        value: blockedZones.tastingPedestal.width,
        min: 0.2,
        max: 2,
        step: 0.01,
        onChange: (value: number) => setBlockedZone('tastingPedestal', { width: value }),
      },
      tastingPedestalDepth: {
        label: 'Pedestal depth',
        value: blockedZones.tastingPedestal.depth,
        min: 0.2,
        max: 2,
        step: 0.01,
        onChange: (value: number) => setBlockedZone('tastingPedestal', { depth: value }),
      },
    }),
    NPC: folder({
      npcX: {
        value: npc.x,
        min: -4,
        max: 4,
        step: 0.01,
        onChange: (value: number) => setNpc({ x: value }),
      },
      npcZ: {
        value: npc.z,
        min: -8,
        max: 4,
        step: 0.01,
        onChange: (value: number) => setNpc({ z: value }),
      },
      interactionRadius: {
        label: 'Talk radius',
        value: npc.interactionRadius,
        min: 0.4,
        max: 3,
        step: 0.01,
        onChange: (value: number) => setNpc({ interactionRadius: value }),
      },
    }),
  }))

  return null
}
