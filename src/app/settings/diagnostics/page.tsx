
import 'server-only';
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from '@/components/ui/card';
import Link from 'next/link';
import { Button } from '@/components/ui/button';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { FileKey, Beaker, CheckCircle, AlertTriangle } from 'lucide-react';
import { serviceAccountError } from '@/lib/service-account';


export const metadata = {
    title: 'Platform Diagnostics | Streamvibe',
    description: 'Use these tools to verify your connection to Firebase services and perform basic code analysis.'
};

export default function DiagnosticsPage() {
  return (
    <div className="container mx-auto py-10 space-y-8">
      <div>
        <h1 className="text-3xl font-bold font-headline mb-2">Platform Diagnostics</h1>
        <p className="text-muted-foreground max-w-3xl">
          Use these tools to verify your connection to Firebase services and perform basic code analysis.
        </p>
      </div>

      <Card>
        <CardHeader>
          <div className="flex items-start gap-4">
             <div className="p-2 bg-blue-500/10 rounded-lg">
                <FileKey className="h-6 w-6 text-blue-500" />
              </div>
            <div>
              <CardTitle>Firebase Admin SDK Setup</CardTitle>
              <CardDescription>
                This enables server-side administrative functions like making a user an administrator.
              </CardDescription>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          {serviceAccountError ? (
             <Alert variant="destructive">
                <AlertTriangle className="h-4 w-4" />
                <AlertTitle>Configuration Required</AlertTitle>
                <AlertDescription>
                  <pre className="mt-2 whitespace-pre-wrap rounded-md bg-muted p-3 font-mono text-xs text-muted-foreground">{serviceAccountError}</pre>
                </AlertDescription>
            </Alert>
          ) : (
             <Alert className="border-green-500/50 text-green-700 dark:text-green-400 [&>svg]:text-green-600">
                <CheckCircle className="h-4 w-4" />
                <AlertTitle>Configuration Complete</AlertTitle>
                <AlertDescription>
                    The Firebase Admin SDK is configured correctly. Admin features are enabled.
                </AlertDescription>
            </Alert>
          )}
        </CardContent>
      </Card>
      
      <Card>
        <CardHeader>
          <div className="flex items-start gap-4">
             <div className="p-2 bg-green-500/10 rounded-lg">
                <Beaker className="h-6 w-6 text-green-500" />
              </div>
            <div>
                <CardTitle>Database Connection Test</CardTitle>
                <CardDescription>
                    This performs a direct write to Firestore to verify your environment variables and security rules are correctly configured for database access.
                </CardDescription>
            </div>
          </div>
        </CardHeader>
        <div className="p-6 pt-0">
          <Button asChild>
            <Link href="/debug/db-test">Run Database Test</Link>
          </Button>
        </div>
      </Card>

    </div>
  );
}
