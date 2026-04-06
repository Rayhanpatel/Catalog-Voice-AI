import { useEffect, useEffectEvent, type MutableRefObject } from 'react'
import { clamp } from '../../lib/math'

interface UsePointerLookOptions {
  domElement: HTMLElement | null
  targetYawRef: MutableRefObject<number>
  targetPitchRef: MutableRefObject<number>
  minPitch: number
  maxPitch: number
  sensitivity: number
  onLockChange?: (locked: boolean) => void
}

export function usePointerLook({
  domElement,
  targetYawRef,
  targetPitchRef,
  minPitch,
  maxPitch,
  sensitivity,
  onLockChange,
}: UsePointerLookOptions) {
  const emitLockChange = useEffectEvent((locked: boolean) => {
    onLockChange?.(locked)
  })

  useEffect(() => {
    if (!domElement) {
      return
    }

    const requestLock = () => {
      if (document.pointerLockElement !== domElement) {
        void domElement.requestPointerLock()
      }
    }

    const handleMouseMove = (event: MouseEvent) => {
      if (document.pointerLockElement !== domElement) {
        return
      }

      targetYawRef.current -= event.movementX * sensitivity
      targetPitchRef.current = clamp(targetPitchRef.current - event.movementY * sensitivity, minPitch, maxPitch)
    }

    const handlePointerLockChange = () => {
      emitLockChange(document.pointerLockElement === domElement)
    }

    domElement.addEventListener('click', requestLock)
    document.addEventListener('mousemove', handleMouseMove)
    document.addEventListener('pointerlockchange', handlePointerLockChange)

    return () => {
      domElement.removeEventListener('click', requestLock)
      document.removeEventListener('mousemove', handleMouseMove)
      document.removeEventListener('pointerlockchange', handlePointerLockChange)
    }
  }, [domElement, maxPitch, minPitch, sensitivity, targetPitchRef, targetYawRef])
}
