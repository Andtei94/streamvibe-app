
import BatchImportClient from './client';

export default function BatchImportPage() {
  return (
    <div className="container mx-auto py-10">
      <h1 className="text-3xl font-bold font-headline mb-2">Batch AI Import</h1>
      <p className="text-muted-foreground mb-8 max-w-2xl">
        Add multiple movies or TV shows at once. Paste a list of titles, and the AI will automatically generate all necessary metadata and posters for each one.
      </p>
      <BatchImportClient />
    </div>
  );
}
