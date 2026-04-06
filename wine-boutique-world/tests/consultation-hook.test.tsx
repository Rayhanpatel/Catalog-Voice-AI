// @vitest-environment jsdom

import { act, useEffect } from 'react'
import { createRoot } from 'react-dom/client'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

const voiceMocks = vi.hoisted(() => ({
  startHandsFreeInput: vi.fn().mockResolvedValue(undefined),
  stopHandsFreeInput: vi.fn(),
  resetSpeechInputRuntimeState: vi.fn(),
  resetSpeechRuntimeState: vi.fn(),
  primeSpeechSynthesisVoices: vi.fn(),
  stopSpeaking: vi.fn(),
}))

vi.mock('../src/features/npc/consultation/llm', () => ({
  askWineQuestionStream: vi.fn(),
}))

vi.mock('../src/features/npc/consultation/wineCatalog', () => ({
  buildRecommendationTurnResult: vi.fn(),
  buildWineCatalog: vi.fn(),
  getTopWinesByScore: vi.fn().mockReturnValue([]),
  loadWines: vi.fn().mockResolvedValue([]),
  normalizeWineSpeechTranscript: vi.fn((text: string) => text),
  parseQuery: vi.fn().mockReturnValue({}),
  retrieveRelevantWines: vi.fn().mockReturnValue({
    matches: [],
    appliedFilters: {},
    relaxedConstraints: [],
    retrievalNote: null,
    spokenPreface: null,
    hasExactMatches: true,
    candidateIds: [],
  }),
}))

vi.mock('../src/features/npc/interactionShell', () => ({
  SOMMELIER_GREETING: 'Welcome in. Tell me what you enjoy.',
}))

vi.mock('../src/features/npc/consultation/voice', () => ({
  createProgressiveSpeaker: vi.fn(() => ({
    feed: vi.fn(),
    finish: vi.fn(),
    stop: vi.fn(),
    isActive: vi.fn(() => false),
  })),
  getPreferredSpeechInputLanguage: vi.fn(() => 'auto'),
  getSpeechInputRuntimeState: vi.fn(() => ({
    isRecording: false,
    isTranscribing: false,
    inputMode: 'browser',
    lastInputError: null,
    languageProfile: 'auto',
  })),
  getSpeechRuntimeState: vi.fn(() => ({
    isSpeaking: false,
    speechMode: 'cloud',
    lastSpeechError: null,
  })),
  isHandsFreeInputSupported: vi.fn(() => true),
  pauseHandsFreeInput: vi.fn(),
  primeSpeechSynthesisVoices: voiceMocks.primeSpeechSynthesisVoices,
  resetSpeechInputRuntimeState: voiceMocks.resetSpeechInputRuntimeState,
  resetSpeechRuntimeState: voiceMocks.resetSpeechRuntimeState,
  resumeHandsFreeInput: vi.fn(),
  setSpeechInputProfile: vi.fn().mockResolvedValue(undefined),
  startHandsFreeInput: voiceMocks.startHandsFreeInput,
  stopHandsFreeInput: voiceMocks.stopHandsFreeInput,
  subscribeSpeechInputRuntime: vi.fn(() => () => {}),
  stopSpeaking: voiceMocks.stopSpeaking,
  subscribeSpeechRuntime: vi.fn(() => () => {}),
}))

import { useSommelierConsultation } from '../src/features/npc/consultation/useSommelierConsultation'

function createHarness() {
  const consultationRef: { current: ReturnType<typeof useSommelierConsultation> | null } = {
    current: null,
  }

  function Harness() {
    const consultation = useSommelierConsultation()

    useEffect(() => {
      consultationRef.current = consultation
    }, [consultation])

    return null
  }

  const container = document.createElement('div')
  document.body.appendChild(container)
  const root = createRoot(container)

  act(() => {
    root.render(<Harness />)
  })

  return {
    get consultation() {
      if (!consultationRef.current) {
        throw new Error('Consultation hook did not mount.')
      }

      return consultationRef.current
    },
    rerender() {
      act(() => {
        root.render(<Harness />)
      })
    },
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
  vi.clearAllMocks()
})

afterEach(() => {
  document.body.innerHTML = ''
  vi.clearAllMocks()
})

describe('useSommelierConsultation mic toggling', () => {
  it('restarts hands-free input when the mic is turned back on', async () => {
    const harness = createHarness()

    await act(async () => {
      await harness.consultation.open()
    })

    expect(voiceMocks.startHandsFreeInput).toHaveBeenCalledTimes(1)

    act(() => {
      harness.consultation.setHandsFreeListening(false)
    })

    harness.rerender()

    act(() => {
      harness.consultation.setHandsFreeListening(true)
    })

    expect(voiceMocks.startHandsFreeInput).toHaveBeenCalledTimes(2)
    expect(voiceMocks.stopHandsFreeInput).toHaveBeenCalled()

    harness.unmount()
  })
})
