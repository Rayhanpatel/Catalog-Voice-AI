import type { ParsedWineFilters as SharedParsedWineFilters, Wine as SharedWine } from '@wine-voice-ai/wine-ai-core'

export type {
  CloudVoiceProfile,
  ConversationTurn,
  ParsedWineFilters,
  RecommendationTurnResult,
  SpeechInputMode,
  SpeechInputRuntimeState,
  SpeechRecognitionLanguageOption,
  SpeechMode,
  SpeechRuntimeState,
  Wine,
  WineRating,
  WineRetrievalResult,
} from '@wine-voice-ai/wine-ai-core'

export interface ConsultationMessage {
  id: string
  role: 'user' | 'assistant'
  text: string
  wines?: import('@wine-voice-ai/wine-ai-core').Wine[]
  isError?: boolean
}

export type ConsultationStage = 'closed' | 'greeting' | 'listening' | 'thinking' | 'speaking' | 'error'

export interface ConsultationSession {
  messages: ConsultationMessage[]
  interimText: string
  isListening: boolean
  isRecording: boolean
  isTranscribing: boolean
  isThinking: boolean
  isSpeaking: boolean
  streamingText: string
  error: string | null
  stage: ConsultationStage
  textInput: string
  setTextInput: (value: string) => void
  wines: SharedWine[]
  voiceSupported: boolean
  catalogReady: boolean
  activeFilters: SharedParsedWineFilters | null
  handsFreeEnabled: boolean
  speechInputLanguage: string
  speechInputMode: import('@wine-voice-ai/wine-ai-core').SpeechInputMode
  lastInputError: string | null
  speechMode: import('@wine-voice-ai/wine-ai-core').SpeechMode
  lastSpeechError: string | null
  open: () => Promise<void>
  close: () => void
  startGreeting: () => void
  submitQuestion: (question: string) => void
  stopSpeaking: () => void
  resetSession: () => void
  setHandsFreeListening: (enabled: boolean) => void
  setSpeechInputLanguage: (language: string) => void
  restartSession: () => Promise<void>
}
