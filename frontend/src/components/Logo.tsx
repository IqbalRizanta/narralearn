import { useId, type SVGProps } from "react";

import { cn } from "../lib/utils";

interface LogoProps {
  showWord?: boolean;
  size?: number;
  className?: string;
}

export function Logo({ showWord = true, size = 38, className }: LogoProps) {
  const gradientId = `nl-mark-${useId().replace(/:/g, "")}`;
  return (
    <span className={cn("brand", className)}>
      <span
        className="brand-mark"
        style={{ width: size, height: size }}
        aria-hidden="true"
      >
        <svg
          viewBox="0 0 64 64"
          width={size}
          height={size}
          role="img"
          aria-label="NarraLearn"
        >
          <defs>
            <linearGradient id={gradientId} x1="0" y1="0" x2="1" y2="1">
              <stop offset="0%" stopColor="#d8f36a" />
              <stop offset="100%" stopColor="#7ee7c4" />
            </linearGradient>
          </defs>
          <rect width="64" height="64" rx="18" fill="#101714" />
          <path
            d="M18 44V22.5c0-1.7 2-2.6 3.2-1.4L41.5 42V22.5"
            fill="none"
            stroke={`url(#${gradientId})`}
            strokeWidth="6"
            strokeLinecap="round"
            strokeLinejoin="round"
          />
          <circle cx="46" cy="18" r="4" fill="#ffb86b" />
          <circle cx="18" cy="47" r="2.5" fill="#7ee7c4" opacity="0.8" />
        </svg>
      </span>
      {showWord && (
        <span className="brand-word">
          Narra<span>Learn</span>
        </span>
      )}
    </span>
  );
}

export function OrbitGlyph(props: SVGProps<SVGSVGElement>) {
  return (
    <svg viewBox="0 0 120 120" fill="none" aria-hidden="true" {...props}>
      <circle cx="60" cy="60" r="42" stroke="currentColor" opacity="0.18" />
      <circle cx="60" cy="60" r="28" stroke="currentColor" opacity="0.28" />
      <ellipse
        cx="60"
        cy="60"
        rx="55"
        ry="24"
        stroke="currentColor"
        opacity="0.35"
        transform="rotate(-18 60 60)"
      />
      <circle cx="60" cy="18" r="7" fill="#d8f36a" />
      <circle cx="103" cy="60" r="5" fill="#7ee7c4" />
      <circle cx="22" cy="83" r="4" fill="#ffb86b" />
      <path
        d="M47 73V47c0-2.2 2.6-3.4 4.1-1.8L75 69V47"
        stroke="currentColor"
        strokeWidth="7"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}
