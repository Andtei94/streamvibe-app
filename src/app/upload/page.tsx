
import UploadClient from './client';

export default function UploadPage() {
  return (
    <div className="container mx-auto py-10">
       <h1 className="text-3xl font-bold font-headline mb-2 text-center">Add New Content</h1>
        <p className="text-muted-foreground mb-8 max-w-xl mx-auto text-center">
          Upload media files from your device or add them from a URL. AI will automatically generate metadata.
        </p>
      <UploadClient />
    </div>
  );
}
