// @vitest-environment jsdom

import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import {
  createProgressiveSpeaker,
  getSpeechRuntimeState,
  resetSpeechRuntimeState,
  subscribeSpeechRuntime,
} from '@wine-voice-ai/wine-ai-core'

class AudioMock {
  src = ''
  onended: ((event: Event) => void) | null = null
  onerror: ((event: Event) => void) | null = null

  constructor(src = '') {
    this.src = src
  }

  play() {
    setTimeout(() => {
      this.onended?.(new Event('ended'))
    }, 0)
    return Promise.resolve()
  }

  pause() {}
}

class MockSpeechRecognition {
  static instances: MockSpeechRecognition[] = []

  continuous = false
  interimResults = false
  lang = 'en-US'
  maxAlternatives = 1
  onstart: ((event: Event) => void) | null = null
  onresult: ((event: Event) => void) | null = null
  onerror: ((event: Event) => void) | null = null
  onend: ((event: Event) => void) | null = null
  startCount = 0
  stopCount = 0
  abortCount = 0

  constructor() {
    MockSpeechRecognition.instances.push(this)
  }

  start() {
    this.startCount += 1
    queueMicrotask(() => {
      this.onstart?.(new Event('start'))
    })
  }

  stop() {
    this.stopCount += 1
    queueMicrotask(() => {
      this.onend?.(new Event('end'))
    })
  }

  abort() {
    this.abortCount += 1
    queueMicrotask(() => {
      this.onend?.(new Event('end'))
    })
  }

  emitResult(
    transcript: string,
    {
      isFinal = true,
      resultIndex = 0,
      alternatives = [],
    }: { isFinal?: boolean; resultIndex?: number; alternatives?: string[] } = {},
  ) {
    const allAlternatives = [transcript, ...alternatives].map((candidate) => ({
      transcript: candidate,
    }))

    this.onresult?.({
      resultIndex,
      results: [
        {
          ...allAlternatives,
          isFinal,
          length: allAlternatives.length,
        },
      ],
    } as unknown as Event)
  }
}

async function flushAsyncWork() {
  await vi.advanceTimersByTimeAsync(10)
  await Promise.resolve()
  await Promise.resolve()
}

async function importFreshVoiceModule() {
  vi.resetModules()
  MockSpeechRecognition.instances = []

  Object.defineProperty(window, 'webkitSpeechRecognition', {
    configurable: true,
    value: MockSpeechRecognition,
  })

  return import('@wine-voice-ai/wine-ai-core')
}

beforeEach(() => {
  vi.useFakeTimers()
  vi.stubGlobal('Audio', AudioMock)
  resetSpeechRuntimeState()
})

afterEach(() => {
  vi.useRealTimers()
  vi.unstubAllGlobals()
  vi.restoreAllMocks()
  delete (window as Window & { webkitSpeechRecognition?: unknown }).webkitSpeechRecognition
  resetSpeechRuntimeState()
})

describe('shared speech runtime state', () => {
  it('reports cloud mode for successful boutique speech playback', async () => {
    vi.stubGlobal(
      'fetch',
      vi.fn().mockResolvedValue({
        ok: true,
        json: async () => ({
          audioContent: 'b2s=',
        }),
      }),
    )

    const snapshots = []
    const unsubscribe = subscribeSpeechRuntime((state) => {
      snapshots.push(state)
    })
    const speaker = createProgressiveSpeaker({ fallbackMode: 'none' })

    speaker.feed('Welcome in.')
    speaker.finish()

    await flushAsyncWork()
    unsubscribe()

    expect(getSpeechRuntimeState().speechMode).toBe('cloud')
    expect(getSpeechRuntimeState().lastSpeechError).toBeNull()
    expect(snapshots.some((state) => state.isSpeaking)).toBe(true)
    expect(getSpeechRuntimeState().isSpeaking).toBe(false)
  })

  it('marks speech unavailable when cloud TTS fails and boutique fallback is disabled', async () => {
    const onError = vi.fn()

    vi.stubGlobal(
      'fetch',
      vi.fn().mockResolvedValue({
        ok: false,
        status: 503,
        text: async () => 'unavailable',
      }),
    )

    const speaker = createProgressiveSpeaker({
      fallbackMode: 'none',
      onError,
    })

    speaker.feed('Hello there.')
    speaker.finish()

    await flushAsyncWork()

    expect(onError).toHaveBeenCalled()
    expect(getSpeechRuntimeState().speechMode).toBe('unavailable')
    expect(getSpeechRuntimeState().lastSpeechError).toContain('Cloud TTS error 503')
    expect(getSpeechRuntimeState().isSpeaking).toBe(false)
  })

  it('keeps hands-free input alive across en-US to en-IN to en-US profile switches', async () => {
    const {
      getSpeechInputRuntimeState,
      setSpeechInputProfile,
      startHandsFreeInput,
      stopHandsFreeInput,
    } = await importFreshVoiceModule()

    await startHandsFreeInput({
      languageProfile: 'en-US',
    })

    expect(getSpeechInputRuntimeState().languageProfile).toBe('en-US')
    expect(getSpeechInputRuntimeState().inputMode).toBe('browser')

    await setSpeechInputProfile('en-IN')
    expect(getSpeechInputRuntimeState().languageProfile).toBe('en-IN')
    expect(getSpeechInputRuntimeState().inputMode).toBe('browser')

    await setSpeechInputProfile('en-US')
    expect(getSpeechInputRuntimeState().languageProfile).toBe('en-US')
    expect(getSpeechInputRuntimeState().inputMode).toBe('browser')
    expect(getSpeechInputRuntimeState().lastInputError).toBeNull()
    expect(MockSpeechRecognition.instances.length).toBeGreaterThanOrEqual(3)

    stopHandsFreeInput()
  })

  it('recovers cleanly when hands-free input is stopped and started again', async () => {
    const {
      getSpeechInputRuntimeState,
      startHandsFreeInput,
      stopHandsFreeInput,
      resetSpeechInputRuntimeState,
    } = await importFreshVoiceModule()

    await startHandsFreeInput({
      languageProfile: 'en-US',
    })

    expect(getSpeechInputRuntimeState().inputMode).toBe('browser')
    stopHandsFreeInput()
    resetSpeechInputRuntimeState()

    expect(getSpeechInputRuntimeState().isRecording).toBe(false)
    expect(getSpeechInputRuntimeState().isTranscribing).toBe(false)
    expect(getSpeechInputRuntimeState().inputMode).toBe('browser')

    await startHandsFreeInput({
      languageProfile: 'en-US',
    })

    expect(getSpeechInputRuntimeState().inputMode).toBe('browser')
    expect(getSpeechInputRuntimeState().lastInputError).toBeNull()

    stopHandsFreeInput()
  })

  it('keeps the recognizer alive during suppression and captures the interrupting utterance', async () => {
    const {
      getSpeechInputRuntimeState,
      pauseHandsFreeInput,
      resumeHandsFreeInput,
      startHandsFreeInput,
      stopHandsFreeInput,
    } = await importFreshVoiceModule()

    const onSpeechStart = vi.fn(() => {
      resumeHandsFreeInput()
    })
    const onInterim = vi.fn()
    const onSilence = vi.fn()

    await startHandsFreeInput({
      languageProfile: 'en-US',
      onSpeechStart,
      onInterim,
      onSilence,
    })

    const recognizer = MockSpeechRecognition.instances.at(-1)
    expect(recognizer).toBeTruthy()
    expect(getSpeechInputRuntimeState().isRecording).toBe(true)

    pauseHandsFreeInput()

    expect(recognizer?.abortCount ?? 0).toBe(0)
    expect(getSpeechInputRuntimeState().isRecording).toBe(true)

    recognizer?.emitResult('worth it', { isFinal: true })

    expect(onSpeechStart).toHaveBeenCalledTimes(1)
    expect(onInterim).toHaveBeenCalledWith('worth it')

    await vi.advanceTimersByTimeAsync(1600)

    expect(onSilence).toHaveBeenCalledWith('worth it')

    stopHandsFreeInput()
  })

  it('marks active browser speech as transcribing until silence submission completes', async () => {
    const {
      getSpeechInputRuntimeState,
      startHandsFreeInput,
      stopHandsFreeInput,
    } = await importFreshVoiceModule()

    const onSilence = vi.fn()

    await startHandsFreeInput({
      languageProfile: 'en-US',
      onSilence,
    })

    const recognizer = MockSpeechRecognition.instances.at(-1)
    expect(recognizer).toBeTruthy()

    recognizer?.emitResult('I want a red under 50', { isFinal: true })

    expect(getSpeechInputRuntimeState().isRecording).toBe(true)
    expect(getSpeechInputRuntimeState().isTranscribing).toBe(true)

    await vi.advanceTimersByTimeAsync(1700)

    expect(onSilence).toHaveBeenCalledWith('I want a red under 50')
    expect(getSpeechInputRuntimeState().isTranscribing).toBe(false)

    stopHandsFreeInput()
  })

  it('prefers a wine-aware browser alternative when recognition supplies more than one guess', async () => {
    const {
      startHandsFreeInput,
      stopHandsFreeInput,
    } = await importFreshVoiceModule()

    const onSilence = vi.fn()

    await startHandsFreeInput({
      languageProfile: 'en-US',
      onSilence,
    })

    const recognizer = MockSpeechRecognition.instances.at(-1)
    expect(recognizer).toBeTruthy()

    recognizer?.emitResult('what do you have from bird gundy', {
      isFinal: true,
      alternatives: ['what do you have from burgundy'],
    })

    await vi.advanceTimersByTimeAsync(1700)

    expect(onSilence).toHaveBeenCalledWith('what do you have from burgundy')

    stopHandsFreeInput()
  })
})
