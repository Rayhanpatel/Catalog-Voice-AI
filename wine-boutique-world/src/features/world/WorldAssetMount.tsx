import { useEffect, useRef } from 'react'
import { useThree } from '@react-three/fiber'
import { Vector3 } from 'three'
import type { Group } from 'three'
import { degToRad } from '../../lib/math'
import type { PlanarPoint } from '../../lib/types'
import { useTuningStore } from '../debug/tuningStore'

type SplatMeshLike = {
  getSplatCount: () => number
  getSplatCenter: (index: number, target: Vector3, applySceneTransform?: boolean) => unknown
}

type DropInViewerLike = Group & {
  addSplatScene: (path: string, options?: Record<string, unknown>) => Promise<unknown>
  getSplatMesh?: () => SplatMeshLike | null
  getSplatScene?: (sceneIndex: number) => unknown
  dispose?: () => Promise<void>
}

interface WorldAssetMountProps {
  assetUrl: string
  enabled: boolean
  scale: number
  offsetX: number
  offsetY: number
  offsetZ: number
  yawDegrees: number
}

function applyViewerTransform(
  viewer: DropInViewerLike,
  scale: number,
  offsetX: number,
  offsetY: number,
  offsetZ: number,
  yawDegrees: number,
) {
  viewer.scale.setScalar(scale)
  viewer.position.set(offsetX, offsetY, offsetZ)
  viewer.rotation.set(0, degToRad(yawDegrees), 0)
}

function syncDevDebugViewer(viewer: DropInViewerLike | null) {
  if (!import.meta.env.DEV) {
    return
  }

  const debugWindow = window as Window & {
    __wbwSplatViewer?: DropInViewerLike
  }

  if (viewer) {
    debugWindow.__wbwSplatViewer = viewer
    return
  }

  delete debugWindow.__wbwSplatViewer
}

function sampleAssetFloorPoints(viewer: DropInViewerLike) {
  const splatMesh = viewer.getSplatMesh?.()

  if (!splatMesh) {
    return []
  }

  const splatCount = splatMesh.getSplatCount()
  const sampleTarget = 1400
  const step = Math.max(1, Math.floor(splatCount / sampleTarget))
  const scratch = new Vector3()
  const samples: PlanarPoint[] = []

  for (let index = 0; index < splatCount; index += step) {
    splatMesh.getSplatCenter(index, scratch, false)

    if (!Number.isFinite(scratch.x) || !Number.isFinite(scratch.y) || !Number.isFinite(scratch.z)) {
      continue
    }

    if (scratch.y < -0.16 || scratch.y > 0.24) {
      continue
    }

    samples.push({
      x: scratch.x,
      z: scratch.z,
    })
  }

  return samples
}

export function WorldAssetMount({
  assetUrl,
  enabled,
  scale,
  offsetX,
  offsetY,
  offsetZ,
  yawDegrees,
}: WorldAssetMountProps) {
  const scene = useThree((state) => state.scene)
  const viewerRef = useRef<DropInViewerLike | null>(null)
  const setWorldAssetStatus = useTuningStore((state) => state.setWorldAssetStatus)
  const setAssetFloorSamples = useTuningStore((state) => state.setAssetFloorSamples)

  useEffect(() => {
    const viewer = viewerRef.current

    if (!viewer) {
      return
    }

    applyViewerTransform(viewer, scale, offsetX, offsetY, offsetZ, yawDegrees)
  }, [offsetX, offsetY, offsetZ, scale, yawDegrees])

  useEffect(() => {
    let cancelled = false

    const cleanupViewer = (viewer: DropInViewerLike | null) => {
      if (!viewer) {
        return
      }

      scene.remove(viewer)
      viewerRef.current = null
      syncDevDebugViewer(null)
      setAssetFloorSamples([])

      if (viewer.dispose) {
        void viewer.dispose()
      }
    }

    if (!enabled) {
      cleanupViewer(viewerRef.current)
      setAssetFloorSamples([])
      setWorldAssetStatus('fallback', 'SPZ disabled')
      return
    }

    setWorldAssetStatus('loading')

    void (async () => {
      try {
        const gaussianSplats = await import('@mkkellogg/gaussian-splats-3d')

        if (cancelled) {
          return
        }

        const viewer = new gaussianSplats.DropInViewer({
          enableSIMDInSort: false,
          gpuAcceleratedSort: false,
          halfPrecisionCovariancesOnGPU: true,
          integerBasedSort: false,
          logLevel: gaussianSplats.LogLevel.None,
          sceneRevealMode: gaussianSplats.SceneRevealMode.Instant,
          sharedMemoryForWorkers: false,
        }) as DropInViewerLike

        applyViewerTransform(viewer, scale, offsetX, offsetY, offsetZ, yawDegrees)
        viewerRef.current = viewer
        syncDevDebugViewer(viewer)

        await viewer.addSplatScene(assetUrl, {
          format: gaussianSplats.SceneFormat.Spz,
          showLoadingUI: false,
          splatAlphaRemovalThreshold: 8,
        })

        if (cancelled) {
          cleanupViewer(viewer)
          return
        }

        scene.add(viewer)
        setAssetFloorSamples(sampleAssetFloorPoints(viewer))
        setWorldAssetStatus('loaded')
      } catch (error) {
        cleanupViewer(viewerRef.current)
        setAssetFloorSamples([])
        const message = error instanceof Error ? error.message : 'Unknown asset loader error'
        console.error('Failed to load SPZ asset.', error)
        setWorldAssetStatus('error', `Load error: ${message}`)
      }
    })()

    return () => {
      cancelled = true
      cleanupViewer(viewerRef.current)
    }
  }, [
    assetUrl,
    enabled,
    offsetX,
    offsetY,
    offsetZ,
    scale,
    scene,
    setAssetFloorSamples,
    setWorldAssetStatus,
    yawDegrees,
  ])

  return null
}
