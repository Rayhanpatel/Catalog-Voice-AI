import { useCallback, useEffect, useRef, useState } from 'react'
import { subscribeSpeechInputRuntime, subscribeSpeechRuntime } from '@wine-voice-ai/wine-ai-core'

const AMBIENCE_BASE_VOLUME = 0.16
const AMBIENCE_ARMED_VOLUME = 0.06
const AMBIENCE_DUCKED_VOLUME = 0.02

export interface BoutiqueAmbienceState {
  musicEnabled: boolean
  musicStarted: boolean
  musicButtonLabel: string
  toggleMusic: () => void
}

export function useBoutiqueAmbience(trackPath: string): BoutiqueAmbienceState {
  const [musicEnabled, setMusicEnabled] = useState(true)
  const [musicStarted, setMusicStarted] = useState(false)
  const ambienceAudioRef = useRef<HTMLAudioElement | null>(null)

  useEffect(() => {
    if (typeof Audio === 'undefined') {
      return
    }

    const ambienceAudio = new Audio(trackPath)
    const handlePlay = () => {
      setMusicStarted(true)
    }
    const handlePause = () => {
      setMusicStarted(false)
    }

    ambienceAudio.loop = true
    ambienceAudio.preload = 'auto'
    ambienceAudio.volume = AMBIENCE_BASE_VOLUME
    ambienceAudio.addEventListener('play', handlePlay)
    ambienceAudio.addEventListener('pause', handlePause)
    ambienceAudio.addEventListener('ended', handlePause)
    ambienceAudioRef.current = ambienceAudio

    return () => {
      ambienceAudio.pause()
      ambienceAudio.removeEventListener('play', handlePlay)
      ambienceAudio.removeEventListener('pause', handlePause)
      ambienceAudio.removeEventListener('ended', handlePause)
      ambienceAudio.src = ''
      ambienceAudioRef.current = null
    }
  }, [trackPath])

  useEffect(() => {
    let speechActive = false
    let inputActive = false
    let micArmed = false

    const applyAmbienceVolume = () => {
      const ambienceAudio = ambienceAudioRef.current

      if (!ambienceAudio) {
        return
      }

      ambienceAudio.volume =
        speechActive || inputActive
          ? AMBIENCE_DUCKED_VOLUME
          : micArmed
            ? AMBIENCE_ARMED_VOLUME
            : AMBIENCE_BASE_VOLUME
    }

    const unsubscribeSpeech = subscribeSpeechRuntime((state) => {
      speechActive = state.isSpeaking
      applyAmbienceVolume()
    })
    const unsubscribeInput = subscribeSpeechInputRuntime((state) => {
      micArmed = state.isRecording
      inputActive = state.isTranscribing
      applyAmbienceVolume()
    })

    return () => {
      unsubscribeSpeech()
      unsubscribeInput()
    }
  }, [])

  useEffect(() => {
    const ambienceAudio = ambienceAudioRef.current

    if (!ambienceAudio) {
      return
    }

    let cancelled = false

    const attemptPlayback = () => {
      if (!musicEnabled) {
        ambienceAudio.pause()
        return
      }

      const playResult = ambienceAudio.play()

      if (!playResult || typeof playResult.then !== 'function') {
        setMusicStarted(true)
        return
      }

      void playResult
        .then(() => {
          if (!cancelled) {
            setMusicStarted(true)
          }
        })
        .catch(() => {
          if (!cancelled) {
            setMusicStarted(false)
          }
        })
    }

    if (!musicEnabled) {
      ambienceAudio.pause()
    } else if (ambienceAudio.paused) {
      attemptPlayback()
    }

    window.addEventListener('pointerdown', attemptPlayback, { passive: true })
    window.addEventListener('keydown', attemptPlayback)

    return () => {
      cancelled = true
      window.removeEventListener('pointerdown', attemptPlayback)
      window.removeEventListener('keydown', attemptPlayback)
    }
  }, [musicEnabled])

  const toggleMusic = useCallback(() => {
    if (musicEnabled && musicStarted) {
      setMusicEnabled(false)
      return
    }

    setMusicEnabled(true)

    const ambienceAudio = ambienceAudioRef.current

    if (!ambienceAudio) {
      return
    }

    const playResult = ambienceAudio.play()

    if (!playResult || typeof playResult.then !== 'function') {
      setMusicStarted(true)
      return
    }

    void playResult
      .then(() => {
        setMusicStarted(true)
      })
      .catch(() => {
        setMusicStarted(false)
      })
  }, [musicEnabled, musicStarted])

  return {
    musicEnabled,
    musicStarted,
    musicButtonLabel: !musicEnabled ? 'Play music' : musicStarted ? 'Pause music' : 'Start music',
    toggleMusic,
  }
}
