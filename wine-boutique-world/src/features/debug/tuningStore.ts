import { create } from 'zustand'
import { defaultBoutiqueTuning } from '../../config/tuningDefaults'
import { getWorldAssetStatusMessage } from '../world/worldAssetStatus'
import type {
  BlockedZone,
  BlockedZoneId,
  BoutiqueTuning,
  LookLimits,
  NpcConfig,
  PlanarPoint,
  RoomBounds,
  SpawnConfig,
  WalkableZone,
  WalkableZoneId,
  WorldAssetConfig,
  WorldAssetStatus,
} from '../../lib/types'

interface RuntimeState {
  developerMode: boolean
  smokeMode: boolean
  showDebugHelpers: boolean
  showCalibrationMap: boolean
  pointerLocked: boolean
  playerPosition: PlanarPoint
  canTalkToSommelier: boolean
  activeInteraction: 'sommelier' | null
  respawnTick: number
  worldAssetStatus: WorldAssetStatus
  worldAssetMessage: string
  assetFloorSamples: PlanarPoint[]
  sommelierLoadState: 'loading' | 'loaded' | 'error'
}

interface TuningStore extends BoutiqueTuning {
  runtime: RuntimeState
  setDeveloperMode: (enabled: boolean) => void
  setSpawn: (patch: Partial<SpawnConfig>) => void
  setEyeHeight: (value: number) => void
  setMovementSpeed: (value: number) => void
  setPlayerRadius: (value: number) => void
  setLookLimits: (patch: Partial<LookLimits>) => void
  setRoomBounds: (patch: Partial<RoomBounds>) => void
  setWalkableZone: (id: WalkableZoneId, patch: Partial<WalkableZone>) => void
  setBlockedZone: (id: BlockedZoneId, patch: Partial<BlockedZone>) => void
  setNpc: (patch: Partial<NpcConfig>) => void
  setWorldAsset: (patch: Partial<WorldAssetConfig>) => void
  setShowDebugHelpers: (value: boolean) => void
  setShowCalibrationMap: (value: boolean) => void
  setAssetFloorSamples: (samples: PlanarPoint[]) => void
  setSommelierLoadState: (state: RuntimeState['sommelierLoadState']) => void
  resetTuning: () => void
  triggerRespawn: () => void
  setPointerLocked: (locked: boolean) => void
  setPlayerPosition: (position: PlanarPoint) => void
  setCanTalkToSommelier: (canTalk: boolean) => void
  openSommelierInteraction: () => void
  closeSommelierInteraction: () => void
  setWorldAssetStatus: (status: WorldAssetStatus, message?: string) => void
}

function getWorldAssetMessage(status: WorldAssetStatus, message?: string) {
  return getWorldAssetStatusMessage(status, message)
}

function getInitialDeveloperMode() {
  if (!import.meta.env.DEV || typeof window === 'undefined') {
    return false
  }

  const searchParams = new URLSearchParams(window.location.search)
  return searchParams.get('debug') === '1'
}

function getInitialSmokeMode() {
  if (typeof window === 'undefined') {
    return false
  }

  const searchParams = new URLSearchParams(window.location.search)
  return searchParams.get('smoke') === '1'
}

const initialSmokeMode = getInitialSmokeMode()
const initialWorldAsset = initialSmokeMode
  ? {
      ...defaultBoutiqueTuning.worldAsset,
      enabled: false,
    }
  : defaultBoutiqueTuning.worldAsset

export const useTuningStore = create<TuningStore>((set) => ({
  ...defaultBoutiqueTuning,
  worldAsset: initialWorldAsset,
  runtime: {
    developerMode: getInitialDeveloperMode(),
    smokeMode: initialSmokeMode,
    showDebugHelpers: false,
    showCalibrationMap: false,
    pointerLocked: false,
    playerPosition: {
      x: defaultBoutiqueTuning.spawn.x,
      z: defaultBoutiqueTuning.spawn.z,
    },
    canTalkToSommelier: false,
    activeInteraction: null,
    respawnTick: 0,
    worldAssetStatus: initialWorldAsset.enabled ? 'loading' : 'fallback',
    worldAssetMessage: initialWorldAsset.enabled
      ? getWorldAssetMessage('loading')
      : getWorldAssetMessage('fallback', 'SPZ disabled'),
    assetFloorSamples: [],
    sommelierLoadState: 'loading',
  },
  setDeveloperMode: (enabled) =>
    set((state) => ({
      runtime: {
        ...state.runtime,
        developerMode: enabled,
      },
    })),
  setSpawn: (patch) => set((state) => ({ spawn: { ...state.spawn, ...patch } })),
  setEyeHeight: (value) => set({ eyeHeight: value }),
  setMovementSpeed: (value) => set({ movementSpeed: value }),
  setPlayerRadius: (value) => set({ playerRadius: value }),
  setLookLimits: (patch) => set((state) => ({ lookLimits: { ...state.lookLimits, ...patch } })),
  setRoomBounds: (patch) => set((state) => ({ roomBounds: { ...state.roomBounds, ...patch } })),
  setWalkableZone: (id, patch) =>
    set((state) => ({
      walkableZones: {
        ...state.walkableZones,
        [id]: {
          ...state.walkableZones[id],
          ...patch,
          id,
        },
      },
    })),
  setBlockedZone: (id, patch) =>
    set((state) => ({
      blockedZones: {
        ...state.blockedZones,
        [id]: {
          ...state.blockedZones[id],
          ...patch,
          id,
        },
      },
    })),
  setNpc: (patch) => set((state) => ({ npc: { ...state.npc, ...patch } })),
  setWorldAsset: (patch) => set((state) => ({ worldAsset: { ...state.worldAsset, ...patch } })),
  setShowDebugHelpers: (value) =>
    set((state) => ({
      runtime: {
        ...state.runtime,
        showDebugHelpers: value,
      },
    })),
  setShowCalibrationMap: (value) =>
    set((state) => ({
      runtime: {
        ...state.runtime,
        showCalibrationMap: value,
      },
    })),
  setAssetFloorSamples: (samples) =>
    set((state) => ({
      runtime: {
        ...state.runtime,
        assetFloorSamples: samples,
      },
    })),
  setSommelierLoadState: (sommelierLoadState) =>
    set((state) => ({
      runtime: {
        ...state.runtime,
        sommelierLoadState,
      },
    })),
  resetTuning: () =>
    set((state) => ({
      ...defaultBoutiqueTuning,
      worldAsset: initialWorldAsset,
      runtime: {
        ...state.runtime,
        playerPosition: {
          x: defaultBoutiqueTuning.spawn.x,
          z: defaultBoutiqueTuning.spawn.z,
        },
        canTalkToSommelier: false,
        activeInteraction: null,
        respawnTick: state.runtime.respawnTick + 1,
        worldAssetStatus: initialWorldAsset.enabled ? 'loading' : 'fallback',
        worldAssetMessage: initialWorldAsset.enabled
          ? getWorldAssetMessage('loading')
          : getWorldAssetMessage('fallback', 'SPZ disabled'),
        assetFloorSamples: [],
        sommelierLoadState: state.runtime.sommelierLoadState,
        smokeMode: state.runtime.smokeMode,
        showDebugHelpers: state.runtime.showDebugHelpers,
        showCalibrationMap: state.runtime.showCalibrationMap,
      },
    })),
  triggerRespawn: () =>
    set((state) => ({
      runtime: {
        ...state.runtime,
        activeInteraction: null,
        respawnTick: state.runtime.respawnTick + 1,
      },
    })),
  setPointerLocked: (locked) =>
    set((state) => ({
      runtime: {
        ...state.runtime,
        pointerLocked: locked,
      },
    })),
  setPlayerPosition: (position) =>
    set((state) => ({
      runtime: {
        ...state.runtime,
        playerPosition: position,
      },
    })),
  setCanTalkToSommelier: (canTalk) =>
    set((state) => ({
      runtime: {
        ...state.runtime,
        canTalkToSommelier: canTalk,
      },
    })),
  openSommelierInteraction: () =>
    set((state) => ({
      runtime: {
        ...state.runtime,
        activeInteraction: 'sommelier',
      },
    })),
  closeSommelierInteraction: () =>
    set((state) => ({
      runtime: {
        ...state.runtime,
        activeInteraction: null,
      },
    })),
  setWorldAssetStatus: (status, message) =>
    set((state) => ({
      runtime: {
        ...state.runtime,
        worldAssetStatus: status,
        worldAssetMessage: getWorldAssetMessage(status, message),
      },
    })),
}))
