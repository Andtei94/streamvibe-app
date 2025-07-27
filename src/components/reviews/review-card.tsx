
'use client';

import type { Review } from '@/lib/types';
import { Card } from '../ui/card';
import { Avatar, AvatarFallback } from '../ui/avatar';
import { StarRating } from './star-rating';
import { formatDistanceToNow } from 'date-fns';

interface ReviewCardProps {
  review: Review;
}

export function ReviewCard({ review }: ReviewCardProps) {
  const timeAgo = formatDistanceToNow(review.createdAt.toDate(), { addSuffix: true });
  const authorInitial = review.authorName ? review.authorName.charAt(0).toUpperCase() : '?';

  return (
    <div className="flex items-start space-x-4">
      <Avatar>
        <AvatarFallback>{authorInitial}</AvatarFallback>
      </Avatar>
      <div className="flex-1">
        <div className="flex items-center justify-between">
            <p className="font-semibold">{review.authorName}</p>
            <p className="text-xs text-muted-foreground">{timeAgo}</p>
        </div>
        <div className="my-1">
            <StarRating rating={review.rating} readOnly />
        </div>
        <p className="text-sm text-muted-foreground">{review.text}</p>
      </div>
    </div>
  );
}
