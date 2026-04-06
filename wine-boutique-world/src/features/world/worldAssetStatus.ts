import type { WorldAssetStatus } from '../../lib/types'

export function getWorldAssetStatusMessage(status: WorldAssetStatus, detail?: string) {
  switch (status) {
    case 'loaded':
      return 'World asset: boutique scene ready.'
    case 'loading':
      return 'World asset: loading boutique scene.'
    case 'fallback':
      return detail
        ? `World asset: fallback room shell ready (${detail}).`
        : 'World asset: fallback room shell ready.'
    case 'error':
      return detail
        ? `World asset: fallback room shell ready (${detail}).`
        : 'World asset: fallback room shell ready.'
    default:
      return 'World asset: idle.'
  }
}
