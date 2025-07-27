
'use client';

import React, {
  useEffect,
  useRef,
  useReducer,
  useCallback,
  useMemo,
  useState,
} from 'react';
import Hls from 'hls.js';
import {
  Play,
  Pause,
  Volume2,
  Volume1,
  VolumeX,
  Maximize,
  Minimize,
  FastForward,
  Rewind,
  Settings,
  PictureInPicture,
  Loader2,
  AlertTriangle,
  RotateCcw,
  SkipForward,
  Check,
  AudioLines,
  Languages,
  VideoOff,
  Timer,
  X,
  ChevronLeft,
  ChevronRight,
  Sun,
  Download,
  Cast,
} from 'lucide-react';
import { useRouter, useSearchParams } from 'next/navigation';
import type { Content, PlayerPreferences, Subtitle, DubbedTrack, PlaybackProgress } from '@/lib/types';
import { Slider } from '@/components/ui/slider';
import { Button } from '@/components/ui/button';
import { useLocalStorage } from '@/hooks/use-local-storage';
import { DEFAULT_PLAYER_PREFERENCES } from '@/lib/constants';
import { cn } from '@/lib/utils';
import Image from 'next/image';
import { Label } from './ui/label';
import { toast } from 'sonner';
import { Separator } from './ui/separator';
import { Input } from './ui/input';
import { ScrollArea } from './ui/scroll-area';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';
import { synchronizeSubtitles, translateSubtitles, fetchUrlContent } from '@/ai/actions';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from './ui/select';
import { usePlaybackProgress } from '@/hooks/use-playback-progress';
import { useIsMobile } from '@/hooks/use-mobile';
import { handleCast, handleDownloadForOffline, initializeShakaPlayer } from '@/lib/advanced-features';
import { Popover, PopoverContent, PopoverTrigger } from './ui/popover';
import { CodecBadge } from './codec-badge';
import { logger } from '@/lib/logger';
import shaka from 'shaka-player';

type OSDState = { type: 'play' | 'pause' | 'seek-forward' | 'seek-backward' | 'volume' | 'brightness'; key: number };

type VTTThumbCue = {
  startTime: number;
  endTime: number;
  text: string;
};

type PlayerState = {
  isPlaying: boolean;
  isReady: boolean;
  progress: number;
  duration: number;
  volume: number;
  lastNonMuteVolume: number;
  isMuted: boolean;
  playbackRate: number;
  brightness: number;
  isFullscreen: boolean;
  isInPip: boolean;
  showControls: boolean;
  isSettingsOpen: boolean;
  activeSubtitleLang: string;
  activeAudioTrack: string;
  showSkipIntro: boolean;
  isLoading: boolean;
  error: { message: string; canRetry: boolean } | null;
  upNextState: 'hidden' | 'visible' | 'countdown';
  upNextCountdown: number;
  availableSubtitles: Subtitle[];
  availableDubbedTracks: DubbedTrack[];
  osd: OSDState | null;
  vttThumbs: VTTThumbCue[];
  isHls: boolean;
  hlsInstance: Hls | null;
  shakaPlayer: shaka.Player | null;
  qualityLevels: { height: number; bitrate: number }[];
  hlsAudioTracks: { id: number; name: string }[];
  shakaAudioTracks: shaka.extern.Track[];
  shakaVideoTracks: shaka.extern.Track[];
  currentQualityLevel: number;
  currentHlsAudioTrack: number;
  currentShakaAudioTrackId: number | null;
  currentShakaVideoTrackId: number | null;
};

type PlayerAction =
  | { type: 'RESET_PLAYER'; payload: { preferences: PlayerPreferences; content: Content } }
  | { type: 'PLAYER_READY'; payload: { duration: number } }
  | { type: 'PLAY' }
  | { type: 'PAUSE' }
  | { type: 'TIME_UPDATE'; payload: { progress: number; showSkipIntro: boolean } }
  | { type: 'SEEK'; payload: { time: number } }
  | { type: 'VOLUME_CHANGE'; payload: { volume: number } }
  | { type: 'MUTE_TOGGLE' }
  | { type: 'RATE_CHANGE'; payload: { rate: number } }
  | { type: 'BRIGHTNESS_CHANGE'; payload: number }
  | { type: 'FULLSCREEN_CHANGE'; payload: { isFullscreen: boolean } }
  | { type: 'PIP_CHANGE'; payload: { isInPip: boolean } }
  | { type: 'SUBTITLE_CHANGE'; payload: { lang: string } }
  | { type: 'AUDIO_TRACK_CHANGE'; payload: { lang: string } }
  | { type: 'SET_AVAILABLE_SUBTITLES'; payload: Subtitle[] }
  | { type: 'ADD_SUBTITLE'; payload: Subtitle }
  | { type: 'REMOVE_SUBTITLE'; payload: { srclang: string } }
  | { type: 'TOGGLE_CONTROLS'; payload: { show: boolean } }
  | { type: 'TOGGLE_SETTINGS' }
  | { type: 'BUFFERING_START' }
  | { type: 'BUFFERING_END' }
  | { type: 'ERROR'; payload: { message: string; canRetry: boolean } }
  | { type: 'RETRY_PLAYBACK' }
  | { type: 'ENDED' }
  | { type: 'START_UP_NEXT' }
  | { type: 'UP_NEXT_TICK' }
  | { type: 'CANCEL_UP_NEXT' }
  | { type: 'SHOW_OSD'; payload: OSDState['type'] | null }
  | { type: 'SET_VTT_THUMBS'; payload: VTTThumbCue[] }
  | { type: 'HLS_INIT'; payload: { hls: Hls } }
  | { type: 'SHAKA_INIT'; payload: { player: shaka.Player } }
  | { type: 'SHAKA_TRACKS_LOADED'; payload: { audio: shaka.extern.Track[], video: shaka.extern.Track[] } }
  | { type: 'SET_SHAKA_AUDIO_TRACK'; payload: number }
  | { type: 'SET_SHAKA_VIDEO_TRACK'; payload: number }
  | { type: 'HLS_LEVELS_LOADED'; payload: { levels: any[] } }
  | { type: 'HLS_AUDIO_TRACKS_LOADED'; payload: { tracks: any[] } }
  | { type: 'SET_QUALITY'; payload: number }
  | { type: 'SET_HLS_AUDIO_TRACK'; payload: number }
  | { type: 'DESTROY_PLAYERS' };


function getInitialState(preferences: PlayerPreferences, content: Content): PlayerState {
  return {
    isPlaying: false,
    isReady: false,
    progress: 0,
    duration: 0,
    volume: preferences.volume,
    lastNonMuteVolume: preferences.volume > 0.1 ? preferences.volume : 0.5,
    isMuted: preferences.isMuted,
    playbackRate: preferences.playbackRate,
    brightness: 1,
    isFullscreen: false,
    isInPip: false,
    showControls: true,
    isSettingsOpen: false,
    activeSubtitleLang: preferences.preferredSubtitleLang,
    activeAudioTrack: preferences.preferredAudioLang,
    availableSubtitles: content.subtitles || [],
    availableDubbedTracks: content.dubbedAudioTracks || [],
    showSkipIntro: false,
    isLoading: true,
    error: null,
    upNextState: 'hidden',
    upNextCountdown: preferences.upNextCountdown,
    osd: null,
    vttThumbs: [],
    isHls: false,
    hlsInstance: null,
    shakaPlayer: null,
    qualityLevels: [],
    hlsAudioTracks: [],
    shakaAudioTracks: [],
    shakaVideoTracks: [],
    currentQualityLevel: -1,
    currentHlsAudioTrack: -1,
    currentShakaAudioTrackId: null,
    currentShakaVideoTrackId: null,
  };
}

function playerReducer(state: PlayerState, action: PlayerAction): PlayerState {
  switch (action.type) {
    case 'RESET_PLAYER': return getInitialState(action.payload.preferences, action.payload.content);
    case 'PLAYER_READY': return { ...state, isReady: true, duration: action.payload.duration, isLoading: false };
    case 'PLAY': return { ...state, isPlaying: true, showControls: false, isSettingsOpen: false, osd: { type: 'play', key: Date.now() } };
    case 'PAUSE': return { ...state, isPlaying: false, showControls: true, osd: { type: 'pause', key: Date.now() } };
    case 'TIME_UPDATE': return { ...state, progress: action.payload.progress, showSkipIntro: action.payload.showSkipIntro };
    case 'SEEK': return { ...state, progress: action.payload.time };
    case 'VOLUME_CHANGE': return { ...state, volume: action.payload.volume, isMuted: action.payload.volume === 0, lastNonMuteVolume: action.payload.volume > 0 ? action.payload.volume : state.lastNonMuteVolume, osd: { type: 'volume', key: Date.now() } };
    case 'MUTE_TOGGLE':
      const newIsMuted = !state.isMuted;
      const newVolume = newIsMuted ? 0 : state.lastNonMuteVolume;
      return { ...state, isMuted: newIsMuted, volume: newVolume, osd: { type: 'volume', key: Date.now() } };
    case 'RATE_CHANGE': return { ...state, playbackRate: action.payload.rate };
    case 'BRIGHTNESS_CHANGE': return { ...state, brightness: action.payload, osd: { type: 'brightness', key: Date.now() } };
    case 'FULLSCREEN_CHANGE': return { ...state, isFullscreen: action.payload.isFullscreen };
    case 'PIP_CHANGE': return { ...state, isInPip: action.payload.isInPip };
    case 'SUBTITLE_CHANGE': return { ...state, activeSubtitleLang: action.payload.lang };
    case 'AUDIO_TRACK_CHANGE': return { ...state, activeAudioTrack: action.payload.lang };
    case 'SET_AVAILABLE_SUBTITLES': return { ...state, availableSubtitles: action.payload };
    case 'ADD_SUBTITLE':
      if (state.availableSubtitles.some(sub => sub.srclang === action.payload.srclang)) {
        return state;
      }
      return { ...state, availableSubtitles: [...state.availableSubtitles, action.payload] };
    case 'REMOVE_SUBTITLE':
      return { ...state, availableSubtitles: state.availableSubtitles.filter(sub => sub.srclang !== action.payload.srclang) };
    case 'TOGGLE_CONTROLS': return { ...state, showControls: state.upNextState !== 'hidden' ? false : state.isPlaying ? action.payload.show : true };
    case 'TOGGLE_SETTINGS': return { ...state, isSettingsOpen: !state.isSettingsOpen };
    case 'BUFFERING_START': return { ...state, isLoading: true };
    case 'BUFFERING_END': return { ...state, isLoading: false };
    case 'ERROR': return { ...state, error: action.payload, isLoading: false, isPlaying: false, showControls: true };
    case 'RETRY_PLAYBACK': return { ...state, error: null, isLoading: true };
    case 'ENDED': return { ...state, isPlaying: false, progress: state.duration, showControls: state.upNextState !== 'hidden' ? false : true };
    case 'START_UP_NEXT': return { ...state, upNextState: 'visible', showControls: false, isSettingsOpen: false };
    case 'UP_NEXT_TICK': return { ...state, upNextCountdown: Math.max(0, state.upNextCountdown - 1) };
    case 'CANCEL_UP_NEXT': return { ...state, upNextState: 'hidden' };
    case 'SHOW_OSD': 
        if (!action.payload) return { ...state, osd: null };
        return { ...state, osd: { type: action.payload, key: Date.now() } };
    case 'SET_VTT_THUMBS': return { ...state, vttThumbs: action.payload };
    case 'HLS_INIT': return { ...state, isHls: true, hlsInstance: action.payload.hls };
    case 'SHAKA_INIT': return { ...state, shakaPlayer: action.payload.player };
    case 'SHAKA_TRACKS_LOADED':
        const audioTracks = action.payload.audio;
        const videoTracks = action.payload.video;
        return { 
            ...state, 
            shakaAudioTracks: audioTracks, 
            shakaVideoTracks: videoTracks,
            currentShakaAudioTrackId: state.shakaPlayer?.getVariantTracks().find(t => t.active)?.audioId || null,
            currentShakaVideoTrackId: state.shakaPlayer?.getVariantTracks().find(t => t.active)?.videoId || null,
        };
    case 'SET_SHAKA_AUDIO_TRACK':
        if(state.shakaPlayer) {
            state.shakaPlayer.selectAudioLanguage(state.shakaAudioTracks.find(t => t.id === action.payload)?.language || 'en');
        }
        return { ...state, currentShakaAudioTrackId: action.payload };
    case 'SET_SHAKA_VIDEO_TRACK':
        if(state.shakaPlayer) {
            state.shakaPlayer.selectVariantTrack(state.shakaVideoTracks.find(t => t.id === action.payload)!, true);
        }
        return { ...state, currentShakaVideoTrackId: action.payload };
    case 'HLS_LEVELS_LOADED': return { ...state, qualityLevels: action.payload.levels.map(l => ({ height: l.height, bitrate: l.bitrate })) };
    case 'HLS_AUDIO_TRACKS_LOADED': return { ...state, hlsAudioTracks: action.payload.tracks.map(t => ({ id: t.id, name: t.name })) };
    case 'SET_QUALITY':
      if (state.hlsInstance) state.hlsInstance.currentLevel = action.payload;
      return { ...state, currentQualityLevel: action.payload };
    case 'SET_HLS_AUDIO_TRACK':
       if (state.hlsInstance) state.hlsInstance.audioTrack = action.payload;
      return { ...state, currentHlsAudioTrack: action.payload };
    case 'DESTROY_PLAYERS':
      if(state.hlsInstance) state.hlsInstance.destroy();
      if(state.shakaPlayer) state.shakaPlayer.destroy();
      return { ...state, isHls: false, hlsInstance: null, shakaPlayer: null, qualityLevels: [], hlsAudioTracks: [], shakaAudioTracks: [], shakaVideoTracks: [] };
    default: return state;
  }
}

const formatTime = (timeInSeconds: number) => {
    if (isNaN(timeInSeconds)) return '--:--';
    const isNegative = timeInSeconds < 0;
    const absTime = Math.abs(timeInSeconds);
    const hours = Math.floor(absTime / 3600);
    const minutes = Math.floor((absTime % 3600) / 60);
    const seconds = Math.floor(absTime % 60);
    const sign = isNegative ? '-' : '';

    const formattedMinutes = String(minutes).padStart(2, '0');
    const formattedSeconds = String(seconds).padStart(2, '0');

    return hours > 0
        ? `${sign}${String(hours)}:${formattedMinutes}:${formattedSeconds}`
        : `${sign}${formattedMinutes}:${formattedSeconds}`;
};

interface NextLevelPlayerProps {
  content: Content;
  nextEpisode?: Content | null;
}

export function NextLevelPlayer({ content, nextEpisode }: NextLevelPlayerProps) {
  const [preferences, setPreferences] = useLocalStorage<PlayerPreferences>('player-preferences', DEFAULT_PLAYER_PREFERENCES);
  const router = useRouter();
  const searchParams = useSearchParams();
  const [playerState, dispatch] = useReducer(playerReducer, getInitialState(preferences, content));
  const [isClient, setIsClient] = useState(false);
  const [activeSettingsPanel, setActiveSettingsPanel] = useState<'main' | 'speed' | 'subtitles' | 'quality' | 'audio'>('main');
  const [selectedTranslationLang, setSelectedTranslationLang] = useState('Romanian');
  const [pendingSubtitleLang, setPendingSubtitleLang] = useState<string | null>(null);
  const [localSubtitleContent, setLocalSubtitleContent] = useState<Map<string, string>>(new Map());

  const wrapperRef = useRef<HTMLDivElement>(null);
  const videoRef = useRef<HTMLVideoElement>(null);
  const seekTooltipRef = useRef<HTMLDivElement>(null);

  const controlsTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const countdownIntervalRef = useRef<NodeJS.Timeout | null>(null);
  const autoplayHandledRef = useRef(false);
  
  const [isTranslating, setIsTranslating] = useState(false);
  const [isSyncing, setIsSyncing] = useState(false);
  
  const isAudioOnly = content.quality === 'Audio' || (content.videoUrl && /\.(mp3|wav|ogg|flac)$/i.test(content.videoUrl));
  const { saveProgress, getInitialProgress } = usePlaybackProgress();
  const isMobile = useIsMobile();
  const osdTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const [isDownloading, setIsDownloading] = useState(false);
  const touchStartRef = useRef<{ x: number, y: number, time: number, type: 'none' | 'volume' | 'brightness' }>({ x: 0, y: 0, time: 0, type: 'none' });
  const doubleTapTimeoutRef = useRef<NodeJS.Timeout | null>(null);

  useEffect(() => {
    setIsClient(true);
  }, []);

  const finalSaveProgress = useCallback(() => {
    const video = videoRef.current;
    if (video && playerState.isReady && isFinite(video.duration) && video.currentTime > 0) {
      saveProgress(content.id, video.currentTime, video.duration);
    }
  }, [playerState.isReady, content.id, saveProgress]);

  useEffect(() => {
    const videoEl = videoRef.current;
    
    window.addEventListener('beforeunload', finalSaveProgress);

    return () => {
      finalSaveProgress();
      if (controlsTimeoutRef.current) clearTimeout(controlsTimeoutRef.current);
      if (countdownIntervalRef.current) clearInterval(countdownIntervalRef.current);
      if (osdTimeoutRef.current) clearTimeout(osdTimeoutRef.current);
      if (videoEl) {
        videoEl.pause();
        videoEl.removeAttribute('src');
        videoEl.load();
      }
      dispatch({ type: 'DESTROY_PLAYERS' });
      window.removeEventListener('beforeunload', finalSaveProgress);
    }
  }, [content.id, finalSaveProgress]);

  useEffect(() => {
    dispatch({ type: 'RESET_PLAYER', payload: { preferences, content } });
    autoplayHandledRef.current = false; 

  }, [content, preferences]);

  useEffect(() => {
    if (playerState.isReady && !autoplayHandledRef.current) {
        const shouldAutoplay = searchParams.get('autoplay') === 'true';
        if (shouldAutoplay && videoRef.current) {
            videoRef.current.play().catch(e => logger.error({error: e}, "Autoplay failed"));
            autoplayHandledRef.current = true;
        }
    }
  }, [playerState.isReady, searchParams]);
  
  useEffect(() => {
    if (playerState.isReady && content.id && videoRef.current) {
        const loadProgress = async () => {
            const startTime = await getInitialProgress(content.id);
            if (startTime !== null && videoRef.current) {
                videoRef.current.currentTime = startTime;
                toast.info("Resuming Playback", {
                    description: `Starting from ${formatTime(startTime)}.`,
                });
            }
        };
        loadProgress();
    }
  }, [playerState.isReady, content.id, getInitialProgress]);
  
   useEffect(() => {
        if (osdTimeoutRef.current) clearTimeout(osdTimeoutRef.current);
        if (playerState.osd) {
            osdTimeoutRef.current = setTimeout(() => {
                dispatch({ type: 'SHOW_OSD', payload: null });
            }, 1000);
        }
    }, [playerState.osd]);

  const handlePlayToggle = useCallback(() => {
    if (videoRef.current) {
        const video = videoRef.current;
        if (video.paused) {
            video.play().catch(e => logger.error({error: e}, "Video play error"));
        } else {
            video.pause();
        }
    }
  }, []);

  const seek = useCallback((amount: number) => {
    if (videoRef.current && Number.isFinite(videoRef.current.duration)) {
      const video = videoRef.current;
      const newTime = Math.max(0, Math.min(video.duration, video.currentTime + amount));
      if (Number.isFinite(newTime)) {
        video.currentTime = newTime;
      }
      dispatch({ type: 'SHOW_OSD', payload: amount > 0 ? 'seek-forward' : 'seek-backward' });
    }
  }, []);

  const toggleMute = useCallback(() => {
    dispatch({ type: 'MUTE_TOGGLE' });
  }, []);
  
  const toggleFullscreen = useCallback(() => {
    if (!wrapperRef.current) return;
    if (!document.fullscreenElement) {
      wrapperRef.current.requestFullscreen().catch(err => logger.error({error: err}, `Error attempting to enable full-screen mode`));
    } else {
      document.exitFullscreen();
    }
  }, []);

  const togglePip = useCallback(() => {
    if (videoRef.current) {
        const video = videoRef.current;
        if (document.pictureInPictureElement) {
            document.exitPictureInPicture();
        } else if (document.pictureInPictureEnabled) {
            video.requestPictureInPicture().catch(err => logger.error({error: err}, 'PIP Error'));
        }
    }
  }, []);

  const setVolume = useCallback((newVolume: number) => {
    dispatch({ type: 'VOLUME_CHANGE', payload: { volume: Math.max(0, Math.min(1, newVolume)) } });
  }, []);
  
  const setBrightness = useCallback((newBrightness: number) => {
    dispatch({ type: 'BRIGHTNESS_CHANGE', payload: Math.max(0.5, Math.min(1.5, newBrightness)) });
  }, []);

  useEffect(() => {
    const handleKeyDown = (event: KeyboardEvent) => {
      if (playerState.isSettingsOpen) return;

      const target = event.target as HTMLElement;
      if (target.tagName === 'INPUT' || target.tagName === 'TEXTAREA' || target.isContentEditable) {
        return;
      }
      
      switch(event.key) {
        case ' ':
        case 'k':
          event.preventDefault();
          handlePlayToggle();
          break;
        case 'm':
          toggleMute();
          break;
        case 'f':
          toggleFullscreen();
          break;
        case 'i':
          togglePip();
          break;
        case 'ArrowRight':
        case 'l':
          seek(preferences.seekInterval);
          break;
        case 'ArrowLeft':
        case 'j':
          seek(-preferences.seekInterval);
          break;
        case 'ArrowUp':
          event.preventDefault();
          setVolume(playerState.volume + 0.1);
          break;
        case 'ArrowDown':
          event.preventDefault();
          setVolume(playerState.volume - 0.1);
          break;
        case '0':
        case '1':
        case '2':
        case '3':
        case '4':
        case '5':
        case '6':
        case '7':
        case '8':
        case '9':
          if (videoRef.current && playerState.duration > 0) {
            videoRef.current.currentTime = playerState.duration * (Number(event.key) / 10);
          }
          break;
      }
    };
    
    const wrapper = wrapperRef.current;
    if (!wrapper) return;
    
    wrapper.addEventListener('keydown', handleKeyDown);

    return () => wrapper.removeEventListener('keydown', handleKeyDown);
  }, [playerState.isSettingsOpen, handlePlayToggle, toggleMute, toggleFullscreen, togglePip, seek, preferences.seekInterval, setVolume, playerState.volume, playerState.duration]);
  
  useEffect(() => {
    if (playerState.upNextState === 'visible' && playerState.upNextCountdown > 0 && nextEpisode) {
      countdownIntervalRef.current = setInterval(() => {
        dispatch({ type: 'UP_NEXT_TICK' });
      }, 1000);
    } else if (playerState.upNextCountdown <= 0 && nextEpisode) {
        if(countdownIntervalRef.current) clearInterval(countdownIntervalRef.current);
        router.push(`/watch/${nextEpisode.id}?autoplay=true`);
        window.scrollTo(0,0);
    }
    return () => { if (countdownIntervalRef.current) clearInterval(countdownIntervalRef.current) };
  }, [playerState.upNextState, playerState.upNextCountdown, nextEpisode, router]);
  
  useEffect(() => {
    const wrapper = wrapperRef.current;
    const video = videoRef.current;
    if (wrapper) {
      wrapper.style.filter = `brightness(${playerState.brightness})`;
      if (preferences) {
        const fontSizeMap: { [key: number]: string } = { 75: '0.8rem', 100: '1rem', 150: '1.5rem', 200: '2rem' };
        wrapper.style.setProperty('--cue-font-size', fontSizeMap[preferences.subtitleFontSize || 100] || '1rem');
        wrapper.style.setProperty('--cue-text-color', preferences.subtitleTextColor || 'white');
        wrapper.style.setProperty('--cue-bg-color', `rgba(0, 0, 0, ${preferences.subtitleBackgroundOpacity ?? 0.5})`);
      }
    }
    if (video) {
      video.volume = playerState.volume;
      video.muted = playerState.isMuted;
      video.playbackRate = playerState.playbackRate;
    }
  }, [playerState.brightness, playerState.volume, playerState.isMuted, playerState.playbackRate, preferences]);
  
  const handleEnded = useCallback(() => {
    if (preferences.autoplay && nextEpisode) {
      dispatch({ type: 'START_UP_NEXT' });
    } else {
      dispatch({ type: 'ENDED' });
    }
  }, [preferences.autoplay, nextEpisode]);
  
  const handleSeekChange = useCallback((value: number[]) => {
    const newTime = value[0];
    if (videoRef.current && Number.isFinite(videoRef.current.duration)) {
        videoRef.current.currentTime = newTime;
    }
  }, []);

  const getThumbnailForTime = useCallback((time: number): { url: string; style: React.CSSProperties } | null => {
    if (playerState.vttThumbs.length === 0) return null;
    const cue = playerState.vttThumbs.find(c => time >= c.startTime && time < c.endTime);
    if (!cue) return null;

    const [url, xywh] = cue.text.split('#xywh=');
    const [x, y, w, h] = xywh.split(',').map(Number);
    
    return {
        url,
        style: {
            backgroundImage: `url(${url})`,
            backgroundPosition: `-${x}px -${y}px`,
            width: `${w}px`,
            height: `${h}px`,
        }
    };
  }, [playerState.vttThumbs]);

  const handleSeekbarHover = useCallback((event: React.MouseEvent<HTMLDivElement>) => {
    const video = videoRef.current;
    const tooltip = seekTooltipRef.current;
    if (!video || !tooltip || !video.duration || video.duration <= 0) return;

    const rect = event.currentTarget.getBoundingClientRect();
    const x = event.clientX - rect.left;
    const percentage = x / rect.width;
    const time = video.duration * percentage;
    
    const timeEl = tooltip.querySelector('[data-seek-time]') as HTMLSpanElement;
    const thumbEl = tooltip.querySelector('[data-seek-thumb]') as HTMLDivElement;
    
    if (timeEl) timeEl.textContent = formatTime(time);
    
    const thumbInfo = getThumbnailForTime(time);
    if (thumbEl && thumbInfo) {
      Object.assign(thumbEl.style, thumbInfo.style);
      thumbEl.style.display = 'block';
    } else if (thumbEl) {
      thumbEl.style.display = 'none';
    }

    tooltip.style.left = `${x}px`;
    
  }, [getThumbnailForTime]);
  
  const handleSubtitleChange = useCallback((srclang: string) => {
    const video = videoRef.current;
    if (!video) return;

    for (let i = 0; i < video.textTracks.length; i++) {
        const track = video.textTracks[i];
        track.mode = track.language === srclang ? 'showing' : 'hidden';
    }
    
    if (playerState.shakaPlayer) {
        playerState.shakaPlayer.setTextTrackVisibility(srclang !== 'off');
        if (srclang !== 'off') {
            playerState.shakaPlayer.selectTextLanguage(srclang);
        }
    }
    dispatch({ type: 'SUBTITLE_CHANGE', payload: { lang: srclang } });
  }, [playerState.shakaPlayer]);

  useEffect(() => {
    if (pendingSubtitleLang && playerState.availableSubtitles.some(s => s.srclang === pendingSubtitleLang)) {
      handleSubtitleChange(pendingSubtitleLang);
      setPendingSubtitleLang(null);
    }
  }, [pendingSubtitleLang, playerState.availableSubtitles, handleSubtitleChange]);

  const handlePlaybackRateChange = (rate: number) => {
    dispatch({ type: 'RATE_CHANGE', payload: { rate } });
  };
  
  const handleRetry = useCallback(() => {
    const video = videoRef.current;
    if (video) {
      const initTime = video.currentTime;
      video.load(); 
      video.currentTime = initTime;
      video.play().catch(e => logger.error({error: e}, "Retry play failed"));
      dispatch({ type: 'RETRY_PLAYBACK' });
    }
  }, []);
  
  const handleSkipIntro = () => {
    if(content.introEnd) {
      const newTime = content.introEnd;
      if (videoRef.current) {
        videoRef.current.currentTime = newTime;
      }
      dispatch({ type: 'TIME_UPDATE', payload: { progress: newTime, showSkipIntro: false } });
    }
  };
  
  const handleFileUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    if (playerState.availableSubtitles.some(track => track.label === file.name)) {
        toast.info('Duplicate File', { description: `A subtitle file named "${file.name}" has already been added.` });
        return;
    }
    
    try {
        const textContent = await file.text();
        const fileUrl = URL.createObjectURL(new Blob([textContent], {type: 'text/vtt'}));
        const newSrclang = `${file.name.slice(0, 2)}-${Date.now()}`;
        
        const newSubtitle: Subtitle = {
          lang: file.name,
          srclang: newSrclang,
          url: fileUrl,
          label: file.name
        };
        
        setLocalSubtitleContent(prev => new Map(prev).set(newSrclang, textContent));
        dispatch({ type: 'ADD_SUBTITLE', payload: newSubtitle });
        setPendingSubtitleLang(newSubtitle.srclang);
        
        toast.success('Subtitle Loaded', { description: `"${file.name}" has been added for this session.` });
    } catch (e: any) {
        logger.error({ error: e, fileName: file.name }, "Failed to read local subtitle file.");
        toast.error("File Read Error", { description: `Could not read the contents of ${file.name}.` });
    }
    
    event.target.value = '';
  };
  
  const handleRemoveSubtitle = useCallback((srclang: string) => {
    const subInfo = playerState.availableSubtitles.find(s => s.srclang === srclang);
    if (subInfo?.url.startsWith('blob:')) {
      URL.revokeObjectURL(subInfo.url);
      setLocalSubtitleContent(prev => {
        const newMap = new Map(prev);
        newMap.delete(srclang);
        return newMap;
      });
    }
    dispatch({ type: 'REMOVE_SUBTITLE', payload: { srclang } });
    const newActiveSubtitleLang = playerState.activeSubtitleLang === srclang ? 'off' : playerState.activeSubtitleLang;
    dispatch({ type: 'SUBTITLE_CHANGE', payload: { lang: newActiveSubtitleLang } });
    toast.success("Subtitle Removed");
  }, [playerState.availableSubtitles, playerState.activeSubtitleLang]);

  const handleTranslate = async () => {
    if (playerState.activeSubtitleLang === 'off') {
        toast.error('No Subtitle Selected', { description: 'Please select a subtitle track to translate.' });
        return;
    }
    const targetLang = selectedTranslationLang;
    if (playerState.availableSubtitles.some(s => s.lang.toLowerCase().startsWith(targetLang.toLowerCase()))) {
        toast.info("Language Exists", { description: "A subtitle track for this language already exists."});
        return;
    }
    const activeTrack = playerState.availableSubtitles.find(t => t.srclang === playerState.activeSubtitleLang);
    if (!activeTrack) {
        toast.error('Translation Error', { description: 'Could not find the source for the selected subtitle.' });
        return;
    }
    
    setIsTranslating(true);
    toast.info('Translating...', { description: `AI is translating "${activeTrack.label}" to ${targetLang}.` });
    
    try {
        let subtitleContent: string;
        if (localSubtitleContent.has(activeTrack.srclang)) {
          subtitleContent = localSubtitleContent.get(activeTrack.srclang)!;
        } else {
          const fetchResult = await fetchUrlContent({ url: activeTrack.url });
          if (!fetchResult.success || !fetchResult.content) {
              throw new Error(fetchResult.error || "Failed to fetch subtitle content from server.");
          }
          subtitleContent = fetchResult.content;
        }
        
        const result = await translateSubtitles({ subtitleContent, targetLanguage: targetLang });

        if (!result?.success || !result?.translatedSrtContent) {
            throw new Error(result?.error?.message || 'AI translation returned empty content.');
        }

        const blob = new Blob([result.translatedSrtContent], { type: 'text/vtt' });
        const newUrl = URL.createObjectURL(blob);
        const baseName = activeTrack.label?.replace(/ \([^)]*\)/g, '') || activeTrack.lang;
        const newSub: Subtitle = {
            lang: `${baseName} (${targetLang.slice(0,3)} AI)`,
            srclang: `${targetLang.slice(0, 2).toLowerCase()}-ai-${Date.now()}`,
            url: newUrl,
            label: `${baseName} (${targetLang.slice(0,3)} AI)`,
        };
        
        dispatch({ type: 'ADD_SUBTITLE', payload: newSub });
        setPendingSubtitleLang(newSub.srclang);
        
        toast.success('Translation Complete!', { description: 'The translated version is now active.' });

    } catch (error: any) {
        logger.error({ error }, 'Translation failed');
        toast.error('Translation Failed', { description: error.message || 'An unknown error occurred.' });
    } finally {
        setIsTranslating(false);
    }
  };

  const handleSync = async () => {
    if (playerState.activeSubtitleLang === 'off') {
        toast.error('No Subtitle Selected', { description: 'Please select a subtitle track to synchronize.' });
        return;
    }
    const activeSub = playerState.availableSubtitles.find(s => s.srclang === playerState.activeSubtitleLang);

    if (!activeSub) {
      toast.error('Sync Error', { description: 'Could not find the source for the selected subtitle.' });
      return;
    }
    
    setIsSyncing(true);
    toast.info('Synchronizing...', { description: `AI is analyzing the timing of "${activeSub.label}".` });

    try {
        let subtitleContent: string;
        if (localSubtitleContent.has(activeSub.srclang)) {
            subtitleContent = localSubtitleContent.get(activeSub.srclang)!;
        } else {
            const fetchResult = await fetchUrlContent({ url: activeSub.url });
            if (!fetchResult.success || !fetchResult.content) {
                throw new Error(fetchResult.error || "Failed to fetch subtitle content from server.");
            }
            subtitleContent = fetchResult.content;
        }
        
        const result = await synchronizeSubtitles({ subtitleContent, subtitleFormat: 'vtt' });

        const blob = new Blob([result.synchronizedSrtContent], { type: 'text/vtt' });
        const newUrl = URL.createObjectURL(blob);
        
        const baseName = activeSub.label?.replace(/ \([^)]*\)/g, '') || activeSub.lang;
        
        const newSyncedSub: Subtitle = {
            lang: `${baseName} (Synced)`,
            srclang: `${activeSub.srclang}-synced-${Date.now()}`,
            url: newUrl,
            label: `${baseName} (Synced)`
        };

        dispatch({ type: 'ADD_SUBTITLE', payload: newSyncedSub });
        setPendingSubtitleLang(newSyncedSub.srclang);
        
        toast.success('Synchronization Complete!', { description: 'The synchronized version is now active.' });
    } catch (error: any) {
        logger.error({error}, 'Synchronization failed');
        toast.error('Sync Failed', { description: error.message || 'An unknown error occurred.' });
    } finally {
        setIsSyncing(false);
    }
  };
  
  const handleOfflineDownload = useCallback(async () => {
    if (isDownloading) return;
    setIsDownloading(true);
    toast.info('Starting Offline Download...', { description: 'Please keep this tab open until the download is complete.' });
    try {
        const result = await handleDownloadForOffline(content);
        toast.success('Download Complete!', { description: result });
    } catch(error) {
        const message = error instanceof Error ? error.message : 'An unknown error occurred.';
        logger.error({ error }, 'Offline download failed');
        toast.error('Download Failed', { description: message });
    } finally {
        setIsDownloading(false);
    }
  }, [content, isDownloading]);

  const handleTouchStart = (e: React.TouchEvent) => {
    const touch = e.touches[0];
    touchStartRef.current = { x: touch.clientX, y: touch.clientY, time: Date.now(), type: 'none' };
  };

  const handleTouchMove = (e: React.TouchEvent) => {
    if(touchStartRef.current.type === 'none') {
        const touch = e.touches[0];
        const dx = touch.clientX - touchStartRef.current.x;
        const dy = touch.clientY - touchStartRef.current.y;
        if (Math.abs(dy) > Math.abs(dx) && Math.abs(dy) > 10) {
            touchStartRef.current.type = touch.clientX > window.innerWidth / 2 ? 'volume' : 'brightness';
        }
    }

    if(touchStartRef.current.type !== 'none') e.preventDefault();
    
    const touch = e.touches[0];
    const dy = touch.clientY - touchStartRef.current.y;

    if (Math.abs(dy) < 2) return; 

    if (touchStartRef.current.type === 'volume') {
      const newVolume = playerState.volume - dy / 200;
      setVolume(newVolume);
    } else if (touchStartRef.current.type === 'brightness') {
      const newBrightness = playerState.brightness - dy / 200;
      setBrightness(newBrightness);
    }

    touchStartRef.current.x = touch.clientX;
    touchStartRef.current.y = touch.clientY;
  };
  
  const handleTouchEnd = (e: React.TouchEvent) => {
    const start = touchStartRef.current;
    const endX = e.changedTouches[0].clientX;
    const endY = e.changedTouches[0].clientY;
    const timeDiff = Date.now() - start.time;

    if (timeDiff < 250 && Math.abs(endX - start.x) < 10 && Math.abs(endY - start.y) < 10) {
        if (doubleTapTimeoutRef.current) {
            clearTimeout(doubleTapTimeoutRef.current);
            doubleTapTimeoutRef.current = null;
            if (endX > window.innerWidth * 0.66) {
                seek(preferences.seekInterval);
            } else if (endX < window.innerWidth * 0.33) {
                seek(-preferences.seekInterval);
            } else {
                 handlePlayToggle();
            }
        } else {
            doubleTapTimeoutRef.current = setTimeout(() => {
                dispatch({ type: 'TOGGLE_CONTROLS', payload: { show: !playerState.showControls } });
                doubleTapTimeoutRef.current = null;
            }, 300);
        }
    }
    start.type = 'none';
  };

  const handleAudioTrackChange = (lang: string) => {
    dispatch({ type: 'AUDIO_TRACK_CHANGE', payload: { lang } });
  }

  const handleShakaError = (error: shaka.util.Error) => {
      let message = 'A DRM-related error occurred.';
      switch (error.code) {
          case shaka.util.Error.Code.LICENSE_REQUEST_FAILED:
          case shaka.util.Error.Code.LICENSE_RESPONSE_REJECTED:
              message = "The license for this content could not be acquired. Please check your subscription or regional availability.";
              break;
          case shaka.util.Error.Code.RESTRICTED_BY_PLATFORM:
              message = "Playback is restricted on this platform. Your browser or device may not support the required DRM.";
              break;
          case shaka.util.Error.Code.BAD_HTTP_STATUS:
              message = "Could not connect to the license server. Please check your network connection.";
              break;
          default:
              message = `A DRM playback error occurred (Code: ${error.code}).`;
              break;
      }
      dispatch({ type: 'ERROR', payload: { message, canRetry: false } });
  }

  useEffect(() => {
    const video = videoRef.current;
    if (!video || !isClient) return;
    
    dispatch({ type: 'DESTROY_PLAYERS' });

    const eventListeners: { [key: string]: EventListener } = {
        loadeddata: () => dispatch({ type: 'PLAYER_READY', payload: { duration: videoRef.current?.duration || 0 } }),
        timeupdate: () => {
            if (!videoRef.current || !isFinite(videoRef.current.currentTime) || !isFinite(videoRef.current.duration)) return;
            dispatch({ type: 'TIME_UPDATE', payload: { 
                progress: videoRef.current.currentTime, 
                showSkipIntro: !!(content.introStart && content.introEnd && videoRef.current.currentTime >= content.introStart && videoRef.current.currentTime < content.introEnd && playerState.isPlaying)
            }});
        },
        ended: handleEnded,
        play: () => dispatch({ type: 'PLAY' }),
        pause: () => dispatch({ type: 'PAUSE' }),
        waiting: () => dispatch({ type: 'BUFFERING_START' }),
        playing: () => dispatch({ type: 'BUFFERING_END' }),
        enterpictureinpicture: () => dispatch({ type: 'PIP_CHANGE', payload: { isInPip: true } }),
        leavepictureinpicture: () => dispatch({ type: 'PIP_CHANGE', payload: { isInPip: false } }),
        error: () => dispatch({ type: 'ERROR', payload: { message: 'A network or media error occurred.', canRetry: true } }),
    };
    
    Object.entries(eventListeners).forEach(([event, handler]) => video.addEventListener(event, handler));
    const onFullscreenChange = () => dispatch({ type: 'FULLSCREEN_CHANGE', payload: { isFullscreen: !!document.fullscreenElement }});
    document.addEventListener('fullscreenchange', onFullscreenChange);

    dispatch({ type: 'RETRY_PLAYBACK' });
    
    const activeDub = playerState.availableDubbedTracks.find(t => t.lang === playerState.activeAudioTrack);
    const videoUrl = activeDub?.url || content.videoUrl;

    if (!videoUrl) return;

    if (content.drm) {
        initializeShakaPlayer(video, videoUrl, content.drm).then(player => {
            if (player) {
                dispatch({ type: 'SHAKA_INIT', payload: { player }});
                dispatch({ type: 'SHAKA_TRACKS_LOADED', payload: { audio: player.getAudioLanguages().map(lang => player.getVariantTracks().find(t => t.language === lang)).filter(Boolean) as shaka.extern.Track[], video: player.getVideoTracks() } });
            }
        }).catch((err: shaka.util.Error) => {
            handleShakaError(err);
        });
    } else if (videoUrl.includes('.m3u8')) {
        if (Hls.isSupported()) {
          const hls = new Hls();
          dispatch({ type: 'HLS_INIT', payload: { hls } });
          hls.loadSource(videoUrl);
          hls.attachMedia(video);
          hls.on(Hls.Events.MANIFEST_PARSED, (event, data) => dispatch({ type: 'HLS_LEVELS_LOADED', payload: { levels: data.levels } }));
          hls.on(Hls.Events.AUDIO_TRACKS_UPDATED, (event, data) => dispatch({ type: 'HLS_AUDIO_TRACKS_LOADED', payload: { tracks: data.audioTracks } }));
        } else if (video.canPlayType('application/vnd.apple.mpegurl')) {
          video.src = videoUrl;
        }
    } else {
        video.src = videoUrl;
    }

    video.load();
    handleSubtitleChange(playerState.activeSubtitleLang);

    return () => {
        Object.entries(eventListeners).forEach(([event, handler]) => video.removeEventListener(event, handler));
        document.removeEventListener('fullscreenchange', onFullscreenChange);
        dispatch({ type: 'DESTROY_PLAYERS' });
    };
  }, [isClient, content.id, playerState.activeAudioTrack, content.drm, handleEnded, handleSubtitleChange]);


  if (!isClient) {
    return (
        <div className="relative aspect-video w-full bg-black rounded-lg overflow-hidden flex items-center justify-center text-white">
            <Loader2 className="w-12 h-12 animate-spin" />
        </div>
    );
  }
  
  const activeVideoUrl = playerState.availableDubbedTracks.find(t => t.lang === playerState.activeAudioTrack)?.url || content.videoUrl;

  if (!activeVideoUrl) {
    return (
        <div className="relative aspect-video w-full bg-black rounded-lg overflow-hidden flex items-center justify-center text-white">
            <div className="p-4 rounded-lg text-center">
                <VideoOff className="w-12 h-12 mx-auto text-destructive mb-2"/>
                <p className="font-semibold">Video Source Missing</p>
                <p className="text-sm text-neutral-300 mb-4 max-w-sm">This content cannot be played because a video URL has not been provided.</p>
            </div>
        </div>
    );
  }
  
  const renderPlayer = () => {
    if (isAudioOnly) {
       return (
        <div className="absolute inset-0 flex items-center justify-center">
            {content.imageUrl ? (
                <>
                    <Image src={content.imageUrl} alt={content.title} fill className="object-cover opacity-20 blur-lg scale-110" priority />
                    <div className="relative z-10 w-48 h-48 sm:w-64 sm:h-64 rounded-lg overflow-hidden shadow-2xl">
                        <Image src={content.imageUrl} alt={content.title} fill className="object-cover" priority />
                    </div>
                </>
            ) : (
                <div className="w-48 h-48 sm:w-64 sm:h-64 rounded-lg bg-neutral-800 flex items-center justify-center">
                    <AudioLines className="w-16 h-16 text-neutral-600" />
                </div>
            )}
        </div>
       )
    }
    
    return (
        <video ref={videoRef} className="w-full h-full object-contain" playsInline crossOrigin="anonymous" {...(content.drm && { "x-webkit-airplay": "allow" })}>
           {playerState.availableSubtitles.map((sub) => (
             <track
                key={sub.srclang}
                kind="subtitles"
                label={sub.label || sub.lang}
                srcLang={sub.srclang}
                src={sub.url}
                default={sub.srclang === playerState.activeSubtitleLang}
             />
           ))}
        </video>
    );
  }

  const SettingsPanel = () => {
    const mainPanel = (
        <div className="p-2 space-y-1">
            <SettingsMenuItem label="Audio" value={<div className="flex items-center gap-1.5">{(content.audioCodecs || []).map(c => <CodecBadge key={c} codec={c}/>)}<span>{playerState.activeAudioTrack === 'original' ? 'Original' : playerState.availableDubbedTracks.find(t => t.lang === playerState.activeAudioTrack)?.lang.toUpperCase() || 'Original' }</span></div>} onClick={() => setActiveSettingsPanel('audio')} disabled={playerState.availableDubbedTracks.length === 0} />
            <SettingsMenuItem label="Speed" value={`${playerState.playbackRate}x`} onClick={() => setActiveSettingsPanel('speed')} />
            <SettingsMenuItem label="Subtitles" value={playerState.activeSubtitleLang === 'off' ? 'Off' : playerState.availableSubtitles.find(s => s.srclang === playerState.activeSubtitleLang)?.label || playerState.activeSubtitleLang} onClick={() => setActiveSettingsPanel('subtitles')} />
            <SettingsMenuItem label="Quality" value={playerState.currentQualityLevel === -1 ? 'Auto' : `${playerState.qualityLevels[playerState.currentQualityLevel]?.height}p`} onClick={() => setActiveSettingsPanel('quality')} disabled={!playerState.isHls || playerState.qualityLevels.length <= 1} />
        </div>
    );
    
    const audioPanel = (
        <ScrollArea className="p-2">
            <SettingsSelectItem label="Original" isSelected={playerState.activeAudioTrack === 'original'} onClick={() => handleAudioTrackChange('original')} />
            {playerState.availableDubbedTracks.map(track => (<SettingsSelectItem key={track.lang} label={`Dubbed - ${track.lang.toUpperCase()}`} isSelected={playerState.activeAudioTrack === track.lang} onClick={() => handleAudioTrackChange(track.lang)} />))}
        </ScrollArea>
    );

    const speedPanel = (
        <ScrollArea className="p-2">
            {[0.5, 1, 1.5, 2].map(rate => <SettingsSelectItem key={rate} label={`${rate}x`} isSelected={playerState.playbackRate === rate} onClick={() => handlePlaybackRateChange(rate)} />)}
        </ScrollArea>
    );

    const subtitlesPanel = (
        <>
            <ScrollArea className="flex-1 p-2">
                <SettingsSelectItem label="Off" isSelected={playerState.activeSubtitleLang === 'off'} onClick={() => handleSubtitleChange('off')} />
                <Separator className="my-1"/>
                {playerState.availableSubtitles.map((track, i) => (track.lang !== 'thumbnails' && <div key={`${track.srclang}-${i}`} className="flex items-center w-full gap-1"><div className="flex-1"><SettingsSelectItem label={track.label || track.lang} isSelected={playerState.activeSubtitleLang === track.srclang} onClick={() => handleSubtitleChange(track.srclang)} /></div>{track.url.startsWith('blob:') && (<Button variant="ghost" size="icon" className="h-7 w-7 text-muted-foreground hover:text-destructive" onClick={() => handleRemoveSubtitle(track.srclang)}><X className="h-4 w-4"/><span className="sr-only">Remove subtitle</span></Button>)}</div>))}
            </ScrollArea>
            <div className="p-2 border-t space-y-2">
                <Label htmlFor="subtitle-upload" className="text-xs text-muted-foreground">Load local file (.vtt, .srt)</Label>
                <Input id="subtitle-upload" type="file" className="h-auto text-xs" onChange={handleFileUpload} accept=".vtt,.srt" />
                <Separator />
                <div className="grid grid-cols-2 gap-2">
                    <div className="space-y-1">
                        <Label className="text-xs text-muted-foreground px-1">AI Translation</Label>
                        <Select value={selectedTranslationLang} onValueChange={setSelectedTranslationLang}><SelectTrigger className="h-8 text-xs"><SelectValue/></SelectTrigger><SelectContent>{['English', 'Romanian', 'French', 'German', 'Italian', 'Spanish', 'Portuguese', 'Dutch', 'Russian', 'Japanese', 'Chinese', 'Korean', 'Arabic', 'Hindi', 'Turkish', 'Polish', 'Swedish', 'Norwegian', 'Danish', 'Finnish', 'Hungarian', 'Czech'].map(lang => <SelectItem key={lang} value={lang}>{lang}</SelectItem>)}</SelectContent></Select>
                        <Button onClick={handleTranslate} disabled={isTranslating || playerState.activeSubtitleLang === 'off'} className="w-full h-8 text-xs" variant="outline">{isTranslating ? <Loader2 className="mr-2 h-3 w-3 animate-spin" /> : <Languages className="mr-2 h-3 w-3" />}Translate</Button>
                    </div>
                    <div className="space-y-1">
                        <Label className="text-xs text-muted-foreground px-1">AI Sync</Label>
                        <p className="text-xs text-muted-foreground h-8 px-1 flex items-center">Corrects timing</p>
                        <Button onClick={handleSync} disabled={isSyncing || playerState.activeSubtitleLang === 'off'} className="w-full h-8 text-xs" variant="outline">{isSyncing ? <Loader2 className="mr-2 h-3 w-3 animate-spin" /> : <Timer className="mr-2 h-3 w-3" />}Synchronize</Button>
                    </div>
                </div>
            </div>
        </>
    );
    
    const qualityPanel = (
        <div className="p-2">
            <SettingsSelectItem label="Auto" isSelected={playerState.currentQualityLevel === -1} onClick={() => { dispatch({ type: 'SET_QUALITY', payload: -1 }); setPreferences(p => ({...p, preferredQuality: 'auto'})); }} />
            <Separator className="my-1"/>
            {playerState.qualityLevels.map((level, index) => (<SettingsSelectItem key={index} label={`${level.height}p`} isSelected={playerState.currentQualityLevel === index} onClick={() => { dispatch({ type: 'SET_QUALITY', payload: index }); setPreferences(p => ({...p, preferredQuality: String(level.height)})); }} />))}
        </div>
    );

    const panels: Record<typeof activeSettingsPanel, React.ReactNode> = {
      main: mainPanel,
      audio: audioPanel,
      speed: speedPanel,
      subtitles: subtitlesPanel,
      quality: qualityPanel
    };
    
    return (
        <div className={cn("absolute inset-0 bg-black/80 z-20 flex justify-end transition-opacity duration-300", playerState.isSettingsOpen ? "opacity-100" : "opacity-0 pointer-events-none")} onClick={() => dispatch({type: 'TOGGLE_SETTINGS'})}>
            <div className="w-full max-w-xs sm:max-w-sm md:max-w-md bg-background/95 backdrop-blur-sm h-full flex flex-col" onClick={(e) => e.stopPropagation()}>
                <div className="flex items-center p-2 border-b">
                     <Button variant="ghost" size="icon" className="h-8 w-8 mr-1" onClick={() => activeSettingsPanel === 'main' ? dispatch({type: 'TOGGLE_SETTINGS'}) : setActiveSettingsPanel('main')}>
                        <ChevronLeft className="h-5 w-5" />
                     </Button>
                     <h3 className="text-base font-semibold">Settings</h3>
                </div>
                {panels[activeSettingsPanel]}
            </div>
        </div>
    );
  };
  
  const SettingsMenuItem = ({ label, value, onClick, disabled = false }: { label: string, value: React.ReactNode, onClick: () => void, disabled?: boolean }) => (
      <Button variant="ghost" className="w-full justify-between h-9 px-2" onClick={onClick} disabled={disabled}>
          <span className="text-sm">{label}</span>
          <div className="flex items-center gap-2">
              <div className="text-sm text-muted-foreground truncate max-w-28 flex items-center gap-1.5">{value}</div>
              <ChevronRight className="h-4 w-4 text-muted-foreground" />
          </div>
      </Button>
  );
  
  const SettingsSelectItem = ({ label, isSelected, onClick }: { label: string, isSelected: boolean, onClick: () => void }) => (
    <Button variant="ghost" className="w-full justify-start h-9 px-2 text-sm" onClick={onClick}>
        <div className="w-6 mr-2 flex items-center justify-center">
            {isSelected && <Check className="h-4 w-4" />}
        </div>
        <span>{label}</span>
    </Button>
  );
  
  const getOSDIcon = () => {
    if (!playerState.osd) return null;
    const osdIconProps = {
        className: "w-12 h-12"
    };

    const renderOsdWrapper = (children: React.ReactNode) => (
       <div className="bg-black/50 rounded-full p-4 transition-all duration-300 animate-in fade-in-0 zoom-in-90 ease-out">
            {children}
       </div>
    );
    
    switch(playerState.osd.type) {
        case 'play': return renderOsdWrapper(<Play {...osdIconProps} />);
        case 'pause': return renderOsdWrapper(<Pause {...osdIconProps} />);
        case 'seek-forward': return renderOsdWrapper(<FastForward {...osdIconProps} />);
        case 'seek-backward': return renderOsdWrapper(<Rewind {...osdIconProps} />);
        case 'volume': 
            const volumeLevel = playerState.isMuted ? 0 : playerState.volume;
            return renderOsdWrapper(
                <div className="flex flex-col items-center gap-2">
                    {volumeLevel === 0 ? <VolumeX {...osdIconProps} /> : volumeLevel < 0.5 ? <Volume1 {...osdIconProps} /> : <Volume2 {...osdIconProps} />}
                    <div className="w-24 h-1.5 bg-white/30 rounded-full overflow-hidden">
                        <div className="h-full bg-white" style={{width: `${volumeLevel * 100}%`}} />
                    </div>
                </div>
            );
        case 'brightness': 
             return renderOsdWrapper(
                <div className="flex flex-col items-center gap-2">
                    <Sun {...osdIconProps} />
                    <div className="w-24 h-1.5 bg-white/30 rounded-full overflow-hidden">
                        <div className="h-full bg-white" style={{width: `${((playerState.brightness - 0.5) / 1) * 100}%`}} />
                    </div>
                </div>
            );
        default: return null;
    }
  }

  return (
    <TooltipProvider>
    <div
      ref={wrapperRef}
      className={cn(
        'relative aspect-video w-full bg-black rounded-lg overflow-hidden group/player outline-none',
        playerState.isFullscreen && 'fixed inset-0 z-50 rounded-none'
      )}
      tabIndex={-1}
      onMouseMove={() => {
        dispatch({ type: 'TOGGLE_CONTROLS', payload: { show: true } });
        if(controlsTimeoutRef.current) clearTimeout(controlsTimeoutRef.current);
        controlsTimeoutRef.current = setTimeout(() => {
          if (playerState.isPlaying && !playerState.isSettingsOpen) {
            dispatch({ type: 'TOGGLE_CONTROLS', payload: { show: false } });
          }
        }, 3000);
      }}
      onMouseLeave={() => {
        if (playerState.isPlaying && !playerState.isSettingsOpen) {
          dispatch({ type: 'TOGGLE_CONTROLS', payload: { show: false } });
        }
      }}
      onClick={(e) => {
          if (!isMobile) {
              const target = e.target as HTMLElement;
              if (target.closest('button, [role="slider"]')) return;
              handlePlayToggle();
          }
      }}
      onTouchStart={isMobile ? handleTouchStart : undefined}
      onTouchMove={isMobile ? handleTouchMove : undefined}
      onTouchEnd={isMobile ? handleTouchEnd : undefined}
    >
      {renderPlayer()}
      
      <div
        className={cn(
          'absolute inset-0 grid place-items-center text-white',
          'transition-opacity duration-300',
          !playerState.isLoading && playerState.error == null ? 'pointer-events-none opacity-0' : 'opacity-100 bg-black/50',
        )}
      >
        {playerState.isLoading && !playerState.error && <Loader2 className="w-12 h-12 animate-spin" />}
        {playerState.error && (
            <div className="p-4 rounded-lg text-center">
                <AlertTriangle className="w-12 h-12 mx-auto text-amber-400 mb-2"/>
                <p className="font-semibold">Playback Error</p>
                <p className="text-sm text-neutral-300 mb-4 max-w-sm">{playerState.error.message}</p>
                {playerState.error.canRetry && <Button onClick={(e) => { e.stopPropagation(); handleRetry(); }}><RotateCcw className="mr-2"/>Retry</Button>}
            </div>
        )}
      </div>
      
      {playerState.upNextState !== 'hidden' && nextEpisode && (
        <div className="absolute inset-0 bg-black/70 flex items-center justify-center sm:justify-end p-4 sm:p-8 z-30">
            <div className="text-center sm:text-right">
                <p className="text-sm text-neutral-300">Up Next</p>
                <h3 className="text-2xl font-bold">{nextEpisode.title}</h3>
                <p className="text-neutral-200">Starting in {playerState.upNextCountdown}s</p>
                <div className="flex gap-2 mt-4 justify-center sm:justify-end">
                    <Button variant="secondary" onClick={(e) => {e.stopPropagation(); dispatch({ type: 'CANCEL_UP_NEXT' });}}>Cancel</Button>
                    <Button onClick={(e) => {e.stopPropagation(); router.push(`/watch/${nextEpisode.id}?autoplay=true`);}}><SkipForward className="mr-2"/>Play Now</Button>
                </div>
            </div>
        </div>
      )}

      <div className={cn("absolute inset-0 flex items-center justify-center pointer-events-none z-10", playerState.isFullscreen && "pb-24")}>
            <div key={playerState.osd?.key}>
                {getOSDIcon()}
            </div>
       </div>

       <div className="absolute inset-0 z-10 pointer-events-none" >
            {playerState.showSkipIntro && (
                <div className="absolute bottom-24 right-4 pointer-events-auto">
                    <Button onClick={(e) => { e.stopPropagation(); handleSkipIntro(); }} size="lg"><SkipForward className="mr-2 h-5 w-5" /> Skip Intro</Button>
                </div>
            )}
       </div>
      
      <SettingsPanel />

      <div
        className={cn(
          'absolute bottom-0 left-0 right-0 flex flex-col justify-between transition-all duration-300 text-white z-20',
          'transform', (playerState.showControls && playerState.upNextState === 'hidden' && !playerState.isSettingsOpen) ? 'translate-y-0' : 'translate-y-full',
          playerState.error && 'hidden'
        )}
        onClick={(e) => e.stopPropagation()}
      >
        <div className="p-4 w-full bg-gradient-to-t from-black/70 via-black/40 to-transparent">
          
          <div className="w-full group/seek relative" onMouseMove={handleSeekbarHover}>
            <Slider
                value={[playerState.progress]}
                max={playerState.duration}
                step={1}
                onValueChange={handleSeekChange}
                className="w-full h-2 [&>span:first-child]:h-1 [&>span:first-child>span]:h-1 [&>span:last-child]:h-3 [&>span:last-child]:w-3 group-hover/seek:[&>span:last-child]:scale-125"
                disabled={!playerState.isReady || playerState.isLoading}
            />
             <div ref={seekTooltipRef} className="absolute bottom-full mb-2 -translate-x-1/2 opacity-0 group-hover/seek:opacity-100 transition-opacity pointer-events-none flex flex-col items-center">
                <div data-seek-thumb className="w-[160px] h-[90px] bg-cover bg-center rounded-sm border-2 border-white mb-1" style={{display: 'none'}}></div>
                <div className="p-1 rounded-sm bg-black/80 text-white text-xs font-mono">
                    <span data-seek-time>00:00</span>
                </div>
            </div>
          </div>
          <div className="flex justify-between text-xs font-mono mt-1">
            <span>{formatTime(playerState.progress)}</span>
            <div className="flex items-center gap-2">
              <span className="text-muted-foreground">{formatTime(playerState.progress - playerState.duration)}</span>
              <span>{playerState.isReady ? formatTime(playerState.duration) : '--:--'}</span>
            </div>
          </div>
          <div className="flex justify-between items-center mt-2">
            <div className="flex items-center gap-1 sm:gap-2">
                <Tooltip><TooltipTrigger asChild><Button variant="ghost" size="icon" onClick={() => seek(-preferences.seekInterval)} aria-label="Rewind"><Rewind /></Button></TooltipTrigger><TooltipContent><p>Rewind ({preferences.seekInterval}s)</p></TooltipContent></Tooltip>
                <Tooltip><TooltipTrigger asChild><Button variant="ghost" size="icon" aria-label={playerState.isPlaying ? 'Pause' : 'Play'} onClick={handlePlayToggle}>{playerState.isPlaying ? <Pause /> : <Play />}</Button></TooltipTrigger><TooltipContent><p>{playerState.isPlaying ? 'Pause (k)' : 'Play (k)'}</p></TooltipContent></Tooltip>
                <Tooltip><TooltipTrigger asChild><Button variant="ghost" size="icon" onClick={() => seek(preferences.seekInterval)} aria-label="Fast Forward"><FastForward /></Button></TooltipTrigger><TooltipContent><p>Fast Forward ({preferences.seekInterval}s)</p></TooltipContent></Tooltip>
                <div className="flex items-center group/volume">
                  <Tooltip><TooltipTrigger asChild><Button variant="ghost" size="icon" onClick={toggleMute} aria-label="Volume">{playerState.isMuted || playerState.volume === 0 ? <VolumeX /> : playerState.volume < 0.5 ? <Volume1 /> : <Volume2 />}</Button></TooltipTrigger><TooltipContent><p>Mute (m)</p></TooltipContent></Tooltip>
                  <div className="w-0 group-hover/volume:w-24 transition-[width] duration-300"><Slider value={[playerState.isMuted ? 0 : playerState.volume]} max={1} step={0.05} className="w-full" onValueChange={(v) => setVolume(v[0])} /></div>
                </div>
            </div>
            <div className="flex items-center gap-1 sm:gap-2">
                 {content.audioCodecs && content.audioCodecs.length > 0 && (<div className="hidden sm:flex items-center gap-2">{content.audioCodecs.map(codec => <CodecBadge key={codec} codec={codec} />)}</div>)}
                <Tooltip><TooltipTrigger asChild><Button variant="ghost" size="icon" aria-label="Download for Offline" onClick={handleOfflineDownload} disabled={isDownloading || !content.canDownload}>{isDownloading ? <Loader2 className="animate-spin"/> : <Download />}</Button></TooltipTrigger><TooltipContent><p>{content.canDownload ? "Save for Offline" : "Download not available"}</p></TooltipContent></Tooltip>
                <Tooltip><TooltipTrigger asChild><Button variant="ghost" size="icon" aria-label="Cast" onClick={() => handleCast(content)}><Cast /></Button></TooltipTrigger><TooltipContent><p>Cast</p></TooltipContent></Tooltip>
                <Tooltip><TooltipTrigger asChild><Button variant="ghost" size="icon" aria-label="Settings" onClick={() => dispatch({type: 'TOGGLE_SETTINGS'})}><Settings /></Button></TooltipTrigger><TooltipContent><p>Settings</p></TooltipContent></Tooltip>
                 <Tooltip><TooltipTrigger asChild><Button variant="ghost" size="icon" onClick={togglePip} aria-label="Picture-in-picture"><PictureInPicture/></Button></TooltipTrigger><TooltipContent><p>Picture in picture (i)</p></TooltipContent></Tooltip>
                 <Tooltip><TooltipTrigger asChild><Button variant="ghost" size="icon" onClick={toggleFullscreen} aria-label="Fullscreen">{playerState.isFullscreen ? <Minimize /> : <Maximize />}</Button></TooltipTrigger><TooltipContent><p>{playerState.isFullscreen ? 'Exit fullscreen (f)' : 'Enter fullscreen (f)'}</p></TooltipContent></Tooltip>
            </div>
          </div>
        </div>
      </div>
    </div>
    </TooltipProvider>
  );
}
