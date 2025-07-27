
'use server';

import { z } from 'zod';
import { collection, doc, getDocs, runTransaction, serverTimestamp, query, orderBy, limit } from 'firebase/firestore';
import { db } from '@/lib/firebase';
import { auth as firebaseAdminAuth } from 'firebase-admin';
import { getAuthenticatedUser } from '@/lib/auth';
import type { Review } from '@/lib/types';
import { moderateContent } from '@/lib/contentModeration';
import { logger } from '@/lib/logger';
import { documentToPlainObject } from '@/lib/utils';
import { unstable_noStore as noStore } from 'next/cache';

const SubmitReviewSchema = z.object({
    contentId: z.string().trim().min(1),
    rating: z.number().min(1).max(5),
    text: z.string().trim().min(10).max(2000),
});

export async function submitReview(input: z.infer<typeof SubmitReviewSchema>) {
    noStore();
    const user = await getAuthenticatedUser();
    if (!user) {
        throw new Error("You must be logged in to submit a review.");
    }
    
    const { contentId, rating, text } = SubmitReviewSchema.parse(input);
    
    const moderationResult = await moderateContent(text);
    if (!moderationResult.isSafe) {
        return { success: false, error: "Your review contains inappropriate language and cannot be posted." };
    }

    const reviewRef = doc(db, 'content', contentId, 'reviews', user.uid);
    const contentRef = doc(db, 'content', contentId);
    
    try {
        let newReview: Review | null = null;

        await runTransaction(db, async (transaction) => {
            const contentDoc = await transaction.get(contentRef);
            if (!contentDoc.exists()) {
                throw new Error("Content not found.");
            }
            const reviewDoc = await transaction.get(reviewRef);

            const contentData = contentDoc.data();
            const currentRating = contentData.averageRating || 0;
            const currentCount = contentData.reviewCount || 0;
            
            let newAverageRating: number;
            let newReviewCount: number;

            if (reviewDoc.exists()) {
                // User is updating their review
                const oldRating = reviewDoc.data().rating;
                newAverageRating = (currentRating * currentCount - oldRating + rating) / currentCount;
                newReviewCount = currentCount;
            } else {
                // New review
                newAverageRating = (currentRating * currentCount + rating) / (currentCount + 1);
                newReviewCount = currentCount + 1;
            }

            const reviewData = {
                userId: user.uid,
                authorName: user.name || 'Anonymous',
                rating,
                text,
                createdAt: serverTimestamp(),
            };

            transaction.set(reviewRef, reviewData);
            transaction.update(contentRef, {
                averageRating: newAverageRating,
                reviewCount: newReviewCount,
            });
            
            // We can't get the final review object with the server timestamp inside the transaction
            // So we'll construct it for the return value
            newReview = {
                ...reviewData,
                id: user.uid,
                createdAt: new Date() as any, // This is a client-side approximation
            };
        });

        return { success: true, review: newReview };
    } catch (e: any) {
        logger.error({ error: e, contentId, userId: user.uid }, "Failed to submit review transaction.");
        return { success: false, error: e.message || "An unknown error occurred while submitting your review." };
    }
}


export async function getReviews({ contentId }: { contentId: string }): Promise<Review[]> {
    noStore();
    try {
        const reviewsRef = collection(db, 'content', contentId, 'reviews');
        const q = query(reviewsRef, orderBy('createdAt', 'desc'), limit(50));
        const snapshot = await getDocs(q);

        if (snapshot.empty) {
            return [];
        }
        
        return snapshot.docs.map(doc => documentToPlainObject(doc) as Review);
    } catch(e: any) {
        logger.error({error: e, contentId}, "Failed to get reviews.");
        // We throw here so the client component can catch it and display an error state.
        throw new Error("Could not fetch reviews.");
    }
}
