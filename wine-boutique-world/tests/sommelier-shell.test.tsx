// @vitest-environment jsdom

import { act, type ReactNode } from 'react'
import { createRoot } from 'react-dom/client'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { useTuningStore } from '../src/features/debug/tuningStore'

function createConsultationMock() {
  return {
    messages: [],
    interimText: '',
    isListening: true,
    isRecording: false,
    isTranscribing: false,
    isThinking: false,
    isSpeaking: false,
    streamingText: '',
    error: null,
    stage: 'listening',
    textInput: '',
    setTextInput: vi.fn(),
    wines: [],
    voiceSupported: true,
    catalogReady: true,
    activeFilters: null,
    handsFreeEnabled: true,
    speechInputLanguage: 'auto',
    speechInputMode: 'browser',
    lastInputError: null,
    speechMode: 'cloud',
    lastSpeechError: null,
    open: vi.fn().mockResolvedValue(undefined),
    close: vi.fn(),
    startGreeting: vi.fn(),
    submitQuestion: vi.fn(),
    stopSpeaking: vi.fn(),
    resetSession: vi.fn(),
    setHandsFreeListening: vi.fn(),
    setSpeechInputLanguage: vi.fn(),
    restartSession: vi.fn().mockResolvedValue(undefined),
  }
}

let consultationMock: ReturnType<typeof createConsultationMock>

vi.mock('../src/features/npc/consultation/useSommelierConsultation', () => ({
  useSommelierConsultation: () => consultationMock,
}))

import { SommelierInteractionShell } from '../src/features/npc/SommelierInteractionShell'

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
  consultationMock = createConsultationMock()

  useTuningStore.setState((state) => ({
    ...state,
    runtime: {
      ...state.runtime,
      activeInteraction: 'sommelier',
    },
  }))
})

afterEach(() => {
  document.body.innerHTML = ''
  vi.clearAllMocks()
})

describe('sommelier interaction shell', () => {
  it('opens on mount and closes on unmount', async () => {
    const view = render(<SommelierInteractionShell />)

    expect(consultationMock.open).toHaveBeenCalledTimes(1)

    view.unmount()

    expect(consultationMock.close).toHaveBeenCalled()
  })

  it('renders stop-audio controls and grouped wine cards for assistant messages', () => {
    consultationMock.isSpeaking = true
    consultationMock.stage = 'speaking'
    consultationMock.messages = [
      {
        id: 'assistant-1',
        role: 'assistant',
        text: 'Here are two polished reds under your budget.',
        wines: [
          {
            name: 'ALLEGRINI PALAZZO DELLA TORRE',
            price: 24.99,
            color: 'red',
            region: 'veneto',
            varietal: 'red blend',
            ratings: [{ score: 93, note: 'Rich cherry and cocoa.' }],
          },
        ],
      },
    ]

    const view = render(<SommelierInteractionShell />)

    expect(view.container.textContent).toContain('Stop audio')
    expect(view.container.textContent).toContain('Speaking - say anything to interrupt')
    expect(view.container.textContent).toContain('ALLEGRINI PALAZZO DELLA TORRE')
    expect(view.container.querySelectorAll('.consultation-wine-card').length).toBe(1)

    view.unmount()
  })

  it('toggles the hands-free mic without resetting the transcript', () => {
    consultationMock.messages = [
      {
        id: 'assistant-1',
        role: 'assistant',
        text: 'Your transcript stays here while the mic is paused.',
      },
    ]

    const view = render(<SommelierInteractionShell />)
    const micButton = Array.from(view.container.querySelectorAll('button')).find((button) => button.textContent === 'Mic on')

    expect(micButton).toBeTruthy()

    act(() => {
      micButton?.dispatchEvent(new MouseEvent('click', { bubbles: true }))
    })

    expect(consultationMock.setHandsFreeListening).toHaveBeenCalledWith(false)
    expect(consultationMock.resetSession).not.toHaveBeenCalled()
    expect(view.container.textContent).toContain('Your transcript stays here while the mic is paused.')

    view.unmount()
  })

  it('changes speech input language without resetting the transcript', () => {
    consultationMock.messages = [
      {
        id: 'assistant-1',
        role: 'assistant',
        text: 'Switching the speech profile should keep the transcript in place.',
      },
    ]

    const view = render(<SommelierInteractionShell />)
    const languageSelect = view.container.querySelector('.consultation-select') as HTMLSelectElement | null

    expect(languageSelect).toBeTruthy()

    act(() => {
      languageSelect!.value = 'en-IN'
      languageSelect!.dispatchEvent(new Event('change', { bubbles: true }))
    })

    expect(consultationMock.setSpeechInputLanguage).toHaveBeenCalledWith('en-IN')
    expect(consultationMock.resetSession).not.toHaveBeenCalled()
    expect(view.container.textContent).toContain('Switching the speech profile should keep the transcript in place.')

    view.unmount()
  })

  it('shows the natural-voice warning without hiding the transcript', () => {
    consultationMock.speechMode = 'unavailable'
    consultationMock.lastSpeechError = 'Cloud TTS error 401'
    consultationMock.messages = [
      {
        id: 'assistant-1',
        role: 'assistant',
        text: 'I can still help in text while the natural voice comes back.',
      },
    ]

    const view = render(<SommelierInteractionShell />)

    expect(view.container.textContent).toContain('Natural voice unavailable')
    expect(view.container.textContent).toContain('I can still help in text while the natural voice comes back.')

    view.unmount()
  })

  it('shows a speech-input warning without clearing the transcript', () => {
    consultationMock.speechInputMode = 'unavailable'
    consultationMock.lastInputError = 'That speech input profile is not available in this browser.'
    consultationMock.messages = [
      {
        id: 'assistant-1',
        role: 'assistant',
        text: 'You can still keep typing while the mic setting is adjusted.',
      },
    ]

    const view = render(<SommelierInteractionShell />)

    expect(view.container.textContent).toContain('Speech input unavailable')
    expect(view.container.textContent).toContain('You can still keep typing while the mic setting is adjusted.')

    view.unmount()
  })

  it('hides mic controls and shows text-only guidance when browser voice input is unsupported', () => {
    consultationMock.voiceSupported = false

    const view = render(<SommelierInteractionShell />)

    expect(view.container.textContent).toContain('Text consultation ready')
    expect(view.container.textContent).toContain('Voice input works in Chrome for this demo. You can keep typing here.')
    expect(Array.from(view.container.querySelectorAll('button')).some((button) => button.textContent === 'Mic on')).toBe(false)

    view.unmount()
  })
})
