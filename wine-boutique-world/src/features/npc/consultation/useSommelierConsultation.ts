import { useCallback, useEffect, useRef, useState } from 'react'
import { askWineQuestionStream } from './llm'
import {
  buildRecommendationTurnResult,
  buildWineCatalog,
  getTopWinesByScore,
  loadWines,
  normalizeWineSpeechTranscript,
  parseQuery,
  retrieveRelevantWines,
} from './wineCatalog'
import {
  createProgressiveSpeaker,
  getPreferredSpeechInputLanguage,
  getSpeechInputRuntimeState,
  getSpeechRuntimeState,
  isHandsFreeInputSupported,
  pauseHandsFreeInput,
  primeSpeechSynthesisVoices,
  resetSpeechInputRuntimeState,
  resetSpeechRuntimeState,
  resumeHandsFreeInput,
  setSpeechInputProfile,
  startHandsFreeInput,
  stopHandsFreeInput,
  subscribeSpeechInputRuntime,
  stopSpeaking,
  subscribeSpeechRuntime,
} from './voice'
import { SOMMELIER_GREETING } from '../interactionShell'
import type {
  ConsultationMessage,
  ConsultationSession,
  ConsultationStage,
  ConversationTurn,
  ParsedWineFilters,
  SpeechMode,
  Wine,
} from './types'

const MAX_HISTORY_TURNS = 5

function stripMarkdown(text: string) {
  return text.replace(/\*\*(.+?)\*\*/g, '$1').replace(/\*(.+?)\*/g, '$1')
}

function buildUserFacingError(error: Error) {
  if (error.message.includes('401')) {
    return 'The sommelier could not reach Vertex AI. Check your local gcloud authentication and try again.'
  }

  if (error.message.includes('403')) {
    return 'The sommelier could not access the Google project. Confirm billing, Vertex AI, and Text-to-Speech are enabled.'
  }

  return `Something went wrong: ${error.message}`
}

function buildVoiceInputErrorMessage(error: Error) {
  if (error.message.includes('Speech input is unavailable in this browser')) {
    return 'Voice input works in Chrome for this demo. You can keep typing here.'
  }

  if (error.message.includes('language-not-supported')) {
    return 'That speech input profile is not available in this browser. Switch to Auto or English (US) and try again.'
  }

  if (error.message.includes('not-allowed') || error.message.includes('service-not-allowed')) {
    return 'Microphone access is blocked right now. You can keep typing, or re-enable microphone access in Chrome.'
  }

  if (error.message.includes('audio-capture')) {
    return 'No microphone was available for voice input. You can keep typing while you reconnect your mic.'
  }

  if (error.message.includes('network')) {
    return 'Speech input lost its connection. You can keep typing, or toggle the mic back on and try again.'
  }

  return 'Voice input is unavailable right now. You can keep typing to continue the consultation.'
}

export function useSommelierConsultation(): ConsultationSession {
  const [messages, setMessages] = useState<ConsultationMessage[]>([])
  const [interimText, setInterimText] = useState('')
  const [streamingText, setStreamingText] = useState('')
  const [isListening, setIsListening] = useState(false)
  const [isRecording, setIsRecording] = useState(false)
  const [isTranscribing, setIsTranscribing] = useState(false)
  const [isThinking, setIsThinking] = useState(false)
  const [isSpeaking, setIsSpeaking] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [stage, setStage] = useState<ConsultationStage>('closed')
  const [textInput, setTextInput] = useState('')
  const [wines, setWines] = useState<Wine[]>([])
  const [catalogReady, setCatalogReady] = useState(false)
  const [activeFilters, setActiveFilters] = useState<ParsedWineFilters | null>(null)
  const [handsFreeEnabled, setHandsFreeEnabledState] = useState(true)
  const [speechInputLanguage, setSpeechInputLanguageState] = useState(() => getPreferredSpeechInputLanguage())
  const [speechInputMode, setSpeechInputMode] = useState(getSpeechInputRuntimeState().inputMode)
  const [lastInputError, setLastInputError] = useState<string | null>(getSpeechInputRuntimeState().lastInputError)
  const [speechMode, setSpeechMode] = useState<SpeechMode>(getSpeechRuntimeState().speechMode)
  const [lastSpeechError, setLastSpeechError] = useState<string | null>(getSpeechRuntimeState().lastSpeechError)

  const winesRef = useRef<Wine[]>([])
  const sessionOpenRef = useRef(false)
  const loadPromiseRef = useRef<Promise<Wine[]> | null>(null)
  const stageRef = useRef<ConsultationStage>('closed')
  const loadStateRef = useRef<'idle' | 'loading' | 'ready' | 'error'>('idle')
  const isThinkingRef = useRef(false)
  const speakerRef = useRef<ReturnType<typeof createProgressiveSpeaker> | null>(null)
  const abortStreamRef = useRef<(() => void) | null>(null)
  const conversationHistoryRef = useRef<ConversationTurn[]>([])
  const lastFiltersRef = useRef<ParsedWineFilters | null>(null)
  const messageCounterRef = useRef(0)
  const sessionInitializedRef = useRef(false)
  const speechInputLanguageRef = useRef(speechInputLanguage)
  const voiceSupported = isHandsFreeInputSupported()

  const updateStage = useCallback((nextStage: ConsultationStage) => {
    stageRef.current = nextStage
    setStage(nextStage)
  }, [])

  const nextMessageId = useCallback((prefix: string) => {
    messageCounterRef.current += 1
    return `${prefix}-${messageCounterRef.current}`
  }, [])

  const ensureWinesLoaded = useCallback(async () => {
    if (winesRef.current.length > 0) {
      return winesRef.current
    }

    if (loadPromiseRef.current) {
      return loadPromiseRef.current
    }

    loadStateRef.current = 'loading'

    const loadPromise = loadWines()
      .then((loadedWines) => {
        winesRef.current = loadedWines
        loadStateRef.current = 'ready'
        setWines(loadedWines)
        setCatalogReady(true)
        return loadedWines
      })
      .catch((loadError) => {
        loadStateRef.current = 'error'
        setCatalogReady(false)

        if (sessionOpenRef.current) {
          const loadMessage = loadError instanceof Error ? loadError.message : 'Failed to load the wine data.'
          setError(loadMessage)
          updateStage('error')
        }

        throw loadError
      })
      .finally(() => {
        loadPromiseRef.current = null
      })

    loadPromiseRef.current = loadPromise
    return loadPromise
  }, [updateStage])

  useEffect(() => {
    primeSpeechSynthesisVoices()
    void ensureWinesLoaded().catch((loadError) => {
      console.error('Sommelier preload failed.', loadError)
    })
  }, [ensureWinesLoaded])

  useEffect(() => {
    return subscribeSpeechRuntime((state) => {
      setIsSpeaking(state.isSpeaking)
      setSpeechMode(state.speechMode)
      setLastSpeechError(state.lastSpeechError)
    })
  }, [])

  useEffect(() => {
    return subscribeSpeechInputRuntime((state) => {
      setIsRecording(state.isRecording)
      setIsTranscribing(state.isTranscribing)
      setSpeechInputMode(state.inputMode)
      setLastInputError(state.lastInputError)

      if (!sessionOpenRef.current) {
        setIsListening(false)
        return
      }

      setIsListening(handsFreeEnabled && voiceSupported && state.inputMode !== 'unavailable')
    })
  }, [handsFreeEnabled, voiceSupported])

  useEffect(() => {
    speechInputLanguageRef.current = speechInputLanguage
  }, [speechInputLanguage])

  const syncListeningStage = useCallback(() => {
    if (!sessionOpenRef.current) {
      return
    }

    if (!voiceSupported || !handsFreeEnabled) {
      setIsListening(false)
      setInterimText('')
      updateStage(isThinkingRef.current ? 'thinking' : 'listening')
      return
    }

    resumeHandsFreeInput()
    setIsListening(true)
    updateStage(isThinkingRef.current ? 'thinking' : 'listening')
  }, [handsFreeEnabled, updateStage, voiceSupported])

  const stopCurrentPlayback = useCallback(
    (resumeListening = false) => {
      if (speakerRef.current) {
        speakerRef.current.stop()
        speakerRef.current = null
      }

      stopSpeaking()

      if (resumeListening) {
        window.setTimeout(() => {
          syncListeningStage()
        }, 0)
      }
    },
    [syncListeningStage],
  )

  const stopActiveStream = useCallback(() => {
    if (abortStreamRef.current) {
      abortStreamRef.current()
      abortStreamRef.current = null
    }

    isThinkingRef.current = false
    setIsThinking(false)
    setStreamingText('')
  }, [])

  const resetSession = useCallback(() => {
    stopActiveStream()
    stopCurrentPlayback()
    stopHandsFreeInput()
    resetSpeechInputRuntimeState()
    conversationHistoryRef.current = []
    lastFiltersRef.current = null
    sessionInitializedRef.current = false
    setMessages([])
    setInterimText('')
    setError(null)
    setIsListening(false)
    setIsRecording(false)
    setIsTranscribing(false)
    setTextInput('')
    setStreamingText('')
    setActiveFilters(null)
  }, [stopActiveStream, stopCurrentPlayback])

  const createSpeaker = useCallback(() => {
    const speaker = createProgressiveSpeaker({
      fallbackMode: 'none',
      onSpeakStart: () => {
        updateStage('speaking')
        pauseHandsFreeInput()
      },
      onEnd: () => {
        speakerRef.current = null
        window.setTimeout(() => {
          syncListeningStage()
        }, 900)
      },
      onError: (speechError) => {
        console.warn('Consultation speech playback unavailable.', speechError)
        speakerRef.current = null
        syncListeningStage()
      },
    })

    speakerRef.current = speaker
    return speaker
  }, [syncListeningStage, updateStage])

  const submitQuestion = useCallback(
    (question: string) => {
      if (!sessionOpenRef.current || !question.trim() || isThinkingRef.current) {
        return
      }

      if (!catalogReady || winesRef.current.length === 0) {
        const loadingMessage =
          loadStateRef.current === 'error'
            ? 'I could not load the wine list for this consultation.'
            : 'Give me a moment while I pull the cellar list together.'

        setError(loadingMessage)
        updateStage('error')
        setMessages((currentMessages) => [
          ...currentMessages,
          {
            id: nextMessageId('assistant'),
            role: 'assistant',
            text: loadingMessage,
            isError: true,
          },
        ])
        return
      }

      stopCurrentPlayback()
      stopActiveStream()
      setInterimText('')
      setError(null)

      setMessages((currentMessages) => [
        ...currentMessages,
        {
          id: nextMessageId('user'),
          role: 'user',
          text: question,
        },
      ])

      const filters = parseQuery(question, lastFiltersRef.current)
      const retrievalResult = retrieveRelevantWines(winesRef.current, filters, 40)
      const prefixedText = retrievalResult.spokenPreface ? `${retrievalResult.spokenPreface} ` : ''
      const catalog =
        retrievalResult.matches.length > 0
          ? buildWineCatalog(retrievalResult.matches)
          : buildWineCatalog(getTopWinesByScore(winesRef.current, 40))

      lastFiltersRef.current = filters
      setActiveFilters(retrievalResult.appliedFilters)
      isThinkingRef.current = true
      setIsThinking(true)
      setStreamingText(prefixedText)
      updateStage('thinking')

      const speaker = createSpeaker()

      if (prefixedText) {
        speaker.feed(prefixedText)
      }

      const abortStream = askWineQuestionStream(question, catalog, conversationHistoryRef.current, {
        retrievalNote: retrievalResult.retrievalNote,
        onChunk: (chunk, fullText) => {
          const combinedText = `${prefixedText}${fullText}`.trim()
          setStreamingText(combinedText)
          speaker?.feed(chunk)
        },
        onDone: (rawText) => {
          const modelText = stripMarkdown(rawText)
          const fullText = `${prefixedText}${modelText}`.trim()
          const recommendationTurn = buildRecommendationTurnResult(fullText, retrievalResult, 5)

          isThinkingRef.current = false
          setIsThinking(false)
          setStreamingText('')
          speaker?.finish()

          setMessages((currentMessages) => [
            ...currentMessages,
            {
              id: nextMessageId('assistant'),
              role: 'assistant',
              text: recommendationTurn.answerText,
              wines: recommendationTurn.cards,
            },
          ])

          conversationHistoryRef.current = [
            ...conversationHistoryRef.current,
            { role: 'user' as const, text: question },
            { role: 'assistant' as const, text: fullText },
          ].slice(-MAX_HISTORY_TURNS * 2)

          abortStreamRef.current = null

          if (!speaker || !speaker.isActive()) {
            syncListeningStage()
          }
        },
        onError: (streamError) => {
          const errorMessage = buildUserFacingError(streamError)

          console.error('Consultation stream error.', streamError)
          isThinkingRef.current = false
          setIsThinking(false)
          setStreamingText('')
          setError(errorMessage)
          speaker?.stop()
          abortStreamRef.current = null
          updateStage('error')

          setMessages((currentMessages) => [
            ...currentMessages,
            {
              id: nextMessageId('assistant'),
              role: 'assistant',
              text: errorMessage,
              isError: true,
            },
          ])
        },
      })

      abortStreamRef.current = abortStream
    },
    [
      catalogReady,
      createSpeaker,
      nextMessageId,
      stopActiveStream,
      stopCurrentPlayback,
      syncListeningStage,
      updateStage,
    ],
  )

  const startListeningMode = useCallback((enabled = handsFreeEnabled) => {
    if (!voiceSupported || !enabled) {
      stopHandsFreeInput()
      setInterimText('')
      setIsListening(false)
      return
    }

    void startHandsFreeInput({
      onSpeechStart: () => {
        stopCurrentPlayback()
        resumeHandsFreeInput()
        updateStage(isThinkingRef.current ? 'thinking' : 'listening')
      },
      onInterim: (transcript) => {
        setInterimText(transcript)
      },
      onSilence: (transcript) => {
        setInterimText('')
        const normalizedTranscript = normalizeWineSpeechTranscript(transcript.trim())

        if (!normalizedTranscript) {
          return
        }

        submitQuestion(normalizedTranscript)
      },
      onError: (voiceError) => {
        console.error('Consultation voice error.', voiceError)
        setError(buildVoiceInputErrorMessage(voiceError))
        setIsListening(false)
        updateStage('listening')
      },
      languageProfile: speechInputLanguageRef.current,
    })

    setIsListening(true)
    updateStage(isThinkingRef.current ? 'thinking' : 'listening')
  }, [handsFreeEnabled, stopCurrentPlayback, submitQuestion, updateStage, voiceSupported])

  const startGreeting = useCallback(() => {
    if (!sessionOpenRef.current) {
      updateStage('listening')
      return
    }

    stopCurrentPlayback()
    const speaker = createSpeaker()
    speaker.feed(SOMMELIER_GREETING)
    speaker.finish()
  }, [createSpeaker, stopCurrentPlayback, updateStage])

  const setHandsFreeListening = useCallback(
    (enabled: boolean) => {
      setHandsFreeEnabledState(enabled)

      if (!enabled) {
        stopHandsFreeInput()
        setInterimText('')
        setIsListening(false)
        if (!isThinkingRef.current && stageRef.current !== 'speaking') {
          updateStage('listening')
        }
        return
      }

      if (sessionOpenRef.current && voiceSupported) {
        startListeningMode(true)
      }
    },
    [startListeningMode, updateStage, voiceSupported],
  )

  const setSpeechInputLanguage = useCallback(
    (language: string) => {
      speechInputLanguageRef.current = language
      setSpeechInputLanguageState(language)
      setInterimText('')

      if (!sessionOpenRef.current) {
        return
      }

      if (handsFreeEnabled && voiceSupported) {
        setIsListening(false)
        void setSpeechInputProfile(language)
      }
    },
    [handsFreeEnabled, voiceSupported],
  )

  const open = useCallback(async () => {
    if (sessionInitializedRef.current && sessionOpenRef.current) {
      return
    }

    sessionOpenRef.current = true
    resetSpeechInputRuntimeState()
    resetSpeechRuntimeState()
    resetSession()
    sessionInitializedRef.current = true
    updateStage('greeting')
    setMessages([
      {
        id: nextMessageId('assistant'),
        role: 'assistant',
        text: SOMMELIER_GREETING,
      },
    ])

    primeSpeechSynthesisVoices()
    void ensureWinesLoaded()

    if (voiceSupported && handsFreeEnabled) {
      startListeningMode()
    }

    startGreeting()
  }, [ensureWinesLoaded, handsFreeEnabled, nextMessageId, resetSession, startGreeting, startListeningMode, updateStage, voiceSupported])

  const restartSession = useCallback(async () => {
    sessionInitializedRef.current = false
    await open()
  }, [open])

  const close = useCallback(() => {
    sessionOpenRef.current = false
    resetSpeechInputRuntimeState()
    resetSpeechRuntimeState()
    resetSession()
    updateStage('closed')
  }, [resetSession, updateStage])

  return {
    messages,
    interimText,
    isListening,
    isRecording,
    isTranscribing,
    isThinking,
    isSpeaking,
    streamingText,
    error,
    stage,
    textInput,
    setTextInput,
    wines,
    voiceSupported,
    catalogReady,
    activeFilters,
    handsFreeEnabled,
    speechInputLanguage,
    speechInputMode,
    lastInputError,
    speechMode,
    lastSpeechError,
    open,
    close,
    startGreeting,
    submitQuestion,
    stopSpeaking: () => stopCurrentPlayback(true),
    resetSession,
    setHandsFreeListening,
    setSpeechInputLanguage,
    restartSession,
  }
}
