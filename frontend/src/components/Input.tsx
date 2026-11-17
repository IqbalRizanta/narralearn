import {
  forwardRef,
  useId,
  type InputHTMLAttributes,
  type ReactNode,
  type SelectHTMLAttributes,
  type TextareaHTMLAttributes,
} from "react";

import { cn } from "../lib/utils";

interface FieldShellProps {
  label?: string;
  htmlFor?: string;
  hint?: string;
  error?: string;
  optional?: boolean;
  children: ReactNode;
  className?: string;
}

export function FieldShell({
  label,
  htmlFor,
  hint,
  error,
  optional,
  children,
  className,
}: FieldShellProps) {
  return (
    <div className={cn("field", className)}>
      {label && (
        <label className="field-label" htmlFor={htmlFor}>
          {label}
          {optional && <span className="field-optional">opsional</span>}
        </label>
      )}
      {children}
      {error ? (
        <p className="field-error" role="alert">
          {error}
        </p>
      ) : hint ? (
        <p className="field-hint">{hint}</p>
      ) : null}
    </div>
  );
}

interface InputProps extends InputHTMLAttributes<HTMLInputElement> {
  label?: string;
  hint?: string;
  error?: string;
  optional?: boolean;
  leftIcon?: ReactNode;
}

export const Input = forwardRef<HTMLInputElement, InputProps>(function Input(
  { label, hint, error, optional, leftIcon, className, id, ...props },
  ref,
) {
  const generated = useId();
  const inputId = id ?? generated;
  return (
    <FieldShell
      label={label}
      htmlFor={inputId}
      hint={hint}
      error={error}
      optional={optional}
    >
      <div className={cn("input-shell", leftIcon && "has-leading")}>
        {leftIcon && <span className="input-leading">{leftIcon}</span>}
        <input
          ref={ref}
          id={inputId}
          className={cn("input", error && "input-error", className)}
          aria-invalid={Boolean(error)}
          {...props}
        />
      </div>
    </FieldShell>
  );
});

interface TextareaProps extends TextareaHTMLAttributes<HTMLTextAreaElement> {
  label?: string;
  hint?: string;
  error?: string;
  optional?: boolean;
}

export const Textarea = forwardRef<HTMLTextAreaElement, TextareaProps>(
  function Textarea(
    { label, hint, error, optional, className, id, ...props },
    ref,
  ) {
    const generated = useId();
    const inputId = id ?? generated;
    return (
      <FieldShell
        label={label}
        htmlFor={inputId}
        hint={hint}
        error={error}
        optional={optional}
      >
        <textarea
          ref={ref}
          id={inputId}
          className={cn("input textarea", error && "input-error", className)}
          aria-invalid={Boolean(error)}
          {...props}
        />
      </FieldShell>
    );
  },
);

interface SelectProps extends SelectHTMLAttributes<HTMLSelectElement> {
  label?: string;
  hint?: string;
  error?: string;
  optional?: boolean;
}

export function Select({
  label,
  hint,
  error,
  optional,
  className,
  id,
  children,
  ...props
}: SelectProps) {
  const generated = useId();
  const inputId = id ?? generated;
  return (
    <FieldShell
      label={label}
      htmlFor={inputId}
      hint={hint}
      error={error}
      optional={optional}
    >
      <select
        id={inputId}
        className={cn("input select", error && "input-error", className)}
        aria-invalid={Boolean(error)}
        {...props}
      >
        {children}
      </select>
    </FieldShell>
  );
}
