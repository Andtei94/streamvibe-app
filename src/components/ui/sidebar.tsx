
"use client"

import * as React from "react"
import { cva, type VariantProps } from "class-variance-authority"
import { ChevronsLeft, ChevronsRight } from "lucide-react"

import { cn } from "@/lib/utils"
import { Button } from "./button"
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "./tooltip"
import { useIsMobile } from "@/hooks/use-mobile"

/* -------------------------------------------------------------------------- */
/*                                  Variants                                  */
/* -------------------------------------------------------------------------- */

const sidebarVariants = cva(
  "fixed left-0 top-0 z-50 flex h-screen flex-col border-r bg-background transition-all duration-300 ease-in-out",
  {
    variants: {
      state: {
        expanded: "w-64",
        collapsed: "w-[72px]",
        hidden: "-translate-x-full",
      },
    },
    defaultVariants: {
      state: "expanded",
    },
  }
)

const sidebarMenuButtonVariants = cva(
  "flex w-full items-center justify-start gap-4 rounded-lg p-3 text-left text-sm font-medium text-muted-foreground transition-colors duration-200 hover:bg-secondary hover:text-foreground",
  {
    variants: {
      size: {
        default: "h-11",
        sm: "h-9",
        lg: "h-12",
      },
    },
    defaultVariants: {
      size: "default",
    },
  }
)

/* -------------------------------------------------------------------------- */
/*                                  Context                                   */
/* -------------------------------------------------------------------------- */

type SidebarState = "expanded" | "collapsed";

type SidebarContextValue = {
  state: SidebarState;
  setState: React.Dispatch<React.SetStateAction<SidebarState>>;
  isMobile: boolean | undefined;
  close: () => void;
};

const SidebarContext = React.createContext<SidebarContextValue | null>(null)

export function useSidebar() {
  const context = React.useContext(SidebarContext)
  if (!context) {
    throw new Error("useSidebar must be used within a SidebarProvider")
  }
  return context
}

/* -------------------------------------------------------------------------- */
/*                                  Provider                                  */
/* -------------------------------------------------------------------------- */

export function SidebarProvider({ children }: { children: React.ReactNode }) {
  const isMobile = useIsMobile()
  const [state, setState] = React.useState<SidebarState>(
    isMobile ? "collapsed" : "expanded"
  )
  
  const close = React.useCallback(() => {
    setState("collapsed");
  }, []);

  return (
    <SidebarContext.Provider value={{ state, setState, isMobile, close }}>
       <TooltipProvider delayDuration={0}>
        <div
          className={cn(
            "relative flex min-h-screen",
            !isMobile &&
              state === "expanded" &&
              "grid-cols-[256px,1fr] md:grid",
            !isMobile &&
              state === "collapsed" &&
              "grid-cols-[72px,1fr] md:grid"
          )}
          data-sidebar-root
        >
          {children}
        </div>
      </TooltipProvider>
    </SidebarContext.Provider>
  )
}

/* -------------------------------------------------------------------------- */
/*                                 Components                                 */
/* -------------------------------------------------------------------------- */

const Sidebar = React.forwardRef<
  HTMLElement,
  React.HTMLAttributes<HTMLElement> &
    VariantProps<typeof sidebarVariants> & {
      collapsible?: "icon" | "button"
    }
>(({ className, children, collapsible, ...props }, ref) => {
  const { state, isMobile } = useSidebar()
  const sidebarState = isMobile ? (state === 'expanded' ? 'expanded' : 'hidden') : state;

  return (
    <>
      <aside
        ref={ref}
        className={cn(
          sidebarVariants({ state: sidebarState }),
          className
        )}
        data-collapsible={collapsible}
        data-state={state}
        {...props}
      >
        <div className="flex h-full flex-col">{children}</div>
      </aside>
      <SidebarOverlay />
    </>
  )
})
Sidebar.displayName = "Sidebar"

const SidebarHeader = React.forwardRef<
  HTMLElement,
  React.HTMLAttributes<HTMLElement>
>(({ className, ...props }, ref) => {
  return (
    <header
      ref={ref}
      className={cn("flex shrink-0 items-center justify-between", className)}
      {...props}
    />
  )
})
SidebarHeader.displayName = "SidebarHeader"

const SidebarContent = React.forwardRef<
  HTMLElement,
  React.HTMLAttributes<HTMLElement>
>(({ className, ...props }, ref) => {
  return (
    <main
      ref={ref}
      className={cn("flex-1 overflow-y-auto", className)}
      {...props}
    />
  )
})
SidebarContent.displayName = "SidebarContent"

const SidebarFooter = React.forwardRef<
  HTMLElement,
  React.HTMLAttributes<HTMLElement>
>(({ className, ...props }, ref) => {
  return (
    <footer
      ref={ref}
      className={cn("mt-auto shrink-0", className)}
      {...props}
    />
  )
})
SidebarFooter.displayName = "SidebarFooter"

const SidebarMenu = React.forwardRef<
  HTMLDivElement,
  React.HTMLAttributes<HTMLDivElement>
>(({ className, ...props }, ref) => {
  return (
    <div
      ref={ref}
      className={cn(
        "flex flex-col gap-2 px-3 py-4 group-data-[collapsible=icon]:gap-3 group-data-[collapsible=icon]:px-3",
        className
      )}
      {...props}
    />
  )
})
SidebarMenu.displayName = "SidebarMenu"

const SidebarMenuItem = React.forwardRef<
  HTMLDivElement,
  React.HTMLAttributes<HTMLDivElement>
>(({ className, ...props }, ref) => {
  return <div ref={ref} className={cn("w-full", className)} {...props} />
})
SidebarMenuItem.displayName = "SidebarMenuItem"

const SidebarSeparator = React.forwardRef<
  HTMLHRElement,
  React.HTMLAttributes<HTMLHRElement>
>(({ className, ...props }, ref) => {
  return (
    <hr
      ref={ref}
      className={cn("my-2 border-border", className)}
      {...props}
    />
  )
})
SidebarSeparator.displayName = "SidebarSeparator"

const SidebarCollapseButton = React.forwardRef<
  HTMLButtonElement,
  React.ButtonHTMLAttributes<HTMLButtonElement>
>(({ className, ...props }, ref) => {
  const { state, setState, isMobile } = useSidebar()
  if (isMobile) return null

  return (
     <Tooltip>
      <TooltipTrigger asChild>
        <Button
          ref={ref}
          variant="ghost"
          size="icon"
          className={cn("size-8 shrink-0", className)}
          onClick={() =>
            setState(state === "expanded" ? "collapsed" : "expanded")
          }
          {...props}
          aria-label={state === 'expanded' ? 'Collapse Sidebar' : 'Expand Sidebar'}
          aria-expanded={state === 'expanded'}
        >
          {state === "expanded" ? (
            <ChevronsLeft className="size-4" />
          ) : (
            <ChevronsRight className="size-4" />
          )}
        </Button>
      </TooltipTrigger>
      <TooltipContent side="right" align="center">
        {state === 'expanded' ? 'Collapse' : 'Expand'}
      </TooltipContent>
    </Tooltip>
  )
})
SidebarCollapseButton.displayName = "SidebarCollapseButton"

const SidebarTrigger = React.forwardRef<
  HTMLButtonElement,
  React.ButtonHTMLAttributes<HTMLButtonElement>
>((props, ref) => {
  const { state, setState, isMobile } = useSidebar()
  if (!isMobile) return null
  
  const toggle = () => {
    setState(state === 'expanded' ? 'collapsed' : 'expanded');
  }

  return (
    <Button
      ref={ref}
      variant="ghost"
      size="icon"
      onClick={toggle}
      {...props}
      aria-label="Toggle Sidebar"
      aria-expanded={state === 'expanded'}
    />
  )
})
SidebarTrigger.displayName = "SidebarTrigger"

const SidebarOverlay = React.forwardRef<
  HTMLDivElement,
  React.HTMLAttributes<HTMLDivElement>
>((props, ref) => {
  const { state, close, isMobile } = useSidebar()
  if (!isMobile) return null
  
  return (
    <div
      ref={ref}
      className={cn(
        "fixed inset-0 z-40 bg-black/50 transition-opacity duration-300",
        state === "expanded"
          ? "opacity-100"
          : "pointer-events-none opacity-0"
      )}
      onClick={close}
      {...props}
    />
  )
})
SidebarOverlay.displayName = "SidebarOverlay"

export {
  Sidebar,
  SidebarHeader,
  SidebarContent,
  SidebarFooter,
  SidebarMenu,
  SidebarMenuItem,
  SidebarSeparator,
  SidebarCollapseButton,
  SidebarTrigger,
  sidebarMenuButtonVariants,
}
