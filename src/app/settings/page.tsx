
'use client';

import Link from 'next/link';
import { Card, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { ChevronRight, Languages, Palette, BrainCircuit, PlaySquare, Beaker, FileCode, User } from 'lucide-react';

export default function SettingsPage() {
  return (
    <div className="container mx-auto py-10">
      <h1 className="text-3xl font-bold font-headline mb-8">Settings & Tools</h1>
      <div className="grid gap-8 max-w-4xl">
        
        <div className="space-y-4">
           <h2 className="text-xl font-bold font-headline">User Preferences</h2>
            <Link href="/settings/appearance">
              <Card className="hover:bg-muted/50 transition-colors">
                <CardHeader className="flex flex-row items-center justify-between p-4">
                  <div className="flex items-center gap-4">
                    <Palette className="h-8 w-8 text-muted-foreground" />
                    <div>
                      <CardTitle className="text-lg">Appearance</CardTitle>
                      <CardDescription className="mt-1">Customize the theme and accent color of the platform.</CardDescription>
                    </div>
                  </div>
                  <ChevronRight className="h-5 w-5 text-muted-foreground" />
                </CardHeader>
              </Card>
            </Link>

             <Link href="/settings/player">
              <Card className="hover:bg-muted/50 transition-colors">
                <CardHeader className="flex flex-row items-center justify-between p-4">
                  <div className="flex items-center gap-4">
                    <PlaySquare className="h-8 w-8 text-muted-foreground" />
                    <div>
                      <CardTitle className="text-lg">Playback</CardTitle>
                      <CardDescription className="mt-1">Customize your viewing experience with autoplay, quality, and language settings.</CardDescription>
                    </div>
                  </div>
                   <ChevronRight className="h-5 w-5 text-muted-foreground" />
                </CardHeader>
              </Card>
            </Link>
        </div>

         <div>
            <h2 className="text-xl font-bold font-headline mb-4">AI &amp; Developer Tools</h2>
            <div className="grid gap-4">
               <Link href="/settings/code-analysis">
                    <Card className="hover:bg-muted/50 transition-colors">
                    <CardHeader className="flex flex-row items-center justify-between p-4">
                        <div className="flex items-center gap-4">
                        <FileCode className="h-8 w-8 text-muted-foreground" />
                            <div>
                            <CardTitle className="text-lg">Code Health Dashboard</CardTitle>
                            <CardDescription className="mt-1">Analyze and fix issues in your codebase with AI.</CardDescription>
                            </div>
                        </div>
                        <ChevronRight className="h-5 w-5 text-muted-foreground" />
                    </CardHeader>
                    </Card>
              </Link>
              <Link href="/settings/library-analysis">
                <Card className="hover:bg-muted/50 transition-colors">
                  <CardHeader className="flex flex-row items-center justify-between p-4">
                    <div className="flex items-center gap-4">
                      <BrainCircuit className="h-8 w-8 text-muted-foreground" />
                        <div>
                          <CardTitle className="text-lg">AI Library Analysis</CardTitle>
                          <CardDescription className="mt-1">Get AI-generated statistics about your content library.</CardDescription>
                        </div>
                    </div>
                    <ChevronRight className="h-5 w-5 text-muted-foreground" />
                  </CardHeader>
                </Card>
              </Link>
              <Link href="/settings/subtitle-tools">
                <Card className="hover:bg-muted/50 transition-colors">
                  <CardHeader className="flex flex-row items-center justify-between p-4">
                    <div className="flex items-center gap-4">
                      <Languages className="h-8 w-8 text-muted-foreground" />
                        <div>
                          <CardTitle className="text-lg">AI Subtitle Tools</CardTitle>
                          <CardDescription className="mt-1">Translate or synchronize subtitle files with AI.</CardDescription>
                        </div>
                    </div>
                    <ChevronRight className="h-5 w-5 text-muted-foreground" />
                  </CardHeader>
                </Card>
              </Link>
                 <Link href="/settings/diagnostics">
                <Card className="hover:bg-muted/50 transition-colors">
                  <CardHeader className="flex flex-row items-center justify-between p-4">
                    <div className="flex items-center gap-4">
                      <Beaker className="h-8 w-8 text-muted-foreground" />
                        <div>
                          <CardTitle className="text-lg">Platform Diagnostics</CardTitle>
                          <CardDescription className="mt-1">Run tests to verify platform configuration and connections.</CardDescription>
                        </div>
                    </div>
                    <ChevronRight className="h-5 w-5 text-muted-foreground" />
                  </CardHeader>
                </Card>
              </Link>
            </div>
         </div>
      </div>
    </div>
  );
}
