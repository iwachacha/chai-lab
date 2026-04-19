import type { InputHTMLAttributes } from "react";

export type TextInputProps = InputHTMLAttributes<HTMLInputElement> & {
  error?: string;
  label: string;
};

export function TextInput({
  error,
  id,
  label,
  className = "",
  ...props
}: TextInputProps) {
  const inputId = id ?? props.name;
  const errorId = inputId ? `${inputId}-error` : undefined;

  return (
    <label
      className="grid gap-2 text-sm font-semibold text-text"
      htmlFor={inputId}
    >
      {label}
      <input
        aria-describedby={error ? errorId : undefined}
        aria-invalid={error ? "true" : "false"}
        className={`min-h-11 rounded-md border border-border bg-surface px-3 py-2 text-base font-normal text-text outline-none transition placeholder:text-muted focus:border-primary focus:ring-2 focus:ring-primary/20 ${className}`}
        id={inputId}
        {...props}
      />
      {error ? (
        <span className="text-sm font-normal text-error" id={errorId}>
          {error}
        </span>
      ) : null}
    </label>
  );
}
