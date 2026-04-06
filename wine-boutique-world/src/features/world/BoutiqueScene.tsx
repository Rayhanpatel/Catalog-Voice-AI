import { FirstPersonController } from '../player/FirstPersonController'
import { useTuningStore } from '../debug/tuningStore'
import { SommelierPlaceholder } from '../npc/SommelierPlaceholder'
import { BoutiqueAsset } from './BoutiqueAsset'
import { CollisionDebug } from './CollisionDebug'
import { Lighting } from './Lighting'

export function BoutiqueScene() {
  const developerMode = useTuningStore((state) => state.runtime.developerMode)
  const worldAssetEnabled = useTuningStore((state) => state.worldAsset.enabled)
  const worldAssetStatus = useTuningStore((state) => state.runtime.worldAssetStatus)
  const sommelierLoadState = useTuningStore((state) => state.runtime.sommelierLoadState)
  const assetReady =
    !worldAssetEnabled || worldAssetStatus === 'loaded' || worldAssetStatus === 'fallback' || worldAssetStatus === 'error'
  const experienceReady = assetReady && sommelierLoadState !== 'loading'
  const canShowDeveloperUi = import.meta.env.DEV && developerMode

  return (
    <>
      <Lighting />
      <BoutiqueAsset />
      {assetReady && <SommelierPlaceholder />}
      {canShowDeveloperUi && assetReady && <CollisionDebug />}
      {experienceReady && <FirstPersonController />}
    </>
  )
}
