
'use client';

import React, { useRef, useState } from 'react';
import ReactPlayer from 'react-player/lazy';
import { Play, Pause, Volume2, Maximize, Loader2, AlertTriangle, VolumeX } from 'lucide-react';
import { Button } from './ui/button';
import { Badge } from './ui/badge';
import { Slider } from './ui/slider';
import { Popover, PopoverContent, PopoverTrigger } from './ui/popover';
import { logger } from '@/lib/logger';

interface StreamVibePlayerProps {
  url: string;
  title: string;
}

export function StreamVibePlayer({ url, title }: StreamVibePlayerProps) {
  const [isPlaying, setIsPlaying] = useState(true);
  const [volume, setVolume] = useState(0.8);
  const [isMuted, setIsMuted] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const wrapperRef = useRef<HTMLDivElement>(null);

  const togglePlay = () => setIsPlaying(p => !p);
  const handleVolumeChange = (newVolume: number[]) => {
    setIsMuted(newVolume[0] === 0);
    setVolume(newVolume[0]);
  };
  const toggleFullscreen = () => {
    if (wrapperRef.current && !document.fullscreenElement) {
      wrapperRef.current.requestFullscreen().catch(err => logger.error({error: err}, 'Fullscreen request failed'));
    } else if (document.exitFullscreen) {
      document.exitFullscreen();
    }
  };

  return (
    <div ref={wrapperRef} className="relative aspect-video w-full bg-black rounded-lg overflow-hidden group/player">
      <ReactPlayer
        url={url}
        playing={isPlaying}
        volume={volume}
        muted={isMuted}
        controls={false}
        width="100%"
        height="100%"
        onReady={() => setIsLoading(false)}
        onBuffer={() => setIsLoading(true)}
        onBufferEnd={() => setIsLoading(false)}
        onError={(e, data, instance, global) => {
            logger.error({ error: e, data, instance, global }, "Live Stream Error");
            setError("This live stream is currently unavailable.");
            setIsLoading(false);
        }}
        config={{
            file: {
                forceHLS: true,
            }
        }}
        className="absolute top-0 left-0 [&>video]:object-contain"
      />

      {(isLoading || error) && (
        <div className="absolute inset-0 grid place-items-center text-white bg-black/50">
          {isLoading && !error && <Loader2 className="w-12 h-12 animate-spin" />}
          {error && (
            <div className="p-4 rounded-lg text-center">
                <AlertTriangle className="w-12 h-12 mx-auto text-amber-400 mb-2"/>
                <p className="font-semibold">Playback Error</p>
                <p className="text-sm text-neutral-300 mb-4 max-w-sm">{error}</p>
            </div>
          )}
        </div>
      )}

      <div className="absolute inset-0 opacity-0 group-hover/player:opacity-100 transition-opacity duration-300 bg-gradient-to-t from-black/60 to-transparent flex flex-col justify-end p-4">
        <div className="flex justify-between items-center">
          <div className="flex items-center gap-2">
            <Button variant="ghost" size="icon" onClick={togglePlay} className="text-white hover:text-primary" disabled={isLoading || !!error}>
              {isPlaying ? <Pause /> : <Play />}
            </Button>
            
            <Popover>
                <PopoverTrigger asChild>
                    <Button variant="ghost" size="icon" className="text-white hover:text-primary" disabled={isLoading}>
                        {isMuted || volume === 0 ? <VolumeX /> : <Volume2 />}
                    </Button>
                </PopoverTrigger>
                <PopoverContent className="w-auto h-32 flex items-center justify-center p-2 mb-2">
                    <Slider
                        value={[isMuted ? 0 : volume]}
                        max={1}
                        step={0.05}
                        className="h-20"
                        orientation="vertical"
                        onValueChange={handleVolumeChange}
                    />
                </PopoverContent>
            </Popover>
          </div>
          <div className="flex items-center gap-2">
            <Badge className="bg-red-600 text-white pointer-events-none">LIVE</Badge>
            <Button variant="ghost" size="icon" onClick={toggleFullscreen} className="text-white hover:text-primary">
              <Maximize />
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
}
