
'use client';

import React, { useEffect, useMemo, useRef, useCallback } from 'react';
import { useForm, useWatch } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';
import type { Content } from '@/lib/types';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
  DialogDescription,
} from '@/components/ui/dialog';
import {
  Form,
  FormControl,
  FormDescription,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from '@/components/ui/form';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Switch } from '@/components/ui/switch';
import { Loader2 } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { logger } from '@/lib/logger';
import { toast } from 'sonner';

const numericString = z.string().refine(val => val === '' || /^\d+$/.test(val), {
  message: "Must be a positive number.",
}).optional();

const subtitleObjectSchema = z.object({
  lang: z.string().min(1),
  srclang: z.string().min(1),
  url: z.string().url(),
  label: z.string().optional(),
});

const dubbedAudioTrackObjectSchema = z.object({
  lang: z.string().min(1),
  url: z.string().url(),
});

const jsonArrayString = (entityName: string, objectSchema: z.ZodTypeAny) => z.string().refine(val => {
    if (val.trim() === '') return true;
    try {
        const parsed = JSON.parse(val);
        if (!Array.isArray(parsed)) return false;
        return parsed.every(item => objectSchema.safeParse(item).success);
    } catch {
        return false;
    }
}, { message: `Must be a valid JSON array of ${entityName} objects or empty. Please check the structure of each item.` });


export const ContentFormSchema = z.object({
  title: z.string().trim().min(1, 'Title is required.').max(150, "Title cannot exceed 150 characters."),
  description: z.string().trim().min(1, 'Description is required.'),
  longDescription: z.string().trim().min(1, 'Long description is required.'),
  type: z.enum(['movie', 'tv-show', 'music', 'sports']),
  status: z.enum(['published', 'review', 'error', 'processing']).optional(),
  genres: z.string().optional(),
  actors: z.string().optional(),
  directors: z.string().optional(),
  keywords: z.string().optional(),
  imageUrl: z.string().url({message: "A valid image URL is required."}).or(z.literal('')),
  aiHint: z.string().max(40, 'AI Hint cannot exceed 40 characters.').refine(val => (val.trim().split(/\s+/).filter(Boolean).length || 0) <= 2, "AI Hint must be 2 words or less.").optional(),
  videoUrl: z.string().url({ message: "Must be a valid URL." }).or(z.literal('')).optional(),
  trailerUrl: z.string().url({message: 'Must be a valid URL.'}).refine(val => !val || val.includes('youtube.com') || val.includes('vimeo.com'), 'For best results, please use a YouTube or Vimeo URL.').or(z.literal('')).optional(),
  subtitles: jsonArrayString('Subtitles', subtitleObjectSchema),
  dubbedAudioTracks: jsonArrayString('Dubbed Audio Tracks', dubbedAudioTrackObjectSchema),
  releaseDate: z.string().refine((date) => !isNaN(new Date(date).getTime()), { message: "Must be a valid date." }),
  rating: z.string().trim().min(1, 'Rating is required.'),
  duration: z.string().trim().min(1, 'Duration is required.'),
  canPlay: z.boolean(),
  canDownload: z.boolean(),
  featured: z.boolean(),
  quality: z.string().optional(),
  collection: z.string().optional(),
  seasonNumber: numericString,
  episodeNumber: numericString,
  audioCodecs: z.string().optional(),
  introStart: numericString,
  introEnd: numericString,
}).superRefine((data, ctx) => {
    if (data.canPlay && (!data.videoUrl || data.videoUrl.trim() === "")) {
        ctx.addIssue({ code: z.ZodIssueCode.custom, message: 'If content is playable, a video URL is required.', path: ['videoUrl'] });
    }
    if (data.type === 'tv-show') {
        const season = Number(data.seasonNumber);
        if (isNaN(season) || season < 1) {
            ctx.addIssue({ code: z.ZodIssueCode.custom, message: 'For TV shows, a valid season number is required.', path: ['seasonNumber'] });
        }
        const episode = Number(data.episodeNumber);
        if (isNaN(episode) || episode < 1) {
             ctx.addIssue({ code: z.ZodIssueCode.custom, message: 'For TV shows, a valid episode number is required.', path: ['episodeNumber'] });
        }
    }
});


export type ContentFormValues = z.infer<typeof ContentFormSchema>;

interface ContentFormProps {
  isOpen: boolean;
  onOpenChange: (isOpen: boolean) => void;
  onSubmit: (values: ContentFormValues) => Promise<void>;
  initialData?: Partial<Content>;
}

const defaultFormValues: ContentFormValues = {
    title: '', description: '', longDescription: '', type: 'movie', status: 'published',
    genres: '', actors: '', directors: '', keywords: '', imageUrl: '', aiHint: '',
    videoUrl: '', trailerUrl: '', subtitles: '[]', dubbedAudioTracks: '[]',
    releaseDate: new Date().toISOString().substring(0, 10), rating: '', duration: '',
    canPlay: true, canDownload: false, featured: false, quality: '1080p', collection: '',
    seasonNumber: '', episodeNumber: '', audioCodecs: '', introStart: '', introEnd: '',
};

function ContentFormDialog({ isOpen, onOpenChange, onSubmit, initialData }: ContentFormProps) {
  const formRef = useRef<HTMLDivElement>(null);
  const isReviewMode = initialData?.status === 'review';

  const form = useForm<ContentFormValues>({
    resolver: zodResolver(ContentFormSchema),
    defaultValues: defaultFormValues,
    mode: 'onBlur',
  });
  
  const videoUrlValue = useWatch({ control: form.control, name: 'videoUrl' });
  const aiHintValue = useWatch({ control: form.control, name: 'aiHint' });
  
  const aiHintWordCount = useMemo(() => aiHintValue?.trim().split(/[\s\t\r\n]+/).filter(Boolean).length || 0, [aiHintValue]);
  
  const videoUrlHint = useMemo(() => videoUrlValue?.includes('.m3u8') ? 'This looks like a stream. Downloading might not be possible.' : null, [videoUrlValue]);

  const resetForm = useCallback(() => {
    if (!initialData) {
      form.reset(defaultFormValues);
      return;
    }

    const transformArrayToString = (arr: any[] | undefined): string =>
      Array.isArray(arr) ? arr.join(', ') : '';

    const transformJsonToString = (json: any | undefined): string => {
        try {
            return json ? JSON.stringify(json, null, 2) : '[]';
        } catch (error) {
            logger.error({ error, data: json }, "Failed to stringify JSON for form");
            return '[]';
        }
    };

    const transformedData: ContentFormValues = {
        title: initialData.title ?? '',
        description: initialData.description ?? '',
        longDescription: initialData.longDescription ?? '',
        type: initialData.type ?? 'movie',
        status: initialData.status ?? 'published',
        genres: transformArrayToString(initialData.genres),
        actors: transformArrayToString(initialData.actors),
        directors: transformArrayToString(initialData.directors),
        keywords: transformArrayToString(initialData.keywords),
        imageUrl: initialData.imageUrl ?? '',
        aiHint: initialData.aiHint ?? '',
        videoUrl: initialData.videoUrl ?? '',
        trailerUrl: initialData.trailerUrl ?? '',
        subtitles: transformJsonToString(initialData.subtitles),
        dubbedAudioTracks: transformJsonToString(initialData.dubbedAudioTracks),
        releaseDate: initialData.releaseDate ? new Date(initialData.releaseDate).toISOString().substring(0, 10) : new Date().toISOString().substring(0, 10),
        rating: initialData.rating ?? '',
        duration: initialData.duration ?? '',
        canPlay: initialData.canPlay ?? true,
        canDownload: initialData.canDownload ?? false,
        featured: initialData.featured ?? false,
        quality: initialData.quality ?? '1080p',
        collection: initialData.collection ?? '',
        seasonNumber: initialData.seasonNumber?.toString() ?? '',
        episodeNumber: initialData.episodeNumber?.toString() ?? '',
        audioCodecs: transformArrayToString(initialData.audioCodecs),
        introStart: initialData.introStart?.toString() ?? '',
        introEnd: initialData.introEnd?.toString() ?? '',
    };
    form.reset(transformedData);
  }, [form, initialData]);

  useEffect(() => {
    if (isOpen) resetForm();
  }, [isOpen, resetForm]);

  const handleFormSubmit = async (values: ContentFormValues) => {
    const finalValues = { ...values, status: isReviewMode ? 'published' : values.status };
    try {
      await onSubmit(finalValues);
    } catch(e: any) {
      const errorMessage = e.message || 'An unexpected error occurred during submission.';
      logger.error({error: e, values: finalValues}, "Submission failed in form component");
      toast.error('Submission Failed', { description: errorMessage });
    }
  };
  
  const dialogTitle = isReviewMode ? 'Review AI-Generated Content' : initialData?.id ? 'Edit Content' : 'Add New Content';
  const dialogDescription = isReviewMode ? 'Please verify the metadata generated by the AI. Make any corrections and click "Save & Publish" when you are done.' : initialData?.id ? 'Make changes to the existing content.' : 'Fill in the details for the new content.';

  return (
    <Dialog open={isOpen} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-4xl max-h-[90vh] overflow-y-auto" ref={formRef}>
        <DialogHeader>
          <DialogTitle>{dialogTitle}</DialogTitle>
          <DialogDescription>{dialogDescription}</DialogDescription>
        </DialogHeader>
        <Form {...form}>
          <form onSubmit={form.handleSubmit(handleFormSubmit)} className="space-y-6 py-4">
            
            <Card>
                <CardHeader><CardTitle>Core Metadata</CardTitle></CardHeader>
                <CardContent className="space-y-4">
                    <FormField control={form.control} name="title" render={({ field }) => (
                        <FormItem><FormLabel>Title</FormLabel><FormControl><Input placeholder="Enter content title" {...field} /></FormControl><FormMessage /></FormItem>
                    )} />
                    <FormField control={form.control} name="description" render={({ field }) => (
                        <FormItem><FormLabel>Short Description</FormLabel><FormControl><Textarea placeholder="A brief summary..." {...field} /></FormControl><FormMessage /></FormItem>
                    )} />
                    <FormField control={form.control} name="longDescription" render={({ field }) => (
                        <FormItem><FormLabel>Long Description</FormLabel><FormControl><Textarea rows={5} placeholder="A detailed description..." {...field} /></FormControl><FormMessage /></FormItem>
                    )} />
                </CardContent>
            </Card>
            
            <Card>
                <CardHeader><CardTitle>Categorization</CardTitle></CardHeader>
                <CardContent className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <FormField control={form.control} name="type" render={({ field }) => (
                        <FormItem><FormLabel>Type</FormLabel><Select onValueChange={field.onChange} value={field.value}><FormControl><SelectTrigger><SelectValue/></SelectTrigger></FormControl><SelectContent><SelectItem value="movie">Movie</SelectItem><SelectItem value="tv-show">TV Show</SelectItem><SelectItem value="music">Music</SelectItem><SelectItem value="sports">Sports</SelectItem></SelectContent></Select><FormMessage /></FormItem>
                    )} />
                    <FormField control={form.control} name="genres" render={({ field }) => (<FormItem><FormLabel>Genres (comma-separated)</FormLabel><FormControl><Input placeholder="Sci-Fi, Adventure,..." {...field} /></FormControl><FormMessage /></FormItem>)} />
                    <FormField control={form.control} name="actors" render={({ field }) => (<FormItem><FormLabel>Actors (comma-separated)</FormLabel><FormControl><Input placeholder="Actor One, Actor Two,..." {...field} /></FormControl><FormMessage /></FormItem>)} />
                    <FormField control={form.control} name="directors" render={({ field }) => (<FormItem><FormLabel>Directors (comma-separated)</FormLabel><FormControl><Input placeholder="Director One,..." {...field} /></FormControl><FormMessage /></FormItem>)} />
                    <div className="md:col-span-2">
                        <FormField control={form.control} name="keywords" render={({ field }) => (
                            <FormItem><FormLabel>Keywords (comma-separated)</FormLabel><FormControl><Textarea rows={3} placeholder="action, sci-fi, keanu reeves,..." {...field} /></FormControl><FormDescription>Search keywords used to find this content. Keep them lowercase.</FormDescription><FormMessage /></FormItem>
                        )} />
                    </div>
                </CardContent>
            </Card>

            <Card>
                <CardHeader><CardTitle>Media & Assets</CardTitle></CardHeader>
                <CardContent className="space-y-4">
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <FormField control={form.control} name="imageUrl" render={({ field }) => (<FormItem><FormLabel>Poster Image URL</FormLabel><FormControl><Input placeholder="https://... or data:image/" {...field} /></FormControl><FormMessage /></FormItem>)} />
                        <FormField control={form.control} name="aiHint" render={({ field }) => (<FormItem><FormLabel>AI Image Hint</FormLabel><FormControl><Input placeholder="e.g., fantasy landscape" {...field} /></FormControl><FormDescription>{aiHintWordCount}/2 words used.</FormDescription><FormMessage /></FormItem>)} />
                    </div>
                    <FormField control={form.control} name="videoUrl" render={({ field }) => (<FormItem><FormLabel>Video URL (Original Audio)</FormLabel><FormControl><Input placeholder="https://..." {...field} /></FormControl>{videoUrlHint && <FormDescription>{videoUrlHint}</FormDescription>}<FormMessage /></FormItem>)} />
                    <FormField control={form.control} name="trailerUrl" render={({ field }) => (<FormItem><FormLabel>Trailer URL</FormLabel><FormControl><Input placeholder="https://youtube.com/watch?v=..." {...field} /></FormControl><FormMessage /></FormItem>)} />
                    <FormField control={form.control} name="subtitles" render={({ field }) => (<FormItem><FormLabel>Subtitles (JSON array)</FormLabel><FormControl><Textarea rows={4} placeholder='[{"lang": "English", "srclang": "en", "url": "..."}]' {...field} /></FormControl><FormDescription>Must be a valid JSON array of objects.</FormDescription><FormMessage /></FormItem>)} />
                    <FormField control={form.control} name="dubbedAudioTracks" render={({ field }) => (<FormItem><FormLabel>Dubbed Audio (JSON array)</FormLabel><FormControl><Textarea rows={4} placeholder='[{"lang": "Romanian", "url": "..."}]' {...field} /></FormControl><FormDescription>Must be a valid JSON array of objects.</FormDescription><FormMessage /></FormItem>)} />
                </CardContent>
            </Card>

            <Card>
                <CardHeader><CardTitle>Details & Timings</CardTitle></CardHeader>
                <CardContent className="space-y-4">
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                        <FormField control={form.control} name="releaseDate" render={({ field }) => (<FormItem><FormLabel>Release Date</FormLabel><FormControl><Input type="date" placeholder="YYYY-MM-DD" {...field} /></FormControl><FormMessage /></FormItem>)} />
                        <FormField control={form.control} name="rating" render={({ field }) => (<FormItem><FormLabel>Rating</FormLabel><FormControl><Input placeholder="PG-13" {...field} /></FormControl><FormMessage /></FormItem>)} />
                        <FormField control={form.control} name="duration" render={({ field }) => (<FormItem><FormLabel>Duration</FormLabel><FormControl><Input placeholder="2h 15m" {...field} /></FormControl><FormMessage /></FormItem>)} />
                    </div>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <FormField control={form.control} name="quality" render={({ field }) => (<FormItem><FormLabel>Quality</FormLabel><FormControl><Input placeholder="4K, 1080p,..." {...field} /></FormControl><FormMessage /></FormItem>)} />
                        <FormField control={form.control} name="collection" render={({ field }) => (<FormItem><FormLabel>Collection / TV Show Name</FormLabel><FormControl><Input placeholder="Collection Name" {...field} /></FormControl><FormMessage /></FormItem>)} />
                    </div>
                     <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <FormField control={form.control} name="seasonNumber" render={({ field }) => (<FormItem><FormLabel>Season Number</FormLabel><FormControl><Input type="number" placeholder="e.g., 1" {...field} min="1" step="1" /></FormControl><FormMessage /></FormItem>)} />
                        <FormField control={form.control} name="episodeNumber" render={({ field }) => (<FormItem><FormLabel>Episode Number</FormLabel><FormControl><Input type="number" placeholder="e.g., 1" {...field} min="1" step="1" /></FormControl><FormMessage /></FormItem>)} />
                    </div>
                    <FormField control={form.control} name="audioCodecs" render={({ field }) => (<FormItem><FormLabel>Audio Codecs (comma-separated)</FormLabel><FormControl><Input placeholder="Dolby Atmos, DTS:X,..." {...field} /></FormControl><FormMessage /></FormItem>)} />
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <FormField control={form.control} name="introStart" render={({ field }) => (<FormItem><FormLabel>Intro Start (seconds)</FormLabel><FormControl><Input type="number" placeholder="e.g., 30" {...field} min="0" /></FormControl><FormMessage /></FormItem>)} />
                        <FormField control={form.control} name="introEnd" render={({ field }) => (<FormItem><FormLabel>Intro End (seconds)</FormLabel><FormControl><Input type="number" placeholder="e.g., 90" {...field} min="0" /></FormControl><FormMessage /></FormItem>)} />
                    </div>
                </CardContent>
            </Card>

            <Card>
                <CardHeader><CardTitle>Settings</CardTitle></CardHeader>
                <CardContent className="space-y-4">
                    <FormField control={form.control} name="featured" render={({ field }) => (<FormItem className="flex flex-row items-center justify-between rounded-lg border p-3 shadow-sm"><div className="space-y-0.5"><FormLabel>Featured</FormLabel><FormDescription>Display this content prominently on the home page.</FormDescription></div><FormControl><Switch checked={field.value} onCheckedChange={field.onChange} /></FormControl></FormItem>)} />
                    <div className="flex items-center space-x-8 pt-2">
                        <FormField control={form.control} name="canPlay" render={({ field }) => (<FormItem className="flex flex-row items-center justify-between rounded-lg border p-3 shadow-sm w-full"><div className="space-y-0.5"><FormLabel>Playable</FormLabel></div><FormControl><Switch checked={field.value} onCheckedChange={field.onChange} /></FormControl></FormItem>)} />
                        <FormField control={form.control} name="canDownload" render={({ field }) => (<FormItem className="flex flex-row items-center justify-between rounded-lg border p-3 shadow-sm w-full"><div className="space-y-0.5"><FormLabel>Downloadable</FormLabel></div><FormControl><Switch checked={field.value} onCheckedChange={field.onChange} /></FormControl></FormItem>)} />
                    </div>
                </CardContent>
            </Card>

            <DialogFooter>
              <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>Cancel</Button>
              <Button type="submit" disabled={!form.formState.isValid || form.formState.isSubmitting}>
                {form.formState.isSubmitting && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                {form.formState.isSubmitting ? 'Saving...' : isReviewMode ? 'Save & Publish' : 'Save'}
              </Button>
            </DialogFooter>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
}

export const ContentForm = React.memo(ContentFormDialog);
