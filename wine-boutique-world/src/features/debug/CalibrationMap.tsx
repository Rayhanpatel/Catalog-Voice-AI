import { useMemo } from 'react'
import { degToRad, transformPlanarPoint } from '../../lib/math'
import type { BlockedZone, PlanarPoint, RoomBounds, WalkableZone } from '../../lib/types'
import { useTuningStore } from './tuningStore'

interface ProjectedPoint {
  x: number
  y: number
}

function getZoneCorners(zone: Pick<BlockedZone | WalkableZone, 'x' | 'z' | 'width' | 'depth'>) {
  const halfWidth = zone.width * 0.5
  const halfDepth = zone.depth * 0.5

  return [
    { x: zone.x - halfWidth, z: zone.z - halfDepth },
    { x: zone.x + halfWidth, z: zone.z - halfDepth },
    { x: zone.x - halfWidth, z: zone.z + halfDepth },
    { x: zone.x + halfWidth, z: zone.z + halfDepth },
  ]
}

function getMapBounds(
  roomBounds: RoomBounds,
  floorSamples: PlanarPoint[],
  walkableZones: WalkableZone[],
  blockedZones: BlockedZone[],
  pointsOfInterest: PlanarPoint[],
) {
  const sampledPoints = [
    ...floorSamples,
    ...pointsOfInterest,
    { x: roomBounds.minX, z: roomBounds.minZ },
    { x: roomBounds.maxX, z: roomBounds.maxZ },
    ...walkableZones.flatMap((zone) => getZoneCorners(zone)),
    ...blockedZones.flatMap((zone) => getZoneCorners(zone)),
  ]

  let minX = Number.POSITIVE_INFINITY
  let maxX = Number.NEGATIVE_INFINITY
  let minZ = Number.POSITIVE_INFINITY
  let maxZ = Number.NEGATIVE_INFINITY

  for (const point of sampledPoints) {
    minX = Math.min(minX, point.x)
    maxX = Math.max(maxX, point.x)
    minZ = Math.min(minZ, point.z)
    maxZ = Math.max(maxZ, point.z)
  }

  if (!Number.isFinite(minX) || !Number.isFinite(maxX) || !Number.isFinite(minZ) || !Number.isFinite(maxZ)) {
    return roomBounds
  }

  const padding = 0.32

  return {
    minX: minX - padding,
    maxX: maxX + padding,
    minZ: minZ - padding,
    maxZ: maxZ + padding,
  }
}

function projectPoint(point: PlanarPoint, bounds: RoomBounds): ProjectedPoint {
  const width = Math.max(bounds.maxX - bounds.minX, 0.001)
  const depth = Math.max(bounds.maxZ - bounds.minZ, 0.001)

  return {
    x: ((point.x - bounds.minX) / width) * 100,
    y: ((point.z - bounds.minZ) / depth) * 100,
  }
}

function projectRect(
  zone: Pick<BlockedZone | WalkableZone, 'x' | 'z' | 'width' | 'depth'>,
  bounds: RoomBounds,
) {
  const halfWidth = zone.width * 0.5
  const halfDepth = zone.depth * 0.5
  const topLeft = projectPoint(
    {
      x: zone.x - halfWidth,
      z: zone.z - halfDepth,
    },
    bounds,
  )
  const bottomRight = projectPoint(
    {
      x: zone.x + halfWidth,
      z: zone.z + halfDepth,
    },
    bounds,
  )

  return {
    x: topLeft.x,
    y: topLeft.y,
    width: bottomRight.x - topLeft.x,
    height: bottomRight.y - topLeft.y,
  }
}

export function CalibrationMap() {
  const showCalibrationMap = useTuningStore((state) => state.runtime.showCalibrationMap)
  const roomBounds = useTuningStore((state) => state.roomBounds)
  const walkableZonesMap = useTuningStore((state) => state.walkableZones)
  const blockedZonesMap = useTuningStore((state) => state.blockedZones)
  const spawn = useTuningStore((state) => state.spawn)
  const npc = useTuningStore((state) => state.npc)
  const worldAsset = useTuningStore((state) => state.worldAsset)
  const playerPosition = useTuningStore((state) => state.runtime.playerPosition)
  const assetFloorSamples = useTuningStore((state) => state.runtime.assetFloorSamples)

  const walkableZones = useMemo(() => Object.values(walkableZonesMap), [walkableZonesMap])
  const blockedZones = useMemo(() => Object.values(blockedZonesMap), [blockedZonesMap])

  const transformedSamples = useMemo(() => {
    const yaw = degToRad(worldAsset.yawDegrees)

    return assetFloorSamples.map((point) =>
      transformPlanarPoint(point, worldAsset.scale, yaw, worldAsset.offsetX, worldAsset.offsetZ),
    )
  }, [
    assetFloorSamples,
    worldAsset.offsetX,
    worldAsset.offsetZ,
    worldAsset.scale,
    worldAsset.yawDegrees,
  ])

  const mapBounds = useMemo(
    () => getMapBounds(roomBounds, transformedSamples, walkableZones, blockedZones, [spawn, npc]),
    [blockedZones, npc, roomBounds, spawn, transformedSamples, walkableZones],
  )

  const roomRect = useMemo(
    () => projectRect(
      {
        x: (roomBounds.minX + roomBounds.maxX) * 0.5,
        z: (roomBounds.minZ + roomBounds.maxZ) * 0.5,
        width: roomBounds.maxX - roomBounds.minX,
        depth: roomBounds.maxZ - roomBounds.minZ,
      },
      mapBounds,
    ),
    [mapBounds, roomBounds],
  )

  const sampleDots = useMemo(
    () =>
      transformedSamples.map((point, index) => {
        const projected = projectPoint(point, mapBounds)

        return <circle key={`sample-${index}`} cx={projected.x} cy={projected.y} r={0.42} />
      }),
    [mapBounds, transformedSamples],
  )

  const walkableRects = useMemo(
    () =>
      walkableZones.map((zone) => {
        const projected = projectRect(zone, mapBounds)

        return (
          <rect
            key={zone.id}
            x={projected.x}
            y={projected.y}
            width={projected.width}
            height={projected.height}
            rx={1.2}
            fill={zone.color}
            fillOpacity={0.24}
            stroke={zone.color}
            strokeOpacity={0.88}
            strokeWidth={0.5}
          />
        )
      }),
    [mapBounds, walkableZones],
  )

  const blockedRects = useMemo(
    () =>
      blockedZones.map((zone) => {
        const projected = projectRect(zone, mapBounds)

        return (
          <rect
            key={zone.id}
            x={projected.x}
            y={projected.y}
            width={projected.width}
            height={projected.height}
            rx={1.1}
            fill={zone.color}
            fillOpacity={0.26}
            stroke={zone.color}
            strokeOpacity={0.95}
            strokeWidth={0.5}
          />
        )
      }),
    [blockedZones, mapBounds],
  )

  const spawnPoint = projectPoint(spawn, mapBounds)
  const playerPoint = projectPoint(playerPosition, mapBounds)
  const npcPoint = projectPoint(npc, mapBounds)
  const spawnYaw = degToRad(spawn.yawDegrees)
  const spawnArrow = {
    x2: spawnPoint.x - Math.sin(spawnYaw) * 5.2,
    y2: spawnPoint.y - Math.cos(spawnYaw) * 5.2,
  }

  if (!showCalibrationMap) {
    return null
  }

  return (
    <div className="calibration-map">
      <div className="calibration-map__header">
        <div>
          <p className="calibration-map__eyebrow">Calibration</p>
          <h3>Top-down room fit</h3>
        </div>
        <span>{assetFloorSamples.length > 0 ? 'SPZ sampled' : 'Waiting for SPZ'}</span>
      </div>

      <svg className="calibration-map__surface" viewBox="0 0 100 100" aria-label="Top-down room calibration map">
        <rect x="0" y="0" width="100" height="100" rx="3.5" className="calibration-map__frame" />

        <g className="calibration-map__samples">{sampleDots}</g>
        <rect
          x={roomRect.x}
          y={roomRect.y}
          width={roomRect.width}
          height={roomRect.height}
          rx={1.3}
          className="calibration-map__room"
        />

        <g>{walkableRects}</g>
        <g>{blockedRects}</g>

        <line
          x1={spawnPoint.x}
          y1={spawnPoint.y}
          x2={spawnArrow.x2}
          y2={spawnArrow.y2}
          className="calibration-map__spawn-arrow"
        />

        <circle cx={spawnPoint.x} cy={spawnPoint.y} r="1.4" className="calibration-map__spawn" />
        <circle cx={npcPoint.x} cy={npcPoint.y} r="1.5" className="calibration-map__npc" />
        <circle cx={playerPoint.x} cy={playerPoint.y} r="1.2" className="calibration-map__player" />
      </svg>

      <div className="calibration-map__legend">
        <span><i className="calibration-map__swatch calibration-map__swatch--samples" /> floor points</span>
        <span><i className="calibration-map__swatch calibration-map__swatch--walkable" /> walkable</span>
        <span><i className="calibration-map__swatch calibration-map__swatch--blocked" /> blocked</span>
        <span><i className="calibration-map__swatch calibration-map__swatch--player" /> player</span>
      </div>
    </div>
  )
}
