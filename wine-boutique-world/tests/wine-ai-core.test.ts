import { describe, expect, it } from 'vitest'
import { buildRecommendationTurnResult, findMentionedWines, normalizeWineSpeechTranscript, parseQuery, retrieveRelevantWines, type Wine } from '@wine-voice-ai/wine-ai-core'

const fixtureWines: Wine[] = [
  {
    name: 'ALLEGRINI PALAZZO DELLA TORRE',
    color: 'red',
    region: 'veneto',
    varietal: 'red blend',
    price: 24.99,
    ratings: [{ score: 93, note: 'Rich cherry and cocoa.' }],
  },
  {
    name: 'VILLA ANTINORI TOSCANA ROSSO',
    color: 'red',
    region: 'tuscany',
    varietal: 'red blend',
    price: 24.99,
    ratings: [{ score: 92, note: 'Savory and polished.' }],
  },
  {
    name: 'NAPA CHARDONNAY RESERVE',
    color: 'white',
    region: 'napa',
    varietal: 'chardonnay',
    price: 29.99,
    ratings: [{ score: 94, note: 'Bright citrus and oak.' }],
  },
]

describe('wine ai core query parsing', () => {
  it('normalizes common wine-domain transcript confusions before parsing', () => {
    expect(normalizeWineSpeechTranscript('show me something from Burgandy')).toBe('show me something from burgundy')
    expect(normalizeWineSpeechTranscript('maybe a Shardenay from Napa')).toBe('maybe a chardonnay from Napa')
  })

  it('parses natural max budget phrasing', () => {
    const filters = parseQuery('My max budget is 50 and I want red wine')

    expect(filters.priceMax).toBe(50)
    expect(filters.color).toBe('red')
  })

  it('parses spoken budget ranges', () => {
    const filters = parseQuery('I want something in the 40 to 60 range')

    expect(filters.priceMin).toBe(40)
    expect(filters.priceMax).toBe(60)
  })

  it('parses casual budget phrasing without requiring under/over keywords', () => {
    const filters = parseQuery('budget 50 and maybe something white')

    expect(filters.priceMax).toBe(50)
    expect(filters.color).toBe('white')
  })

  it('carries forward filters through follow-up wording', () => {
    const firstTurn = parseQuery('Show me a red from Italy under 50')
    const followUp = parseQuery('What else do you have?', firstTurn)

    expect(followUp.priceMax).toBe(50)
    expect(followUp.color).toBe('red')
    expect(followUp.region).toBe('italy')
  })
})

describe('wine ai core retrieval behavior', () => {
  it('returns explicit closest-match metadata when filters need relaxing', () => {
    const result = retrieveRelevantWines(fixtureWines, {
      color: 'white',
      region: 'napa',
      priceMax: 20,
    })

    expect(result.hasExactMatches).toBe(false)
    expect(result.matches.length).toBeGreaterThan(0)
    expect(result.retrievalNote).toContain('No exact matches')
    expect(result.spokenPreface).toContain('closest bottles')
    expect(result.relaxedConstraints.length).toBeGreaterThan(0)
    expect(result.candidateIds.length).toBe(result.matches.length)
  })

  it('matches recommendation cards only from the active candidate set', () => {
    const candidates = [fixtureWines[0]]
    const matches = findMentionedWines('I recommend VILLA ANTINORI TOSCANA ROSSO tonight.', candidates)

    expect(matches).toEqual([])
  })

  it('builds grouped recommendation turn metadata from the active retrieval result', () => {
    const retrieval = retrieveRelevantWines(fixtureWines, { color: 'red', priceMax: 30 })
    const turn = buildRecommendationTurnResult(
      'I recommend ALLEGRINI PALAZZO DELLA TORRE and VILLA ANTINORI TOSCANA ROSSO tonight.',
      retrieval,
      5,
    )

    expect(turn.answerText).toContain('ALLEGRINI PALAZZO DELLA TORRE')
    expect(turn.cards.map((wine) => wine.name)).toEqual([
      'ALLEGRINI PALAZZO DELLA TORRE',
      'VILLA ANTINORI TOSCANA ROSSO',
    ])
    expect(turn.candidateIds).toEqual(retrieval.candidateIds)
  })
})
