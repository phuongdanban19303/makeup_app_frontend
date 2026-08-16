import React from 'react';
import { Star } from 'lucide-react';

export const RatingStars = ({ rating = 5.0, totalReviews, showScore = true, size = 16 }) => {
  const fullStars = Math.floor(rating);
  const hasHalfStar = rating % 1 >= 0.5;

  return (
    <div className="flex items-center gap-1">
      <div className="flex items-center text-amber-400">
        {[...Array(5)].map((_, i) => (
          <Star
            key={i}
            size={size}
            className={`${
              i < fullStars
                ? 'fill-amber-400 text-amber-400'
                : i === fullStars && hasHalfStar
                ? 'fill-amber-400/50 text-amber-400'
                : 'text-slate-600'
            }`}
          />
        ))}
      </div>
      {showScore && (
        <span className="text-xs font-semibold text-amber-300 ml-1">
          {rating.toFixed(1)}
        </span>
      )}
      {totalReviews !== undefined && (
        <span className="text-xs text-slate-400">({totalReviews})</span>
      )}
    </div>
  );
};
