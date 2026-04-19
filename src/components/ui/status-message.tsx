import type { ReactNode } from "react";

type StatusKind = "info" | "success" | "warning" | "error";

const statusClassName: Record<StatusKind, string> = {
  info: "border-border bg-surface text-text",
  success: "border-success/40 bg-success/10 text-success",
  warning: "border-warning/40 bg-warning/10 text-text",
  error: "border-error/40 bg-error/10 text-error",
};

export function StatusMessage({
  children,
  kind = "info",
  role,
}: {
  children: ReactNode;
  kind?: StatusKind;
  role?: "alert" | "status";
}) {
  return (
    <div
      className={`rounded-md border px-4 py-3 text-sm leading-6 ${statusClassName[kind]}`}
      role={role}
    >
      {children}
    </div>
  );
}
