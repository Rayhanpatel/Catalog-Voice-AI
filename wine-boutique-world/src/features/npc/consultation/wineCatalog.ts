import {
  buildRecommendationTurnResult,
  buildWineCatalog,
  createWineCatalogStore,
  filterWines,
  findMentionedWines,
  getTopRating,
  getTopScore,
  getTopWinesByScore,
  normalizeWineSpeechTranscript,
  parseQuery,
  retrieveRelevantWines,
} from '@wine-voice-ai/wine-ai-core'

const catalogStore = createWineCatalogStore('/data/wines.json')

export const loadWines = catalogStore.loadWines
export {
  buildRecommendationTurnResult,
  buildWineCatalog,
  filterWines,
  findMentionedWines,
  getTopRating,
  getTopScore,
  getTopWinesByScore,
  normalizeWineSpeechTranscript,
  parseQuery,
  retrieveRelevantWines,
}
