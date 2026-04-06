import { lazy, Suspense, useEffect, useState } from 'react'
import { Canvas } from '@react-three/fiber'
import { BoutiqueScene } from '../features/world/BoutiqueScene'
import { SommelierInteractionShell } from '../features/npc/SommelierInteractionShell'
import { useTuningStore } from '../features/debug/tuningStore'
import { BoutiqueAmbienceCard } from '../features/audio/BoutiqueAmbienceCard'
import { useBoutiqueAmbience } from '../features/audio/useBoutiqueAmbience'
import { useWineAiReadiness } from '../features/health/useWineAiReadiness'

const DeveloperTools = lazy(() => import('../features/debug/DeveloperTools'))
const AMBIENCE_TRACK_PATH = '/audio/midnight-in-garda.mp3'

function getPresentationStatusLabel(assetReady: boolean, worldAssetStatus: string) {
  if (!assetReady) {
    return 'Preparing the boutique'
  }

  if (worldAssetStatus === 'error' || worldAssetStatus === 'fallback') {
    return 'Presentation shell ready'
  }

  return 'Boutique ready'
}

export function App() {
  const pointerLocked = useTuningStore((state) => state.runtime.pointerLocked)
  const canTalkToSommelier = useTuningStore((state) => state.runtime.canTalkToSommelier)
  const activeInteraction = useTuningStore((state) => state.runtime.activeInteraction)
  const developerMode = useTuningStore((state) => state.runtime.developerMode)
  const smokeMode = useTuningStore((state) => state.runtime.smokeMode)
  const worldAssetEnabled = useTuningStore((state) => state.worldAsset.enabled)
  const worldAssetStatus = useTuningStore((state) => state.runtime.worldAssetStatus)
  const worldAssetMessage = useTuningStore((state) => state.runtime.worldAssetMessage)
  const sommelierLoadState = useTuningStore((state) => state.runtime.sommelierLoadState)
  const setDeveloperMode = useTuningStore((state) => state.setDeveloperMode)
  const [smokeIntroReady, setSmokeIntroReady] = useState(!smokeMode)
  const ambience = useBoutiqueAmbience(AMBIENCE_TRACK_PATH)
  const readiness = useWineAiReadiness()
  const assetReady =
    !worldAssetEnabled || worldAssetStatus === 'loaded' || worldAssetStatus === 'fallback' || worldAssetStatus === 'error'
  const experienceReady = assetReady && sommelierLoadState !== 'loading' && smokeIntroReady
  const canShowDeveloperUi = import.meta.env.DEV && developerMode
  const statusLabel = canShowDeveloperUi ? worldAssetMessage : getPresentationStatusLabel(assetReady, worldAssetStatus)
  const consultationOpen = activeInteraction === 'sommelier'

  useEffect(() => {
    if (!import.meta.env.DEV) {
      return
    }

    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.code !== 'KeyD' || !event.shiftKey) {
        return
      }

      const target = event.target
      if (target instanceof HTMLElement && target.tagName !== 'BODY') {
        return
      }

      event.preventDefault()
      setDeveloperMode(!developerMode)
    }

    window.addEventListener('keydown', handleKeyDown)

    return () => {
      window.removeEventListener('keydown', handleKeyDown)
    }
  }, [developerMode, setDeveloperMode])

  useEffect(() => {
    if (!smokeMode) {
      return
    }

    const timeout = window.setTimeout(() => {
      setSmokeIntroReady(true)
    }, 1200)

    return () => {
      window.clearTimeout(timeout)
    }
  }, [smokeMode])

  return (
    <div className="app-shell">
      <Canvas
        shadows="percentage"
        dpr={[1, 2]}
        camera={{ fov: 68, near: 0.1, far: 80 }}
      >
        <color attach="background" args={['#140b07']} />
        <BoutiqueScene />
      </Canvas>

      {canShowDeveloperUi && (
        <Suspense fallback={null}>
          <DeveloperTools experienceReady={experienceReady} />
        </Suspense>
      )}

      <div className="hud-card hud-card--top">
        <p className="hud-eyebrow">Wine Boutique World</p>
        <h1>Private Tasting Room</h1>
        <p>{statusLabel}</p>
        <p className={`hud-readiness hud-readiness--${readiness.tone}`}>{readiness.label}</p>
        <p>WASD to move, mouse to look, Esc to release the cursor.</p>
      </div>

      <BoutiqueAmbienceCard {...ambience} />

      {!pointerLocked && experienceReady && !consultationOpen && (
        <div className="hud-card hud-card--bottom">
          <p className="hud-eyebrow">Enter The Boutique</p>
          <h2>Click inside the scene to step in</h2>
          <p>Move through the central corridor with WASD and meet the sommelier when you are ready.</p>
        </div>
      )}

      {canTalkToSommelier && !consultationOpen && (
        <div className="hint-pill">
          <span>Press E</span>
          <span>Start tasting consultation</span>
        </div>
      )}

      {!experienceReady && (
        <div className="scene-loading">
          <div className="scene-loading__card">
            <p className="hud-eyebrow">Preparing The Boutique</p>
            <h2>Opening the tasting room</h2>
            <p>The boutique is loading before the room is revealed.</p>
            <div className="scene-loading__pulse" aria-hidden="true" />
          </div>
        </div>
      )}

      {experienceReady && (
        <div className="scene-reveal" aria-hidden="true">
          <div className="scene-reveal__glow" />
        </div>
      )}

      {import.meta.env.DEV && !canShowDeveloperUi && experienceReady && (
        <div className="dev-hint">Press Shift+D to open dev tools</div>
      )}

      <SommelierInteractionShell />
    </div>
  )
}
