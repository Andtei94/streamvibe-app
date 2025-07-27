
/**
 * @fileOverview
 * This file contains the primary TypeScript interfaces used throughout the application,
 * ensuring data consistency between Firestore, AI flows, and React components.
 * It serves as the single source of truth for the shape of the data.
 */

import type { Timestamp } from "firebase/firestore";

export interface BrowseNavData {
  movieGenres: string[];
  tvShowGenres: string[];
  specialGenres: string[];
  studios: string[];
}

export interface Subtitle {
  lang: string;
  srclang: string;
  url: string;
  label?: string; // Optional label for display
}

export interface DubbedTrack {
  lang: string;
  url: string;
}

export interface Scene {
  imageUrl: string;
  text: string;
  duration: number;
}

export interface Program {
  startDateTime: string;
  endDateTime: string;
  title: string;
  description: string;
}

export interface LiveChannel {
  id: string;
  name: string;
  url: string;
  logoUrl: string;
  category: string;
  epg: Program[];
}

export interface Review {
  id: string; // Will be the UID of the user who wrote it
  authorName: string;
  rating: number; // 1-5
  text: string;
  createdAt: Timestamp;
  userId: string;
}

export interface Content {
  id: string;
  title: string;
  title_lowercase?: string;
  description: string;
  longDescription: string;
  type: 'movie' | 'tv-show' | 'music' | 'sports';
  genres: string[];
  actors: string[];
  directors: string[];
  releaseDate: string; // ISO 8601 string
  rating: string;
  duration: string;
  quality?: string;
  collection?: string;
  trailerUrl?: string;
  aiHint?: string;
  audioCodecs?: string[];
  featured: boolean;
  keywords?: string[];
  seasonNumber?: number;
  episodeNumber?: number;
  introStart?: number; // in seconds
  introEnd?: number; // in seconds
  
  // Playback specific
  imageUrl: string;
  videoUrl: string;
  canPlay: boolean;
  canDownload: boolean;
  subtitles: Subtitle[];
  dubbedAudioTracks?: DubbedTrack[];
  scenes?: Scene[]; // For image-sequence videos

  // Advanced Playback / DRM
  drm?: {
    type: 'widevine' | 'fairplay' | 'playready';
    licenseUrl: string;
    authToken?: string; // Optional auth token for the license server
  };

  // User interaction fields
  averageRating?: number;
  reviewCount?: number;

  // System fields
  status?: 'published' | 'review' | 'error' | 'processing';
  sourceStoragePath?: string; // The original path in Firebase Storage
  errorMessage?: string; // To store error messages on failed processing
}

export interface PlaybackProgress {
  id?: string; // Add id to be compatible with Content
  progressPercent: number; // Store as 0-100
  lastWatchedTimestamp: Timestamp;
  contentDuration: number;
  lastWatchedSeconds: number;
}

export type SubtitleColor = 'white' | 'black' | 'yellow';

export interface PlayerPreferences {
  volume: number; // 0 to 1
  isMuted: boolean;
  playbackRate: number; // e.g., 1, 1.5
  preferredSubtitleLang: string; // srclang
  preferredAudioLang: string; // 'original' or language code
  preferredQuality: string; // 'auto' or specific height
  autoplay: boolean;
  skipIntroDuration: number; // in seconds
  upNextCountdown: number; // in seconds
  seekInterval: number; // in seconds
  subtitleFontSize?: number; // percentage, e.g., 100
  subtitleTextColor?: SubtitleColor;
  subtitleBackgroundOpacity?: number; // 0 to 1
}

export type Voice = {
    name: string;
    ttsVoiceId: string; // This is the real ID for the TTS service (e.g., 'ro-RO-Wavenet-A')
    isCustom: boolean;
    createdAt?: Timestamp; // Firestore Timestamp
};

export type VoiceCategory = {
    categoryName: string;
    voices: Partial<Voice & { voiceId: string }>[]; // voiceId is the doc ID in Firestore
};
