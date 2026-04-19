import Link from "next/link";
import type { ReactNode } from "react";

import { navigationItems } from "@/lib/routes";

export function PageShell({
  actions,
  children,
  showNavigation = true,
  title,
}: {
  actions?: ReactNode;
  children: ReactNode;
  showNavigation?: boolean;
  title: string;
}) {
  return (
    <div className="min-h-screen bg-bg text-text">
      <header className="border-b border-border bg-surface">
        <div className="mx-auto flex w-full max-w-5xl items-center justify-between gap-4 px-4 py-4">
          <Link className="text-base font-bold text-primary" href="/home/">
            chai-lab
          </Link>
          {actions ? (
            <div className="flex items-center gap-2">{actions}</div>
          ) : null}
        </div>
      </header>
      <main className="mx-auto grid w-full max-w-5xl gap-6 px-4 pb-24 pt-6 md:pb-10">
        <div className="grid gap-2">
          <h1 className="text-2xl font-bold leading-tight text-text">
            {title}
          </h1>
        </div>
        {children}
      </main>
      {showNavigation ? (
        <nav
          aria-label="主要ナビゲーション"
          className="fixed inset-x-0 bottom-0 border-t border-border bg-surface md:hidden"
        >
          <div className="grid grid-cols-4">
            {navigationItems.map((item) => (
              <Link
                className="min-h-14 px-2 py-3 text-center text-sm font-semibold text-text"
                href={item.href}
                key={item.href}
              >
                {item.label}
              </Link>
            ))}
          </div>
        </nav>
      ) : null}
    </div>
  );
}
