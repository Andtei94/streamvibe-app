
'use client';

import { useLocalStorage } from '@/hooks/use-local-storage';
import type { PlayerPreferences, SubtitleColor } from '@/lib/types';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { useEffect, useState, useCallback } from 'react';
import { Skeleton } from '@/components/ui/skeleton';
import { Input } from '@/components/ui/input';
import { DEFAULT_PLAYER_PREFERENCES, LOCAL_STORAGE_PLAYER_PREFERENCES_KEY } from '@/lib/constants';
import { Slider } from '@/components/ui/slider';
import { Separator } from '@/components/ui/separator';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';

const languageOptions = [
    { value: 'off', label: 'Off' },
    { value: 'en', label: 'English' },
    { value: 'ro', label: 'Romanian' },
    { value: 'fr', label: 'French' },
    { value: 'de', label: 'German' },
    { value: 'es', label: 'Spanish' },
    { value: 'it', label: 'Italian' },
];

const audioLanguageOptions = [
    { value: 'original', label: 'Original' },
    { value: 'ro', label: 'Romanian' },
    { value: 'en', label: 'English' },
    { value: 'fr', label: 'French' },
    { value: 'de', label: 'German' },
    { value: 'es', label: 'Spanish' },
    { value: 'it', label: 'Italian' },
];

const qualityOptions = [
    { value: 'auto', label: 'Auto' },
    { value: '1080', label: '1080p' },
    { value: '720', label: '720p' },
    { value: '480', label: '480p' },
];

const subtitleFontSizeOptions = [
    { value: 100, label: 'Medium' },
    { value: 75, label: 'Small' },
    { value: 150, label: 'Large' },
    { value: 200, label: 'Extra Large' },
];

const subtitleTextColorOptions: { value: SubtitleColor, label: string }[] = [
    { value: 'white', label: 'White' },
    { value: 'yellow', label: 'Yellow' },
    { value: 'black', label: 'Black' },
];


export function PlayerSettings() {
  const [preferences, setPreferences] = useLocalStorage<PlayerPreferences>(LOCAL_STORAGE_PLAYER_PREFERENCES_KEY, DEFAULT_PLAYER_PREFERENCES);
  const [isClient, setIsClient] = useState(false);

  useEffect(() => {
    setIsClient(true);
  }, []);
  
  const handlePreferenceChange = useCallback((key: keyof PlayerPreferences, value: any) => {
    setPreferences(prev => ({ ...prev, [key]: value }));
  }, [setPreferences]);
  
  const handleNumericChange = (key: keyof PlayerPreferences, value: string) => {
    const numValue = parseInt(value, 10);
    if (!isNaN(numValue) && numValue >= 0) {
        handlePreferenceChange(key, numValue);
    } else if (value === '') {
        handlePreferenceChange(key, DEFAULT_PLAYER_PREFERENCES[key]);
    }
  };


  if (!isClient) {
    return (
      <div className="space-y-6">
        <Skeleton className="h-20 w-full" />
        <Skeleton className="h-20 w-full" />
        <Skeleton className="h-20 w-full" />
        <Skeleton className="h-20 w-full" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader><CardTitle className="text-lg">General</CardTitle></CardHeader>
        <CardContent>
          <div className="flex items-center justify-between">
              <div>
                <h4 className="font-medium">Autoplay</h4>
                <p className="text-sm text-muted-foreground">
                  Automatically play the next video in a collection.
                </p>
              </div>
              <Switch
                checked={preferences.autoplay}
                onCheckedChange={(checked) => handlePreferenceChange('autoplay', checked)}
                aria-label="Toggle autoplay"
              />
          </div>
        </CardContent>
      </Card>
      <Card>
         <CardHeader><CardTitle className="text-lg">Volume &amp; Language</CardTitle></CardHeader>
         <CardContent className="space-y-4">
            <div className="flex items-center justify-between">
                <Label>Default Volume</Label>
                <div className="flex items-center gap-2 w-[180px]">
                    <Slider value={[preferences.volume]} max={1} min={0} step={0.05} onValueChange={(v) => handlePreferenceChange('volume', v[0])} />
                    <span className="text-sm font-mono w-12 text-right">{Math.round(preferences.volume * 100)}%</span>
                </div>
            </div>
            <div className="flex items-center justify-between">
                <div>
                <h4 className="font-medium">Preferred Quality</h4>
                <p className="text-sm text-muted-foreground">
                    Select the default playback quality (for HLS streams).
                </p>
                </div>
                <Select 
                    value={preferences.preferredQuality} 
                    onValueChange={(value) => handlePreferenceChange('preferredQuality', value)}
                >
                    <SelectTrigger className="w-[180px]">
                        <SelectValue placeholder="Select quality" />
                    </SelectTrigger>
                    <SelectContent>
                        {qualityOptions.map(opt => (
                            <SelectItem key={opt.value} value={opt.value}>{opt.label}</SelectItem>
                        ))}
                    </SelectContent>
                </Select>
            </div>
            <div className="flex items-center justify-between">
                <div>
                <h4 className="font-medium">Preferred Audio Language</h4>
                <p className="text-sm text-muted-foreground">
                    Select the default language for the audio track.
                </p>
                </div>
                <Select 
                    value={preferences.preferredAudioLang} 
                    onValueChange={(value) => handlePreferenceChange('preferredAudioLang', value)}
                >
                    <SelectTrigger className="w-[180px]">
                        <SelectValue placeholder="Select language" />
                    </SelectTrigger>
                    <SelectContent>
                        {audioLanguageOptions.map(opt => (
                            <SelectItem key={opt.value} value={opt.value}>{opt.label}</SelectItem>
                        ))}
                    </SelectContent>
                </Select>
            </div>
            <div className="flex items-center justify-between">
                <div>
                <h4 className="font-medium">Preferred Subtitle Language</h4>
                <p className="text-sm text-muted-foreground">
                    Select the default language for subtitles, if available.
                </p>
                </div>
                <Select 
                    value={preferences.preferredSubtitleLang} 
                    onValueChange={(value) => handlePreferenceChange('preferredSubtitleLang', value)}
                >
                    <SelectTrigger className="w-[180px]">
                        <SelectValue placeholder="Select language" />
                    </SelectTrigger>
                    <SelectContent>
                        {languageOptions.map(opt => (
                            <SelectItem key={opt.value} value={opt.value}>{opt.label}</SelectItem>
                        ))}
                    </SelectContent>
                </Select>
            </div>
         </CardContent>
      </Card>
      <Card>
          <CardHeader><CardTitle className="text-lg">Subtitle Appearance</CardTitle></CardHeader>
           <CardContent className="space-y-4">
               <div className="flex items-center justify-between">
                    <Label>Font Size</Label>
                    <Select 
                        onValueChange={(v) => handlePreferenceChange('subtitleFontSize', Number(v))} 
                        value={String(preferences.subtitleFontSize ?? DEFAULT_PLAYER_PREFERENCES.subtitleFontSize)}
                    >
                        <SelectTrigger className="w-[180px]"><SelectValue placeholder="Font Size" /></SelectTrigger>
                        <SelectContent>
                            {subtitleFontSizeOptions.map(opt => <SelectItem key={opt.value} value={String(opt.value)}>{opt.label}</SelectItem>)}
                        </SelectContent>
                    </Select>
               </div>
               <div className="flex items-center justify-between">
                    <Label>Text Color</Label>
                     <Select onValueChange={(v) => handlePreferenceChange('subtitleTextColor', v as SubtitleColor)} value={preferences.subtitleTextColor ?? DEFAULT_PLAYER_PREFERENCES.subtitleTextColor}>
                        <SelectTrigger className="w-[180px]"><SelectValue placeholder="Text Color" /></SelectTrigger>
                        <SelectContent>
                           {subtitleTextColorOptions.map(opt => <SelectItem key={opt.value} value={opt.value}>{opt.label}</SelectItem>)}
                        </SelectContent>
                    </Select>
               </div>
                <div className="flex items-center justify-between">
                    <Label>Background Opacity</Label>
                    <div className="flex items-center gap-2 w-[180px]">
                        <Slider value={[preferences.subtitleBackgroundOpacity ?? 0.5]} max={1} min={0} step={0.1} onValueChange={(v) => handlePreferenceChange('subtitleBackgroundOpacity', v[0])} />
                        <span className="text-sm font-mono w-12 text-right">{Math.round((preferences.subtitleBackgroundOpacity ?? 0.5) * 100)}%</span>
                    </div>
               </div>
           </CardContent>
      </Card>
      <Card>
         <CardHeader><CardTitle className="text-lg">Playback Timings</CardTitle></CardHeader>
         <CardContent>
            <div className="flex items-center justify-between">
                <div>
                    <h5 className="font-medium">Seek Interval</h5>
                    <p className="text-sm text-muted-foreground">
                        Set seconds to jump with rewind/fast-forward controls.
                    </p>
                </div>
                <Input
                type="text"
                inputMode="numeric"
                pattern="[0-9]*"
                className="w-24"
                value={preferences.seekInterval}
                onChange={(e) => handleNumericChange('seekInterval', e.target.value)}
                />
            </div>
         </CardContent>
      </Card>
    </div>
  );
}
