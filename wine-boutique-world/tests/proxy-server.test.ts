import { Readable } from 'node:stream'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

const proxyModuleUrl = new URL('../../packages/wine-ai-core/server/proxy.mjs', import.meta.url).href

function createResponseRecorder() {
  const headers = new Map<string, string>()
  let statusCode = 200
  let body = ''

  return {
    get statusCode() {
      return statusCode
    },
    set statusCode(value: number) {
      statusCode = value
    },
    setHeader(key: string, value: string) {
      headers.set(key.toLowerCase(), value)
    },
    end(chunk?: Buffer | string) {
      body = chunk ? chunk.toString() : ''
    },
    getBody() {
      return body
    },
    getHeader(key: string) {
      return headers.get(key.toLowerCase()) ?? null
    },
  }
}

function createJsonRequest(pathname: string, payload: unknown) {
  const body = Buffer.from(JSON.stringify(payload))
  const request = Readable.from([body]) as Readable & {
    url?: string
    method?: string
    headers?: Record<string, string>
  }

  request.url = pathname
  request.method = 'POST'
  request.headers = {
    'content-type': 'application/json',
  }

  return request
}

async function importFreshProxyModule() {
  vi.resetModules()
  return import(proxyModuleUrl)
}

beforeEach(() => {
  vi.doMock('node:child_process', () => ({
    execSync: vi.fn(() => Buffer.from('test-token\n')),
  }))
})

afterEach(() => {
  vi.restoreAllMocks()
  vi.resetModules()
})

describe('wine ai proxy middleware', () => {
  it('reports partial health when cloud STT is unavailable', async () => {
    const fetchMock = vi
      .fn()
      .mockResolvedValueOnce({
        ok: true,
        status: 200,
      })
      .mockResolvedValueOnce({
        ok: true,
        status: 200,
      })
      .mockResolvedValueOnce({
        ok: false,
        status: 503,
        text: async () => 'stt unavailable',
      })

    vi.stubGlobal('fetch', fetchMock)

    const { buildWineAiProxyHealth } = await importFreshProxyModule()
    const health = await buildWineAiProxyHealth({ projectId: 'wine-voice-explorer' })

    expect(health.ok).toBe(false)
    expect(health.capabilities.vertex.ready).toBe(true)
    expect(health.capabilities.tts.ready).toBe(true)
    expect(health.capabilities.stt.ready).toBe(false)
    expect(health.routes.stt).toBe(true)
  })

  it('returns structured cloud STT results from the speech-input route', async () => {
    const fetchMock = vi.fn().mockResolvedValue({
      ok: true,
      status: 200,
      json: async () => ({
        results: [
          {
            alternatives: [
              {
                transcript: 'show me a red under 50',
                confidence: 0.91,
              },
            ],
          },
        ],
      }),
    })

    vi.stubGlobal('fetch', fetchMock)

    const { createWineAiProxyMiddleware } = await importFreshProxyModule()
    const middleware = createWineAiProxyMiddleware({ projectId: 'wine-voice-explorer' })
    const request = createJsonRequest('/api/stt/recognize', {
      audioContent: 'ZmFrZQ==',
      mimeType: 'audio/webm;codecs=opus',
      sampleRateHertz: 48000,
      languageProfile: 'en-IN',
    })
    const response = createResponseRecorder()

    await middleware(request as never, response as never, () => {})

    expect(response.statusCode).toBe(200)
    expect(response.getHeader('content-type')).toBe('application/json')
    expect(JSON.parse(response.getBody())).toEqual({
      transcript: 'show me a red under 50',
      language: 'en-IN',
      confidence: 0.91,
      provider: 'google-cloud-speech-to-text',
    })
  })
})
