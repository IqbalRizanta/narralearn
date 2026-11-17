import { cn } from "../lib/utils";

interface ProgressRingProps {
  value: number;
  size?: number;
  stroke?: number;
  label?: string;
  sublabel?: string;
  color?: string;
  className?: string;
  showValue?: boolean;
}

export function ProgressRing({
  value,
  size = 132,
  stroke = 9,
  label,
  sublabel,
  color = "var(--accent)",
  className,
  showValue = true,
}: ProgressRingProps) {
  const clamped = Math.max(0, Math.min(100, Number.isFinite(value) ? value : 0));
  const radius = (size - stroke) / 2;
  const circumference = 2 * Math.PI * radius;
  const offset = circumference - (clamped / 100) * circumference;

  return (
    <div
      className={cn("progress-ring", className)}
      style={{ width: size, height: size }}
      role="progressbar"
      aria-valuemin={0}
      aria-valuemax={100}
      aria-valuenow={Math.round(clamped)}
      aria-label={label ?? "Progres"}
    >
      <svg width={size} height={size} viewBox={`0 0 ${size} ${size}`}>
        <circle
          cx={size / 2}
          cy={size / 2}
          r={radius}
          fill="none"
          stroke="var(--line-strong)"
          strokeWidth={stroke}
        />
        <circle
          cx={size / 2}
          cy={size / 2}
          r={radius}
          fill="none"
          stroke={color}
          strokeWidth={stroke}
          strokeLinecap="round"
          strokeDasharray={circumference}
          strokeDashoffset={offset}
          transform={`rotate(-90 ${size / 2} ${size / 2})`}
          className="progress-ring-value"
        />
      </svg>
      {(showValue || label) && (
        <div className="progress-ring-label">
          {showValue && <strong>{Math.round(clamped)}%</strong>}
          {label && <span>{label}</span>}
          {sublabel && <small>{sublabel}</small>}
        </div>
      )}
    </div>
  );
}
