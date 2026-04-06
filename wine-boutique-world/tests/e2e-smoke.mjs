import { spawn } from 'node:child_process'
import process from 'node:process'
import { setTimeout as delay } from 'node:timers/promises'
import { chromium } from 'playwright'

const port = Number(process.env.E2E_PORT ?? 4174)
const baseUrl = `http://127.0.0.1:${port}/?smoke=1`
const serverReadyTimeoutMs = 20_000

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

    browser = await chromium.launch({
      headless: true,
    })

    page = await browser.newPage()

    page.on('console', (message) => {
      browserLogs.push(`${message.type()}: ${message.text()}`)
    })

    page.on('pageerror', (error) => {
      browserLogs.push(`pageerror: ${error.message}`)
    })

    await page.route('**/*.spz', async (route) => {
      await delay(350)
      await route.continue()
    })

    await page.route('**/*.vrm', async (route) => {
      await delay(200)
      await route.continue()
    })

    await page.goto(baseUrl, {
      waitUntil: 'domcontentloaded',
    })

    await page.locator('.scene-loading').waitFor({
      state: 'visible',
      timeout: 8_000,
    })

    await page.locator('.scene-loading').waitFor({
      state: 'hidden',
      timeout: 90_000,
    })

    const topHudText = await page.locator('.hud-card--top').textContent()
    assert(topHudText?.includes('Private Tasting Room'), 'Top HUD did not render the final room title.')
    assert(
      topHudText?.includes('Boutique ready') || topHudText?.includes('Presentation shell ready'),
      'Top HUD did not reach the final ready state.',
    )

    await page.locator('.hud-card--bottom').waitFor({
      state: 'visible',
      timeout: 8_000,
    })

    assert((await page.locator('.calibration-map').count()) === 0, 'Calibration map should be hidden by default.')
    assert((await page.locator('text=Use SPZ (exp)').count()) === 0, 'Developer controls should be hidden by default.')
    assert(
      (await page.locator('text=Click inside the scene to step in').count()) > 0,
      'Entry prompt was not visible before pointer lock.',
    )

    const appControlledShadowWarnings = browserLogs.filter((line) => line.includes('PCFSoftShadowMap'))
    assert(
      appControlledShadowWarnings.length === 0,
      `App-controlled shadow warning leaked into the browser console:\n${appControlledShadowWarnings.join('\n')}`,
    )
  } catch (error) {
    console.error('E2E smoke test failed.')
    console.error(previewServer.getOutput())
    console.error(browserLogs.join('\n'))

    if (page) {
      try {
        const screenshotPath = new URL('./e2e-smoke-failure.png', import.meta.url)
        await page.screenshot({
          path: screenshotPath.pathname,
          fullPage: true,
        })
        console.error(`Failure screenshot: ${screenshotPath.pathname}`)
      } catch (screenshotError) {
        console.error(`Failure screenshot skipped: ${screenshotError}`)
      }
    }

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
