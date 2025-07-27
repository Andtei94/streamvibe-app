
'use client';

import * as React from 'react';
import * as RechartsPrimitive from 'recharts';
import { cn } from '@/lib/utils';

const THEMES = { light: '', dark: '.dark' } as const;

export type ChartConfig = {
  [k in string]: {
    label?: React.ReactNode;
    icon?: React.ComponentType;
  } & (
    | { color?: string; theme?: never }
    | { color?: never; theme: Record<keyof typeof THEMES, string> }
  );
};

type ChartContextProps = {
  config: ChartConfig;
};

const ChartContext = React.createContext<ChartContextProps | null>(null);

function useChart() {
  const context = React.useContext(ChartContext);
  if (!context) {
    throw new Error('useChart must be used within a <ChartContainer />');
  }
  return context;
}

const ChartContainer = React.forwardRef<HTMLDivElement, React.ComponentProps<'div'> & {
    config: ChartConfig;
    children: React.ComponentProps<typeof RechartsPrimitive.ResponsiveContainer>['children'];
  }>(({ id, className, children, config, ...props }, ref) => {
    const uniqueId = React.useId();
    const chartId = `chart-${id || uniqueId.replace(/:/g, '')}`;
    const chartContainerClassNames = cn(
        "flex aspect-video justify-center text-xs",
        "[&_.recharts-cartesian-axis-tick_text]:fill-muted-foreground",
        "[&_.recharts-cartesian-grid_line[stroke='#ccc']]:stroke-border/50",
        "[&_.recharts-curve.recharts-tooltip-cursor]:stroke-border",
        "[&_.recharts-dot[stroke='#fff']]:stroke-transparent",
        "[&_.recharts-layer]:outline-none",
        "[&_.recharts-polar-grid_[stroke='#ccc']]:stroke-border",
        "[&_.recharts-radial-bar-background-sector]:fill-muted",
        "[&_.recharts-rectangle.recharts-tooltip-cursor]:fill-muted",
        "[&_.recharts-reference-line_[stroke='#ccc']]:stroke-border",
        "[&_.recharts-sector[stroke='#fff']]:stroke-transparent",
        "[&_.recharts-sector]:outline-none",
        "[&_.recharts-surface]:outline-none",
        className
    );

    return (
      <ChartContext.Provider value={{ config }}>
        <div data-chart={chartId} ref={ref} className={chartContainerClassNames} {...props}>
          <ChartStyle id={chartId} config={config} />
          <RechartsPrimitive.ResponsiveContainer>{children}</RechartsPrimitive.ResponsiveContainer>
        </div>
      </ChartContext.Provider>
    );
  }
);
ChartContainer.displayName = 'Chart';

const ChartStyle = ({ id, config }: { id: string; config: ChartConfig }) => {
  const colorConfig = Object.entries(config).filter(([_, config]) => config.theme || config.color);
  if (!colorConfig.length) return null;
  const css = Object.entries(THEMES).map(([theme, prefix]) => {
    const colors = colorConfig.map(([key, itemConfig]) => {
      const color = itemConfig.theme?.[theme as keyof typeof itemConfig.theme] || itemConfig.color;
      return color ? `  --color-${key}: ${color};` : null;
    }).join('\n');
    return `${prefix} [data-chart=${id}] {\n${colors}\n}`;
  }).join('\n');
  return <style dangerouslySetInnerHTML={{ __html: css }} />;
};

const ChartTooltip = RechartsPrimitive.Tooltip;

const TooltipLabel = ({ hideLabel, payload, label, labelFormatter, labelClassName }: any) => {
  const { config } = useChart();
  if (hideLabel || !payload?.length) return null;
  const item = payload[0];
  const key = `${item.dataKey || item.name || 'value'}`;
  const itemConfig = getPayloadConfigFromPayload(config, item, key);
  const value = itemConfig?.label || (typeof label === 'string' ? config[label]?.label : null) || label;
  if (labelFormatter) return <div className={cn('font-medium', labelClassName)}>{labelFormatter(value, payload)}</div>;
  if (!value) return null;
  return <div className={cn('font-medium', labelClassName)}>{value}</div>;
};

const TooltipContentItem = ({ item, nameKey, hideIndicator, indicator, formatter, index }: any) => {
    const { config } = useChart();
    const key = `${nameKey || item.name || item.dataKey || 'value'}`;
    const itemConfig = getPayloadConfigFromPayload(config, item, key);
    const indicatorColor = item.payload.fill || item.color;

    const renderFormattedValue = () => {
        if (formatter) return formatter(item.value, item.name, item, index, item.payload);
        return (
            <>
                <div className="grid flex-1 gap-1.5">
                    <span className="text-muted-foreground">{itemConfig?.label || item.name}</span>
                </div>
                {item.value && <span className="font-mono font-medium tabular-nums text-foreground">{item.value.toLocaleString()}</span>}
            </>
        );
    };

    return (
        <div className={cn("flex w-full items-stretch gap-2 [&>svg]:h-2.5 [&>svg]:w-2.5 [&>svg]:text-muted-foreground", indicator === 'dot' && 'items-center')}>
            {!hideIndicator && (
                <div className={cn("shrink-0 rounded-[2px] border-[--color-border] bg-[--color-bg]", {'h-2.5 w-2.5': indicator === 'dot', 'w-1': indicator === 'line', 'w-0 border-[1.5px] border-dashed bg-transparent': indicator === 'dashed'})} style={{ '--color-bg': indicatorColor, '--color-border': indicatorColor } as React.CSSProperties} />
            )}
            <div className={cn("flex flex-1 justify-between leading-none", indicator !== "dot" ? "items-end" : "items-center")}>
                {renderFormattedValue()}
            </div>
        </div>
    );
};

const ChartTooltipContent = React.forwardRef<HTMLDivElement, React.ComponentProps<typeof RechartsPrimitive.Tooltip> & React.ComponentProps<'div'> & {
    hideLabel?: boolean;
    hideIndicator?: boolean;
    indicator?: 'line' | 'dot' | 'dashed';
    nameKey?: string;
    labelKey?: string;
  }
>(({ active, payload, className, indicator = 'dot', hideLabel = false, hideIndicator = false, label, labelFormatter, labelClassName, formatter, nameKey, labelKey }, ref) => {
    if (!active || !payload?.length) return null;

    return (
      <div ref={ref} className={cn('grid min-w-[8rem] items-start gap-1.5 rounded-lg border border-border/50 bg-background px-2.5 py-1.5 text-xs shadow-xl', className)}>
        <TooltipLabel hideLabel={hideLabel} payload={payload} label={label} labelFormatter={labelFormatter} labelClassName={labelClassName} />
        <div className="grid gap-1.5">
            {payload.map((item, index) => (
                <TooltipContentItem key={item.dataKey} item={item} nameKey={nameKey} hideIndicator={hideIndicator} indicator={indicator} formatter={formatter} index={index} />
            ))}
        </div>
      </div>
    );
  }
);
ChartTooltipContent.displayName = 'ChartTooltip';

const ChartLegend = RechartsPrimitive.Legend;

const ChartLegendContent = React.forwardRef<HTMLDivElement, React.ComponentProps<'div'> & Pick<RechartsPrimitive.LegendProps, 'payload' | 'verticalAlign'> & {
      hideIcon?: boolean;
      nameKey?: string;
    }
>(({ className, hideIcon = false, payload, verticalAlign = 'bottom', nameKey }, ref) => {
  const { config } = useChart();
  if (!payload?.length) return null;

  return (
    <div ref={ref} className={cn('flex items-center justify-center gap-4', verticalAlign === 'top' ? 'pb-3' : 'pt-3', className)}>
      {payload.map((item) => {
        const key = `${nameKey || item.dataKey || 'value'}`;
        const itemConfig = getPayloadConfigFromPayload(config, item, key);
        return (
          <div key={item.value as string} className={cn('flex items-center gap-1.5 [&>svg]:h-3 [&>svg]:w-3 [&>svg]:text-muted-foreground')}>
            {itemConfig?.icon && !hideIcon ? <itemConfig.icon /> : <div className="h-2 w-2 shrink-0 rounded-[2px]" style={{ backgroundColor: item.color }} />}
            {itemConfig?.label}
          </div>
        );
      })}
    </div>
  );
});
ChartLegendContent.displayName = 'ChartLegend';

function getPayloadConfigFromPayload(config: ChartConfig, payload: unknown, key: string) {
  if (typeof payload !== 'object' || payload === null) return undefined;
  const payloadPayload = 'payload' in payload && typeof payload.payload === 'object' && payload.payload !== null ? payload.payload : undefined;
  let configLabelKey: string = key;
  if (key in payload && typeof payload[key as keyof typeof payload] === 'string') {
    configLabelKey = payload[key as keyof typeof payload] as string;
  } else if (payloadPayload && key in payloadPayload && typeof payloadPayload[key as keyof typeof payloadPayload] === 'string') {
    configLabelKey = payloadPayload[key as keyof typeof payloadPayload] as string;
  }
  return configLabelKey in config ? config[configLabelKey] : config[key as keyof typeof config];
}

export { ChartContainer, ChartTooltip, ChartTooltipContent, ChartLegend, ChartLegendContent, ChartStyle };
