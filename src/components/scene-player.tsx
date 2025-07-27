
'use client';

import React, { useEffect, useRef, useReducer, useCallback, useMemo, useState } from 'react';
import { Play, Pause, Volume2, Volume1, VolumeX, Maximize, Minimize, ChevronLeft, ChevronRight, Check, Settings } from 'lucide-react';
import type { Content, PlayerPreferences } from '@/lib/types';
import { Slider } from '@/components/ui/slider';
import { Button } from '@/components/ui/button';
import { useLocalStorage } from '@/hooks/use-local-storage';
import { DEFAULT_PLAYER_PREFERENCES } from '@/lib/constants';
import { cn } from '@/lib/utils';
import Image from 'next/image';
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from '@/components/ui/popover';
import { Tooltip, TooltipProvider, TooltipTrigger, TooltipContent } from '@/components/ui/tooltip';
import { logger } from '@/lib/logger';

// --- Types and State Management ---

type ScenePlayerState = {
  isPlaying: boolean;
  isReady: boolean;
  progress: number; // in seconds
  duration: number; // total duration in seconds
  volume: number;
  isMuted: boolean;
  playbackRate: number;
  isFullscreen: boolean;
  showControls: boolean;
  currentSceneIndex: number;
};

type ScenePlayerAction = 
  | { type: 'RESET'; payload: { duration: number; preferences: PlayerPreferences } }
  | { type: 'READY' }
  | { type: 'PLAY' }
  | { type: 'PAUSE' }
  | { type: 'TIME_UPDATE'; payload: { progress: number, sceneIndex: number } } 
  | { type: 'SEEK_TO_SCENE'; payload: number } // payload is scene index
  | { type: 'VOLUME_CHANGE'; payload: number }
  | { type: 'MUTE_TOGGLE' }
  | { type: 'RATE_CHANGE'; payload: number }
  | { type: 'FULLSCREEN_CHANGE'; payload: boolean }
  | { type: 'TOGGLE_CONTROLS'; payload: boolean }
  | { type: 'ENDED' };

let currentContent: Content;

const getInitialState = (duration: number, preferences: PlayerPreferences): ScenePlayerState => ({
  isPlaying: false,
  isReady: true,
  progress: 0,
  duration,
  volume: preferences.volume,
  isMuted: false,
  playbackRate: preferences.playbackRate,
  isFullscreen: false,
  showControls: true,
  currentSceneIndex: 0,
});

const scenePlayerReducer = (state: ScenePlayerState, action: ScenePlayerAction): ScenePlayerState => {
  switch (action.type) {
    case 'RESET': return getInitialState(action.payload.duration, action.payload.preferences);
    case 'READY': return { ...state, isReady: true };
    case 'PLAY': return { ...state, isPlaying: true, showControls: false };
    case 'PAUSE': return { ...state, isPlaying: false, showControls: true };
    case 'TIME_UPDATE': return { ...state, progress: action.payload.progress, currentSceneIndex: action.payload.sceneIndex };
    case 'SEEK_TO_SCENE': {
      let cumulativeDuration = 0;
      for (let i = 0; i < action.payload; i++) {
        cumulativeDuration += currentContent?.scenes?.[i]?.duration || 0;
      }
      return { ...state, progress: cumulativeDuration, currentSceneIndex: action.payload };
    }
    case 'VOLUME_CHANGE': return { ...state, volume: action.payload, isMuted: action.payload === 0 };
    case 'MUTE_TOGGLE': return { ...state, isMuted: !state.isMuted };
    case 'RATE_CHANGE': return { ...state, playbackRate: action.payload };
    case 'FULLSCREEN_CHANGE': return { ...state, isFullscreen: action.payload };
    case 'TOGGLE_CONTROLS': return { ...state, showControls: state.isPlaying ? action.payload : true };
    case 'ENDED': return { ...state, isPlaying: false, progress: state.duration };
    default: return state;
  }
};

const formatTime = (timeInSeconds: number) => {
    const minutes = Math.floor(timeInSeconds / 60);
    const seconds = Math.floor(timeInSeconds % 60);
    return `${String(minutes).padStart(2, '0')}:${String(seconds).padStart(2, '0')}`;
};

// --- Component ---

interface ScenePlayerProps {
  content: Content;
}



export function ScenePlayer({ content }: ScenePlayerProps) {
  currentContent = content;
  const [preferences] = useLocalStorage<PlayerPreferences>('player-preferences', DEFAULT_PLAYER_PREFERENCES);
  const totalDuration = useMemo(() => content.scenes?.reduce((sum, scene) => sum + (scene.duration || 0), 0) || 0, [content.scenes]);
  
  const [state, dispatch] = useReducer(scenePlayerReducer, getInitialState(totalDuration, preferences));
  
  const wrapperRef = useRef<HTMLDivElement>(null);
  const audioRef = useRef<HTMLAudioElement>(null);
  const controlsTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const [activeSettingsPanel, setActiveSettingsPanel] = useState<'main' | 'speed'>('main');

  const { isPlaying, progress, duration, volume, isMuted, playbackRate, isFullscreen, showControls, currentSceneIndex } = state;
  const scenes = content.scenes || [];

  const currentScene = useMemo(() => scenes[currentSceneIndex] || null, [scenes, currentSceneIndex]);

  useEffect(() => {
    dispatch({ type: 'RESET', payload: { duration: totalDuration, preferences } });
  }, [content, totalDuration, preferences]);
  
  useEffect(() => {
    return () => {
        if(controlsTimeoutRef.current) clearTimeout(controlsTimeoutRef.current);
    }
  }, []);

  useEffect(() => {
    let animationFrameId: number;
    let lastTime = performance.now();

    const tick = (now: number) => {
      const deltaTime = (now - lastTime) / 1000;
      lastTime = now;
      
      const newProgress = state.progress + (deltaTime * playbackRate);
      if (isPlaying && newProgress < duration) {
        let cumulativeDuration = 0;
        let newIndex = 0;
        for (let i = 0; i < scenes.length; i++) {
          cumulativeDuration += scenes[i].duration;
          if (newProgress < cumulativeDuration) {
            newIndex = i;
            break;
          }
          newIndex = scenes.length - 1;
        }
        dispatch({ type: 'TIME_UPDATE', payload: { progress: newProgress, sceneIndex: newIndex } });
        animationFrameId = requestAnimationFrame(tick);
      } else if (isPlaying) {
        dispatch({ type: 'ENDED' });
      }
    };

    if (isPlaying) {
      lastTime = performance.now();
      animationFrameId = requestAnimationFrame(tick);
    }

    return () => cancelAnimationFrame(animationFrameId);
  }, [isPlaying, duration, playbackRate, state.progress, scenes]);


  useEffect(() => {
    const audio = audioRef.current;
    if (!audio) return;
    audio.volume = volume;
    audio.muted = isMuted;
    audio.playbackRate = playbackRate;

    if (isPlaying && audio.paused) audio.play().catch(e => logger.error({error: e}, "Audio play failed"));
    if (!isPlaying && !audio.paused) audio.pause();
    
    if (Math.abs(audio.currentTime - progress) > 1.5) {
      audio.currentTime = progress;
    }
  }, [isPlaying, volume, isMuted, playbackRate, progress]);
  
  const handlePlayToggle = useCallback(() => {
    dispatch({ type: isPlaying ? 'PAUSE' : 'PLAY' });
  }, [isPlaying]);

  const toggleFullscreen = useCallback(() => {
    const wrapper = wrapperRef.current;
    if (!wrapper) return;
    if (!document.fullscreenElement) {
      wrapper.requestFullscreen().catch(err => logger.error({error: err}, "Fullscreen error"));
    } else {
      document.exitFullscreen();
    }
  }, []);
  
  const handleSceneChange = useCallback((direction: 'next' | 'prev') => {
    if (!scenes || scenes.length === 0) return;
    let newIndex = direction === 'next' ? currentSceneIndex + 1 : currentSceneIndex - 1;
    newIndex = Math.max(0, Math.min(scenes.length - 1, newIndex));
    dispatch({ type: 'SEEK_TO_SCENE', payload: newIndex });
  }, [scenes, currentSceneIndex]);
  
  useEffect(() => {
    const handleKeyDown = (event: KeyboardEvent) => {
        const keyMap: {[key: string]: () => void} = {
            ' ': handlePlayToggle,
            'k': handlePlayToggle,
            'ArrowRight': () => handleSceneChange('next'),
            'ArrowLeft': () => handleSceneChange('prev'),
            'f': toggleFullscreen
        };
        const handler = keyMap[event.key];
        if (handler) {
            event.preventDefault();
            handler();
        }
    }
    const wrapper = wrapperRef.current;
    wrapper?.addEventListener('keydown', handleKeyDown);
    return () => wrapper?.removeEventListener('keydown', handleKeyDown);
  }, [handlePlayToggle, toggleFullscreen, handleSceneChange]);
  
  const handleMouseMove = useCallback(() => {
    dispatch({ type: 'TOGGLE_CONTROLS', payload: true });
    if (controlsTimeoutRef.current) clearTimeout(controlsTimeoutRef.current);
    controlsTimeoutRef.current = setTimeout(() => {
      if (isPlaying) dispatch({ type: 'TOGGLE_CONTROLS', payload: false });
    }, 3000);
  }, [isPlaying]);


  return (
     <TooltipProvider>
    <div
      ref={wrapperRef}
      className={cn('relative aspect-video w-full bg-black rounded-lg overflow-hidden group/player outline-none', isFullscreen && 'fixed inset-0 z-50 rounded-none')}
      tabIndex={-1}
      onMouseMove={handleMouseMove}
      onMouseLeave={() => { if (isPlaying) dispatch({ type: 'TOGGLE_CONTROLS', payload: false }); }}
    >
      <audio ref={audioRef} src={content.videoUrl} onEnded={() => dispatch({type: 'ENDED'})} />

      {content.imageUrl && (
        <Image src={content.imageUrl} alt={content.title} fill className="object-cover opacity-20 blur-lg scale-110" priority />
      )}
      {currentScene && (
         <div className="absolute inset-0 flex items-center justify-center p-8">
            <div className="relative w-full h-full max-w-4xl max-h-[75vh]">
                <Image src={currentScene.imageUrl} alt={currentScene.text} fill className="object-contain" priority sizes="100vw" />
            </div>
         </div>
      )}
      
      <div className="absolute inset-0 flex items-center justify-between p-4 z-10">
         <Button variant="ghost" size="icon" className="text-white bg-black/30 hover:bg-black/50 h-16 w-16" onClick={(e) => {e.stopPropagation(); handleSceneChange('prev');}} disabled={currentSceneIndex === 0}><ChevronLeft className="w-12 h-12" /></Button>
         <Button variant="ghost" size="icon" className="text-white bg-black/30 hover:bg-black/50 h-20 w-20" onClick={(e) => {e.stopPropagation(); handlePlayToggle();}}>{isPlaying ? <Pause className="w-12 h-12" /> : <Play className="w-12 h-12" />}</Button>
         <Button variant="ghost" size="icon" className="text-white bg-black/30 hover:bg-black/50 h-16 w-16" onClick={(e) => {e.stopPropagation(); handleSceneChange('next');}} disabled={!content.scenes || currentSceneIndex === content.scenes.length - 1}><ChevronRight className="w-12 h-12" /></Button>
      </div>

      <div
        className={cn('absolute bottom-0 left-0 right-0 z-20 transition-transform duration-300', showControls ? 'translate-y-0' : 'translate-y-full')}
        onClick={(e) => e.stopPropagation()}
      >
        <div className="p-4 w-full bg-gradient-to-t from-black/80 via-black/50 to-transparent">
            <p className="text-center text-white text-lg drop-shadow-md mb-4 h-14 line-clamp-2">{currentScene?.text}</p>
            
            <div className="flex items-center gap-2 mb-2">
                {scenes?.map((scene, index) => {
                   let progressWidth = '0%';
                   if (index < currentSceneIndex) {
                       progressWidth = '100%';
                   } else if (index === currentSceneIndex && scene.duration > 0) {
                       let sceneStartProgress = 0;
                       for(let i=0; i<index; i++) {
                           sceneStartProgress += scenes[i].duration;
                       }
                       const currentSceneProgress = progress - sceneStartProgress;
                       progressWidth = `${(currentSceneProgress / scene.duration) * 100}%`;
                   }
                   return (
                      <div key={index} className="flex-1 h-1.5 bg-white/30 rounded-full cursor-pointer" onClick={() => dispatch({type: 'SEEK_TO_SCENE', payload: index})}>
                          <div className={cn("h-full bg-primary rounded-full")} style={{width: progressWidth}}/>
                      </div>
                   )
                })}
            </div>
            
            <div className="flex justify-between items-center text-white">
                <div className="flex items-center gap-2">
                    <Button variant="ghost" size="icon" className="text-white" onClick={handlePlayToggle}>{isPlaying ? <Pause /> : <Play />}</Button>
                    <Popover>
                        <PopoverTrigger asChild>
                             <Button variant="ghost" size="icon" aria-label="Volume">
                                {isMuted || volume === 0 ? <VolumeX /> : <Volume2 />}
                             </Button>
                        </PopoverTrigger>
                        <PopoverContent className="w-auto h-32 flex items-center justify-center p-2 mb-2">
                            <Slider value={[isMuted ? 0 : volume]} max={1} step={0.05} className="h-20" orientation="vertical" onValueChange={(v) => dispatch({type: 'VOLUME_CHANGE', payload: v[0]})} />
                        </PopoverContent>
                    </Popover>
                    <span className="text-xs font-mono">{formatTime(progress)} / {formatTime(duration)}</span>
                </div>
                <div className="flex items-center gap-2">
                    <Popover>
                        <PopoverTrigger asChild><Button variant="ghost" size="icon"><Settings /></Button></PopoverTrigger>
                        <PopoverContent onPointerDown={(e) => e.preventDefault()} className="w-56 p-0 mb-2" onOpenAutoFocus={(e) => e.preventDefault()}>
                             <div className={cn("p-2 space-y-1", activeSettingsPanel !== 'main' && 'hidden')}>
                                <Button variant="ghost" className="w-full justify-between h-9 px-2" onClick={() => setActiveSettingsPanel('speed')}>
                                    <span className="text-sm">Speed</span>
                                    <div className="flex items-center gap-2">
                                        <span className="text-sm text-muted-foreground">{playbackRate}x</span>
                                        <ChevronRight className="h-4 w-4 text-muted-foreground" />
                                    </div>
                                </Button>
                             </div>
                             <div className={cn(activeSettingsPanel !== 'speed' && 'hidden')}>
                                <div className="flex items-center p-2 border-b">
                                    <Button variant="ghost" size="icon" className="h-8 w-8 mr-1" onClick={() => setActiveSettingsPanel('main')}><ChevronLeft className="h-5 w-5" /></Button>
                                    <h4 className="text-sm font-semibold">Speed</h4>
                                </div>
                                <div className="p-2 space-y-1">
                                {[0.5, 1, 1.5, 2].map(rate => (
                                    <Button key={rate} variant="ghost" className="w-full justify-between h-9 px-2 text-sm" onClick={() => dispatch({type: 'RATE_CHANGE', payload: rate})}>
                                        <span>{rate}x</span>
                                        {playbackRate === rate && <Check className="h-4 w-4" />}
                                    </Button>
                                ))}
                                </div>
                             </div>
                        </PopoverContent>
                    </Popover>
                    <Button variant="ghost" size="icon" onClick={toggleFullscreen}>{isFullscreen ? <Minimize /> : <Maximize />}</Button>
                </div>
            </div>
        </div>
      </div>
    </div>
     </TooltipProvider>
  );
}
