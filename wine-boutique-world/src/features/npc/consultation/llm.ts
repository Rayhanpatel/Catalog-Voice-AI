import { askCatalogQuestionStream, createWineAdvisorSystemPrompt } from '@wine-voice-ai/wine-ai-core'
import type { ConversationTurn } from './types'

const GOOGLE_CLOUD_PROJECT = (import.meta.env.VITE_GOOGLE_CLOUD_PROJECT as string | undefined) ?? 'wine-voice-explorer'
const VERTEX_LOCATION = 'us-central1'
const MODEL = 'gemini-2.5-flash'
const SYSTEM_PROMPT = createWineAdvisorSystemPrompt({
  experienceLabel: 'private tasting concierge inside a wine boutique',
  collectionLabel: 'boutique collection',
  recommendationsLabel: '2-3',
})

interface StreamCallbacks {
  onChunk?: (chunk: string, fullText: string) => void
  onDone?: (fullText: string) => void
  onError?: (error: Error) => void
  retrievalNote?: string | null
}

export function askWineQuestionStream(
  question: string,
  wineCatalog: string,
  conversationHistory: ConversationTurn[],
  { onChunk, onDone, onError, retrievalNote }: StreamCallbacks,
) {
  return askCatalogQuestionStream({
    question,
    wineCatalog,
    conversationHistory,
    onChunk,
    onDone,
    onError,
    retrievalNote,
    systemPrompt: SYSTEM_PROMPT,
    projectId: GOOGLE_CLOUD_PROJECT,
    location: VERTEX_LOCATION,
    model: MODEL,
  })
}
