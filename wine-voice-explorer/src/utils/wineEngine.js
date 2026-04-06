import {
  buildRecommendationTurnResult,
  buildWineCatalog,
  createWineCatalogStore,
  filterWines,
  findMentionedWines,
  getTopScore,
  getTopWinesByScore,
  normalizeWineSpeechTranscript,
  parseQuery,
  retrieveRelevantWines,
} from '@wine-voice-ai/wine-ai-core';

const catalogStore = createWineCatalogStore('/wines.json');

export const loadWines = catalogStore.loadWines;
export const getAllWines = catalogStore.getAllWines;
export function resetWineCache() {
  catalogStore.reset();
}

export { buildRecommendationTurnResult, buildWineCatalog, filterWines, findMentionedWines, getTopScore, getTopWinesByScore, normalizeWineSpeechTranscript, parseQuery, retrieveRelevantWines };
