// @vitest-environment jsdom

import { act, type ReactNode } from 'react'
import { createRoot } from 'react-dom/client'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { App } from '../src/app/App'
import { useTuningStore } from '../src/features/debug/tuningStore'

class AudioMock {
  loop = false
  preload = 'auto'
  volume = 1
  paused = true
  src = ''
  private listeners = new Map<string, Set<() => void>>()

  constructor(src?: string) {
    this.src = src ?? ''
  }

  play() {
    this.paused = false
    this.listeners.get('play')?.forEach((listener) => listener())
    return Promise.resolve()
  }

  pause() {
    this.paused = true
    this.listeners.get('pause')?.forEach((listener) => listener())
  }

  addEventListener(type: string, listener: () => void) {
    const listenersForType = this.listeners.get(type) ?? new Set<() => void>()
    listenersForType.add(listener)
    this.listeners.set(type, listenersForType)
  }

  removeEventListener(type: string, listener: () => void) {
    this.listeners.get(type)?.delete(listener)
  }
}

vi.mock('@react-three/fiber', () => ({
  Canvas: ({ children }: { children: unknown }) => <div data-testid="canvas">{children}</div>,
}))

vi.mock('../src/features/world/BoutiqueScene', () => ({
  BoutiqueScene: () => <div data-testid="scene">scene</div>,
}))

vi.mock('../src/features/npc/SommelierInteractionShell', () => ({
  SommelierInteractionShell: () => <div data-testid="consultation-shell">consultation</div>,
}))

vi.mock('../src/features/debug/DeveloperTools', () => ({
  default: () => <div data-testid="developer-tools">dev</div>,
}))

function render(element: ReactNode) {
  const container = document.createElement('div')
  document.body.appendChild(container)
  const root = createRoot(container)

  act(() => {
    root.render(element)
  })

  return {
    container,
    unmount() {
      act(() => {
        root.unmount()
      })
      container.remove()
    },
  }
}

beforeEach(() => {
  ;(globalThis as typeof globalThis & { IS_REACT_ACT_ENVIRONMENT?: boolean }).IS_REACT_ACT_ENVIRONMENT = true
  Element.prototype.scrollIntoView = vi.fn()
  vi.stubGlobal('Audio', AudioMock)
  vi.stubGlobal(
    'fetch',
    vi.fn().mockResolvedValue({
      json: async () => ({
        ok: true,
        projectId: 'wine-voice-explorer',
        authenticated: true,
        capabilities: {
          vertex: {
            ready: true,
            message: 'Vertex AI is reachable.',
          },
          tts: {
            ready: true,
            message: 'Cloud TTS is reachable.',
          },
          stt: {
            ready: true,
            message: 'Cloud STT is reachable.',
          },
        },
        routes: {
          vertex: true,
          tts: true,
          stt: true,
          wineImage: true,
        },
        checkedAt: new Date().toISOString(),
        message: 'ready',
      }),
    }),
  )
  useTuningStore.setState((state) => ({
    ...state,
    worldAsset: {
      ...state.worldAsset,
      enabled: false,
    },
    runtime: {
      ...state.runtime,
      pointerLocked: false,
      canTalkToSommelier: true,
      activeInteraction: 'sommelier',
      worldAssetStatus: 'fallback',
      worldAssetMessage: 'Presentation shell ready',
      sommelierLoadState: 'loaded',
      developerMode: false,
      smokeMode: false,
    },
  }))
})

afterEach(() => {
  document.body.innerHTML = ''
  vi.unstubAllGlobals()
  vi.clearAllMocks()
})

describe('app shell consultation gating', () => {
  it('hides onboarding and proximity prompts while the consultation is open', async () => {
    const view = render(<App />)

    await act(async () => {
      await Promise.resolve()
    })

    expect(view.container.textContent).not.toContain('Click inside the scene to step in')
    expect(view.container.textContent).not.toContain('Press EStart tasting consultation')
    expect(view.container.textContent).toContain('Private Tasting Room')
    expect(view.container.textContent).toContain('Midnight in Garda')
    expect(view.container.textContent).toContain('AI + natural voice ready')

    view.unmount()
  })
})
