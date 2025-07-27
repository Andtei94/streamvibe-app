import LiveTvClient from './client';

export default function LiveTvPage() {
  return (
    <div className="container mx-auto py-10">
      <div className="mb-8">
        <h1 className="text-3xl font-bold font-headline">Live TV</h1>
        <p className="text-muted-foreground">
          Explore the interactive program guide and watch live channels.
        </p>
      </div>
      <LiveTvClient />
    </div>
  );
}
