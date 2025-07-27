
'use client';

import { useState, useEffect, useRef, useMemo, useCallback } from 'react';
import Image from 'next/image';
import type { LiveChannel, Program } from '@/lib/types';
import { ScrollArea, ScrollBar } from '@/components/ui/scroll-area';
import { cn } from '@/lib/utils';
import { 
  format,
  startOfHour,
  addMinutes,
  addHours,
  differenceInMinutes,
  isWithinInterval,
  parseISO
} from 'date-fns';
import { EPG_PIXELS_PER_MINUTE, GUIDE_HOURS } from '@/lib/constants';
import { Skeleton } from '@/components/ui/skeleton';
import { useIsMobile } from '@/hooks/use-mobile';
import {Card} from '@/components/ui/card';
import { logger } from '@/lib/logger';

interface EPGGridProps {
  channels: LiveChannel[];
  onSelectChannel: (channel: LiveChannel) => void;
  selectedChannelId: string | null;
}

const usePreParsedChannels = (channels: LiveChannel[]) => {
    return useMemo(() => {
        return channels.map(channel => ({
            ...channel,
            epg: (
                (channel.epg || []).map(program => {
                    try {
                        return {
                            ...program,
                            parsedStart: parseISO(program.startDateTime),
                            parsedEnd: parseISO(program.endDateTime),
                        }
                    } catch (e) {
                        logger.error({ e, program }, "Failed to parse program dates");
                        return null;
                    }
                }).filter(Boolean) as (Program & { parsedStart: Date, parsedEnd: Date })[]
            ).sort((a, b) => a.parsedStart.getTime() - b.parsedStart.getTime()),
        }));
    }, [channels]);
};

const findProgramAtTime = (sortedEpg: (Program & { parsedStart: Date, parsedEnd: Date })[], time: Date): Program | null => {
  if (!sortedEpg || sortedEpg.length === 0) return null;

  // Binary search implementation
  let low = 0;
  let high = sortedEpg.length - 1;
  let result: Program | null = null;

  while (low <= high) {
    const mid = Math.floor((low + high) / 2);
    const program = sortedEpg[mid];
    
    if (isWithinInterval(time, { start: program.parsedStart, end: program.parsedEnd })) {
      return program;
    } else if (program.parsedStart > time) {
      high = mid - 1;
    } else {
      low = mid + 1;
    }
  }
  return null;
};

export function EPGGrid({ channels, onSelectChannel, selectedChannelId }: EPGGridProps) {
  const [now, setNow] = useState<Date | null>(null);
  const headerRef = useRef<HTMLDivElement>(null);
  const programGridRef = useRef<HTMLDivElement>(null);
  const intervalRef = useRef<NodeJS.Timeout | null>(null);

  const preParsedChannels = usePreParsedChannels(channels);
  const isMobile = useIsMobile();

  const timelineStart = useMemo(() => (now ? startOfHour(now) : new Date()), [now]);
  const timelineEnd = useMemo(() => addHours(timelineStart, GUIDE_HOURS), [timelineStart]);

  useEffect(() => {
    setNow(new Date());
    intervalRef.current = setInterval(() => setNow(new Date()), 60000);
    return () => {
        if(intervalRef.current) clearInterval(intervalRef.current);
    };
  }, []);

  useEffect(() => {
    if (now && programGridRef.current && headerRef.current) {
      const initialOffset = differenceInMinutes(now, timelineStart) * EPG_PIXELS_PER_MINUTE;
      const scrollPosition = Math.max(0, initialOffset - 100);
      programGridRef.current.scrollLeft = scrollPosition;
      headerRef.current.scrollLeft = scrollPosition;
    }
  }, [now, timelineStart]);


  const timelineHeaders = useMemo(() => {
    const headers = [];
    let time = timelineStart;
    while (time < timelineEnd) {
      headers.push(
        <div
          key={time.toISOString()}
          className="flex-shrink-0 text-center text-sm font-semibold border-r"
          style={{ width: `${30 * EPG_PIXELS_PER_MINUTE}px` }}
        >
          {format(time, 'HH:mm')}
        </div>
      );
      time = addMinutes(time, 30);
    }
    return headers;
  }, [timelineStart, timelineEnd]);
  
  const nowPosition = now ? differenceInMinutes(now, timelineStart) * EPG_PIXELS_PER_MINUTE : -1;

  const syncScroll = (scrolledElement: HTMLDivElement) => {
    if (headerRef.current) {
      headerRef.current.scrollLeft = scrolledElement.scrollLeft;
    }
    if (programGridRef.current) {
      programGridRef.current.scrollLeft = scrolledElement.scrollLeft;
    }
  };
  
  const getProgramForTime = useCallback((channel: (typeof preParsedChannels)[0], time: Date | null): Program | null => {
    if (!channel.epg || !time) return null;
    return findProgramAtTime(channel.epg, time);
  }, []);
  
if (!now || isMobile === undefined) {
    return <Skeleton className="h-96 w-full" />
  }
  
if (isMobile) {
    return (
        <ScrollArea>
            <div className="flex gap-4 pb-4">
                {preParsedChannels.map((channel) => (
                    <Card key={channel.id} onClick={() => onSelectChannel(channel)} className={cn("p-3 flex flex-col gap-2 active:bg-secondary w-64 flex-shrink-0", selectedChannelId === channel.id && "bg-secondary ring-2 ring-primary")}>
                         <div className="flex items-center gap-2">
                            <Image
                                src={channel.logoUrl}
                                alt={`Logo for ${channel.name}`}
                                width={40}
                                height={40}
                                className="h-10 w-10 object-contain rounded-md bg-white/10 p-1 flex-shrink-0"
                            />
                            <div className="flex-1 min-w-0">
                                <h4 className="font-semibold truncate">{channel.name}</h4>
                                <p className="text-sm text-muted-foreground">{channel.category}</p>
                            </div>
                        </div>
                        <div className="bg-muted/50 p-2 rounded-md h-24">
                            <p className="font-semibold text-sm truncate">{getProgramForTime(channel, now)?.title || "Currently Off-Air"}</p>
                            <p className="text-xs text-muted-foreground line-clamp-3">{getProgramForTime(channel, now)?.description}</p>
                        </div>
                    </Card>
                ))}
            </div>
            <ScrollBar orientation="horizontal" />
        </ScrollArea>
    );
  }

  return (
    <div className="bg-card border rounded-lg overflow-hidden flex" style={{ height: 'calc(100vh - 250px)' }}>
      {/* Channels Column */}
      <div className="w-48 shrink-0 border-r flex flex-col">
        <div className="h-10 flex items-center p-2 font-semibold bg-card border-b sticky top-0 z-20">Channels</div>
        <ScrollArea className="flex-1">
          {preParsedChannels.map((channel) => (
            <div
              key={channel.id}
              className={cn(
                "flex items-center p-2 border-b cursor-pointer h-[80px]",
                "hover:bg-secondary/50",
                channel.id === selectedChannelId && "bg-secondary"
              )}
              onClick={() => onSelectChannel(channel)}
            >
              <Image
                src={channel.logoUrl}
                alt={`Logo for ${channel.name}`}
                width={40}
                height={40}
                className="h-10 w-10 object-contain rounded-md bg-white/10 p-1 mr-2 flex-shrink-0"
              />
              <div className="flex-1 min-w-0">
                <p className="font-semibold truncate">{channel.name}</p>
                <p className="text-xs text-muted-foreground truncate">{getProgramForTime(channel, now)?.title || "Currently Off-Air"}</p>
              </div>
            </div>
          ))}
        </ScrollArea>
      </div>

      {/* EPG Column */}
      <div className="flex-1 flex flex-col overflow-hidden">
        <div className="h-10 shrink-0 border-b overflow-hidden">
          <div ref={headerRef} className="flex h-10 items-center" style={{ width: `${GUIDE_HOURS * 60 * EPG_PIXELS_PER_MINUTE}px` }}>
            {timelineHeaders}
          </div>
        </div>
        <ScrollArea className="flex-1" onScroll={(e) => syncScroll(e.currentTarget as HTMLDivElement)} ref={programGridRef}>
          <div className="relative" style={{ height: `${preParsedChannels.length * 80}px`, width: `${GUIDE_HOURS * 60 * EPG_PIXELS_PER_MINUTE}px` }}>
            {/* Hour markers */}
            {Array.from({ length: GUIDE_HOURS }).map((_, i) => (
              <div key={i} className="absolute top-0 bottom-0 border-l border-dashed" style={{ left: `${i * 60 * EPG_PIXELS_PER_MINUTE}px` }} />
            ))}

            {/* Programs */}
            {preParsedChannels.map((channel, channelIndex) => (
              <div key={channel.id} className="absolute w-full h-[80px]" style={{ top: `${channelIndex * 80}px` }}>
                {channel.epg?.map((program, progIndex) => {
                  const startOffsetMinutes = differenceInMinutes(program.parsedStart, timelineStart);
                  const durationMinutes = differenceInMinutes(program.parsedEnd, program.parsedStart);

                  if (durationMinutes <= 0) {
                    logger.warn({ program }, 'Program with duration <= 0 detected and skipped.');
                    return null;
                  }
                  if (startOffsetMinutes > GUIDE_HOURS * 60 || startOffsetMinutes + durationMinutes < 0) return null;

                  const isCurrent = now >= program.parsedStart && now < program.parsedEnd;

                  return (
                    <div
                      key={progIndex}
                      className={cn(
                        "absolute my-1 p-2 rounded-md border flex flex-col justify-center transition-colors inset-y-1",
                        isCurrent ? "bg-primary/20 border-primary z-20" : "bg-muted/50",
                        "hover:bg-primary/30 cursor-pointer"
                      )}
                      style={{
                        left: `${startOffsetMinutes * EPG_PIXELS_PER_MINUTE}px`,
                        width: `${durationMinutes * EPG_PIXELS_PER_MINUTE}px`,
                      }}
                      onClick={() => onSelectChannel(channel)}
                      title={`${program.title} (${format(program.parsedStart, 'HH:mm')} - ${format(program.parsedEnd, 'HH:mm')})`}
                    >
                      <p className="font-semibold text-sm truncate">{program.title}</p>
                      <p className="text-xs text-muted-foreground truncate">{program.description}</p>
                    </div>
                  );
                })}
              </div>
            ))}
            
            {/* "Now" indicator line */}
            {nowPosition > -1 && (
              <div
                className="absolute top-0 bottom-0 w-0.5 bg-primary z-30 pointer-events-none"
                style={{ left: `${nowPosition}px` }}
              >
                <div className="absolute -top-1 -translate-x-1/2 left-1/2 h-2 w-2 rounded-full bg-primary" />
              </div>
            )}
          </div>
          <ScrollBar orientation="horizontal" />
        </ScrollArea>
      </div>
    </div>
  );
}
