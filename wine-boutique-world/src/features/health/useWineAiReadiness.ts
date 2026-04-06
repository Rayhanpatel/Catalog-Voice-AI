import { useEffect, useState } from 'react'
import type { WineAiProxyHealth } from '@wine-voice-ai/wine-ai-core'

interface WineAiReadinessState {
  label: string
  tone: 'info' | 'ready' | 'warning'
  health: WineAiProxyHealth | null
}

const defaultState: WineAiReadinessState = {
  label: 'Checking natural voice readiness',
  tone: 'info',
  health: null,
}

export function useWineAiReadiness() {
  const [state, setState] = useState<WineAiReadinessState>(defaultState)

  useEffect(() => {
    let cancelled = false

    void (async () => {
      try {
        const response = await fetch('/api/health', {
          headers: {
            Accept: 'application/json',
          },
        })
        const health = (await response.json()) as WineAiProxyHealth

        if (cancelled) {
          return
        }

        const vertexReady = health.capabilities?.vertex?.ready ?? false
        const ttsReady = health.capabilities?.tts?.ready ?? false
        const allReady = vertexReady && ttsReady

        setState({
          health,
          label: allReady
            ? 'AI + natural voice ready'
            : 'AI stack partially ready',
          tone: allReady ? 'ready' : 'warning',
        })
      } catch (error) {
        if (cancelled) {
          return
        }

        console.error('Wine AI readiness check failed.', error)
        setState({
          health: null,
          label: 'AI readiness check unavailable',
          tone: 'warning',
        })
      }
    })()

    return () => {
      cancelled = true
    }
  }, [])

  return state
}
