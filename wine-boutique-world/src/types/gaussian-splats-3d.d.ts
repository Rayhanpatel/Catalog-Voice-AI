declare module '@mkkellogg/gaussian-splats-3d' {
  import { Group } from 'three'

  export const LogLevel: {
    None: number
  }

  export const SceneFormat: {
    Spz: number
  }

  export const SceneRevealMode: {
    Instant: number
  }

  export class DropInViewer extends Group {
    constructor(options?: Record<string, unknown>)
    addSplatScene(path: string, options?: Record<string, unknown>): Promise<unknown>
    dispose(): Promise<void>
  }
}

declare module '*.spz?url' {
  const url: string
  export default url
}
