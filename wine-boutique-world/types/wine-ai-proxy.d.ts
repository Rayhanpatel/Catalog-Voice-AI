declare module '../packages/wine-ai-core/server/proxy.mjs' {
  import type { IncomingMessage, ServerResponse } from 'node:http'

  type MiddlewareNext = (error?: unknown) => void

  export function createWineAiProxyMiddleware(options: {
    projectId: string
    allowedImageHosts?: string[]
  }): (req: IncomingMessage, res: ServerResponse, next: MiddlewareNext) => void | Promise<void>
}
