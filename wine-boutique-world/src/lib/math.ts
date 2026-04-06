import { MathUtils } from 'three'
import type { PlanarPoint } from './types'

export const clamp = MathUtils.clamp
export const degToRad = MathUtils.degToRad

export function rotatePlanarPoint(point: PlanarPoint, yawRadians: number): PlanarPoint {
  const cos = Math.cos(yawRadians)
  const sin = Math.sin(yawRadians)

  return {
    x: point.x * cos - point.z * sin,
    z: point.x * sin + point.z * cos,
  }
}

export function transformPlanarPoint(
  point: PlanarPoint,
  scale: number,
  yawRadians: number,
  offsetX: number,
  offsetZ: number,
): PlanarPoint {
  const scaled = {
    x: point.x * scale,
    z: point.z * scale,
  }
  const rotated = rotatePlanarPoint(scaled, yawRadians)

  return {
    x: rotated.x + offsetX,
    z: rotated.z + offsetZ,
  }
}

export function distanceSquared2D(a: PlanarPoint, b: PlanarPoint) {
  const dx = a.x - b.x
  const dz = a.z - b.z
  return dx * dx + dz * dz
}
