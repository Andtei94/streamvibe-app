
'use client';

import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { db } from '@/lib/firebase';
import { collection, addDoc, serverTimestamp } from 'firebase/firestore';
import { CheckCircle, AlertCircle, Loader } from 'lucide-react';

export default function DbTestPage() {
  const [status, setStatus] = useState<'idle' | 'loading' | 'success' | 'error'>('idle');
  const [errorDetails, setErrorDetails] = useState<string | null>(null);

  const handleWriteTest = async () => {
    setStatus('loading');
    setErrorDetails(null);
    try {
      const testCollectionRef = collection(db, 'debug_tests');
      await addDoc(testCollectionRef, {
        message: 'Hello, Firestore!',
        createdAt: serverTimestamp(),
      });
      setStatus('success');
    } catch (e: any) {
      console.error("Firestore Write Failed:", e);
      setStatus('error');
      
      let details = `Code: ${e.code}\nMessage: ${e.message}`;
      if (e.code === 'permission-denied') {
          details += `\n\nThis is a permissions issue. Please check your Firestore security rules in the Firebase Console. Ensure that your rules allow write access to the 'debug_tests' collection.`;
      } else if (e.code === 'failed-precondition' && e.message.includes('indexes')) {
          details += `\n\nThis error indicates a missing Firestore index. Please check the Firebase Console for a link to create the required index.`;
      }
      
      setErrorDetails(details);
    }
  };

  return (
    <div className="container mx-auto py-10">
      <h1 className="text-3xl font-bold font-headline mb-4">Firestore Database Connection Test</h1>
      <p className="text-muted-foreground mb-8 max-w-2xl">
        This page performs a single, direct action: it attempts to write a new document to a test collection in your Firestore database.
        This helps isolate whether the issue is with the database connection and permissions, separate from any application logic.
      </p>
      <Card className="max-w-2xl">
        <CardHeader>
          <CardTitle>Run Write Test</CardTitle>
          <CardDescription>Click the button below to attempt the write operation.</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <Button onClick={handleWriteTest} disabled={status === 'loading'} size="lg">
            {status === 'loading' && <Loader className="mr-2 h-5 w-5 animate-spin" />}
            Attempt to Write to Firestore
          </Button>

          {status === 'success' && (
            <Alert className="border-green-500/50 text-green-700 dark:text-green-400 [&>svg]:text-green-600">
              <CheckCircle className="h-4 w-4" />
              <AlertTitle>Success!</AlertTitle>
              <AlertDescription>
                A document was successfully written to the 'debug_tests' collection. This confirms your connection and permissions are working correctly from the browser.
              </AlertDescription>
            </Alert>
          )}

          {status === 'error' && (
            <Alert variant="destructive">
              <AlertCircle className="h-4 w-4" />
              <AlertTitle>Write Operation Failed</AlertTitle>
              <AlertDescription>
                The application could not write to the database. This confirms a permissions or configuration issue.
                <pre className="mt-2 whitespace-pre-wrap rounded-md bg-muted p-4 font-mono text-xs text-muted-foreground">{errorDetails}</pre>
              </AlertDescription>
            </Alert>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
