import { describe, expect, it } from 'vitest'
import { resolvePlanarMovement } from '../src/features/player/collision'
import { getMovementDelta } from '../src/features/player/movement'
import { premiumBoutiqueSpzPreset } from '../src/config/presets/premiumBoutiqueSpzPreset'
import { intersectsBlockedZones, isPointInsideAnyWalkableZone } from '../src/lib/bounds2d'
import type { BlockedZone, WalkableZone } from '../src/lib/types'

const walkableZones = Object.values(premiumBoutiqueSpzPreset.walkableZones)
const blockedZones = Object.values(premiumBoutiqueSpzPreset.blockedZones)

describe('premium boutique movement rules', () => {
  it('keeps the saved spawn inside the playable corridor and outside blockers', () => {
    expect(
      isPointInsideAnyWalkableZone(
        premiumBoutiqueSpzPreset.spawn,
        premiumBoutiqueSpzPreset.playerRadius,
        walkableZones,
      ),
    ).toBe(true)

    expect(
      intersectsBlockedZones(
        premiumBoutiqueSpzPreset.spawn,
        premiumBoutiqueSpzPreset.playerRadius,
        blockedZones,
      ),
    ).toBe(false)
  })

  it('moves forward on the floor plane without reversing W and S', () => {
    const delta = getMovementDelta(
      {
        forward: true,
        backward: false,
        left: false,
        right: false,
      },
      0,
      2.5,
      1,
    )

    expect(delta.x).toBeCloseTo(0)
    expect(delta.z).toBeCloseTo(-2.5)
  })

  it('normalizes diagonal movement speed', () => {
    const delta = getMovementDelta(
      {
        forward: true,
        backward: false,
        left: false,
        right: true,
      },
      0,
      2.5,
      1,
    )

    expect(Math.hypot(delta.x, delta.z)).toBeCloseTo(2.5)
  })

  it('prevents the player from walking through the tasting pedestal', () => {
    const start = { x: 0, z: -1.2 }

    const resolved = resolvePlanarMovement(
      start,
      { x: 0, z: 1 },
      premiumBoutiqueSpzPreset.roomBounds,
      walkableZones,
      blockedZones,
      premiumBoutiqueSpzPreset.playerRadius,
    )

    expect(resolved.x).toBeCloseTo(start.x)
    expect(resolved.z).toBeCloseTo(start.z)
  })

  it('slides along blockers instead of tunneling through them', () => {
    const start = { x: 0.7, z: -1.2 }

    const resolved = resolvePlanarMovement(
      start,
      { x: -0.7, z: 0.9 },
      premiumBoutiqueSpzPreset.roomBounds,
      walkableZones,
      blockedZones,
      premiumBoutiqueSpzPreset.playerRadius,
    )

    expect(resolved.x).toBeCloseTo(0)
    expect(resolved.z).toBeCloseTo(start.z)
  })
})

describe('planar collision helpers', () => {
  const simpleBounds = {
    minX: -1,
    maxX: 1,
    minZ: -1,
    maxZ: 1,
  }

  const simpleWalkableZones: WalkableZone[] = [
    {
      id: 'centralCorridor',
      label: 'Simple room',
      x: 0,
      z: 0,
      width: 2,
      depth: 2,
      color: '#ffffff',
    },
  ]

  const noBlockedZones: BlockedZone[] = []

  it('clamps movement to room bounds while keeping the player radius inside', () => {
    const resolved = resolvePlanarMovement(
      { x: 0, z: 0 },
      { x: 4, z: 4 },
      simpleBounds,
      simpleWalkableZones,
      noBlockedZones,
      0.25,
    )

    expect(resolved.x).toBeCloseTo(0.75)
    expect(resolved.z).toBeCloseTo(0.75)
  })
})
