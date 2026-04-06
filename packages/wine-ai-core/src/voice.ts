import type { CloudVoiceProfile, SpeechRuntimeState } from './types'

export {
  getPreferredSpeechInputLanguage,
  getPreferredSpeechRecognitionLanguage,
  getSpeechInputRuntimeState,
  isHandsFreeInputSupported,
  isSpeechRecognitionSupported,
  pauseHandsFreeInput,
  pauseContinuousListening,
  resetSpeechInputRuntimeState,
  resumeHandsFreeInput,
  resumeContinuousListening,
  setSpeechInputProfile,
  SPEECH_INPUT_LANGUAGE_OPTIONS,
  SPEECH_RECOGNITION_LANGUAGE_OPTIONS,
  startHandsFreeInput,
  startContinuousListening,
  stopHandsFreeInput,
  stopContinuousListening,
  subscribeSpeechInputRuntime,
} from './speechInput'

export const DEFAULT_SOMMELIER_VOICE_PROFILE: CloudVoiceProfile = {
  languageCode: 'en-US',
  name: 'en-US-Neural2-D',
  speakingRate: 0.93,
  pitch: -1.4,
}

const MALE_VOICE_NAME_PATTERN = /aaron|alex|daniel|david|guy|lee|matthew|oliver|tom|male|man/i

let currentAudio: HTMLAudioElement | null = null
let currentAudioUrl: string | null = null
let cachedVoice: SpeechSynthesisVoice | null = null
let speechRuntimeState: SpeechRuntimeState = {
  isSpeaking: false,
  speechMode: 'cloud',
  lastSpeechError: null,
}
const speechRuntimeListeners = new Set<(state: SpeechRuntimeState) => void>()

export function primeSpeechSynthesisVoices() {
  if (typeof window !== 'undefined') {
    window.speechSynthesis?.getVoices()
  }
}

function setSpeechRuntimeState(nextState: Partial<SpeechRuntimeState>) {
  speechRuntimeState = {
    ...speechRuntimeState,
    ...nextState,
  }

  for (const listener of speechRuntimeListeners) {
    listener(speechRuntimeState)
  }
}

export function getSpeechRuntimeState() {
  return speechRuntimeState
}

export function resetSpeechRuntimeState() {
  setSpeechRuntimeState({
    isSpeaking: false,
    speechMode: 'cloud',
    lastSpeechError: null,
  })
}

export function subscribeSpeechRuntime(listener: (state: SpeechRuntimeState) => void) {
  speechRuntimeListeners.add(listener)
  listener(speechRuntimeState)

  return () => {
    speechRuntimeListeners.delete(listener)
  }
}

function preferMaleVoice(voices: SpeechSynthesisVoice[]) {
  return (
    voices.find((voice) => voice.lang.startsWith('en') && /natural|neural/i.test(voice.name) && MALE_VOICE_NAME_PATTERN.test(voice.name)) ??
    voices.find((voice) => voice.lang.startsWith('en') && voice.localService && MALE_VOICE_NAME_PATTERN.test(voice.name)) ??
    voices.find((voice) => voice.lang.startsWith('en-US') && MALE_VOICE_NAME_PATTERN.test(voice.name)) ??
    voices.find((voice) => voice.lang.startsWith('en') && MALE_VOICE_NAME_PATTERN.test(voice.name)) ??
    null
  )
}

function pickVoice() {
  if (!window.speechSynthesis) {
    return null
  }

  if (cachedVoice) {
    return cachedVoice
  }

  const voices = window.speechSynthesis.getVoices()

  cachedVoice =
    preferMaleVoice(voices) ??
    voices.find((voice) => voice.lang.startsWith('en') && /natural|neural/i.test(voice.name)) ??
    voices.find((voice) => voice.lang.startsWith('en') && voice.localService) ??
    voices.find((voice) => voice.lang.startsWith('en-US')) ??
    voices.find((voice) => voice.lang.startsWith('en')) ??
    null

  return cachedVoice
}

if (typeof window !== 'undefined' && window.speechSynthesis) {
  window.speechSynthesis.onvoiceschanged = () => {
    cachedVoice = null
  }
}

interface CloudSynthesisOptions {
  apiKey?: string
  signal?: AbortSignal
  voiceProfile?: CloudVoiceProfile
}

async function synthesizeWithCloudTts(
  text: string,
  {
    apiKey,
    signal: externalSignal,
    voiceProfile = DEFAULT_SOMMELIER_VOICE_PROFILE,
  }: CloudSynthesisOptions = {},
) {
  const timeoutController = new AbortController()
  const timeoutId = window.setTimeout(() => timeoutController.abort(), 30_000)
  const signal = externalSignal ? AbortSignal.any([timeoutController.signal, externalSignal]) : timeoutController.signal

  try {
    const apiKeySuffix = apiKey ? `?key=${encodeURIComponent(apiKey)}` : ''
    const response = await fetch(`/api/tts/v1/text:synthesize${apiKeySuffix}`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        input: { text },
        voice: {
          languageCode: voiceProfile.languageCode,
          name: voiceProfile.name,
        },
        audioConfig: {
          audioEncoding: 'MP3',
          speakingRate: voiceProfile.speakingRate,
          pitch: voiceProfile.pitch,
          volumeGainDb: 8,
        },
      }),
      signal,
    })

    if (!response.ok) {
      throw new Error(`Cloud TTS error ${response.status}`)
    }

    const data = (await response.json()) as { audioContent?: string }

    if (!data.audioContent) {
      throw new Error('Cloud TTS returned an empty audio payload.')
    }

    const binary = atob(data.audioContent)
    const bytes = new Uint8Array(binary.length)

    for (let index = 0; index < binary.length; index += 1) {
      bytes[index] = binary.charCodeAt(index)
    }

    const blob = new Blob([bytes], { type: 'audio/mpeg' })
    return URL.createObjectURL(blob)
  } finally {
    window.clearTimeout(timeoutId)
  }
}

function playAudioUrl(url: string) {
  return new Promise<void>((resolve, reject) => {
    const audio = new Audio(url)
    currentAudio = audio
    currentAudioUrl = url
    audio.preload = 'auto'
    audio.volume = 1

    audio.onended = () => {
      currentAudio = null
      currentAudioUrl = null
      URL.revokeObjectURL(url)
      resolve()
    }

    audio.onerror = () => {
      currentAudio = null
      currentAudioUrl = null
      URL.revokeObjectURL(url)
      reject(new Error('Audio playback failed.'))
    }

    void audio.play().catch(reject)
  })
}

export function stopSpeaking() {
  if (currentAudio) {
    currentAudio.pause()
    currentAudio = null
  }

  if (currentAudioUrl) {
    URL.revokeObjectURL(currentAudioUrl)
    currentAudioUrl = null
  }

  if (typeof window !== 'undefined') {
    window.speechSynthesis?.cancel()
  }

  setSpeechRuntimeState({ isSpeaking: false })
}

interface ProgressiveSpeakerOptions {
  onSpeakStart?: () => void
  onEnd?: () => void
  onError?: (error: Error) => void
  apiKey?: string
  fallbackMode?: 'browser' | 'none'
  voiceProfile?: CloudVoiceProfile
}

interface ProgressiveSpeaker {
  feed: (chunk: string) => void
  finish: () => void
  stop: () => void
  isActive: () => boolean
}

export function createProgressiveSpeaker({
  onSpeakStart,
  onEnd,
  onError,
  apiKey,
  fallbackMode = 'browser',
  voiceProfile = DEFAULT_SOMMELIER_VOICE_PROFILE,
}: ProgressiveSpeakerOptions = {}): ProgressiveSpeaker {
  let buffer = ''
  let queue: string[] = []
  let currentlySpeaking = false
  let finished = false
  let stopped = false
  let hasStarted = false
  let useCloudTts = true
  let currentSynthesisController: AbortController | null = null

  const voice = pickVoice()
  const segmenter =
    typeof Intl !== 'undefined' && typeof Intl.Segmenter !== 'undefined'
      ? new Intl.Segmenter('en', { granularity: 'sentence' })
      : null

  function notifyStartIfNeeded() {
    if (hasStarted) {
      return
    }

    hasStarted = true
    setSpeechRuntimeState({
      isSpeaking: true,
      speechMode: useCloudTts ? 'cloud' : 'unavailable',
      lastSpeechError: useCloudTts ? null : speechRuntimeState.lastSpeechError,
    })
    onSpeakStart?.()
  }

  function notifyEnded() {
    setSpeechRuntimeState({ isSpeaking: false })
    onEnd?.()
  }

  function extractSentences() {
    if (segmenter) {
      const segments = [...segmenter.segment(buffer)]

      if (segments.length === 0) {
        return
      }

      let processedLength = 0

      for (let index = 0; index < segments.length; index += 1) {
        const segment = segments[index]
        const trimmed = segment.segment.trim()

        if (index === segments.length - 1) {
          const endsWithPunctuation = /[.!?](\s+)?$/.test(segment.segment)

          if (finished || endsWithPunctuation) {
            if (trimmed) {
              queue.push(trimmed)
            }

            processedLength += segment.segment.length
          }
        } else {
          if (trimmed) {
            queue.push(trimmed)
          }

          processedLength += segment.segment.length
        }
      }

      buffer = buffer.slice(processedLength)
      return
    }

    const sentencePattern = /[^.!?]*[.!?]+\s*/g
    let match: RegExpExecArray | null
    let lastIndex = 0

    match = sentencePattern.exec(buffer)

    while (match) {
      const trimmed = match[0].trim()

      if (trimmed) {
        queue.push(trimmed)
      }

      lastIndex = match.index + match[0].length
      match = sentencePattern.exec(buffer)
    }

    if (lastIndex > 0) {
      buffer = buffer.slice(lastIndex)
    }
  }

  async function speakNextCloud() {
    if (stopped) {
      return
    }

    if (queue.length === 0) {
      currentlySpeaking = false
      if (finished) {
        notifyEnded()
      }
      return
    }

    let text = queue.shift()!

    while (queue.length > 0 && text.length < 80) {
      text += ` ${queue.shift()!}`
    }

    currentlySpeaking = true
    notifyStartIfNeeded()

    try {
      currentSynthesisController = new AbortController()
      const audioUrl = await synthesizeWithCloudTts(text, {
        apiKey,
        signal: currentSynthesisController.signal,
        voiceProfile,
      })
      currentSynthesisController = null
      setSpeechRuntimeState({
        speechMode: 'cloud',
        lastSpeechError: null,
      })

      if (stopped) {
        return
      }

      await playAudioUrl(audioUrl)

      if (!stopped) {
        await speakNextCloud()
      }
    } catch (error) {
      currentSynthesisController = null

      if (error instanceof Error && error.name === 'AbortError') {
        return
      }

      const speechError = error instanceof Error ? error : new Error('Cloud TTS failed.')
      setSpeechRuntimeState({
        isSpeaking: false,
        speechMode: 'unavailable',
        lastSpeechError: speechError.message,
      })

      if (fallbackMode === 'browser') {
        console.warn('Cloud TTS failed in progressive speaker, falling back.', speechError)
        useCloudTts = false
        queue.unshift(text)
        speakNextBrowser()
        return
      }

      stopped = true
      currentlySpeaking = false
      queue = []
      buffer = ''
      onError?.(speechError)
      notifyEnded()
    }
  }

  function speakNextBrowser() {
    if (stopped) {
      return
    }

    if (!window.speechSynthesis || typeof SpeechSynthesisUtterance === 'undefined') {
      currentlySpeaking = false
      setSpeechRuntimeState({
        isSpeaking: false,
        speechMode: 'unavailable',
        lastSpeechError: 'Browser speech synthesis is unavailable.',
      })
      notifyEnded()
      onError?.(new Error('Browser speech synthesis is unavailable.'))
      return
    }

    if (queue.length === 0) {
      currentlySpeaking = false
      if (finished) {
        notifyEnded()
      }
      return
    }

    let text = queue.shift()!

    while (queue.length > 0 && text.length < 80) {
      text += ` ${queue.shift()!}`
    }

    currentlySpeaking = true
    notifyStartIfNeeded()
    setSpeechRuntimeState({
      isSpeaking: true,
      speechMode: 'unavailable',
    })

    const utterance = new SpeechSynthesisUtterance(text)
    utterance.rate = 0.96
    utterance.pitch = 0.82
    utterance.volume = 1

    if (voice) {
      utterance.voice = voice
    }

    utterance.onend = () => {
      if (!stopped) {
        speakNextBrowser()
      }
    }

    utterance.onerror = () => {
      const speechError = new Error('Browser speech playback failed.')
      setSpeechRuntimeState({
        isSpeaking: false,
        speechMode: 'unavailable',
        lastSpeechError: speechError.message,
      })
      onError?.(speechError)

      if (!stopped) {
        speakNextBrowser()
      }
    }

    window.speechSynthesis.speak(utterance)
  }

  function speakNext() {
    if (useCloudTts) {
      void speakNextCloud()
      return
    }

    speakNextBrowser()
  }

  return {
    feed(chunk) {
      if (stopped) {
        return
      }

      buffer += chunk
      extractSentences()

      if (!currentlySpeaking && queue.length > 0) {
        speakNext()
      }
    },
    finish() {
      if (stopped) {
        return
      }

      finished = true

      if (buffer.trim()) {
        queue.push(buffer.trim())
        buffer = ''
      }

      if (!currentlySpeaking) {
        if (queue.length > 0) {
          speakNext()
        } else {
          notifyEnded()
        }
      }
    },
    stop() {
      stopped = true
      currentlySpeaking = false
      queue = []
      buffer = ''

      if (currentSynthesisController) {
        currentSynthesisController.abort()
        currentSynthesisController = null
      }

      stopSpeaking()
    },
    isActive() {
      return !stopped && (currentlySpeaking || queue.length > 0 || buffer.trim().length > 0)
    },
  }
}
