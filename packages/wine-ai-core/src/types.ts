export interface WineRating {
  score?: number | null
  note?: string | null
  source?: string | null
}

export interface Wine {
  name: string
  producer?: string | null
  varietal?: string | null
  region?: string | null
  country?: string | null
  appellation?: string | null
  color?: string | null
  vintage?: string | number | null
  price?: number | null
  abv?: number | null
  volume_ml?: number | null
  image_url?: string | null
  ratings?: WineRating[] | null
}

export interface ParsedWineFilters {
  priceMin?: number
  priceMax?: number
  color?: string
  region?: string
  varietal?: string
  sortByScore?: boolean
  sortByPriceAsc?: boolean
  sortByPriceDesc?: boolean
  occasion?: boolean
}

export interface ConversationTurn {
  role: 'user' | 'assistant'
  text: string
}

export type SpeechMode = 'cloud' | 'unavailable'
export type SpeechInputMode = 'browser' | 'unavailable'

export interface SpeechRecognitionLanguageOption {
  value: string
  label: string
  lang: string | null
}

export interface SpeechInputRuntimeState {
  isRecording: boolean
  isTranscribing: boolean
  inputMode: SpeechInputMode
  lastInputError: string | null
  languageProfile: string
}

export interface SpeechRuntimeState {
  isSpeaking: boolean
  speechMode: SpeechMode
  lastSpeechError: string | null
}

export interface CloudVoiceProfile {
  languageCode: string
  name: string
  speakingRate: number
  pitch: number
}

export interface WineRetrievalResult {
  matches: Wine[]
  appliedFilters: ParsedWineFilters
  relaxedConstraints: string[]
  retrievalNote: string | null
  spokenPreface: string | null
  hasExactMatches: boolean
  candidateIds: string[]
}

export interface RecommendationTurnResult {
  answerText: string
  cards: Wine[]
  appliedFilters: ParsedWineFilters
  relaxedConstraints: string[]
  candidateIds: string[]
}

export interface WineAiProxyHealth {
  ok: boolean
  projectId: string
  authenticated: boolean
  capabilities: {
    vertex: {
      ready: boolean
      message: string
    }
    tts: {
      ready: boolean
      message: string
    }
    stt: {
      ready: boolean
      message: string
    }
  }
  routes: {
    vertex: boolean
    tts: boolean
    stt: boolean
    wineImage: boolean
  }
  checkedAt: string
  message: string
}
