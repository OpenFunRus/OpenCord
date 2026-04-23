import * as TooltipPrimitive from '@radix-ui/react-tooltip';
import * as React from 'react';

import { cn } from '../lib/utils';

function TooltipProvider({
  delayDuration = 0,
  ...props
}: React.ComponentProps<typeof TooltipPrimitive.Provider>) {
  return (
    <TooltipPrimitive.Provider
      data-slot="tooltip-provider"
      delayDuration={delayDuration}
      {...props}
    />
  );
}

function TooltipRoot({
  ...props
}: React.ComponentProps<typeof TooltipPrimitive.Root>) {
  return (
    <TooltipProvider>
      <TooltipPrimitive.Root data-slot="tooltip" {...props} />
    </TooltipProvider>
  );
}

function TooltipTrigger({
  ...props
}: React.ComponentProps<typeof TooltipPrimitive.Trigger>) {
  return <TooltipPrimitive.Trigger data-slot="tooltip-trigger" {...props} />;
}

function TooltipContent({
  className,
  sideOffset = 0,
  children,
  ...props
}: React.ComponentProps<typeof TooltipPrimitive.Content>) {
  return (
    <TooltipPrimitive.Portal>
      <TooltipPrimitive.Content
        data-slot="tooltip-content"
        sideOffset={sideOffset}
        className={cn(
          'animate-in fade-in-0 zoom-in-95 data-[state=closed]:animate-out data-[state=closed]:fade-out-0 data-[state=closed]:zoom-out-95 data-[side=bottom]:slide-in-from-top-2 data-[side=left]:slide-in-from-right-2 data-[side=right]:slide-in-from-left-2 data-[side=top]:slide-in-from-bottom-2 z-50 w-fit max-w-xs origin-(--radix-tooltip-content-transform-origin) rounded-md border border-[#314055] bg-[#172231] px-3 py-2 text-xs leading-normal text-[#d7e2f0] text-balance shadow-[0_18px_42px_rgba(2,6,23,0.42)]',
          className
        )}
        {...props}
      >
        {children}
        <TooltipPrimitive.Arrow
          width={10}
          height={5}
          className="z-50 fill-[#172231]"
        />
      </TooltipPrimitive.Content>
    </TooltipPrimitive.Portal>
  );
}

type TTooltipProps = {
  children: React.ReactElement;
  content: React.ReactNode;
  sideOffset?: number;
  asChild?: boolean;
};

const Tooltip = ({
  children,
  content,
  sideOffset = 4,
  asChild = true
}: TTooltipProps) => (
  <TooltipProvider>
    <TooltipRoot delayDuration={200}>
      <TooltipTrigger asChild={asChild}>{children}</TooltipTrigger>
      <TooltipContent sideOffset={sideOffset}>{content}</TooltipContent>
    </TooltipRoot>
  </TooltipProvider>
);

export {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipRoot,
  TooltipTrigger
};
