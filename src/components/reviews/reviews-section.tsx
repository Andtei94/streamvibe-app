
'use client';

import { useState, useEffect } from 'react';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card';
import { getReviews } from './actions';
import type { Review } from '@/lib/types';
import { useAuth } from '@/hooks/use-auth';
import { ReviewForm } from './review-form';
import { ReviewCard } from './review-card';
import { Star } from 'lucide-react';
import { logger } from '@/lib/logger';
import { Skeleton } from '../ui/skeleton';
import { Separator } from '../ui/separator';

interface ReviewsSectionProps {
  contentId: string;
}

const ReviewSkeleton = () => (
    <div className="flex items-start space-x-4">
        <Skeleton className="h-10 w-10 rounded-full" />
        <div className="space-y-2 flex-1">
            <Skeleton className="h-4 w-1/4" />
            <Skeleton className="h-4 w-full" />
            <Skeleton className="h-4 w-3/4" />
        </div>
    </div>
);

export function ReviewsSection({ contentId }: ReviewsSectionProps) {
  const [reviews, setReviews] = useState<Review[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const { user, uid } = useAuth();
  
  useEffect(() => {
    const fetchReviews = async () => {
      setLoading(true);
      setError(null);
      try {
        const fetchedReviews = await getReviews({ contentId });
        setReviews(fetchedReviews);
      } catch (err: any) {
        logger.error({ error: err, contentId }, "Failed to fetch reviews");
        setError("Could not load reviews at this time.");
      } finally {
        setLoading(false);
      }
    };
    fetchReviews();
  }, [contentId]);

  const handleReviewSubmitted = (newReview: Review) => {
    setReviews(prevReviews => {
        // Remove existing review from the same user to prevent duplicates
        const filtered = prevReviews.filter(r => r.userId !== newReview.userId);
        // Add the new review to the top
        return [newReview, ...filtered];
    });
  };

  const hasUserReviewed = user ? reviews.some(review => review.userId === uid) : false;

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
            <Star className="w-6 h-6" /> Reviews & Ratings
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-6">
        {user && !hasUserReviewed && (
          <>
            <ReviewForm contentId={contentId} onReviewSubmitted={handleReviewSubmitted} />
            <Separator />
          </>
        )}

        {loading ? (
          <div className="space-y-4">
             <ReviewSkeleton />
             <ReviewSkeleton />
          </div>
        ) : error ? (
          <p className="text-destructive text-center">{error}</p>
        ) : reviews.length > 0 ? (
          <div className="space-y-6">
            {reviews.map(review => (
              <ReviewCard key={review.id} review={review} />
            ))}
          </div>
        ) : (
          <p className="text-muted-foreground text-center py-4">Be the first to leave a review for this content.</p>
        )}
      </CardContent>
    </Card>
  );
}
