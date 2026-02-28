"use client";

import * as React from "react";

import { cn } from "@/lib/utils";

interface CollapsibleContextValue {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

const CollapsibleContext = React.createContext<CollapsibleContextValue | null>(null);

export function Collapsible({
  open: controlledOpen,
  defaultOpen,
  onOpenChange,
  children,
  className,
  ...props
}: React.HTMLAttributes<HTMLDivElement> & {
  open?: boolean;
  defaultOpen?: boolean;
  onOpenChange?: (open: boolean) => void;
}) {
  const [uncontrolledOpen, setUncontrolledOpen] = React.useState(defaultOpen ?? false);
  const open = controlledOpen ?? uncontrolledOpen;
  const handleOpenChange = onOpenChange ?? setUncontrolledOpen;

  return (
    <CollapsibleContext.Provider value={{ open, onOpenChange: handleOpenChange }}>
      <div data-state={open ? "open" : "closed"} className={cn(className)} {...props}>
        {children}
      </div>
    </CollapsibleContext.Provider>
  );
}

export function CollapsibleTrigger({
  children,
  className,
  ...props
}: React.ButtonHTMLAttributes<HTMLButtonElement>) {
  const ctx = React.useContext(CollapsibleContext);
  if (!ctx) return null;
  return (
    <button
      type="button"
      aria-expanded={ctx.open}
      className={cn(
        "flex w-full items-center justify-between rounded-md px-4 py-3 text-left font-medium hover:bg-muted/50 transition-colors",
        className
      )}
      onClick={() => ctx.onOpenChange(!ctx.open)}
      {...props}
    >
      {children}
      <span className="text-muted-foreground">{ctx.open ? "▲" : "▼"}</span>
    </button>
  );
}

export function CollapsibleContent({
  children,
  className,
  ...props
}: React.HTMLAttributes<HTMLDivElement>) {
  const ctx = React.useContext(CollapsibleContext);
  if (!ctx) return null;
  if (!ctx.open) return null;
  return (
    <div className={cn("px-4 pb-3", className)} {...props}>
      {children}
    </div>
  );
}
