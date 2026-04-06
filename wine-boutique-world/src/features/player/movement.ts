import type { MovementKeyState } from './useKeyboardInput'
import type { PlanarPoint } from '../../lib/types'

export function getMovementDelta(
  keys: MovementKeyState,
  yaw: number,
  speed: number,
  deltaSeconds: number,
): PlanarPoint {
  const forwardAxis = Number(keys.forward) - Number(keys.backward)
  const strafeAxis = Number(keys.right) - Number(keys.left)

  if (forwardAxis === 0 && strafeAxis === 0) {
    return { x: 0, z: 0 }
  }

  const length = Math.hypot(strafeAxis, forwardAxis) || 1
  const normalizedStrafe = strafeAxis / length
  const normalizedForward = forwardAxis / length
  const distance = speed * deltaSeconds

  return {
    x: (Math.cos(yaw) * normalizedStrafe - Math.sin(yaw) * normalizedForward) * distance,
    z: (-Math.sin(yaw) * normalizedStrafe - Math.cos(yaw) * normalizedForward) * distance,
  }
}
