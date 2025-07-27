
'use client';

import { useState } from 'react';
import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from '@/components/ui/dialog';
import { generateTrivia } from '@/ai/actions';
import type { GenerateTriviaOutput } from '@/ai/schemas';
import { Lightbulb, Sparkles, Loader2 } from 'lucide-react';
import type { Content } from '@/lib/types';
import { toast } from 'sonner';
import { logger } from '@/lib/logger';

interface TriviaButtonProps {
  content: Content;
}

export function TriviaButton({ content }: TriviaButtonProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [triviaData, setTriviaData] = useState<GenerateTriviaOutput | null>(null);
  const [isLoading, setIsLoading] = useState(false);

  const handleFetchTrivia = async () => {
    if (triviaData) {
      setIsOpen(true);
      return;
    }

    setIsLoading(true);
    setIsOpen(true);

    try {
      const result = await generateTrivia({
        title: content.title,
        context: content.description,
      });
      setTriviaData(result);
    } catch (error) {
      logger.error({ error, contentId: content.id }, 'Failed to generate trivia');
      toast.error('An error occurred', {
        description: 'Could not fetch trivia for this title.',
      });
      setIsOpen(false);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <>
      <Button size="lg" variant="secondary" className="w-full font-semibold" onClick={handleFetchTrivia} disabled={isLoading}>
        {isLoading ? <Loader2 className="mr-2 h-5 w-5 animate-spin" /> : <Lightbulb className="mr-2 h-5 w-5" />}
        Trivia
      </Button>

      <Dialog open={isOpen} onOpenChange={setIsOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Lightbulb /> Trivia for {content.title}
            </DialogTitle>
            <DialogDescription>
              Interesting facts and behind-the-scenes details.
            </DialogDescription>
          </DialogHeader>
          <div className="py-4">
            {isLoading ? (
              <div className="flex items-center justify-center space-x-2 text-muted-foreground">
                <Sparkles className="h-5 w-5 animate-spin" />
                <span>Generating trivia...</span>
              </div>
            ) : (
              <ul className="space-y-4 list-disc pl-5 text-sm">
                {triviaData?.trivia.map((fact, index) => (
                  <li key={index}>{fact}</li>
                ))}
              </ul>
            )}
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setIsOpen(false)}>Close</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}
