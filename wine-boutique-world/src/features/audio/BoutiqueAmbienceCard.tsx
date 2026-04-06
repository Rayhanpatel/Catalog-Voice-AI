import type { BoutiqueAmbienceState } from './useBoutiqueAmbience'

export function BoutiqueAmbienceCard({
  musicEnabled,
  musicStarted,
  musicButtonLabel,
  toggleMusic,
}: BoutiqueAmbienceState) {
  return (
    <div className="ambience-card">
      <p className="hud-eyebrow">Boutique Ambience</p>
      <h2>Midnight in Garda</h2>
      <p>
        {musicEnabled
          ? musicStarted
            ? 'Dreamy jazz-pop loop is playing.'
            : 'Starts on your next click or key press.'
          : 'Ambient music is paused.'}
      </p>
      <button type="button" className="ambience-card__button" onClick={toggleMusic}>
        {musicButtonLabel}
      </button>
    </div>
  )
}
