export const fixedInternalRoutes = [
  "/",
  "/auth/",
  "/auth/callback/",
  "/home/",
  "/research-lines/",
  "/research-lines/detail/",
  "/trials/new/",
  "/trials/edit/",
  "/trials/detail/",
  "/trials/history/",
  "/settings/",
] as const;

export type FixedInternalRoute = (typeof fixedInternalRoutes)[number];

const routeSet = new Set<string>(fixedInternalRoutes);

export function withTrailingSlash(pathname: string): string {
  if (pathname === "/") {
    return pathname;
  }

  return pathname.endsWith("/") ? pathname : `${pathname}/`;
}

export function isFixedInternalPath(
  pathname: string,
): pathname is FixedInternalRoute {
  return routeSet.has(withTrailingSlash(pathname));
}

export function getSafeRedirectPath(
  candidate: string | null | undefined,
): string {
  if (!candidate) {
    return "/home/";
  }

  if (!candidate.startsWith("/") || candidate.startsWith("//")) {
    return "/home/";
  }

  try {
    const url = new URL(candidate, "https://chai-lab.local");
    const pathname = withTrailingSlash(url.pathname);

    if (
      !isFixedInternalPath(pathname) ||
      pathname === "/auth/" ||
      pathname === "/auth/callback/"
    ) {
      return "/home/";
    }

    return `${pathname}${url.search}`;
  } catch {
    return "/home/";
  }
}

export const navigationItems: Array<{
  href: FixedInternalRoute;
  label: string;
}> = [
  { href: "/home/", label: "ホーム" },
  { href: "/research-lines/", label: "研究ライン" },
  { href: "/trials/history/", label: "履歴" },
  { href: "/settings/", label: "設定" },
];
