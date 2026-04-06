import { useEffect, useEffectEvent, useMemo, useRef } from 'react'
import { useFrame, useThree } from '@react-three/fiber'
import type { PerspectiveCamera } from 'three'
import { degToRad, distanceSquared2D } from '../../lib/math'
import type { PlanarPoint } from '../../lib/types'
import { useTuningStore } from '../debug/tuningStore'
import { resolvePlanarMovement } from './collision'
import { getMovementDelta } from './movement'
import { useKeyboardInput } from './useKeyboardInput'
import { usePointerLook } from './usePointerLook'

const LOOK_DAMPING = 11

function applyCameraTransform(camera: PerspectiveCamera, position: PlanarPoint, eyeHeight: number, yaw: number, pitch: number) {
  camera.position.set(position.x, eyeHeight, position.z)
  camera.rotation.order = 'YXZ'
  camera.rotation.y = yaw
  camera.rotation.x = pitch
}

export function FirstPersonController() {
  const camera = useThree((state) => state.camera as PerspectiveCamera)
  const gl = useThree((state) => state.gl)
  const spawn = useTuningStore((state) => state.spawn)
  const eyeHeight = useTuningStore((state) => state.eyeHeight)
  const movementSpeed = useTuningStore((state) => state.movementSpeed)
  const playerRadius = useTuningStore((state) => state.playerRadius)
  const lookLimits = useTuningStore((state) => state.lookLimits)
  const roomBounds = useTuningStore((state) => state.roomBounds)
  const walkableZonesMap = useTuningStore((state) => state.walkableZones)
  const blockedZonesMap = useTuningStore((state) => state.blockedZones)
  const npc = useTuningStore((state) => state.npc)
  const interactionOpen = useTuningStore((state) => state.runtime.activeInteraction !== null)
  const respawnTick = useTuningStore((state) => state.runtime.respawnTick)
  const setPointerLocked = useTuningStore((state) => state.setPointerLocked)
  const setPlayerPosition = useTuningStore((state) => state.setPlayerPosition)
  const setCanTalkToSommelier = useTuningStore((state) => state.setCanTalkToSommelier)
  const openSommelierInteraction = useTuningStore((state) => state.openSommelierInteraction)
  const positionRef = useRef<PlanarPoint>({ x: spawn.x, z: spawn.z })
  const yawRef = useRef(degToRad(spawn.yawDegrees))
  const pitchRef = useRef(0)
  const targetYawRef = useRef(degToRad(spawn.yawDegrees))
  const targetPitchRef = useRef(0)
  const lastReportedPositionRef = useRef<PlanarPoint>({ x: spawn.x, z: spawn.z })
  const lastTalkStateRef = useRef(false)
  const keysRef = useKeyboardInput(interactionOpen)
  const walkableZones = useMemo(() => Object.values(walkableZonesMap), [walkableZonesMap])
  const blockedZones = useMemo(() => Object.values(blockedZonesMap), [blockedZonesMap])

  const respawnPlayer = useEffectEvent(() => {
    positionRef.current = { x: spawn.x, z: spawn.z }
    yawRef.current = degToRad(spawn.yawDegrees)
    pitchRef.current = 0
    targetYawRef.current = yawRef.current
    targetPitchRef.current = pitchRef.current
    lastReportedPositionRef.current = { x: spawn.x, z: spawn.z }
    lastTalkStateRef.current = false
    setCanTalkToSommelier(false)
    setPlayerPosition({ x: spawn.x, z: spawn.z })
    applyCameraTransform(camera, positionRef.current, eyeHeight, yawRef.current, pitchRef.current)
  })

  useEffect(() => {
    respawnPlayer()
  }, [camera, eyeHeight, respawnTick, spawn.x, spawn.yawDegrees, spawn.z])

  usePointerLook({
    domElement: gl.domElement,
    targetYawRef,
    targetPitchRef,
    minPitch: degToRad(lookLimits.minDegrees),
    maxPitch: degToRad(lookLimits.maxDegrees),
    sensitivity: lookLimits.sensitivity,
    onLockChange: setPointerLocked,
  })

  useEffect(() => {
    if (!interactionOpen) {
      return
    }

    if (document.pointerLockElement === gl.domElement) {
      document.exitPointerLock()
    }
  }, [gl.domElement, interactionOpen])

  const handleInteractionKeys = useEffectEvent((event: KeyboardEvent) => {
    if (event.code === 'KeyE' && lastTalkStateRef.current) {
      openSommelierInteraction()
    }
  })

  useEffect(() => {
    window.addEventListener('keydown', handleInteractionKeys)

    return () => {
      window.removeEventListener('keydown', handleInteractionKeys)
    }
  }, [])

  useFrame((_, delta) => {
    const lookBlend = 1 - Math.exp(-LOOK_DAMPING * delta)
    yawRef.current += (targetYawRef.current - yawRef.current) * lookBlend
    pitchRef.current += (targetPitchRef.current - pitchRef.current) * lookBlend

    const movementDelta = interactionOpen
      ? { x: 0, z: 0 }
      : getMovementDelta(keysRef.current, yawRef.current, movementSpeed, delta)
    positionRef.current = resolvePlanarMovement(
      positionRef.current,
      movementDelta,
      roomBounds,
      walkableZones,
      blockedZones,
      playerRadius,
    )
    applyCameraTransform(camera, positionRef.current, eyeHeight, yawRef.current, pitchRef.current)

    if (distanceSquared2D(positionRef.current, lastReportedPositionRef.current) > 0.0001) {
      lastReportedPositionRef.current = { ...positionRef.current }
      setPlayerPosition(positionRef.current)
    }

    const talkDistanceSquared = distanceSquared2D(positionRef.current, npc)
    const canTalk = talkDistanceSquared <= npc.interactionRadius * npc.interactionRadius

    if (canTalk !== lastTalkStateRef.current) {
      lastTalkStateRef.current = canTalk
      setCanTalkToSommelier(canTalk)
    }
  })

  return null
}
