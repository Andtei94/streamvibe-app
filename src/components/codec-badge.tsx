import React from 'react';
import { AudioWaveform } from 'lucide-react';
import { Badge } from './ui/badge';
import { cn } from '@/lib/utils';

type CodecBadgeProps = {
  codec: string;
};

const CodecBadgeComponent = ({ codec }: CodecBadgeProps) => {
    const isPremium = /dolby|dts|atmos|imax/i.test(codec);

  return (
    <Badge 
        variant={isPremium ? "default" : "outline"} 
        className={cn("flex items-center gap-1.5", !isPremium && "border-dashed")}
        title={isPremium ? `Premium Audio: ${codec}` : `Audio: ${codec}`}
    >
      <AudioWaveform className="h-3 w-3" />
      {codec}
    </Badge>
  );
};

export const CodecBadge = React.memo(CodecBadgeComponent);
