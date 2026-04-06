import type { ParsedWineFilters, RecommendationTurnResult, Wine, WineRating, WineRetrievalResult } from './types'

export function createWineCatalogStore(catalogPath: string) {
  let wineData: Wine[] = []

  return {
    async loadWines() {
      if (wineData.length > 0) {
        return wineData
      }

      const response = await fetch(catalogPath)

      if (!response.ok) {
        throw new Error(`Failed to load wine data (HTTP ${response.status})`)
      }

      const data = (await response.json()) as unknown

      if (!Array.isArray(data)) {
        throw new Error('Invalid wine data format')
      }

      wineData = data as Wine[]
      return wineData
    },
    getAllWines() {
      return wineData
    },
    reset() {
      wineData = []
    },
  }
}

const COLOR_KEYWORDS: Record<string, string> = {
  red: 'red',
  white: 'white',
  rose: 'rose',
  'rosé': 'rose',
  'rośe': 'rose',
  rosay: 'rose',
  rozay: 'rose',
  rosa: 'rose',
  rows: 'rose',
  sparkling: 'sparkling',
  champagne: 'sparkling',
  bubbly: 'sparkling',
  dessert: 'dessert',
  fortified: 'fortified',
}

const REGION_KEYWORDS = [
  'napa',
  'sonoma',
  'california',
  'oregon',
  'burgundy',
  'bordeaux',
  'champagne',
  'rhone',
  'tuscany',
  'piedmont',
  'veneto',
  'rioja',
  'mendoza',
  'marlborough',
  'provence',
  'toro',
  'sardinia',
  'barossa',
  'argentina',
  'france',
  'italy',
  'spain',
  'australia',
  'new zealand',
  'portugal',
  'germany',
  'chile',
  'south africa',
  'united states',
  'canada',
]

const VARIETAL_KEYWORDS = [
  'cabernet sauvignon',
  'cabernet',
  'merlot',
  'pinot noir',
  'pinot',
  'chardonnay',
  'sauvignon blanc',
  'riesling',
  'malbec',
  'syrah',
  'shiraz',
  'zinfandel',
  'sangiovese',
  'tempranillo',
  'grenache',
  'nebbiolo',
  'barbera',
  'prosecco',
  'moscato',
  'gewurztraminer',
  'viognier',
  'chenin blanc',
  'gruner veltliner',
  'red blend',
  'sparkling blend',
  'rosé blend',
  'glera',
  'cortese',
  'super tuscan',
]

const FOLLOW_UP_PATTERN =
  /what about|how about|what else|anything else|tell me another|another one|another|same budget|same price|same range|that budget|that range|more like that|more like those|more like this|more like them|similar|what other|other options|one more|same idea|keep the same|something cheaper|cheaper|instead|rather|also/i

const SPEECH_TRANSCRIPT_CORRECTIONS: Array<[RegExp, string]> = [
  [/\bburgandy\b/gi, 'burgundy'],
  [/\bburgendy\b/gi, 'burgundy'],
  [/\bboardeaux\b/gi, 'bordeaux'],
  [/\bbar doe\b/gi, 'bordeaux'],
  [/\bbor doe\b/gi, 'bordeaux'],
  [/\bpinot newar\b/gi, 'pinot noir'],
  [/\bpinot nor\b/gi, 'pinot noir'],
  [/\bshard(?:enay|onnay|inay)\b/gi, 'chardonnay'],
  [/\bsovee(?:gnyon|nyon)\s+blanc\b/gi, 'sauvignon blanc'],
  [/\bcab sav\b/gi, 'cabernet sauvignon'],
  [/\bhouse warming\b/gi, 'housewarming'],
  [/\brose\b/gi, 'rose'],
]

function normalizeColor(value: string | null | undefined) {
  return value
    ? value
        .toLowerCase()
        .normalize('NFD')
        .replace(/[\u0300-\u036f]/g, '')
    : ''
}

function formatCurrency(value: number) {
  return `$${Math.round(value)}`
}

function describeRelaxedConstraints(relaxedConstraints: string[]) {
  if (relaxedConstraints.length === 0) {
    return ''
  }

  if (relaxedConstraints.length === 1) {
    return relaxedConstraints[0]
  }

  return `${relaxedConstraints.slice(0, -1).join(', ')} and ${relaxedConstraints[relaxedConstraints.length - 1]}`
}

function roundPrice(value: number) {
  return Math.max(0, Math.round(value))
}

export function normalizeWineSpeechTranscript(transcript: string) {
  let normalizedTranscript = transcript.trim()

  for (const [pattern, replacement] of SPEECH_TRANSCRIPT_CORRECTIONS) {
    normalizedTranscript = normalizedTranscript.replace(pattern, replacement)
  }

  normalizedTranscript = normalizedTranscript.replace(/\s+/g, ' ').trim()

  return normalizedTranscript
}

function getWineCandidateId(wine: Wine) {
  return wine.name
}

function dedupeRelaxationVariants(variants: Array<{ filters: ParsedWineFilters; relaxedConstraints: string[] }>) {
  const seen = new Set<string>()

  return variants.filter((variant) => {
    const key = JSON.stringify(variant.filters)

    if (seen.has(key)) {
      return false
    }

    seen.add(key)
    return true
  })
}

function buildRelaxationVariants(filters: ParsedWineFilters) {
  const variants: Array<{ filters: ParsedWineFilters; relaxedConstraints: string[] }> = []

  if (filters.occasion) {
    variants.push({
      filters: {
        ...filters,
        occasion: undefined,
      },
      relaxedConstraints: ['occasion guidance'],
    })
  }

  if (filters.region) {
    variants.push({
      filters: {
        ...filters,
        region: undefined,
      },
      relaxedConstraints: ['region preference'],
    })
  }

  if (filters.varietal) {
    variants.push({
      filters: {
        ...filters,
        varietal: undefined,
      },
      relaxedConstraints: ['grape preference'],
    })
  }

  if (filters.priceMin != null || filters.priceMax != null) {
    variants.push({
      filters: {
        ...filters,
        priceMin: filters.priceMin != null ? roundPrice(filters.priceMin * 0.85) : undefined,
        priceMax: filters.priceMax != null ? roundPrice(filters.priceMax * 1.15) : undefined,
      },
      relaxedConstraints: [
        filters.priceMin != null && filters.priceMax != null
          ? `price range around ${formatCurrency(filters.priceMin)} to ${formatCurrency(filters.priceMax)}`
          : filters.priceMax != null
            ? `budget cap near ${formatCurrency(filters.priceMax ?? 0)}`
            : `minimum spend near ${formatCurrency(filters.priceMin ?? 0)}`,
      ],
    })
  }

  if (filters.priceMax != null) {
    variants.push({
      filters: {
        ...filters,
        priceMax: undefined,
      },
      relaxedConstraints: ['budget cap'],
    })
  }

  if (filters.priceMin != null) {
    variants.push({
      filters: {
        ...filters,
        priceMin: undefined,
      },
      relaxedConstraints: ['minimum spend'],
    })
  }

  if (filters.color) {
    variants.push({
      filters: {
        ...filters,
        color: undefined,
      },
      relaxedConstraints: ['wine color'],
    })
  }

  return dedupeRelaxationVariants(variants)
}

function maybeCarryForwardFilters(
  filters: ParsedWineFilters,
  prevFilters: ParsedWineFilters | null,
  lowerQuery: string,
) {
  if (!prevFilters) {
    return filters
  }

  const ownFilterCount = Object.entries(filters).filter(([, value]) => value != null && value !== false).length
  const isFollowUp = ownFilterCount <= 3 && FOLLOW_UP_PATTERN.test(lowerQuery)

  if (!isFollowUp) {
    return filters
  }

  const carriedFilters = { ...filters }

  if (carriedFilters.priceMin == null && prevFilters.priceMin != null) {
    carriedFilters.priceMin = prevFilters.priceMin
  }

  if (carriedFilters.priceMax == null && prevFilters.priceMax != null) {
    carriedFilters.priceMax = prevFilters.priceMax
  }

  if (!carriedFilters.color && prevFilters.color) {
    carriedFilters.color = prevFilters.color
  }

  if (!carriedFilters.region && prevFilters.region) {
    carriedFilters.region = prevFilters.region
  }

  if (!carriedFilters.varietal && prevFilters.varietal) {
    carriedFilters.varietal = prevFilters.varietal
  }

  if (!carriedFilters.occasion && prevFilters.occasion) {
    carriedFilters.occasion = prevFilters.occasion
  }

  if (!carriedFilters.sortByScore && !carriedFilters.sortByPriceAsc && !carriedFilters.sortByPriceDesc) {
    if (prevFilters.sortByScore) {
      carriedFilters.sortByScore = true
    }

    if (prevFilters.sortByPriceAsc) {
      carriedFilters.sortByPriceAsc = true
    }

    if (prevFilters.sortByPriceDesc) {
      carriedFilters.sortByPriceDesc = true
    }
  }

  if (/cheaper|less expensive|lower price|more affordable/i.test(lowerQuery)) {
    carriedFilters.sortByPriceAsc = true
    carriedFilters.sortByPriceDesc = undefined
    carriedFilters.sortByScore = undefined
  }

  if (/pricier|more expensive|higher end|higher-end|more premium/i.test(lowerQuery)) {
    carriedFilters.sortByPriceDesc = true
    carriedFilters.sortByPriceAsc = undefined
    carriedFilters.sortByScore = undefined
  }

  return carriedFilters
}

function getRangeMatch(lowerQuery: string) {
  return (
    lowerQuery.match(
      /(?:between|from|within|in(?: the)?(?: budget)?(?: range)?(?: of)?)\s*\$?(\d+)\s*(?:and|to|-)\s*\$?(\d+)(?:\s*(?:range|budget|dollars?))?/,
    ) ??
    lowerQuery.match(/\$?(\d+)\s*(?:and|to|-)\s*\$?(\d+)\s*(?:range|budget)/) ??
    lowerQuery.match(/in(?: the)?\s+\$?(\d+)\s*(?:to|-)\s*\$?(\d+)\s+range/)
  )
}

export function getTopRating(wine: Wine) {
  if (!wine.ratings?.length) {
    return null
  }

  return wine.ratings.reduce<WineRating | null>((best, rating) => {
    if (!best) {
      return rating
    }

    return (rating.score ?? 0) > (best.score ?? 0) ? rating : best
  }, null)
}

export function getTopScore(wine: Wine) {
  if (!wine.ratings?.length) {
    return null
  }

  return Math.max(...wine.ratings.map((rating) => rating.score ?? 0))
}

export function getTopWinesByScore(wines: Wine[], limit: number) {
  return [...wines].sort((a, b) => (getTopScore(b) ?? 0) - (getTopScore(a) ?? 0)).slice(0, limit)
}

export function parseQuery(query: string, prevFilters: ParsedWineFilters | null = null) {
  const lowerQuery = query.toLowerCase()
  const filters: ParsedWineFilters = {}

  const rangeMatch = getRangeMatch(lowerQuery)
  const underMatch =
    lowerQuery.match(/(?:under|below|less than|up to|no more than|keep it under|cap(?: it)? at|at most)\s*\$?(\d+)/) ??
    lowerQuery.match(/(?:my\s+)?(?:max(?:imum)?\s+)?budget(?:\s+(?:is|of|at))?\s*\$?(\d+)/) ??
    lowerQuery.match(/(?:budget(?:\s+(?:is|of|at))?|max(?:imum)?(?:\s+is)?)\s*\$?(\d+)/) ??
    lowerQuery.match(/\$?(\d+)\s*(?:dollar|dollars|bucks?)\s+budget/)
  const overMatch =
    lowerQuery.match(/(?:over|above|more than|at least|minimum of|start at|starting at)\s*\$?(\d+)/) ??
    lowerQuery.match(/(?:minimum|floor)(?:\s+(?:is|of|at))?\s*\$?(\d+)/)
  const aroundMatch =
    lowerQuery.match(/(?:around|about|roughly|close to|near|keep it around|keep it near)\s*\$?(\d+)/) ??
    lowerQuery.match(/(?:budget(?:\s+(?:around|about|near))?)\s*\$?(\d+)/)

  if (rangeMatch) {
    filters.priceMin = Number.parseFloat(rangeMatch[1])
    filters.priceMax = Number.parseFloat(rangeMatch[2])
  } else if (underMatch) {
    filters.priceMax = Number.parseFloat(underMatch[1])
  } else if (overMatch) {
    filters.priceMin = Number.parseFloat(overMatch[1])
  } else if (aroundMatch) {
    const midpoint = Number.parseFloat(aroundMatch[1])
    filters.priceMin = roundPrice(midpoint * 0.7)
    filters.priceMax = roundPrice(midpoint * 1.3)
  }

  const hasCheapSignal = /cheap|budget|affordable|inexpensive|bargain|value/i.test(lowerQuery)
  const hasLuxurySignal = /expensive|luxury|premium|splurge|high[\s-]?end|finest/i.test(lowerQuery)

  if (hasCheapSignal && !hasLuxurySignal && filters.priceMax == null) {
    filters.priceMax = 30
  }

  if (hasLuxurySignal && !hasCheapSignal && filters.priceMin == null) {
    filters.priceMin = 80
  }

  const champagneAsRegion = /from\s+champagne|champagne\s+region|in\s+champagne/i.test(lowerQuery)

  for (const [keyword, color] of Object.entries(COLOR_KEYWORDS)) {
    if (keyword === 'champagne' && champagneAsRegion) {
      continue
    }

    if (lowerQuery.includes(keyword)) {
      filters.color = color
      break
    }
  }

  for (const region of REGION_KEYWORDS) {
    if (lowerQuery.includes(region)) {
      filters.region = region
      break
    }
  }

  for (const varietal of VARIETAL_KEYWORDS) {
    if (lowerQuery.includes(varietal)) {
      filters.varietal = varietal
      break
    }
  }

  if (/best|top|highest.rated|award|critic|rated|acclaimed/i.test(lowerQuery)) {
    filters.sortByScore = true
  }

  if (/most expensive|priciest|costliest/i.test(lowerQuery)) {
    filters.sortByPriceDesc = true
  }

  if (/cheapest|least expensive|lowest price/i.test(lowerQuery)) {
    filters.sortByPriceAsc = true
  }

  const noPriceLimit = /don.t care|no budget|no limit|regardless of price|price doesn.t matter|money.s no object/i.test(
    lowerQuery,
  )

  if (/gift|present|housewarming|birthday|anniversary|celebration|special occasion/i.test(lowerQuery)) {
    filters.occasion = true

    if (filters.priceMin == null && filters.priceMax == null && !noPriceLimit) {
      filters.priceMin = 25
      filters.priceMax = 120
    }

    filters.sortByScore = true
  }

  return maybeCarryForwardFilters(filters, prevFilters, lowerQuery)
}

export function filterWines(wines: Wine[], filters: ParsedWineFilters, maxResults = 30) {
  let results = [...wines]

  if (filters.color) {
    const targetColor = normalizeColor(filters.color)
    results = results.filter((wine) => normalizeColor(wine.color) === targetColor)
  }

  if (filters.priceMax != null) {
    const priceMax = filters.priceMax
    results = results.filter((wine) => wine.price != null && wine.price <= priceMax)
  }

  if (filters.priceMin != null) {
    const priceMin = filters.priceMin
    results = results.filter((wine) => wine.price != null && wine.price >= priceMin)
  }

  if (filters.region) {
    const lowerRegion = filters.region.toLowerCase()
    results = results.filter((wine) => {
      const region = wine.region?.toLowerCase() ?? ''
      const country = wine.country?.toLowerCase() ?? ''
      const appellation = wine.appellation?.toLowerCase() ?? ''
      return region.includes(lowerRegion) || country.includes(lowerRegion) || appellation.includes(lowerRegion)
    })
  }

  if (filters.varietal) {
    const lowerVarietal = filters.varietal.toLowerCase()
    results = results.filter((wine) => wine.varietal?.toLowerCase().includes(lowerVarietal))
  }

  if (filters.sortByScore) {
    results.sort((a, b) => (getTopScore(b) ?? 0) - (getTopScore(a) ?? 0))
  } else if (filters.sortByPriceDesc) {
    results.sort((a, b) => (b.price ?? 0) - (a.price ?? 0))
  } else if (filters.sortByPriceAsc) {
    results.sort((a, b) => (a.price ?? Number.POSITIVE_INFINITY) - (b.price ?? Number.POSITIVE_INFINITY))
  } else {
    results.sort((a, b) => (getTopScore(b) ?? 0) - (getTopScore(a) ?? 0))
  }

  return results.slice(0, maxResults)
}

export function retrieveRelevantWines(wines: Wine[], filters: ParsedWineFilters, maxResults = 30): WineRetrievalResult {
  const exactMatches = filterWines(wines, filters, maxResults)

  if (exactMatches.length > 0 || Object.keys(filters).length === 0) {
    const matches = exactMatches.length > 0 ? exactMatches : getTopWinesByScore(wines, maxResults)

    return {
      matches,
      appliedFilters: filters,
      relaxedConstraints: [],
      retrievalNote: null,
      spokenPreface: null,
      hasExactMatches: exactMatches.length > 0,
      candidateIds: matches.map(getWineCandidateId),
    }
  }

  for (const variant of buildRelaxationVariants(filters)) {
    const relaxedMatches = filterWines(wines, variant.filters, maxResults)

    if (relaxedMatches.length === 0) {
      continue
    }

    const relaxedDescription = describeRelaxedConstraints(variant.relaxedConstraints)

    return {
      matches: relaxedMatches,
      appliedFilters: variant.filters,
      relaxedConstraints: variant.relaxedConstraints,
      retrievalNote: `No exact matches fit every requested detail. The closest available bottles relax the ${relaxedDescription}. Briefly acknowledge that before recommending bottles.`,
      spokenPreface: `I couldn't find an exact match for every detail, so I'm showing the closest bottles while relaxing the ${relaxedDescription}.`,
      hasExactMatches: false,
      candidateIds: relaxedMatches.map(getWineCandidateId),
    }
  }

  const fallbackMatches = getTopWinesByScore(wines, maxResults)

  return {
    matches: fallbackMatches,
    appliedFilters: {},
    relaxedConstraints: ['exact filter match'],
    retrievalNote:
      'No close matches were available for every requested detail. Briefly say that you are offering standout bottles from the broader collection.',
    spokenPreface:
      "I couldn't find a close match for every detail, so I'm sharing a few standout bottles from the broader collection.",
    hasExactMatches: false,
    candidateIds: fallbackMatches.map(getWineCandidateId),
  }
}

export function buildWineCatalog(wines: Wine[]) {
  return wines
    .map((wine, index) => {
      const score = getTopScore(wine)
      const topRating = getTopRating(wine)

      const parts = [
        `[${index + 1}] ${wine.name}`,
        wine.producer ? `Producer: ${wine.producer}` : null,
        wine.varietal ? `Varietal: ${wine.varietal}` : null,
        wine.color ? `Type: ${wine.color}` : null,
        wine.region ? `Region: ${wine.region}` : null,
        wine.country ? `Country: ${wine.country}` : null,
        wine.vintage != null ? `Vintage: ${wine.vintage}` : null,
        wine.price != null ? `Price: $${wine.price}` : null,
        wine.volume_ml ? `Volume: ${wine.volume_ml}ml` : null,
        wine.abv ? `ABV: ${wine.abv}%` : null,
        score ? `Top Score: ${score}/100` : null,
        topRating?.note ? `Tasting Note (${topRating.source ?? 'Unknown'}): "${topRating.note.slice(0, 200)}"` : null,
      ].filter(Boolean)

      return parts.join(' | ')
    })
    .join('\n')
}

function escapeRegExp(value: string) {
  return value.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')
}

export function findMentionedWines(responseText: string, candidateWines: Wine[]) {
  const lowerResponse = responseText.toLowerCase()
  const matched = candidateWines.filter((wine) => {
    const name = wine.name.toLowerCase()

    if (name.length < 4) {
      return false
    }

    const fullNamePattern = new RegExp(`\\b${escapeRegExp(name)}\\b`, 'i')

    if (fullNamePattern.test(lowerResponse)) {
      return true
    }

    const shortenedName = name.replace(/^(the |chateau |domaine |bodega )/, '')

    if (shortenedName.length > 8) {
      const shortNamePattern = new RegExp(`\\b${escapeRegExp(shortenedName)}\\b`, 'i')
      return shortNamePattern.test(lowerResponse)
    }

    return false
  })

  const dedupedBySubset = matched.filter((wine) => {
    const name = wine.name.toLowerCase()
    return !matched.some((otherWine) => {
      if (otherWine === wine) {
        return false
      }

      const otherName = otherWine.name.toLowerCase()
      return otherName.startsWith(`${name} `) || otherName.startsWith(`${name},`)
    })
  })

  const dedupedByName = new Map<string, Wine>()

  for (const wine of dedupedBySubset) {
    const key = wine.name.toLowerCase()
    const existingWine = dedupedByName.get(key)

    if (!existingWine || (getTopScore(wine) ?? 0) > (getTopScore(existingWine) ?? 0)) {
      dedupedByName.set(key, wine)
    }
  }

  return [...dedupedByName.values()]
}

export function buildRecommendationTurnResult(
  answerText: string,
  retrievalResult: WineRetrievalResult,
  maxCards = 5,
): RecommendationTurnResult {
  return {
    answerText,
    cards: findMentionedWines(answerText, retrievalResult.matches).slice(0, maxCards),
    appliedFilters: retrievalResult.appliedFilters,
    relaxedConstraints: retrievalResult.relaxedConstraints,
    candidateIds: retrievalResult.candidateIds,
  }
}
