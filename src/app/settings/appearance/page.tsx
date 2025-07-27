
import { AppearanceSettings } from '@/components/settings/appearance-settings';
import { TooltipProvider } from '@/components/ui/tooltip';

export const metadata = {
    title: 'Appearance Settings | Streamvibe',
    description: 'Customize the look and feel of the platform.'
};

export default function AppearancePage() {
  return (
    <TooltipProvider>
      <div className="container mx-auto py-10 max-w-4xl">
        <h1 className="text-3xl font-bold font-headline mb-2">Appearance Settings</h1>
        <p className="text-muted-foreground mb-8">
            Customize the theme and accent color of the platform to your liking.
        </p>
        <AppearanceSettings />
      </div>
    </TooltipProvider>
  );
}
