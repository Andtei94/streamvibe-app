
'use client';

import { useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from '../ui/form';
import { Textarea } from '../ui/textarea';
import { Button } from '../ui/button';
import { StarRating } from './star-rating';
import { useAuth } from '@/hooks/use-auth';
import { toast } from 'sonner';
import { submitReview } from './actions';
import type { Review } from '@/lib/types';
import { Loader2 } from 'lucide-react';
import { logger } from '@/lib/logger';

const reviewSchema = z.object({
  rating: z.number().min(1, 'Rating is required').max(5),
  text: z.string().trim().min(10, 'Review must be at least 10 characters long.').max(2000, 'Review cannot exceed 2000 characters.'),
});

type ReviewFormValues = z.infer<typeof reviewSchema>;

interface ReviewFormProps {
  contentId: string;
  onReviewSubmitted: (review: Review) => void;
}

export function ReviewForm({ contentId, onReviewSubmitted }: ReviewFormProps) {
  const { user } = useAuth();
  const [isLoading, setIsLoading] = useState(false);

  const form = useForm<ReviewFormValues>({
    resolver: zodResolver(reviewSchema),
    defaultValues: {
      rating: 0,
      text: '',
    },
  });

  const onSubmit = async (values: ReviewFormValues) => {
    if (!user) {
      toast.error('You must be logged in to leave a review.');
      return;
    }
    
    setIsLoading(true);
    try {
        const result = await submitReview({
            contentId: contentId,
            rating: values.rating,
            text: values.text
        });

        if (result.success && result.review) {
            toast.success('Review submitted!');
            onReviewSubmitted(result.review);
            form.reset();
        } else {
            throw new Error(result.error || "An unknown error occurred.");
        }
    } catch (err: any) {
        logger.error({ error: err }, "Failed to submit review");
        toast.error('Submission Failed', { description: err.message });
    } finally {
        setIsLoading(false);
    }
  };

  return (
    <Form {...form}>
      <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
        <FormField
          control={form.control}
          name="rating"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Your Rating</FormLabel>
              <FormControl>
                <StarRating rating={field.value} setRating={field.onChange} />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />
        <FormField
          control={form.control}
          name="text"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Your Review</FormLabel>
              <FormControl>
                <Textarea
                  placeholder="What did you think of this content?"
                  rows={4}
                  {...field}
                />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />
        <Button type="submit" disabled={isLoading}>
          {isLoading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
          Submit Review
        </Button>
      </form>
    </Form>
  );
}
