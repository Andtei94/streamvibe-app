
import SubtitleToolsClient from './client';

export const metadata = {
    title: 'AI Subtitle Tools | Streamvibe',
    description: 'Select a local subtitle file (.vtt, .srt) to translate or synchronize its timings using AI.'
};

export default function SubtitleToolsPage() {
  return (
    <div className="container mx-auto py-10">
      <h1 className="text-3xl font-bold font-headline mb-2">AI Subtitle Tools</h1>
      <p className="text-muted-foreground mb-8 max-w-3xl">
        Select a local subtitle file (.vtt, .srt) to translate or synchronize its timings using AI.
      </p>
      <SubtitleToolsClient />
    </div>
  );
}
