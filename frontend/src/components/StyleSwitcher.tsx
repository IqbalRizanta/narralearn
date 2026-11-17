import { Check, Loader2, Sparkles } from "lucide-react";

import type { ModuleSummary, StyleMode } from "../lib/types";
import { cn, modeStyle, STYLE_META, STYLE_ORDER } from "../lib/utils";

export function StyleBadge({
  style,
  className,
}: {
  style: StyleMode;
  className?: string;
}) {
  const meta = STYLE_META[style];
  return (
    <span
      className={cn("style-badge", className)}
      style={modeStyle(meta.color)}
    >
      <span className="style-dot" />
      {meta.label}
    </span>
  );
}

export function StyleSwitcher({
  current,
  modules,
  onSelect,
  busy = false,
  compact = false,
}: {
  current: StyleMode;
  modules: ModuleSummary[];
  onSelect: (style: StyleMode) => void;
  busy?: boolean;
  compact?: boolean;
}) {
  return (
    <div className={cn("style-switcher", compact && "style-switcher-compact")}>
      {STYLE_ORDER.map((style) => {
        const meta = STYLE_META[style];
        const available = modules.some((module) => module.style_mode === style);
        const active = style === current;
        return (
          <button
            key={style}
            type="button"
            className={cn("style-chip", active && "is-active", !available && "is-new")}
            style={modeStyle(meta.color)}
            onClick={() => onSelect(style)}
            disabled={busy || active}
            aria-pressed={active}
            title={
              available
                ? `Buka gaya ${meta.label}`
                : `Buat gaya ${meta.label}`
            }
          >
            <span className="style-chip-dot" />
            <span className="style-chip-label">
              <strong>{meta.label}</strong>
              {!compact && <small>{meta.short}</small>}
            </span>
            <span className="style-chip-state">
              {active ? (
                <Check size={14} />
              ) : busy && !available ? (
                <Loader2 size={14} className="spin" />
              ) : !available ? (
                <Sparkles size={14} />
              ) : null}
            </span>
          </button>
        );
      })}
    </div>
  );
}
