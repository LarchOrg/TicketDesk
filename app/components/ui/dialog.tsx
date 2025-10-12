import { X } from "lucide-react";
import * as React from "react";

interface DialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  children: React.ReactNode;
}

interface DialogContentProps {
  children: React.ReactNode;
  className?: string;
}

interface DialogHeaderProps {
  children: React.ReactNode;
  className?: string;
}

interface DialogTitleProps {
  children: React.ReactNode;
  className?: string;
}

interface DialogDescriptionProps {
  children: React.ReactNode;
  className?: string;
}

interface DialogFooterProps {
  children: React.ReactNode;
  className?: string;
}

export function Dialog({ open, onOpenChange, children }: DialogProps) {
  React.useEffect(() => {
    const handleEscape = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        onOpenChange(false);
      }
    };

    if (open) {
      document.addEventListener("keydown", handleEscape);
      document.body.style.overflow = "hidden";
    }

    return () => {
      document.removeEventListener("keydown", handleEscape);
      document.body.style.overflow = "unset";
    };
  }, [open, onOpenChange]);

  // Ensure all hooks run before performing an early return to avoid
  // "Rendered fewer hooks than expected" errors.
  if (!open) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center">
      {/* Backdrop */}
      <div
        className="fixed inset-0 bg-black/50 backdrop-blur-sm"
        onClick={() => onOpenChange(false)}
      />
      {/* Content */}
      {children}
    </div>
  );
}

export function DialogContent({
  children,
  className = "",
}: DialogContentProps) {
  return (
    <div
      className={`relative z-50 w-full max-w-lg rounded-lg border border-border bg-card p-6 shadow-lg ${className}`}
      onClick={(e) => e.stopPropagation()}
    >
      {children}
    </div>
  );
}

export function DialogHeader({ children, className = "" }: DialogHeaderProps) {
  return (
    <div
      className={`flex flex-col space-y-1.5 text-center sm:text-left ${className}`}
    >
      {children}
    </div>
  );
}

export function DialogTitle({ children, className = "" }: DialogTitleProps) {
  return (
    <h2
      className={`text-lg font-semibold leading-none tracking-tight ${className}`}
    >
      {children}
    </h2>
  );
}

export function DialogDescription({
  children,
  className = "",
}: DialogDescriptionProps) {
  return (
    <p className={`text-sm text-muted-foreground ${className}`}>{children}</p>
  );
}

export function DialogFooter({ children, className = "" }: DialogFooterProps) {
  return (
    <div
      className={`flex flex-col-reverse sm:flex-row sm:justify-end sm:space-x-2 ${className}`}
    >
      {children}
    </div>
  );
}

export function DialogClose({
  onClick,
  children,
}: {
  onClick: () => void;
  children?: React.ReactNode;
}) {
  return (
    <button
      onClick={onClick}
      className="absolute right-4 top-4 rounded-sm opacity-70 ring-offset-background transition-opacity hover:opacity-100 focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2 disabled:pointer-events-none"
    >
      {children || <X className="h-4 w-4" />}
      <span className="sr-only">Close</span>
    </button>
  );
}
