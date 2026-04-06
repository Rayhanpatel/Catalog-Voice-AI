import { useEffect, useRef, useState } from 'react'
import { useFrame } from '@react-three/fiber'
import { Box3, Euler, Group, Object3D, Quaternion, Vector3 } from 'three'
import { GLTFLoader } from 'three/addons/loaders/GLTFLoader.js'
import { VRMLoaderPlugin, VRMUtils } from '@pixiv/three-vrm'
import type { VRM } from '@pixiv/three-vrm'
import { degToRad } from '../../lib/math'

interface SommelierVrmProps {
  modelUrl: string
  targetHeight?: number
  yawDegrees?: number
  onLoadStateChange?: (state: 'loading' | 'loaded' | 'error') => void
}

interface LoadedVrmResult {
  root: Group
  vrm: VRM
}

const scratchBox = new Box3()
const scratchSize = new Vector3()
const scratchQuaternion = new Quaternion()

function applyMeshShadows(root: Object3D) {
  root.traverse((child) => {
    const childAsMesh = child as Object3D & {
      castShadow?: boolean
      receiveShadow?: boolean
      frustumCulled?: boolean
    }

    childAsMesh.castShadow = true
    childAsMesh.receiveShadow = true
    childAsMesh.frustumCulled = false
  })
}

function normalizeAvatarHeight(root: Group, targetHeight: number) {
  scratchBox.setFromObject(root)
  scratchBox.getSize(scratchSize)
  const currentHeight = Math.max(scratchSize.y, 0.001)
  const scale = targetHeight / currentHeight
  root.scale.setScalar(scale)

  scratchBox.setFromObject(root)
  root.position.y -= scratchBox.min.y
}

function setBoneRotation(vrm: VRM, boneName: Parameters<NonNullable<VRM['humanoid']>['getNormalizedBoneNode']>[0], rotation: Euler) {
  const bone = vrm.humanoid?.getNormalizedBoneNode(boneName)

  if (!bone) {
    return
  }

  scratchQuaternion.setFromEuler(rotation)
  bone.quaternion.copy(scratchQuaternion)
}

function applyHostPose(vrm: VRM) {
  setBoneRotation(vrm, 'leftShoulder', new Euler(0, 0, degToRad(-6)))
  setBoneRotation(vrm, 'rightShoulder', new Euler(0, 0, degToRad(6)))
  setBoneRotation(vrm, 'leftUpperArm', new Euler(degToRad(6), 0, degToRad(-68)))
  setBoneRotation(vrm, 'rightUpperArm', new Euler(degToRad(6), 0, degToRad(68)))
  setBoneRotation(vrm, 'leftLowerArm', new Euler(degToRad(-10), 0, degToRad(-8)))
  setBoneRotation(vrm, 'rightLowerArm', new Euler(degToRad(-10), 0, degToRad(8)))
  setBoneRotation(vrm, 'leftHand', new Euler(0, 0, degToRad(-4)))
  setBoneRotation(vrm, 'rightHand', new Euler(0, 0, degToRad(4)))
  setBoneRotation(vrm, 'neck', new Euler(0, degToRad(-4), 0))
  setBoneRotation(vrm, 'head', new Euler(degToRad(1), degToRad(-4), 0))
  setBoneRotation(vrm, 'leftUpperLeg', new Euler(0, 0, degToRad(1)))
  setBoneRotation(vrm, 'rightUpperLeg', new Euler(0, 0, degToRad(-1)))
  vrm.humanoid?.update()
}

async function loadVrm(modelUrl: string, targetHeight: number, yawDegrees: number) {
  const loader = new GLTFLoader()
  loader.register((parser) => new VRMLoaderPlugin(parser))

  const gltf = await loader.loadAsync(modelUrl)
  const vrm = (gltf.userData as { vrm?: VRM }).vrm

  if (!vrm) {
    throw new Error('VRM instance missing from loaded model.')
  }

  VRMUtils.rotateVRM0(vrm)
  applyMeshShadows(vrm.scene)
  normalizeAvatarHeight(vrm.scene, targetHeight)
  applyHostPose(vrm)
  vrm.scene.rotation.y += degToRad(yawDegrees)

  return {
    root: vrm.scene,
    vrm,
  } satisfies LoadedVrmResult
}

export function SommelierVrm({
  modelUrl,
  targetHeight = 1.72,
  yawDegrees = 180,
  onLoadStateChange,
}: SommelierVrmProps) {
  const [result, setResult] = useState<LoadedVrmResult | null>(null)
  const vrmRef = useRef<VRM | null>(null)

  useEffect(() => {
    let disposed = false

    onLoadStateChange?.('loading')

    void loadVrm(modelUrl, targetHeight, yawDegrees)
      .then((loaded) => {
        if (disposed) {
          VRMUtils.deepDispose(loaded.root)
          return
        }

        vrmRef.current = loaded.vrm
        setResult(loaded)
        onLoadStateChange?.('loaded')
      })
      .catch((error) => {
        if (disposed) {
          return
        }

        console.error('Failed to load sommelier VRM.', error)
        onLoadStateChange?.('error')
      })

    return () => {
      disposed = true

      if (vrmRef.current) {
        VRMUtils.deepDispose(vrmRef.current.scene)
        vrmRef.current = null
      }

      setResult(null)
    }
  }, [modelUrl, onLoadStateChange, targetHeight, yawDegrees])

  useFrame((_, delta) => {
    vrmRef.current?.update(delta)
  })

  if (!result) {
    return null
  }

  return <primitive object={result.root} />
}
