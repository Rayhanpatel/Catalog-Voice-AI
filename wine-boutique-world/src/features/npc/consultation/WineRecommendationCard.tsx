import { useState } from 'react'
import { getTopScore } from './wineCatalog'
import type { Wine } from './types'

interface WineRecommendationCardProps {
  wine: Wine
}

function getTopNote(wine: Wine) {
  if (!wine.ratings?.length) {
    return null
  }

  return wine.ratings.reduce((best, rating) => {
    if (!best) {
      return rating
    }

    return (rating.score ?? 0) > (best.score ?? 0) ? rating : best
  }, wine.ratings[0] ?? null)
}

export function WineRecommendationCard({ wine }: WineRecommendationCardProps) {
  const [imageError, setImageError] = useState(false)
  const topScore = getTopScore(wine)
  const topNote = getTopNote(wine)
  const imageUrl = wine.image_url ? `/api/wine-image?url=${encodeURIComponent(wine.image_url)}` : null
  const fallbackMark = wine.name.charAt(0).toUpperCase()

  return (
    <article className="consultation-wine-card">
      <div className="consultation-wine-card__image-wrap">
        {imageUrl && !imageError ? (
          <img
            src={imageUrl}
            alt={wine.name}
            className="consultation-wine-card__image"
            loading="lazy"
            onError={() => setImageError(true)}
          />
        ) : (
          <div className="consultation-wine-card__image-fallback" aria-label={`${wine.name} image unavailable`}>
            <span className="consultation-wine-card__fallback-mark">{fallbackMark}</span>
          </div>
        )}
      </div>

      <div className="consultation-wine-card__body">
        <h3>{wine.name}</h3>
        {wine.producer && <p className="consultation-wine-card__producer">{wine.producer}</p>}

        <div className="consultation-wine-card__tags">
          {wine.varietal && <span>{wine.varietal}</span>}
          {wine.color && <span>{wine.color}</span>}
          {wine.region && <span>{wine.region}</span>}
        </div>

        <div className="consultation-wine-card__footer">
          {wine.price != null && <strong>${wine.price.toFixed(2)}</strong>}
          {topScore != null && <span>{topScore}/100</span>}
        </div>

        {topNote?.note && (
          <p className="consultation-wine-card__note">
            "{topNote.note.length > 140 ? `${topNote.note.slice(0, 140)}...` : topNote.note}"
          </p>
        )}
      </div>
    </article>
  )
}
