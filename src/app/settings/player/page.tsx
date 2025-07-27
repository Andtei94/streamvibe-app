
import { PlayerSettings } from '@/components/settings/player-settings';

export const metadata = {
    title: 'Playback Settings | Streamvibe',
    description: 'Customize your viewing experience with autoplay, quality, and language settings.'
};

export default function PlayerSettingsPage() {
  return (
    <div className="container mx-auto py-10 max-w-4xl">
        <h1 className="text-3xl font-bold font-headline mb-2">Playback Settings</h1>
        <p className="text-muted-foreground mb-8">
          Customize your viewing experience with autoplay, quality, and language settings. Your preferences will be saved locally in your browser.
        </p>
        <PlayerSettings />
    </div>
  );
}
