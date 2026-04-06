import { useEffect, useRef, type FormEvent } from 'react'
import { useTuningStore } from '../debug/tuningStore'
import { SOMMELIER_PANEL_TITLE } from './interactionShell'
import { useSommelierConsultation } from './consultation/useSommelierConsultation'
import { SPEECH_RECOGNITION_LANGUAGE_OPTIONS } from './consultation/voice'
import { WineRecommendationCard } from './consultation/WineRecommendationCard'
import type { ConsultationSession } from './consultation/types'

function getStatusLabel(
  stage: ConsultationSession['stage'],
  voiceSupported: boolean,
  catalogReady: boolean,
  handsFreeEnabled: boolean,
  isRecording: boolean,
  isTranscribing: boolean,
) {
  if (!catalogReady) {
    return 'Loading cellar'
  }

  if (!voiceSupported) {
    return 'Text consultation ready'
  }

  if (!handsFreeEnabled && stage !== 'speaking' && stage !== 'thinking') {
    return 'Text input ready'
  }

  if (isTranscribing) {
    return 'Transcribing'
  }

  if (isRecording) {
    return 'Listening'
  }

  switch (stage) {
    case 'greeting':
      return 'Sommelier greeting'
    case 'thinking':
      return 'Selecting bottles'
    case 'speaking':
      return 'Speaking - say anything to interrupt'
    case 'error':
      return 'Needs attention'
    case 'listening':
    case 'closed':
    default:
      return 'Listening'
  }
}

function getStatusBanners(consultation: ConsultationSession) {
  const banners: Array<{ key: string; tone: 'info' | 'warning' | 'error'; text: string }> = []

  if (!consultation.catalogReady) {
    banners.push({
      key: 'catalog-loading',
      tone: 'info',
      text: 'Catalog loading. The sommelier is pulling the cellar list together.',
    })
  }

  if (consultation.lastInputError) {
    banners.push({
      key: 'speech-input',
      tone: 'warning',
      text: consultation.speechInputMode === 'unavailable'
        ? `Speech input unavailable. ${consultation.lastInputError}`
        : `Voice input needs attention. ${consultation.lastInputError}`,
    })
  }

  if (consultation.speechMode === 'unavailable') {
    banners.push({
      key: 'natural-voice',
      tone: 'warning',
      text: consultation.lastSpeechError
        ? `Natural voice unavailable. ${consultation.lastSpeechError}`
        : 'Natural voice unavailable. Replies stay in text until cloud TTS is back.',
    })
  }

  if (
    consultation.error &&
    !consultation.lastInputError &&
    !consultation.error.includes('wine list') &&
    !consultation.error.includes('Voice input is unavailable') &&
    !consultation.error.includes('Speech input')
  ) {
    banners.push({
      key: 'connection',
      tone: 'error',
      text: 'Connection retrying. The current reply may need to be asked again.',
    })
  }

  return banners
}

export function SommelierInteractionShell() {
  const activeInteraction = useTuningStore((state) => state.runtime.activeInteraction)
  const closeSommelierInteraction = useTuningStore((state) => state.closeSommelierInteraction)
  const consultation = useSommelierConsultation()
  const transcriptEndRef = useRef<HTMLDivElement | null>(null)
  const openConsultationRef = useRef(consultation.open)
  const shutdownConsultationRef = useRef(consultation.close)
  const isOpen = activeInteraction === 'sommelier'
  const showStopAudio = consultation.isSpeaking || consultation.stage === 'speaking'
  const statusBanners = getStatusBanners(consultation)

  useEffect(() => {
    openConsultationRef.current = consultation.open
    shutdownConsultationRef.current = consultation.close
  }, [consultation.close, consultation.open])

  const handleClose = () => {
    consultation.close()
    closeSommelierInteraction()
  }

  const handleSubmit = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault()

    if (!consultation.textInput.trim() || consultation.isThinking) {
      return
    }

    consultation.submitQuestion(consultation.textInput.trim())
    consultation.setTextInput('')
  }

  useEffect(() => {
    if (!isOpen) {
      return
    }

    void openConsultationRef.current()

    return () => {
      shutdownConsultationRef.current()
    }
  }, [isOpen])

  useEffect(() => {
    if (!isOpen) {
      return
    }

    transcriptEndRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [consultation.interimText, consultation.messages, consultation.streamingText, isOpen])

  if (!isOpen) {
    return null
  }

  return (
    <section className="consultation-shell" aria-label="Sommelier consultation">
      <header className="consultation-shell__header">
        <div>
          <p className="hud-eyebrow">Sommelier Consultation</p>
          <h2>{SOMMELIER_PANEL_TITLE}</h2>
        </div>

        <div className="consultation-shell__header-actions">
          <span className={`consultation-status consultation-status--${consultation.stage}`}>
            {getStatusLabel(
              consultation.stage,
              consultation.voiceSupported,
              consultation.catalogReady,
              consultation.handsFreeEnabled,
              consultation.isRecording,
              consultation.isTranscribing,
            )}
          </span>
          {consultation.voiceSupported && (
            <button
              type="button"
              className="consultation-secondary-button"
              onClick={() => consultation.setHandsFreeListening(!consultation.handsFreeEnabled)}
            >
              {consultation.handsFreeEnabled ? 'Mic on' : 'Mic off'}
            </button>
          )}
          {showStopAudio && (
            <button type="button" className="consultation-secondary-button" onClick={consultation.stopSpeaking}>
              Stop audio
            </button>
          )}
          <button type="button" className="consultation-close-button" onClick={handleClose}>
            Close
          </button>
        </div>
      </header>

      <p className="consultation-shell__intro">
        Ask naturally by voice or type. Recommendations stay grounded in the boutique collection.
      </p>

      {statusBanners.length > 0 && (
        <div className="consultation-status-banners">
          {statusBanners.map((banner) => (
            <p
              key={banner.key}
              className={`consultation-status-banner consultation-status-banner--${banner.tone}`}
            >
              {banner.text}
            </p>
          ))}
        </div>
      )}

      <div className="consultation-transcript">
        {consultation.messages.map((message) => (
          <div
            key={message.id}
            className={`consultation-message consultation-message--${message.role}`}
          >
            <div
              className={`consultation-bubble consultation-bubble--${message.role}${message.isError ? ' consultation-bubble--error' : ''}`}
            >
              {message.text}
            </div>

            {message.wines && message.wines.length > 0 && (
              <div className="consultation-wine-row">
                {message.wines.map((wine) => (
                  <WineRecommendationCard key={`${message.id}-${wine.name}`} wine={wine} />
                ))}
              </div>
            )}
          </div>
        ))}

        {consultation.isThinking && consultation.streamingText && (
          <div className="consultation-message consultation-message--assistant">
            <div className="consultation-bubble consultation-bubble--assistant consultation-bubble--streaming">
              {consultation.streamingText}
              <span className="consultation-streaming-cursor" aria-hidden="true" />
            </div>
          </div>
        )}

        {consultation.isThinking && !consultation.streamingText && (
          <div className="consultation-message consultation-message--assistant">
            <div className="consultation-bubble consultation-bubble--assistant consultation-bubble--thinking">
              <span className="consultation-thinking-dot" aria-hidden="true" />
              Choosing the next pour...
            </div>
          </div>
        )}

        {consultation.interimText && (
          <div className="consultation-message consultation-message--user">
            <div className="consultation-bubble consultation-bubble--user consultation-bubble--interim">
              {consultation.interimText}
            </div>
          </div>
        )}

        <div ref={transcriptEndRef} />
      </div>

      <footer className="consultation-shell__footer">
        <div className="consultation-toolbar">
          <div className={`consultation-mic-status${consultation.isListening ? ' consultation-mic-status--active' : ''}`}>
            <span className="consultation-mic-status__dot" aria-hidden="true" />
            {consultation.voiceSupported
              ? consultation.stage === 'speaking'
                ? 'Speaking - say anything to interrupt'
                : consultation.handsFreeEnabled
                  ? consultation.isTranscribing
                    ? 'Transcribing your question now'
                    : consultation.isRecording
                      ? 'Hands-free mic is armed'
                      : consultation.isListening
                        ? 'Hands-free mic is armed'
                        : 'Hands-free mic needs attention. Type freely or retry the mic.'
                  : 'Hands-free mic is paused. Type freely or turn the mic back on.'
              : 'Voice input works in Chrome for this demo. You can keep typing here.'}
          </div>
          {consultation.voiceSupported && (
            <label className="consultation-select-field">
              <span>Speech input</span>
              <select
                value={consultation.speechInputLanguage}
                onChange={(event) => consultation.setSpeechInputLanguage(event.target.value)}
                className="consultation-select"
              >
                {SPEECH_RECOGNITION_LANGUAGE_OPTIONS.map((option) => (
                  <option key={option.value} value={option.value}>
                    {option.label}
                  </option>
                ))}
              </select>
            </label>
          )}
          <button type="button" className="consultation-secondary-button" onClick={() => void consultation.restartSession()}>
            New consultation
          </button>
        </div>

        {consultation.error && <p className="consultation-error-text">{consultation.error}</p>}

        <form className="consultation-text-form" onSubmit={handleSubmit}>
          <input
            type="text"
            value={consultation.textInput}
            onChange={(event) => consultation.setTextInput(event.target.value)}
            placeholder={
              consultation.catalogReady
                ? 'Tell the sommelier what you enjoy, your budget, or the occasion...'
                : 'Pulling the cellar list together...'
            }
            className="consultation-text-input"
            disabled={consultation.isThinking || !consultation.catalogReady}
          />
          <button
            type="submit"
            className="consultation-submit-button"
            disabled={!consultation.textInput.trim() || consultation.isThinking || !consultation.catalogReady}
          >
            Send
          </button>
        </form>
      </footer>
    </section>
  )
}
