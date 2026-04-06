import React, { useState } from 'react';

function getTopRating(wine) {
  if (!wine.ratings || wine.ratings.length === 0) return null;
  return wine.ratings.reduce((best, r) =>
    (r.score || 0) > (best.score || 0) ? r : best
  );
}

export default function WineCard({ wine }) {
  const topRating = getTopRating(wine);
  const score = topRating?.score;
  const [imgError, setImgError] = useState(false);
  const imageUrl = wine.image_url ? `/api/wine-image?url=${encodeURIComponent(wine.image_url)}` : null;
  const fallbackMark = wine.name.charAt(0).toUpperCase();

  return (
    <div className="wine-card">
      <div className="wine-card-img-wrap">
        {imageUrl && !imgError ? (
          <img
            src={imageUrl}
            alt={wine.name}
            className="wine-card-img"
            loading="lazy"
            onError={() => setImgError(true)}
          />
        ) : (
          <div className="wine-card-img-placeholder">{fallbackMark}</div>
        )}
      </div>
      <div className="wine-card-body">
        <h3 className="wine-card-name">{wine.name}</h3>
        {wine.producer && <p className="wine-card-producer">{wine.producer}</p>}
        <div className="wine-card-meta">
          {wine.varietal && <span className="wine-tag">{wine.varietal}</span>}
          {wine.color && <span className={`wine-tag wine-tag-${wine.color}`}>{wine.color}</span>}
          {wine.region && <span className="wine-tag">{wine.region}</span>}
          {wine.vintage && <span className="wine-tag">{wine.vintage}</span>}
        </div>
        <div className="wine-card-footer">
          {wine.price != null && (
            <span className="wine-price">${wine.price.toFixed(2)}</span>
          )}
          {score && (
            <span className="wine-score">{score}<small>/100</small></span>
          )}
        </div>
        {topRating?.note && (
          <p className="wine-card-note">
            "{topRating.note.length > 150
              ? topRating.note.slice(0, 150) + '...'
              : topRating.note}"
            {topRating.source && (
              <span className="wine-note-source"> — {topRating.source}</span>
            )}
          </p>
        )}
      </div>
    </div>
  );
}
