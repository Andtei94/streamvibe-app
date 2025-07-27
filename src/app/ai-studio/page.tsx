
'use client';

import { useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from '@/components/ui/form';
import { Textarea } from '@/components/ui/textarea';
import { Wand2, Sparkles, Rabbit, Clapperboard, Mic, Loader2, Video } from 'lucide-react';
import { toast } from 'sonner';
import Link from 'next/link';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { Label } from '@/components/ui/label';
import { generateShowFromPrompt, generateVideoFromPrompt, generateVideoClip } from '@/ai/actions';

const formSchema = z.object({
  prompt: z.preprocess(
    (arg) => (typeof arg === 'string' ? arg.trim() : arg),
    z.string()
      .min(10, 'Please enter a prompt of at least 10 characters.')
      .max(500, 'Prompt must be 500 characters or less for optimal results.')
  ),
  outputType: z.enum(['audio', 'slideshow', 'video'], {
    required_error: 'You need to select an output type.',
  }),
});

type FormValues = z.infer<typeof formSchema>;

export default function AiStudioPage() {
  const [isLoading, setIsLoading] = useState(false);

  const form = useForm<FormValues>({
    resolver: zodResolver(formSchema),
    defaultValues: { prompt: '', outputType: 'audio' },
    mode: 'onChange',
  });

  const handleSubmit = async (values: FormValues) => {
    setIsLoading(true);
    let contentId: string;
    
    try {
      if (values.outputType === 'slideshow') {
        toast.info('AI Slideshow Generation Started', { description: 'Your new show is being created. This may take a moment...' });
        const result = await generateVideoFromPrompt({ prompt: values.prompt });
        contentId = result.contentId;
      } else if (values.outputType === 'video') {
        toast.info('AI Video Generation Started', { description: 'Your video is being generated. This can take up to a minute.' });
        const result = await generateVideoClip({ prompt: values.prompt });
        contentId = result.contentId;
      } else {
        toast.info('AI Audio Generation Started', { description: 'Your new show is being created. This may take a moment...' });
        const result = await generateShowFromPrompt({ prompt: values.prompt });
        contentId = result.contentId;
      }

      toast.success('Content Generated Successfully!', {
        description: `"${values.prompt.substring(0, 30)}..." has been added to your library.`,
        action: (
          <Button asChild variant="outline" size="sm">
            <Link href={`/watch/${contentId}`}>View</Link>
          </Button>
        ),
      });

      form.reset();
    } catch (error: any) {
      console.error('AI Studio generation error:', error);
      let description = error.message || 'An unknown error occurred.';
      if (error.message?.includes('SAFETY')) {
        description = 'The prompt was blocked by the content safety filter. Please modify your prompt and try again.';
      }
      toast.error('Generation Failed', {
        description,
      });
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="container mx-auto py-10">
      <div className="flex items-center gap-4 mb-2">
        <Wand2 className="w-10 h-10" />
        <h1 className="text-4xl font-bold font-headline">AI Content Studio</h1>
      </div>
      <p className="text-muted-foreground mb-8 max-w-3xl">
        Describe an idea, and the AI will generate a complete piece of content—from an audio show to a dynamic video clip—ready to be watched.
      </p>

      <Card className="max-w-3xl relative">
        {isLoading && (
            <div className="absolute inset-0 bg-background/80 z-10 flex items-center justify-center">
                <div className="flex flex-col items-center gap-2 text-muted-foreground">
                    <Loader2 className="w-8 h-8 animate-spin" />
                    <p className="font-medium">Generating Content...</p>
                    <p className="text-sm">This may take a minute or two.</p>
                </div>
            </div>
        )}
        <Form {...form}>
          <form onSubmit={form.handleSubmit(handleSubmit)}>
            <CardHeader>
              <CardTitle>Create New Content</CardTitle>
              <CardDescription>Enter a prompt and choose the type of content you want to create.</CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
                <FormField
                  control={form.control}
                  name="prompt"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Your Idea</FormLabel>
                      <FormControl>
                        <Textarea
                          placeholder="e.g., A short documentary about the mysterious creatures of the deep sea."
                          rows={5}
                          {...field}
                          disabled={isLoading}
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="outputType"
                  render={({ field }) => (
                    <FormItem className="space-y-3">
                      <FormLabel>Select Output Type</FormLabel>
                      <FormControl>
                        <RadioGroup
                          onValueChange={field.onChange}
                          defaultValue={field.value}
                          className="grid grid-cols-1 md:grid-cols-3 gap-4"
                          disabled={isLoading}
                        >
                          <FormItem>
                            <FormControl>
                              <RadioGroupItem value="audio" id="audio" className="sr-only" />
                            </FormControl>
                            <Label
                              htmlFor="audio"
                              className="flex flex-col items-center justify-between rounded-md border-2 border-muted bg-popover p-4 hover:bg-accent hover:text-accent-foreground peer-data-[state=checked]:border-primary [&:has([data-state=checked])]:border-primary cursor-pointer"
                            >
                              <Mic className="mb-3 h-6 w-6" />
                              Audio Documentary
                            </Label>
                          </FormItem>
                          <FormItem>
                            <FormControl>
                              <RadioGroupItem value="slideshow" id="slideshow" className="sr-only" />
                            </FormControl>
                            <Label
                              htmlFor="slideshow"
                              className="flex flex-col items-center justify-between rounded-md border-2 border-muted bg-popover p-4 hover:bg-accent hover:text-accent-foreground peer-data-[state=checked]:border-primary [&:has([data-state=checked])]:border-primary cursor-pointer"
                            >
                              <Clapperboard className="mb-3 h-6 w-6" />
                              Cinematic Scene
                            </Label>
                          </FormItem>
                           <FormItem>
                            <FormControl>
                              <RadioGroupItem value="video" id="video" className="sr-only" />
                            </FormControl>
                            <Label
                              htmlFor="video"
                              className="flex flex-col items-center justify-between rounded-md border-2 border-muted bg-popover p-4 hover:bg-accent hover:text-accent-foreground peer-data-[state=checked]:border-primary [&:has([data-state=checked])]:border-primary cursor-pointer"
                            >
                              <Video className="mb-3 h-6 w-6" />
                              Dynamic Video Clip
                            </Label>
                          </FormItem>
                        </RadioGroup>
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <Button type="submit" disabled={isLoading || !form.formState.isValid} size="lg" className="w-full">
                  {isLoading ? (
                    <>
                      <Sparkles className="mr-2 h-5 w-5 animate-spin" />
                      Generating...
                    </>
                  ) : (
                    <>
                      <Rabbit className="mr-2 h-5 w-5" />
                      Make Magic
                    </>
                  )}
                </Button>
            </CardContent>
             <CardFooter>
                <p className="text-xs text-muted-foreground">
                    Please be aware of AI content generation limitations. Generated content may be inaccurate or of variable quality. Avoid prompts that violate safety policies.
                </p>
            </CardFooter>
          </form>
        </Form>
      </Card>
    </div>
  );
}
