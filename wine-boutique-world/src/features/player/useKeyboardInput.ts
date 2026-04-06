import { useEffect, useRef } from 'react'

export interface MovementKeyState {
  forward: boolean
  backward: boolean
  left: boolean
  right: boolean
}

const defaultKeyState: MovementKeyState = {
  forward: false,
  backward: false,
  left: false,
  right: false,
}

const keyBindings: Record<string, keyof MovementKeyState> = {
  ArrowDown: 'backward',
  ArrowLeft: 'left',
  ArrowRight: 'right',
  ArrowUp: 'forward',
  KeyA: 'left',
  KeyD: 'right',
  KeyS: 'backward',
  KeyW: 'forward',
}

export function useKeyboardInput(disabled = false) {
  const keysRef = useRef<MovementKeyState>({ ...defaultKeyState })

  useEffect(() => {
    if (!disabled) {
      return
    }

    keysRef.current = { ...defaultKeyState }
  }, [disabled])

  useEffect(() => {
    function updateKeyState(event: KeyboardEvent, isPressed: boolean) {
      const binding = keyBindings[event.code]

      if (!binding) {
        return
      }

      if (disabled) {
        keysRef.current = { ...defaultKeyState }
        return
      }

      keysRef.current[binding] = isPressed

      if (event.target instanceof HTMLElement && event.target.tagName !== 'BODY') {
        return
      }

      event.preventDefault()
    }

    const handleKeyDown = (event: KeyboardEvent) => updateKeyState(event, true)
    const handleKeyUp = (event: KeyboardEvent) => updateKeyState(event, false)

    window.addEventListener('keydown', handleKeyDown)
    window.addEventListener('keyup', handleKeyUp)

    return () => {
      window.removeEventListener('keydown', handleKeyDown)
      window.removeEventListener('keyup', handleKeyUp)
    }
  }, [disabled])

  return keysRef
}
