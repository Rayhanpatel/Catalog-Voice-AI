import { askCatalogQuestion, askCatalogQuestionStream, createWineAdvisorSystemPrompt } from '@wine-voice-ai/wine-ai-core';

const MODEL = 'gemini-2.5-flash';
const VERTEX_PROJECT = import.meta.env.VITE_GOOGLE_CLOUD_PROJECT ?? 'wine-voice-explorer';
const VERTEX_LOCATION = 'us-central1';
const SYSTEM_PROMPT = createWineAdvisorSystemPrompt({
  experienceLabel: 'private tasting consultation demo',
  collectionLabel: 'boutique collection',
  recommendationsLabel: '2-3',
});

export function askWineQuestionStream(question, wineCatalog, conversationHistory = [], { onChunk, onDone, onError, retrievalNote } = {}) {
  return askCatalogQuestionStream({
    question,
    wineCatalog,
    conversationHistory,
    onChunk,
    onDone,
    onError,
    retrievalNote,
    systemPrompt: SYSTEM_PROMPT,
    projectId: VERTEX_PROJECT,
    location: VERTEX_LOCATION,
    model: MODEL,
  });
}

export function askWineQuestion(question, wineCatalog, conversationHistory = [], { retrievalNote } = {}) {
  return askCatalogQuestion({
    question,
    wineCatalog,
    conversationHistory,
    retrievalNote,
    systemPrompt: SYSTEM_PROMPT,
    projectId: VERTEX_PROJECT,
    location: VERTEX_LOCATION,
    model: MODEL,
  });
}
