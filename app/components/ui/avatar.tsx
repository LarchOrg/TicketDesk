import React from "react";

interface AvatarProps {
  className?: string;
  children: React.ReactNode;
}

interface AvatarImageProps {
  src?: string;
  alt?: string;
}

interface AvatarFallbackProps {
  children: React.ReactNode;
}

export function Avatar({ className = "", children }: AvatarProps) {
  return (
    <div
      className={`relative flex h-10 w-10 shrink-0 overflow-hidden rounded-full ${className}`}
    >
      {children}
    </div>
  );
}

export function AvatarImage({ src, alt }: AvatarImageProps) {
  if (!src) return null;

  return (
    <img
      src={src}
      alt={alt}
      className="aspect-square h-full w-full object-cover"
    />
  );
}

export function AvatarFallback({ children }: AvatarFallbackProps) {
  return (
    <div className="flex h-full w-full items-center justify-center rounded-full bg-muted text-sm font-medium">
      {children}
    </div>
  );
}
