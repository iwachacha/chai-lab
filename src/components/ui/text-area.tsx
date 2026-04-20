import type { TextareaHTMLAttributes } from "react";

export type TextAreaProps = TextareaHTMLAttributes<HTMLTextAreaElement> & {
  error?: string;
  label: string;
};

export function TextArea({
  error,
  id,
  label,
  className = "",
  ...props
}: TextAreaProps) {
  const textAreaId = id ?? props.name;
  const errorId = textAreaId ? `${textAreaId}-error` : undefined;

  return (
    <label
      className="grid gap-2 text-sm font-semibold text-text"
      htmlFor={textAreaId}
    >
      {label}
      <textarea
        aria-describedby={error ? errorId : undefined}
        aria-invalid={error ? "true" : "false"}
        className={`min-h-28 rounded-md border border-border bg-surface px-3 py-2 text-base font-normal text-text outline-none transition placeholder:text-muted focus:border-primary focus:ring-2 focus:ring-primary/20 ${className}`}
        id={textAreaId}
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
