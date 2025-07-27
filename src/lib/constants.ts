
import type { PlayerPreferences } from './types';

export const CAROUSEL_ITEM_LIMIT = 12;
export const STORAGE_PAGE_SIZE = 15;
export const BROWSE_PAGE_SIZE = 50;
export const INITIAL_RECOMMENDATIONS_LIMIT = 50;

export const LIVE_TV_CATEGORIES = [
  'News', 
  'Sports', 
  'Movies', 
  'Entertainment', 
  'Kids', 
  'Documentary', 
  'Music', 
  'General'
];

export const EPG_PIXELS_PER_MINUTE = 4;
export const GUIDE_HOURS = 6;
export const DEFAULT_POSTER_URL = 'https://placehold.co/300x450.png';

export const DEFAULT_UP_NEXT_COUNTDOWN_SECONDS = 10;
export const DEFAULT_SKIP_INTRO_SECONDS = 5;
export const DEFAULT_SEEK_INTERVAL_SECONDS = 10;
export const MAX_FILE_SIZE = 15 * 1024 * 1024 * 1024; // 15 GB

export const DEFAULT_PLAYER_PREFERENCES: PlayerPreferences = {
  volume: 1,
  isMuted: false,
  playbackRate: 1,
  preferredSubtitleLang: 'off',
  preferredAudioLang: 'original',
  preferredQuality: 'auto',
  autoplay: true,
  skipIntroDuration: DEFAULT_SKIP_INTRO_SECONDS,
  upNextCountdown: DEFAULT_UP_NEXT_COUNTDOWN_SECONDS,
  seekInterval: DEFAULT_SEEK_INTERVAL_SECONDS,
  subtitleFontSize: 100,
  subtitleTextColor: 'white',
  subtitleBackgroundOpacity: 0.5,
};

export const LOCAL_STORAGE_PLAYER_PREFERENCES_KEY = 'player-preferences';
export const LOCAL_STORAGE_UI_COLOR_KEY = 'ui-color';
export const LOCAL_STORAGE_THEME_KEY = 'theme';
