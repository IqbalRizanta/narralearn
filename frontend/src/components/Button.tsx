import type { ButtonHTMLAttributes, ReactNode } from "react";

import { cn } from "../lib/utils";

export function Spinner({ size = 18, className }: { size?: number; className?: string }) {
  return (
    <span
      className={cn("spinner", className)}
      style={{ width: size, height: size }}
      role="status"
      aria-label="Memuat"
    />
  );
}

type Variant = "primary" | "secondary" | "ghost" | "danger" | "soft";
type Size = "sm" | "md" | "lg";

interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: Variant;
  size?: Size;
  loading?: boolean;
  leftIcon?: ReactNode;
  rightIcon?: ReactNode;
  fullWidth?: boolean;
}

export function Button({
  variant = "primary",
  size = "md",
  loading = false,
  leftIcon,
  rightIcon,
  fullWidth = false,
  className,
  children,
  disabled,
  ...props
}: ButtonProps) {
  return (
    <button
      className={cn(
        "btn",
        `btn-${variant}`,
        `btn-${size}`,
        fullWidth && "btn-block",
        className,
      )}
      disabled={disabled || loading}
      {...props}
    >
      {loading ? <Spinner size={16} /> : leftIcon}
      <span>{children}</span>
      {!loading && rightIcon}
    </button>
  );
}

interface IconButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  label: string;
  variant?: Variant;
  size?: Size;
}

export function IconButton({
  label,
  variant = "ghost",
  size = "md",
  className,
  children,
  ...props
}: IconButtonProps) {
  return (
    <button
      type="button"
      aria-label={label}
      title={label}
      className={cn("btn", `btn-${variant}`, `btn-${size}`, "btn-icon", className)}
      {...props}
    >
      {children}
    </button>
  );
}
