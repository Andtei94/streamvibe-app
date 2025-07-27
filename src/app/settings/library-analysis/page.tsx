
import LibraryAnalysisClient from './client';

export const metadata = {
    title: 'Library Analysis | Streamvibe',
    description: 'Get an AI-powered overview of your content library. This tool analyzes genres, release dates, and content types to provide statistics and insights.'
};

export default function LibraryAnalysisPage() {
  return (
    <div className="container mx-auto py-10">
      <h1 className="text-3xl font-bold font-headline mb-2">Library Analysis</h1>
      <p className="text-muted-foreground mb-8 max-w-3xl">
        Get an AI-powered overview of your content library. This tool analyzes genres, release dates, and content types to provide statistics and insights.
      </p>
      <LibraryAnalysisClient />
    </div>
  );
}
