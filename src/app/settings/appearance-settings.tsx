
'use client';

import { useTheme } from 'next-themes';
import { useEffect, useState } from 'react';
import { Button } from '@/components/ui/button';
import { Check, Monitor, Moon, Sun, RotateCcw, Loader2 } from 'lucide-react';
import { cn } from '@/lib/utils';
import { toast } from 'sonner';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from '@/components/ui/alert-dialog';
import { z } from 'zod';
import { LOCAL_STORAGE_UI_COLOR_KEY, LOCAL_STORAGE_THEME_KEY } from '@/lib/constants';

const themes = [
    { name: 'Light', icon: Sun },
    { name: 'Dark', icon: Moon },
    { name: 'System', icon: Monitor },
];

const colors = [
    { name: 'default', primary: '263 87% 65%', accent: '173 95% 42%' },
    { name: 'rose', primary: '346.8 77.2% 49.8%', accent: '346.8 77.2% 49.8%' },
    { name: 'orange', primary: '24.6 95% 53.1%', accent: '24.6 95% 53.1%' },
    { name: 'green', primary: '142.1 76.2% 36.3%', accent: '142.1 76.2% 36.3%' },
    { name: 'blue', primary: '221.2 83.2% 53.3%', accent: '221.2 83.2% 53.3%' },
];

const ColorNameSchema = z.enum(colors.map(c => c.name) as [string, ...string[]]).default('default');

export function AppearanceSettings() {
  const { setTheme, theme } = useTheme();
  const [mounted, setMounted] = useState(false);
  const [isResetting, setIsResetting] = useState(false);
  const [selectedColor, setSelectedColor] = useState(colors[0]);

  useEffect(() => {
    let initialColor = colors[0];
    try {
        const storedColorName = localStorage.getItem(LOCAL_STORAGE_UI_COLOR_KEY);
        const validationResult = ColorNameSchema.safeParse(storedColorName);
        if (validationResult.success) {
            initialColor = colors.find(c => c.name === validationResult.data) || colors[0];
        } else if (storedColorName) {
            // If there's a value but it's invalid, remove it
            localStorage.removeItem(LOCAL_STORAGE_UI_COLOR_KEY);
        }
    } catch (error) {
        console.error("Failed to read appearance settings from localStorage:", error);
    }
    setSelectedColor(initialColor);
    setMounted(true);
  }, []);

  useEffect(() => {
    if (mounted) {
      document.documentElement.style.setProperty('--primary', selectedColor.primary);
      document.documentElement.style.setProperty('--accent', selectedColor.accent);
      try {
        localStorage.setItem(LOCAL_STORAGE_UI_COLOR_KEY, selectedColor.name);
      } catch (error) {
          console.error("Failed to save color preference to localStorage:", error);
      }
    }
  }, [selectedColor, mounted]);


  if (!mounted) {
    return null; 
  }

  const handleReset = () => {
    setIsResetting(true);
    try {
        setTheme('dark');
        setSelectedColor(colors[0]);
        localStorage.removeItem(LOCAL_STORAGE_UI_COLOR_KEY);
        localStorage.removeItem(LOCAL_STORAGE_THEME_KEY);
        toast.success("Preferences Reset", {
            description: "Appearance settings have been reset to default.",
        });
    } catch (error) {
        console.error("Failed to reset appearance settings:", error);
        toast.error("Reset Failed", {
            description: "Could not reset all appearance settings.",
        });
    } finally {
        setTimeout(() => setIsResetting(false), 500); // Give some feedback time
    }
  };

  return (
    <div className="space-y-8">
      <div>
        <h3 className="text-md font-medium mb-2">Theme</h3>
        <div className="grid grid-cols-3 gap-4">
          {themes.map((t) => (
            <Button
              key={t.name}
              variant="outline"
              className={cn(
                'h-auto py-4 flex flex-col items-center gap-2',
                theme === t.name.toLowerCase() && 'border-primary ring-2 ring-primary'
              )}
              onClick={() => setTheme(t.name.toLowerCase())}
              disabled={isResetting}
            >
              <t.icon className="h-5 w-5" />
              {t.name}
            </Button>
          ))}
        </div>
      </div>
      <div>
        <h3 className="text-md font-medium mb-2">Accent Color</h3>
        <div className="flex flex-wrap gap-3">
          {colors.map((color) => (
            <Button
              key={color.name}
              variant="outline"
              size="icon"
              className={cn(
                'h-10 w-10 rounded-full flex items-center justify-center',
                 selectedColor.name === color.name && 'ring-2 ring-offset-2 ring-primary ring-offset-background'
              )}
              style={{ backgroundColor: `hsl(${color.primary})` }}
              onClick={() => setSelectedColor(color)}
              disabled={isResetting}
            >
              {selectedColor.name === color.name && <Check className="h-5 w-5 text-primary-foreground" />}
               <span className="sr-only">{color.name}</span>
            </Button>
          ))}
        </div>
      </div>
      <div className="border-t pt-6">
        <AlertDialog>
          <AlertDialogTrigger asChild>
            <Button variant="ghost" disabled={isResetting}>
              {isResetting ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <RotateCcw className="mr-2 h-4 w-4" />}
              {isResetting ? 'Resetting...' : 'Reset to Defaults'}
            </Button>
          </AlertDialogTrigger>
          <AlertDialogContent>
            <AlertDialogHeader>
              <AlertDialogTitle>Are you sure?</AlertDialogTitle>
              <AlertDialogDescription>
                This will reset your theme and accent color preferences to the default settings.
              </AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
              <AlertDialogCancel>Cancel</AlertDialogCancel>
              <AlertDialogAction onClick={handleReset} disabled={isResetting}>
                {isResetting && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                Yes, reset
              </AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>
      </div>
    </div>
  );
}
