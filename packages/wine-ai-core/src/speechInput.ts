import { normalizeWineSpeechTranscript } from './catalog'
import type { SpeechInputRuntimeState, SpeechRecognitionLanguageOption } from './types'

interface SpeechRecognitionConstructor {
  new (): SpeechRecognition
}

interface SpeechRecognitionAlternative {
  transcript: string
  confidence?: number
}

interface SpeechRecognitionResultLike {
  isFinal: boolean
  length: number
  [index: number]: SpeechRecognitionAlternative
}

interface SpeechRecognitionEventLike extends Event {
  resultIndex: number
  results: ArrayLike<SpeechRecognitionResultLike>
}

interface SpeechRecognitionErrorEventLike extends Event {
  error: string
}

interface SpeechRecognition extends EventTarget {
  continuous: boolean
  interimResults: boolean
  lang: string
  maxAlternatives: number
  onstart: ((event: Event) => void) | null
  onresult: ((event: SpeechRecognitionEventLike) => void) | null
  onerror: ((event: SpeechRecognitionErrorEventLike) => void) | null
  onend: ((event: Event) => void) | null
  start: () => void
  stop: () => void
  abort: () => void
}

type WindowWithSpeechRecognition = Window & {
  SpeechRecognition?: SpeechRecognitionConstructor
  webkitSpeechRecognition?: SpeechRecognitionConstructor
}

interface HandsFreeInputOptions {
  onSpeechStart?: () => void
  onInterim?: (text: string) => void
  onSilence?: (text: string) => void
  onError?: (error: Error) => void
  languageProfile?: string
}

interface ContinuousListeningOptions {
  onSpeechStart?: () => void
  onInterim?: (text: string) => void
  onSilence?: (text: string) => void
  onError?: (error: Error) => void
  language?: string
}

const SILENCE_TIMEOUT_MS = 1600
const RESTART_DELAY_MS = 150
const SPEECH_QUERY_HINT_PATTERN =
  /\b(?:budget|under|below|less|over|above|around|about|between|from|gift|housewarming|birthday|anniversary|occasion|best|top|highest|rated|most|expensive|cheapest|least|bottle|bottles|wine|wines|red|white|rose|sparkling|champagne|burgundy|bordeaux|rhone|napa|sonoma|california|oregon|rioja|mendoza|marlborough|provence|tuscany|piedmont|veneto|cabernet|merlot|pinot|chardonnay|sauvignon|riesling|malbec|syrah|shiraz|zinfandel|sangiovese|tempranillo|grenache|nebbiolo|barbera|prosecco|moscato|viognier|chenin|gruner)\b/gi

export const SPEECH_INPUT_LANGUAGE_OPTIONS: SpeechRecognitionLanguageOption[] = [
  {
    value: 'auto',
    label: 'Auto (browser default)',
    lang: null,
  },
  {
    value: 'en-IN',
    label: 'English (India)',
    lang: 'en-IN',
  },
  {
    value: 'en-US',
    label: 'English (US)',
    lang: 'en-US',
  },
  {
    value: 'en-GB',
    label: 'English (UK)',
    lang: 'en-GB',
  },
]

export const SPEECH_RECOGNITION_LANGUAGE_OPTIONS = SPEECH_INPUT_LANGUAGE_OPTIONS

function getSpeechRecognitionConstructor() {
  const root = globalThis as typeof globalThis & WindowWithSpeechRecognition

  if (root.SpeechRecognition || root.webkitSpeechRecognition) {
    return root.SpeechRecognition ?? root.webkitSpeechRecognition ?? null
  }

  if (typeof window === 'undefined') {
    return null
  }

  const browserWindow = window as WindowWithSpeechRecognition
  return browserWindow.SpeechRecognition ?? browserWindow.webkitSpeechRecognition ?? null
}

function isChromeVoiceInputBrowser() {
  if (typeof navigator === 'undefined') {
    return false
  }

  const userAgent = navigator.userAgent || ''

  if (/jsdom/i.test(userAgent)) {
    return true
  }

  return /Chrome|CriOS|Edg/i.test(userAgent)
}

let speechInputRuntimeState: SpeechInputRuntimeState = {
  isRecording: false,
  isTranscribing: false,
  inputMode: getSpeechRecognitionConstructor() && isChromeVoiceInputBrowser() ? 'browser' : 'unavailable',
  lastInputError: null,
  languageProfile: 'auto',
}

const speechInputRuntimeListeners = new Set<(state: SpeechInputRuntimeState) => void>()

let currentRecognition: SpeechRecognition | null = null
let currentHandsFreeOptions: HandsFreeInputOptions | null = null
let currentLanguageProfile = 'auto'
let handsFreeActive = false
let inputSuppressed = false
let handsFreeSessionId = 0
let silenceTimeoutId: number | null = null
let restartTimeoutId: number | null = null
let continuousTranscript = ''

function setSpeechInputRuntimeState(nextState: Partial<SpeechInputRuntimeState>) {
  speechInputRuntimeState = {
    ...speechInputRuntimeState,
    ...nextState,
  }

  for (const listener of speechInputRuntimeListeners) {
    listener(speechInputRuntimeState)
  }
}

function normalizeLanguageCode(language: string | null | undefined) {
  return language?.trim().toLowerCase().replace('_', '-') ?? ''
}

function clearSilenceTimeout() {
  if (silenceTimeoutId != null) {
    window.clearTimeout(silenceTimeoutId)
    silenceTimeoutId = null
  }
}

function clearRestartTimeout() {
  if (restartTimeoutId != null) {
    window.clearTimeout(restartTimeoutId)
    restartTimeoutId = null
  }
}

function clearRecognitionBuffers() {
  clearSilenceTimeout()
  continuousTranscript = ''
  currentHandsFreeOptions?.onInterim?.('')
  setSpeechInputRuntimeState({
    isTranscribing: false,
  })
}

function scoreTranscriptCandidate(alternative: SpeechRecognitionAlternative | undefined) {
  const rawTranscript = alternative?.transcript?.trim()

  if (!rawTranscript) {
    return Number.NEGATIVE_INFINITY
  }

  const normalizedTranscript = normalizeWineSpeechTranscript(rawTranscript)
  const lowerTranscript = normalizedTranscript.toLowerCase()
  const hintMatches = lowerTranscript.match(SPEECH_QUERY_HINT_PATTERN)?.length ?? 0
  const wordCount = lowerTranscript.split(/\s+/).filter(Boolean).length
  const priceSignal = /\b\d+\b/.test(lowerTranscript) ? 1.5 : 0
  const querySignal = /\b(?:under|over|budget|around|between|gift|best|rated|expensive|cheapest)\b/.test(
    lowerTranscript,
  )
    ? 1.5
    : 0
  const correctionBonus = normalizedTranscript !== rawTranscript ? 0.5 : 0
  const confidenceBonus = typeof alternative?.confidence === 'number' ? alternative.confidence : 0

  return hintMatches * 3 + priceSignal + querySignal + Math.min(wordCount, 8) * 0.1 + correctionBonus + confidenceBonus
}

function pickBestTranscript(result: SpeechRecognitionResultLike) {
  let bestAlternative: SpeechRecognitionAlternative | undefined
  let bestScore = Number.NEGATIVE_INFINITY

  for (let index = 0; index < result.length; index += 1) {
    const alternative = result[index]
    const score = scoreTranscriptCandidate(alternative)

    if (score > bestScore) {
      bestScore = score
      bestAlternative = alternative
    }
  }

  const transcript = bestAlternative?.transcript ?? result[0]?.transcript ?? ''
  return normalizeWineSpeechTranscript(transcript)
}

function resolveRecognitionLanguage(languageProfile: string) {
  if (languageProfile === 'auto') {
    return navigator.language || 'en-US'
  }

  const option = SPEECH_INPUT_LANGUAGE_OPTIONS.find((candidate) => candidate.value === languageProfile)
  return option?.lang ?? languageProfile
}

function getPreferredDefaultProfile(defaultValue = 'auto') {
  if (typeof navigator === 'undefined') {
    return defaultValue
  }

  const languageCandidates = [
    ...(Array.isArray(navigator.languages) ? navigator.languages : []),
    navigator.language,
  ]

  for (const candidate of languageCandidates) {
    const normalizedCandidate = normalizeLanguageCode(candidate)

    if (!normalizedCandidate) {
      continue
    }

    const exactOption = SPEECH_INPUT_LANGUAGE_OPTIONS.find(
      (option) => option.lang && normalizeLanguageCode(option.lang) === normalizedCandidate,
    )

    if (exactOption) {
      return exactOption.value
    }
  }

  return defaultValue
}

function buildRecognitionError(errorCode: string | undefined) {
  switch (errorCode) {
    case 'language-not-supported':
      return new Error('language-not-supported')
    case 'not-allowed':
    case 'service-not-allowed':
      return new Error(errorCode)
    case 'audio-capture':
      return new Error('audio-capture')
    case 'network':
      return new Error('Speech recognition network error.')
    default:
      return new Error(errorCode ? `Speech recognition error: ${errorCode}` : 'Speech recognition failed.')
  }
}

function shouldMarkInputUnavailable(error: Error) {
  return /language-not-supported|not-allowed|service-not-allowed|audio-capture|unavailable/i.test(error.message)
}

function restartRecognitionLoop(sessionId: number) {
  clearRestartTimeout()

  if (!handsFreeActive || sessionId !== handsFreeSessionId) {
    return
  }

  restartTimeoutId = window.setTimeout(() => {
    if (!handsFreeActive || sessionId !== handsFreeSessionId || currentRecognition) {
      return
    }

    void startRecognitionSession(sessionId)
  }, RESTART_DELAY_MS)
}

function stopRecognitionInstance() {
  const recognition = currentRecognition
  currentRecognition = null

  if (!recognition) {
    return
  }

  recognition.onstart = null
  recognition.onresult = null
  recognition.onerror = null
  recognition.onend = null

  try {
    recognition.abort()
  } catch {
    // Ignore shutdown races.
  }
}

async function startRecognitionSession(sessionId: number) {
  const RecognitionConstructor = getSpeechRecognitionConstructor()

  if (!RecognitionConstructor || !isChromeVoiceInputBrowser()) {
    const error = new Error('Speech input is unavailable in this browser.')
    setSpeechInputRuntimeState({
      isRecording: false,
      isTranscribing: false,
      inputMode: 'unavailable',
      lastInputError: error.message,
      languageProfile: currentLanguageProfile,
    })
    currentHandsFreeOptions?.onError?.(error)
    return
  }

  stopRecognitionInstance()
  clearRecognitionBuffers()

  const recognition = new RecognitionConstructor()
  currentRecognition = recognition
  recognition.continuous = true
  recognition.interimResults = true
  recognition.maxAlternatives = 3
  recognition.lang = resolveRecognitionLanguage(currentLanguageProfile)

  let speechDetectedThisSession = false

  recognition.onstart = () => {
    if (sessionId !== handsFreeSessionId) {
      return
    }

    setSpeechInputRuntimeState({
      isRecording: true,
      isTranscribing: false,
      inputMode: 'browser',
      lastInputError: null,
      languageProfile: currentLanguageProfile,
    })
  }

  recognition.onresult = (event) => {
    if (sessionId !== handsFreeSessionId) {
      return
    }

    if (!speechDetectedThisSession) {
      speechDetectedThisSession = true
      currentHandsFreeOptions?.onSpeechStart?.()
    }

    if (inputSuppressed) {
      return
    }

    let interim = ''

    for (let index = event.resultIndex; index < event.results.length; index += 1) {
      const transcript = pickBestTranscript(event.results[index])

      if (event.results[index]?.isFinal) {
        continuousTranscript += `${transcript} `
      } else {
        interim += transcript
      }
    }

    const liveTranscript = `${continuousTranscript}${interim}`.trim()
    setSpeechInputRuntimeState({
      isRecording: true,
      isTranscribing: liveTranscript.length > 0,
      inputMode: 'browser',
      lastInputError: null,
      languageProfile: currentLanguageProfile,
    })
    currentHandsFreeOptions?.onInterim?.(liveTranscript)

    clearSilenceTimeout()
    silenceTimeoutId = window.setTimeout(() => {
      const transcript = continuousTranscript.trim()

      if (!transcript) {
        setSpeechInputRuntimeState({
          isRecording: Boolean(currentRecognition),
          isTranscribing: false,
          inputMode: isSpeechRecognitionSupported() ? 'browser' : 'unavailable',
          lastInputError: null,
          languageProfile: currentLanguageProfile,
        })
        return
      }

      continuousTranscript = ''
      speechDetectedThisSession = false
      setSpeechInputRuntimeState({
        isRecording: Boolean(currentRecognition),
        isTranscribing: false,
        inputMode: isSpeechRecognitionSupported() ? 'browser' : 'unavailable',
        lastInputError: null,
        languageProfile: currentLanguageProfile,
      })
      currentHandsFreeOptions?.onInterim?.('')
      currentHandsFreeOptions?.onSilence?.(transcript)
    }, SILENCE_TIMEOUT_MS)
  }

  recognition.onerror = (event) => {
    if (sessionId !== handsFreeSessionId) {
      return
    }

    if (event.error === 'aborted' || event.error === 'no-speech') {
      return
    }

    const inputError = buildRecognitionError(event.error)
    setSpeechInputRuntimeState({
      isRecording: false,
      isTranscribing: false,
      inputMode: shouldMarkInputUnavailable(inputError) ? 'unavailable' : 'browser',
      lastInputError: inputError.message,
      languageProfile: currentLanguageProfile,
    })
    currentHandsFreeOptions?.onError?.(inputError)
  }

  recognition.onend = () => {
    if (sessionId !== handsFreeSessionId) {
      return
    }

    currentRecognition = null
    setSpeechInputRuntimeState({
      isRecording: false,
      isTranscribing: false,
      inputMode: isSpeechRecognitionSupported() ? 'browser' : 'unavailable',
      languageProfile: currentLanguageProfile,
    })

    if (handsFreeActive) {
      restartRecognitionLoop(sessionId)
    }
  }

  try {
    recognition.start()
  } catch (error) {
    const inputError = error instanceof Error ? error : new Error('Speech recognition failed to start.')
    setSpeechInputRuntimeState({
      isRecording: false,
      isTranscribing: false,
      inputMode: shouldMarkInputUnavailable(inputError) ? 'unavailable' : 'browser',
      lastInputError: inputError.message,
      languageProfile: currentLanguageProfile,
    })
    currentHandsFreeOptions?.onError?.(inputError)
  }
}

function stopHandsFreeSession() {
  handsFreeActive = false
  inputSuppressed = false
  handsFreeSessionId += 1
  clearRestartTimeout()
  clearRecognitionBuffers()
  stopRecognitionInstance()
  setSpeechInputRuntimeState({
    isRecording: false,
    isTranscribing: false,
    inputMode: isSpeechRecognitionSupported() ? 'browser' : 'unavailable',
    lastInputError: null,
    languageProfile: currentLanguageProfile,
  })
}

export function isSpeechRecognitionSupported() {
  return Boolean(getSpeechRecognitionConstructor() && isChromeVoiceInputBrowser())
}

export function isHandsFreeInputSupported() {
  return isSpeechRecognitionSupported()
}

export function getPreferredSpeechInputLanguage(defaultValue = 'auto') {
  return getPreferredDefaultProfile(defaultValue)
}

export function getPreferredSpeechRecognitionLanguage(defaultValue = 'auto') {
  return getPreferredSpeechInputLanguage(defaultValue)
}

export function getSpeechInputRuntimeState() {
  return speechInputRuntimeState
}

export function resetSpeechInputRuntimeState() {
  setSpeechInputRuntimeState({
    isRecording: Boolean(currentRecognition),
    isTranscribing: false,
    inputMode: isSpeechRecognitionSupported() ? 'browser' : 'unavailable',
    lastInputError: null,
    languageProfile: currentLanguageProfile,
  })
}

export function subscribeSpeechInputRuntime(listener: (state: SpeechInputRuntimeState) => void) {
  speechInputRuntimeListeners.add(listener)
  listener(speechInputRuntimeState)

  return () => {
    speechInputRuntimeListeners.delete(listener)
  }
}

export async function startHandsFreeInput({
  onSpeechStart,
  onInterim,
  onSilence,
  onError,
  languageProfile = currentLanguageProfile,
}: HandsFreeInputOptions = {}) {
  currentLanguageProfile = languageProfile
  currentHandsFreeOptions = {
    onSpeechStart,
    onInterim,
    onSilence,
    onError,
    languageProfile,
  }

  if (!isSpeechRecognitionSupported()) {
    const error = new Error('Speech input is unavailable in this browser.')
    setSpeechInputRuntimeState({
      isRecording: false,
      isTranscribing: false,
      inputMode: 'unavailable',
      lastInputError: error.message,
      languageProfile: currentLanguageProfile,
    })
    onError?.(error)
    return
  }

  stopHandsFreeSession()
  handsFreeActive = true
  currentLanguageProfile = languageProfile
  setSpeechInputRuntimeState({
    isRecording: false,
    isTranscribing: false,
    inputMode: 'browser',
    lastInputError: null,
    languageProfile: currentLanguageProfile,
  })

  const sessionId = handsFreeSessionId
  await startRecognitionSession(sessionId)
}

export function stopHandsFreeInput() {
  stopHandsFreeSession()
}

export function pauseHandsFreeInput() {
  inputSuppressed = true
  clearRecognitionBuffers()
  setSpeechInputRuntimeState({
    isRecording: Boolean(currentRecognition),
    isTranscribing: false,
    inputMode: isSpeechRecognitionSupported() ? 'browser' : 'unavailable',
    lastInputError: null,
  })
}

export function resumeHandsFreeInput() {
  inputSuppressed = false
  clearRecognitionBuffers()

  if (!handsFreeActive || !isSpeechRecognitionSupported()) {
    return
  }

  if (!currentRecognition) {
    const sessionId = handsFreeSessionId
    void startRecognitionSession(sessionId)
  } else {
    setSpeechInputRuntimeState({
      isRecording: true,
      isTranscribing: false,
      inputMode: 'browser',
      lastInputError: null,
      languageProfile: currentLanguageProfile,
    })
  }
}

export async function setSpeechInputProfile(languageProfile: string) {
  currentLanguageProfile = languageProfile
  setSpeechInputRuntimeState({
    languageProfile,
    lastInputError: null,
    inputMode: isSpeechRecognitionSupported() ? 'browser' : 'unavailable',
  })

  if (!handsFreeActive || !currentHandsFreeOptions) {
    return
  }

  const suppressed = inputSuppressed
  await startHandsFreeInput({
    ...currentHandsFreeOptions,
    languageProfile,
  })

  if (suppressed) {
    pauseHandsFreeInput()
  }
}

export function startContinuousListening(options: ContinuousListeningOptions = {}) {
  return startHandsFreeInput({
    onSpeechStart: options.onSpeechStart,
    onInterim: options.onInterim,
    onSilence: options.onSilence,
    onError: options.onError,
    languageProfile: options.language ?? currentLanguageProfile,
  })
}

export function stopContinuousListening() {
  stopHandsFreeInput()
}

export function pauseContinuousListening() {
  pauseHandsFreeInput()
}

export function resumeContinuousListening() {
  resumeHandsFreeInput()
}
