import { spawn } from 'node:child_process'
import process from 'node:process'
import { setTimeout as delay } from 'node:timers/promises'
import { chromium } from 'playwright'

const port = Number(process.env.E2E_CONSULT_PORT ?? 4175)
const baseUrl = `http://127.0.0.1:${port}/?smoke=1`
const serverReadyTimeoutMs = 20_000
const greetingText = "Welcome in. Tell me what you enjoy, your budget, or the occasion, and I'll recommend bottles from this collection."

function startPreviewServer() {
  const child = spawn('npm', ['run', 'preview', '--', '--host', '127.0.0.1', '--port', String(port)], {
    cwd: process.cwd(),
    stdio: ['ignore', 'pipe', 'pipe'],
    env: process.env,
  })

  let output = ''

  child.stdout.on('data', (chunk) => {
    output += chunk.toString()
  })

  child.stderr.on('data', (chunk) => {
    output += chunk.toString()
  })

  return {
    child,
    getOutput: () => output,
  }
}

async function waitForServer(url) {
  const startedAt = Date.now()

  while (Date.now() - startedAt < serverReadyTimeoutMs) {
    try {
      const response = await fetch(url)

      if (response.ok) {
        return
      }
    } catch {
      // Keep polling until the preview server is ready.
    }

    await delay(200)
  }

  throw new Error(`Preview server did not become ready within ${serverReadyTimeoutMs}ms.`)
}

function assert(condition, message) {
  if (!condition) {
    throw new Error(message)
  }
}

async function main() {
  const previewServer = startPreviewServer()
  let browser
  let page
  const browserLogs = []

  try {
    await waitForServer(baseUrl)

    browser = await chromium.launch({ headless: true })
    page = await browser.newPage()

    await page.addInitScript(() => {
      class AudioMock {
        constructor(src = '') {
          this.src = src
          this.onended = null
          this.onerror = null
          this.listeners = new Map()
        }

        play() {
          window.__wineAudioPlayCount = (window.__wineAudioPlayCount ?? 0) + 1
          this.listeners.get('play')?.forEach((listener) => listener())
          setTimeout(() => {
            this.listeners.get('ended')?.forEach((listener) => listener())
            this.onended?.(new Event('ended'))
          }, 450)
          return Promise.resolve()
        }

        pause() {
          this.listeners.get('pause')?.forEach((listener) => listener())
        }

        addEventListener(type, listener) {
          const listenersForType = this.listeners.get(type) ?? new Set()
          listenersForType.add(listener)
          this.listeners.set(type, listenersForType)
        }

        removeEventListener(type, listener) {
          this.listeners.get(type)?.delete(listener)
        }
      }

      Object.defineProperty(window, 'Audio', {
        configurable: true,
        value: AudioMock,
      })

      const fakeSpeechSynthesis = {
        cancel() {},
        getVoices() {
          return []
        },
        speak(utterance) {
          setTimeout(() => {
            utterance.onend?.(new Event('end'))
          }, 0)
        },
      }

      Object.defineProperty(window, 'speechSynthesis', {
        configurable: true,
        value: fakeSpeechSynthesis,
      })

      class MockSpeechRecognition {
        constructor() {
          this.continuous = true
          this.interimResults = true
          this.lang = 'en-US'
          this.maxAlternatives = 1
          this.onstart = null
          this.onresult = null
          this.onerror = null
          this.onend = null
          window.__wineActiveSpeechRecognition = this
        }

        start() {
          setTimeout(() => {
            this.onstart?.(new Event('start'))
          }, 0)
        }

        stop() {
          setTimeout(() => {
            this.onend?.(new Event('end'))
          }, 0)
        }

        abort() {
          setTimeout(() => {
            this.onend?.(new Event('end'))
          }, 0)
        }
      }

      Object.defineProperty(window, 'SpeechRecognition', {
        configurable: true,
        value: MockSpeechRecognition,
      })

      Object.defineProperty(window, 'webkitSpeechRecognition', {
        configurable: true,
        value: MockSpeechRecognition,
      })

      window.__triggerWineSpeechRecognition = (transcript) => {
        const recognition = window.__wineActiveSpeechRecognition

        if (!recognition) {
          return false
        }

        recognition.onresult?.({
          resultIndex: 0,
          results: [
            {
              0: {
                transcript,
              },
              isFinal: true,
              length: 1,
            },
          ],
        })

        return true
      }
    })

    page.on('console', (message) => {
      browserLogs.push(`${message.type()}: ${message.text()}`)
    })

    page.on('pageerror', (error) => {
      browserLogs.push(`pageerror: ${error.message}`)
    })

    await page.route('**/api/health', async (route) => {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({
          ok: true,
          projectId: 'wine-voice-explorer',
          authenticated: true,
          capabilities: {
            vertex: {
              ready: true,
              message: 'Vertex AI is reachable.',
            },
            tts: {
              ready: true,
              message: 'Cloud TTS is reachable.',
            },
            stt: {
              ready: true,
              message: 'Cloud STT is reachable.',
            },
          },
          routes: {
            vertex: true,
            tts: true,
            stt: true,
            wineImage: true,
          },
          checkedAt: new Date().toISOString(),
          message: 'ready',
        }),
      })
    })

    await page.route('**/api/tts/**', async (route) => {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({ audioContent: 'b2s=' }),
      })
    })

    await page.route('**/api/vertex/**', async (route) => {
      const body = [
        'I found two excellent reds under $50. ',
        'ALLEGRINI PALAZZO DELLA TORRE at $24.99 brings dark cherry, cocoa, and a polished structure. ',
        'VILLA ANTINORI TOSCANA ROSSO at $24.99 adds a savory Tuscan option with depth and balance.',
      ]
        .map((chunk) => `data: ${JSON.stringify({ candidates: [{ content: { parts: [{ text: chunk }] } }] })}\n\n`)
        .join('')

      await route.fulfill({
        status: 200,
        headers: {
          'Content-Type': 'text/event-stream',
          'Cache-Control': 'no-cache',
        },
        body,
      })
    })

    await page.goto(baseUrl, {
      waitUntil: 'domcontentloaded',
    })

    await page.locator('.scene-loading').waitFor({
      state: 'hidden',
      timeout: 90_000,
    })

    await page.locator('canvas').click()
    await page.keyboard.down('w')
    await delay(1600)
    await page.keyboard.up('w')

    await page.locator('.hint-pill').waitFor({
      state: 'visible',
      timeout: 8_000,
    })

    await page.keyboard.press('e')

    await page.locator('.consultation-shell').waitFor({
      state: 'visible',
      timeout: 8_000,
    })

    await page.waitForFunction((text) => {
      return document.body.innerText.includes(text)
    }, greetingText)

    const greetingCount = await page.locator(`text=${greetingText}`).count()
    assert(greetingCount === 1, `Expected one greeting bubble, found ${greetingCount}.`)
    assert(
      await page.evaluate(() => document.pointerLockElement === null),
      'Pointer lock should be released when the consultation opens.',
    )

    await page.getByRole('button', { name: 'Stop audio' }).waitFor({
      state: 'visible',
      timeout: 8_000,
    })

    await page.waitForFunction(() => {
      return Boolean(window.__wineActiveSpeechRecognition)
    })

    const interruptTriggered = await page.evaluate(() => {
      return window.__triggerWineSpeechRecognition?.('I want a red under 50') ?? false
    })
    assert(interruptTriggered, 'Expected a live speech recognizer instance before testing barge-in.')

    await page.waitForFunction(() => {
      return Array.from(document.querySelectorAll('.consultation-message--user')).some((node) =>
        node.textContent?.includes('I want a red under 50'),
      )
    })

    await page.getByRole('button', { name: 'New consultation' }).click()
    await page.waitForFunction((text) => {
      const greetingMatches = Array.from(document.querySelectorAll('.consultation-message--assistant')).filter((node) =>
        node.textContent?.includes(text),
      )
      const userMatches = document.querySelectorAll('.consultation-message--user')
      return greetingMatches.length === 1 && userMatches.length === 0
    }, greetingText)

    await page.locator('.consultation-text-input').fill('I want a red under 50')
    await page.locator('.consultation-submit-button').click()

    await page.waitForFunction(() => {
      return document.body.innerText.includes('ALLEGRINI PALAZZO DELLA TORRE')
    })

    await page.waitForFunction(() => {
      return (window.__wineAudioPlayCount ?? 0) >= 2
    })

    const priceTexts = await page.locator('.consultation-wine-card__footer strong').allTextContents()
    const prices = priceTexts.map((text) => Number.parseFloat(text.replace(/[^0-9.]/g, '')))
    assert(prices.length > 0, 'Expected at least one wine recommendation card.')
    assert(prices.every((price) => price <= 50), `Expected all cards to stay under $50, saw ${prices.join(', ')}.`)

    await page.waitForFunction(() => {
      return !Array.from(document.querySelectorAll('button')).some((button) => button.textContent?.includes('Stop audio'))
    })

    await page.getByRole('button', { name: 'Mic on' }).click()
    const userBubbleCountBeforeToggle = await page.locator('.consultation-message--user').count()
    const greetingCountAfterToggle = await page.locator(`text=${greetingText}`).count()

    assert(userBubbleCountBeforeToggle === 1, `Expected the transcript to keep the prior question after mic toggle, found ${userBubbleCountBeforeToggle}.`)
    assert(greetingCountAfterToggle === 1, `Expected the greeting not to replay after mic toggle, found ${greetingCountAfterToggle}.`)

    await page.getByRole('button', { name: 'Mic off' }).click()
    await page.waitForFunction(() => {
      return document.body.innerText.includes('Hands-free mic is armed')
    })

    const languageSelect = page.locator('.consultation-select')
    await languageSelect.selectOption('en-IN')
    const speechInputValueIn = await languageSelect.inputValue()
    assert(speechInputValueIn === 'en-IN', `Expected speech input profile to switch to en-IN, found ${speechInputValueIn}.`)
    const userBubbleCountAfterIndia = await page.locator('.consultation-message--user').count()
    assert(userBubbleCountAfterIndia === 1, `Expected the transcript to stay intact after switching to English (India), found ${userBubbleCountAfterIndia} user bubbles.`)

    await languageSelect.selectOption('en-US')
    const speechInputValueUs = await languageSelect.inputValue()
    assert(speechInputValueUs === 'en-US', `Expected speech input profile to switch back to en-US, found ${speechInputValueUs}.`)
    const userBubbleCountAfterUs = await page.locator('.consultation-message--user').count()
    assert(userBubbleCountAfterUs === 1, `Expected the transcript to stay intact after switching back to English (US), found ${userBubbleCountAfterUs} user bubbles.`)

    const recognizerActiveAfterSwitch = await page.evaluate(() => {
      return Boolean(window.__wineActiveSpeechRecognition)
    })
    assert(recognizerActiveAfterSwitch, 'Expected the recognizer to stay alive after profile switches.')

    const stopAudioButton = page.getByRole('button', { name: 'Stop audio' })

    if (await stopAudioButton.count()) {
      await stopAudioButton.click()
      await page.waitForFunction(() => {
        return !Array.from(document.querySelectorAll('button')).some((button) => button.textContent?.includes('Stop audio'))
      })
    }

    await page.locator('.consultation-close-button').click()
    await page.locator('.consultation-shell').waitFor({
      state: 'hidden',
      timeout: 8_000,
    })

    await page.keyboard.press('e')
    await page.locator('.consultation-shell').waitFor({
      state: 'visible',
      timeout: 8_000,
    })

    const userBubbleCount = await page.locator('.consultation-message--user').count()
    assert(userBubbleCount === 0, `Expected a fresh consultation transcript after reopening, found ${userBubbleCount} user bubbles.`)

    const reopenedGreetingCount = await page.locator(`text=${greetingText}`).count()
    assert(reopenedGreetingCount === 1, `Expected one fresh greeting after reopening, found ${reopenedGreetingCount}.`)
  } catch (error) {
    console.error('E2E consultation test failed.')
    console.error(previewServer.getOutput())
    console.error(browserLogs.join('\n'))
    throw error
  } finally {
    if (browser) {
      await browser.close()
    }

    previewServer.child.kill('SIGTERM')
    await delay(200)
  }
}

await main()
