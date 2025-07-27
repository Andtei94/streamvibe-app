
'use client';

import { useState } from 'react';
import { Star } from 'lucide-react';
import { cn } from '@/lib/utils';

interface StarRatingProps {
  rating: number;
  setRating?: (rating: number) => void;
  readOnly?: boolean;
}

export function StarRating({ rating, setRating, readOnly = false }: StarRatingProps) {
  const [hover, setHover] = useState(0);

  return (
    <div className="flex items-center space-x-1">
      {[...Array(5)].map((_, index) => {
        const ratingValue = index + 1;
        return (
          <button
            type="button"
            key={ratingValue}
            className={cn(
              "text-muted-foreground transition-colors",
              ratingValue <= (hover || rating) && "text-amber-400",
              !readOnly && "cursor-pointer"
            )}
            onClick={() => !readOnly && setRating && setRating(ratingValue)}
            onMouseEnter={() => !readOnly && setHover(ratingValue)}
            onMouseLeave={() => !readOnly && setHover(0)}
            disabled={readOnly}
            aria-label={`Rate ${ratingValue} out of 5 stars`}
          >
            <Star className="h-5 w-5 fill-current" />
          </button>
        );
      })}
    </div>
  );
}
