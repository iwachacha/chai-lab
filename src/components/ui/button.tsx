import Link from "next/link";
import type {
  AnchorHTMLAttributes,
  ButtonHTMLAttributes,
  ReactNode,
} from "react";

type ButtonVariant = "primary" | "secondary" | "danger";

const variantClassName: Record<ButtonVariant, string> = {
  primary:
    "bg-primary text-white hover:bg-primary/90 focus-visible:outline-primary",
  secondary:
    "border border-border bg-surface text-text hover:bg-bg focus-visible:outline-primary",
  danger:
    "border border-error bg-surface text-error hover:bg-error/10 focus-visible:outline-error",
};

const baseClassName =
  "inline-flex min-h-11 items-center justify-center rounded-md px-4 py-2 text-base font-semibold transition focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 disabled:cursor-not-allowed disabled:opacity-60";

export type ButtonProps = ButtonHTMLAttributes<HTMLButtonElement> & {
  variant?: ButtonVariant;
};

export function Button({
  className = "",
  variant = "primary",
  type = "button",
  ...props
}: ButtonProps) {
  return (
    <button
      className={`${baseClassName} ${variantClassName[variant]} ${className}`}
      type={type}
      {...props}
    />
  );
}

export type LinkButtonProps = AnchorHTMLAttributes<HTMLAnchorElement> & {
  children: ReactNode;
  href: string;
  variant?: ButtonVariant;
};

export function LinkButton({
  children,
  className = "",
  href,
  variant = "primary",
  ...props
}: LinkButtonProps) {
  return (
    <Link
      className={`${baseClassName} ${variantClassName[variant]} ${className}`}
      href={href}
      {...props}
    >
      {children}
    </Link>
  );
}
