import boutiqueWorldSpzUrl from '../../../Premium Intimate Wine Boutique.spz?url'
import { useTuningStore } from '../debug/tuningStore'
import { RoomShell } from './RoomShell'
import { WorldAssetMount } from './WorldAssetMount'

export function BoutiqueAsset() {
  const worldAsset = useTuningStore((state) => state.worldAsset)
  const worldAssetStatus = useTuningStore((state) => state.runtime.worldAssetStatus)
  const shouldShowPlaceholderShell =
    worldAsset.showPlaceholderShell ||
    !worldAsset.enabled ||
    worldAssetStatus === 'error' ||
    worldAssetStatus === 'fallback'

  return (
    <>
      <WorldAssetMount
        assetUrl={boutiqueWorldSpzUrl}
        enabled={worldAsset.enabled}
        scale={worldAsset.scale}
        offsetX={worldAsset.offsetX}
        offsetY={worldAsset.offsetY}
        offsetZ={worldAsset.offsetZ}
        yawDegrees={worldAsset.yawDegrees}
      />
      {shouldShowPlaceholderShell && <RoomShell />}
    </>
  )
}
