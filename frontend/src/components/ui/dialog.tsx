"use client";

import * as DialogPrimitive from "@radix-ui/react-dialog";
import { cn } from "@/src/lib/utils";

const Dialog = DialogPrimitive.Root;
const DialogTrigger = DialogPrimitive.Trigger;
const DialogPortal = DialogPrimitive.Portal;

const DialogOverlay = ({
  className,
  ...props
}: React.ComponentPropsWithoutRef<typeof DialogPrimitive.Overlay>) => (
  <DialogPrimitive.Overlay
    className={cn("fixed inset-0 bg-black/40 backdrop-blur-sm", className)}
    {...props}
  />
);
DialogOverlay.displayName = DialogPrimitive.Overlay.displayName;

const DialogContent = ({
  className,
  ...props
}: React.ComponentPropsWithoutRef<typeof DialogPrimitive.Content>) => (
  <DialogPortal>
    <DialogOverlay />
    <DialogPrimitive.Content
      className={cn(
        "fixed left-1/2 top-1/2 z-50 w-[90vw] max-w-2xl max-h-[90vh] -translate-x-1/2 -translate-y-1/2 rounded-md border bg-background shadow-lg focus:outline-none overflow-y-auto",
        className
      )}
      {...props}
    />
  </DialogPortal>
);
DialogContent.displayName = DialogPrimitive.Content.displayName;

const DialogHeader = ({
  className,
  ...props
}: React.HTMLAttributes<HTMLDivElement>) => (
  <div className={cn("mb-4 space-y-1 p-6 pb-0", className)} {...props} />
);
const DialogFooter = ({
  className,
  ...props
}: React.HTMLAttributes<HTMLDivElement>) => (
  <div
    className={cn(
      "mt-4 flex items-center justify-end gap-2 p-6 pt-0",
      className
    )}
    {...props}
  />
);
const DialogTitle = ({
  className,
  ...props
}: React.ComponentPropsWithoutRef<typeof DialogPrimitive.Title>) => (
  <DialogPrimitive.Title
    className={cn("text-lg font-semibold", className)}
    {...props}
  />
);
const DialogDescription = ({
  className,
  ...props
}: React.ComponentPropsWithoutRef<typeof DialogPrimitive.Description>) => (
  <DialogPrimitive.Description
    className={cn("text-sm text-muted-foreground", className)}
    {...props}
  />
);

export {
  Dialog,
  DialogTrigger,
  DialogContent,
  DialogHeader,
  DialogFooter,
  DialogTitle,
  DialogDescription,
};
