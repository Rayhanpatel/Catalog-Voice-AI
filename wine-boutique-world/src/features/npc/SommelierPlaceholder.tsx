import { Suspense, lazy, useEffect, useRef, useState } from 'react'
import { useFrame } from '@react-three/fiber'
import type { Group } from 'three'
import { useTuningStore } from '../debug/tuningStore'
import { InteractionPrompt } from './InteractionPrompt'
import { SommelierStandIn } from './SommelierStandIn'

const SOMMELIER_VRM_URL = '/models/sommelier.vrm'
const SOMMELIER_MODEL_YAW_OFFSET = Math.PI
const SOMMELIER_TURN_DEADZONE = (3 * Math.PI) / 180
const SOMMELIER_MAX_TURN_SPEED = (140 * Math.PI) / 180
const SommelierVrm = lazy(() =>
  import('./SommelierVrm').then((module) => ({
    default: module.SommelierVrm,
  })),
)

function getShortestAngleDelta(current: number, target: number) {
  return Math.atan2(Math.sin(target - current), Math.cos(target - current))
}

export function SommelierPlaceholder() {
  const npc = useTuningStore((state) => state.npc)
  const smokeMode = useTuningStore((state) => state.runtime.smokeMode)
  const playerPosition = useTuningStore((state) => state.runtime.playerPosition)
  const canTalkToSommelier = useTuningStore((state) => state.runtime.canTalkToSommelier)
  const activeInteraction = useTuningStore((state) => state.runtime.activeInteraction)
  const setSommelierLoadState = useTuningStore((state) => state.setSommelierLoadState)
  const [vrmState, setVrmState] = useState<'loading' | 'loaded' | 'error'>('loading')
  const rootRef = useRef<Group | null>(null)
  const facingInitializedRef = useRef(false)

  useEffect(() => {
    if (smokeMode) {
      setSommelierLoadState('loaded')
      return
    }

    setSommelierLoadState(vrmState)
  }, [setSommelierLoadState, smokeMode, vrmState])

  useEffect(() => {
    return () => {
      setSommelierLoadState('loading')
    }
  }, [setSommelierLoadState])

  useFrame((_, delta) => {
    const root = rootRef.current

    if (!root) {
      return
    }

    const dx = playerPosition.x - npc.x
    const dz = playerPosition.z - npc.z

    if (dx * dx + dz * dz < 0.0001) {
      return
    }

    const targetYaw = Math.atan2(dx, dz) - SOMMELIER_MODEL_YAW_OFFSET
    const deltaYaw = getShortestAngleDelta(root.rotation.y, targetYaw)

    if (!facingInitializedRef.current) {
      root.rotation.y = targetYaw
      facingInitializedRef.current = true
      return
    }

    if (Math.abs(deltaYaw) < SOMMELIER_TURN_DEADZONE) {
      return
    }

    const maxTurnStep = SOMMELIER_MAX_TURN_SPEED * delta
    const appliedDelta = Math.sign(deltaYaw) * Math.min(Math.abs(deltaYaw), maxTurnStep)

    root.rotation.y += appliedDelta
  })

  return (
    <group ref={rootRef} position={[npc.x, 0, npc.z]}>
      {smokeMode ? (
        <SommelierStandIn />
      ) : (
        <Suspense fallback={null}>
          <SommelierVrm modelUrl={SOMMELIER_VRM_URL} onLoadStateChange={setVrmState} />
        </Suspense>
      )}
      {vrmState === 'error' && <SommelierStandIn />}

      {canTalkToSommelier && activeInteraction !== 'sommelier' && <InteractionPrompt position={[0, 2.12, 0]} />}
    </group>
  )
}
