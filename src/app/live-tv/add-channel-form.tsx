
'use client';

import { useState, useEffect } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';
import { collection, addDoc, updateDoc, doc } from 'firebase/firestore';
import { db } from '@/lib/firebase';
import DOMPurify from 'isomorphic-dompurify';
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
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from '@/components/ui/form';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { toast } from 'sonner';
import { Sparkles, Loader2 } from 'lucide-react';
import { generateChannelMetadata } from '@/ai/actions';
import type { LiveChannel } from '@/lib/types';
import { logger } from '@/lib/logger';

// Client-side schema is simplified as the robust validation is on the server.
const formSchema = z.object({
  name: z.string().trim().min(1, 'Channel name is required.').max(100, 'Channel name is too long.'),
  url: z.string().trim().url('Must be a valid stream URL (e.g., ending in .m3u8).'),
});

type ChannelFormValues = z.infer<typeof formSchema>;

interface AddChannelFormProps {
  isOpen: boolean;
  onOpenChange: (isOpen: boolean) => void;
  initialData?: LiveChannel | null;
}

export function AddChannelForm({ isOpen, onOpenChange, initialData }: AddChannelFormProps) {
  const [isProcessing, setIsProcessing] = useState(false);
  const form = useForm<ChannelFormValues>({
    resolver: zodResolver(formSchema),
    defaultValues: { name: '', url: '' },
    mode: 'onChange',
  });

  useEffect(() => {
    if (isOpen) {
        if (initialData) {
            form.reset({ name: initialData.name, url: initialData.url });
        } else {
            form.reset({ name: '', url: '' });
        }
    }
  }, [initialData, form, isOpen]);


  const handleSubmit = async (values: ChannelFormValues) => {
    setIsProcessing(true);
    try {
        const sanitizedValues = {
          name: DOMPurify.sanitize(values.name),
          url: DOMPurify.sanitize(values.url)
        };
        
        if (initialData) {
            const docRef = doc(db, 'live-channels', initialData.id);
            await updateDoc(docRef, sanitizedValues);
            toast.success('Channel Updated', {
                description: `"${sanitizedValues.name}" has been successfully updated.`,
            });
        } else {
            const { logoUrl, category, epg } = await generateChannelMetadata({ channelName: sanitizedValues.name });
            await addDoc(collection(db, 'live-channels'), {
                ...sanitizedValues,
                logoUrl,
                category,
                epg,
            });
            toast.success('Channel Added', {
                description: `"${sanitizedValues.name}" has been added with an AI-generated logo and program guide.`,
            });
        }
        
        onOpenChange(false);
    } catch (error: any) {
        logger.error({ error, stack: error.stack }, "Error saving channel:");
        toast.error('An error occurred', {
            description: error.message || 'Failed to save the channel. Please try again.',
        });
    } finally {
        setIsProcessing(false);
    }
  };

  const isEditMode = !!initialData;
  const dialogTitle = isEditMode ? 'Edit Channel' : 'Add New Live TV Channel';
  const dialogDescription = isEditMode 
    ? 'Update the channel name or stream URL.' 
    : 'Enter the channel name and a direct stream URL. AI will generate a logo and program guide for new channels.';

  return (
    <Dialog open={isOpen} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>{dialogTitle}</DialogTitle>
          <DialogDescription>{dialogDescription}</DialogDescription>
        </DialogHeader>
        <Form {...form}>
          <form onSubmit={form.handleSubmit(handleSubmit)} className="space-y-4 py-4">
            <FormField
              control={form.control}
              name="name"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Channel Name</FormLabel>
                  <FormControl>
                    <Input placeholder="e.g., Pro TV" {...field} disabled={isProcessing} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="url"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Stream URL</FormLabel>
                  <FormControl>
                    <Input placeholder="https://.../stream.m3u8" {...field} disabled={isProcessing} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            
            <DialogFooter>
              <Button type="button" variant="outline" onClick={() => onOpenChange(false)} disabled={isProcessing}>Cancel</Button>
              <Button type="submit" disabled={isProcessing || !form.formState.isValid}>
                {isProcessing ? (
                    <><Loader2 className="mr-2 h-4 w-4 animate-spin" />Processing...</>                ) : (
                    isEditMode ? 'Save Changes' : <><Sparkles className="mr-2 h-4 w-4" /> Add Channel</>
                )}
              </Button>
            </DialogFooter>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
}
