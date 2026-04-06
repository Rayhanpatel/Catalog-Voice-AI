import { execSync } from 'node:child_process'

const VERTEX_TARGET_ORIGIN = 'https://us-central1-aiplatform.googleapis.com'
const TTS_TARGET_ORIGIN = 'https://texttospeech.googleapis.com'
const STT_TARGET_URL = 'https://speech.googleapis.com/v1/speech:recognize'
const STT_PROVIDER = 'google-cloud-speech-to-text'
const STT_PHRASE_HINTS = [
  'wine',
  'budget',
  'under 50 dollars',
  'under 100 dollars',
  'burgundy',
  'bordeaux',
  'napa',
  'sonoma',
  'rioja',
  'tuscany',
  'piedmont',
  'veneto',
  'champagne',
  'cabernet sauvignon',
  'pinot noir',
  'chardonnay',
  'sauvignon blanc',
  'riesling',
  'merlot',
  'tempranillo',
  'syrah',
  'rose',
  'sparkling',
  'housewarming',
]
const SPEECH_PROFILE_CONFIG = {
  auto: {
    languageCode: 'en-US',
    alternativeLanguageCodes: ['en-IN', 'en-GB'],
  },
  'en-IN': {
    languageCode: 'en-IN',
    alternativeLanguageCodes: ['en-US', 'en-GB'],
  },
  'en-US': {
    languageCode: 'en-US',
    alternativeLanguageCodes: ['en-IN', 'en-GB'],
  },
  'en-GB': {
    languageCode: 'en-GB',
    alternativeLanguageCodes: ['en-IN', 'en-US'],
  },
}

let cachedToken = null
let tokenExpiry = 0

function clearCachedToken() {
  cachedToken = null
  tokenExpiry = 0
}

function getGcloudToken({ forceRefresh = false } = {}) {
  if (!forceRefresh && Date.now() < tokenExpiry && cachedToken) {
    return cachedToken
  }

  try {
    cachedToken = execSync('gcloud auth print-access-token 2>/dev/null').toString().trim()
    tokenExpiry = Date.now() + 50 * 60 * 1000
    console.log('[Wine AI Proxy] gcloud token refreshed.')
    return cachedToken
  } catch {
    console.warn('[Wine AI Proxy] gcloud not authenticated. Run: gcloud auth login')
    return null
  }
}

async function readRequestBuffer(req) {
  const chunks = []

  for await (const chunk of req) {
    chunks.push(Buffer.isBuffer(chunk) ? chunk : Buffer.from(chunk))
  }

  return chunks.length > 0 ? Buffer.concat(chunks) : undefined
}

async function readJsonRequest(req) {
  const body = await readRequestBuffer(req)

  if (!body) {
    return null
  }

  return JSON.parse(body.toString('utf8'))
}

function copyResponseHeaders(upstreamResponse, res) {
  upstreamResponse.headers.forEach((value, key) => {
    const lowerKey = key.toLowerCase()

    if (lowerKey === 'content-length' || lowerKey === 'content-encoding' || lowerKey === 'transfer-encoding') {
      return
    }

    res.setHeader(key, value)
  })
}

function getForwardHeaders(reqHeaders) {
  const headers = new Headers()

  for (const [key, value] of Object.entries(reqHeaders)) {
    if (!value) {
      continue
    }

    const lowerKey = key.toLowerCase()

    if (lowerKey === 'host' || lowerKey === 'connection' || lowerKey === 'content-length') {
      continue
    }

    headers.set(key, Array.isArray(value) ? value.join(', ') : value)
  }

  return headers
}

async function performGoogleRequest({
  url,
  method = 'GET',
  headers = new Headers(),
  body,
  projectId,
  forceRefresh = false,
}) {
  const token = getGcloudToken({ forceRefresh })

  if (!token) {
    return null
  }

  const requestHeaders = headers instanceof Headers ? new Headers(headers) : new Headers(headers)
  requestHeaders.set('Authorization', `Bearer ${token}`)
  requestHeaders.set('X-Goog-User-Project', projectId)

  return fetch(url, {
    method,
    headers: requestHeaders,
    body,
  })
}

async function performGoogleRequestWithRetry(options) {
  let response = await performGoogleRequest(options)

  if (!response) {
    return null
  }

  if (response.status === 401) {
    clearCachedToken()
    response = await performGoogleRequest({
      ...options,
      forceRefresh: true,
    })
  }

  return response
}

async function summarizeResponseFailure(response) {
  try {
    const text = await response.text()
    return text.slice(0, 240) || `HTTP ${response.status}`
  } catch {
    return `HTTP ${response.status}`
  }
}

function createSilentLinear16Base64({ durationMs = 120, sampleRateHertz = 16_000 } = {}) {
  const frameCount = Math.max(1, Math.round((sampleRateHertz * durationMs) / 1000))
  return Buffer.alloc(frameCount * 2).toString('base64')
}

function mapMimeTypeToEncoding(mimeType = '') {
  const normalizedMimeType = mimeType.toLowerCase()

  if (normalizedMimeType.includes('ogg')) {
    return 'OGG_OPUS'
  }

  if (normalizedMimeType.includes('wav') || normalizedMimeType.includes('wave') || normalizedMimeType.includes('pcm')) {
    return 'LINEAR16'
  }

  return 'WEBM_OPUS'
}

function resolveSpeechProfile(languageProfile = 'auto') {
  return SPEECH_PROFILE_CONFIG[languageProfile] ?? SPEECH_PROFILE_CONFIG.auto
}

function buildSpeechRecognizeRequest({
  audioContent,
  mimeType = 'audio/webm',
  sampleRateHertz,
  languageProfile = 'auto',
}) {
  const profile = resolveSpeechProfile(languageProfile)
  const encoding = mapMimeTypeToEncoding(mimeType)
  const config = {
    encoding,
    languageCode: profile.languageCode,
    alternativeLanguageCodes: profile.alternativeLanguageCodes,
    enableAutomaticPunctuation: true,
    maxAlternatives: 3,
    model: 'latest_short',
    speechContexts: [
      {
        phrases: STT_PHRASE_HINTS,
        boost: 20,
      },
    ],
  }

  if (typeof sampleRateHertz === 'number' && Number.isFinite(sampleRateHertz)) {
    config.sampleRateHertz = Math.round(sampleRateHertz)
  }

  return {
    config,
    audio: {
      content: audioContent,
    },
  }
}

async function validateVertexCapability(projectId) {
  const response = await performGoogleRequestWithRetry({
    url: `${VERTEX_TARGET_ORIGIN}/v1/projects/${projectId}/locations/us-central1/publishers/google/models/gemini-2.5-flash:generateContent`,
    method: 'POST',
    projectId,
    headers: new Headers({
      'Content-Type': 'application/json',
    }),
    body: JSON.stringify({
      contents: [
        {
          role: 'user',
          parts: [{ text: 'Reply with ok.' }],
        },
      ],
      generationConfig: {
        maxOutputTokens: 8,
        temperature: 0,
        thinkingConfig: {
          thinkingBudget: 0,
        },
      },
    }),
  })

  if (!response) {
    return {
      ready: false,
      message: 'Missing gcloud authentication.',
    }
  }

  if (!response.ok) {
    return {
      ready: false,
      message: `Vertex AI check failed (${response.status}). ${await summarizeResponseFailure(response)}`,
    }
  }

  return {
    ready: true,
    message: 'Vertex AI is reachable.',
  }
}

async function validateTtsCapability(projectId) {
  const response = await performGoogleRequestWithRetry({
    url: `${TTS_TARGET_ORIGIN}/v1/voices?languageCode=en-US`,
    method: 'GET',
    projectId,
  })

  if (!response) {
    return {
      ready: false,
      message: 'Missing gcloud authentication.',
    }
  }

  if (!response.ok) {
    return {
      ready: false,
      message: `Cloud TTS check failed (${response.status}). ${await summarizeResponseFailure(response)}`,
    }
  }

  return {
    ready: true,
    message: 'Cloud TTS is reachable.',
  }
}

async function validateSttCapability(projectId) {
  const response = await performGoogleRequestWithRetry({
    url: STT_TARGET_URL,
    method: 'POST',
    projectId,
    headers: new Headers({
      'Content-Type': 'application/json',
    }),
    body: JSON.stringify(
      buildSpeechRecognizeRequest({
        audioContent: createSilentLinear16Base64(),
        mimeType: 'audio/pcm',
        sampleRateHertz: 16_000,
        languageProfile: 'en-US',
      }),
    ),
  })

  if (!response) {
    return {
      ready: false,
      message: 'Missing gcloud authentication.',
    }
  }

  if (!response.ok) {
    return {
      ready: false,
      message: `Cloud STT check failed (${response.status}). ${await summarizeResponseFailure(response)}`,
    }
  }

  return {
    ready: true,
    message: 'Cloud STT is reachable.',
  }
}

export async function buildWineAiProxyHealth({ projectId }) {
  const authenticated = Boolean(getGcloudToken({ forceRefresh: true }))
  const [vertex, tts, stt] = authenticated
    ? await Promise.all([
        validateVertexCapability(projectId),
        validateTtsCapability(projectId),
        validateSttCapability(projectId),
      ])
    : [
        { ready: false, message: 'Missing gcloud authentication.' },
        { ready: false, message: 'Missing gcloud authentication.' },
        { ready: false, message: 'Missing gcloud authentication.' },
      ]

  const ok = vertex.ready && tts.ready && stt.ready

  return {
    ok,
    projectId,
    authenticated,
    capabilities: {
      vertex,
      tts,
      stt,
    },
    routes: {
      vertex: true,
      tts: true,
      stt: true,
      wineImage: true,
    },
    checkedAt: new Date().toISOString(),
    message: ok
      ? 'Vertex AI, Cloud TTS, and Cloud STT proxy routes are ready.'
      : [vertex.message, tts.message, stt.message].find((message) => !message.includes('reachable')) ?? 'One or more AI services need attention.',
  }
}

async function proxyJsonRequest(
  req,
  res,
  {
    routePrefix,
    targetOrigin,
    projectId,
    stripKeySearchParam = false,
  },
) {
  const requestUrl = new URL(req.url, 'http://127.0.0.1')
  const upstreamUrl = new URL(requestUrl.pathname.replace(routePrefix, ''), targetOrigin)
  upstreamUrl.search = requestUrl.search

  if (stripKeySearchParam) {
    upstreamUrl.searchParams.delete('key')
  }

  const body = req.method === 'GET' || req.method === 'HEAD' ? undefined : await readRequestBuffer(req)
  const response = await performGoogleRequestWithRetry({
    url: upstreamUrl,
    method: req.method,
    projectId,
    headers: getForwardHeaders(req.headers),
    body,
  })

  if (!response) {
    res.statusCode = 401
    res.end('Missing gcloud authentication.')
    return
  }

  const responseBuffer = Buffer.from(await response.arrayBuffer())
  res.statusCode = response.status
  copyResponseHeaders(response, res)
  res.end(responseBuffer)
}

async function handleSpeechRecognizeRequest(req, res, projectId) {
  const payload = await readJsonRequest(req)

  if (!payload?.audioContent) {
    res.statusCode = 400
    res.end('Speech-to-Text request missing audioContent.')
    return
  }

  const response = await performGoogleRequestWithRetry({
    url: STT_TARGET_URL,
    method: 'POST',
    projectId,
    headers: new Headers({
      'Content-Type': 'application/json',
    }),
    body: JSON.stringify(
      buildSpeechRecognizeRequest({
        audioContent: payload.audioContent,
        mimeType: payload.mimeType,
        sampleRateHertz: payload.sampleRateHertz,
        languageProfile: payload.languageProfile,
      }),
    ),
  })

  if (!response) {
    res.statusCode = 401
    res.end('Missing gcloud authentication.')
    return
  }

  if (!response.ok) {
    res.statusCode = response.status
    res.end(`Speech-to-Text error ${response.status}: ${await summarizeResponseFailure(response)}`)
    return
  }

  const data = await response.json()
  const results = Array.isArray(data.results) ? data.results : []
  const alternatives = results.flatMap((result) => (Array.isArray(result.alternatives) ? result.alternatives : []))
  const transcript = results
    .map((result) => result.alternatives?.[0]?.transcript?.trim() ?? '')
    .filter(Boolean)
    .join(' ')
    .trim()
  const confidences = alternatives
    .map((alternative) => alternative.confidence)
    .filter((confidence) => typeof confidence === 'number' && Number.isFinite(confidence))
  const confidence =
    confidences.length > 0 ? confidences.reduce((sum, value) => sum + value, 0) / confidences.length : null
  const profile = resolveSpeechProfile(payload.languageProfile)

  res.statusCode = 200
  res.setHeader('Content-Type', 'application/json')
  res.setHeader('Cache-Control', 'no-store')
  res.end(
    JSON.stringify({
      transcript,
      language: profile.languageCode,
      confidence,
      provider: STT_PROVIDER,
    }),
  )
}

async function handleWineImageRequest(req, res, allowedImageHosts) {
  const requestUrl = new URL(req.url, 'http://127.0.0.1')
  const upstreamUrl = requestUrl.searchParams.get('url')

  if (!upstreamUrl) {
    res.statusCode = 400
    res.end('Missing image url.')
    return
  }

  let parsedUpstreamUrl

  try {
    parsedUpstreamUrl = new URL(upstreamUrl)
  } catch {
    res.statusCode = 400
    res.end('Invalid image url.')
    return
  }

  if (!['http:', 'https:'].includes(parsedUpstreamUrl.protocol) || !allowedImageHosts.includes(parsedUpstreamUrl.hostname)) {
    res.statusCode = 403
    res.end('Image host not allowed.')
    return
  }

  const upstreamResponse = await fetch(parsedUpstreamUrl)

  if (!upstreamResponse.ok) {
    res.statusCode = upstreamResponse.status
    res.end(`Image proxy error ${upstreamResponse.status}.`)
    return
  }

  const imageBuffer = Buffer.from(await upstreamResponse.arrayBuffer())
  const contentType = upstreamResponse.headers.get('content-type') ?? 'image/jpeg'

  res.statusCode = 200
  res.setHeader('Content-Type', contentType)
  res.setHeader('Cache-Control', 'public, max-age=86400')
  res.setHeader('Cross-Origin-Resource-Policy', 'same-origin')
  res.end(imageBuffer)
}

export function createWineAiProxyMiddleware({
  projectId,
  allowedImageHosts = ['assets.wine.com'],
} = {}) {
  if (!projectId) {
    throw new Error('projectId is required for the wine AI proxy middleware.')
  }

  return async function wineAiProxyMiddleware(req, res, next) {
    if (!req.url) {
      next()
      return
    }

    const requestUrl = new URL(req.url, 'http://127.0.0.1')

    try {
      if (requestUrl.pathname === '/api/health') {
        const health = await buildWineAiProxyHealth({ projectId })
        res.statusCode = 200
        res.setHeader('Content-Type', 'application/json')
        res.setHeader('Cache-Control', 'no-store')
        res.end(JSON.stringify(health))
        return
      }

      if (requestUrl.pathname === '/api/wine-image') {
        await handleWineImageRequest(req, res, allowedImageHosts)
        return
      }

      if (requestUrl.pathname === '/api/stt/recognize') {
        await handleSpeechRecognizeRequest(req, res, projectId)
        return
      }

      if (requestUrl.pathname.startsWith('/api/vertex/')) {
        await proxyJsonRequest(req, res, {
          routePrefix: '/api/vertex',
          targetOrigin: VERTEX_TARGET_ORIGIN,
          projectId,
        })
        return
      }

      if (requestUrl.pathname.startsWith('/api/tts/')) {
        await proxyJsonRequest(req, res, {
          routePrefix: '/api/tts',
          targetOrigin: TTS_TARGET_ORIGIN,
          projectId,
          stripKeySearchParam: true,
        })
        return
      }
    } catch (error) {
      console.error('[Wine AI Proxy] request failed.', error)
      res.statusCode = 502
      res.end('Wine AI proxy request failed.')
      return
    }

    next()
  }
}
