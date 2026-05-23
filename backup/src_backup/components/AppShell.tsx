"use client";

import { FileDown } from "lucide-react";
import { motion, useReducedMotion } from "framer-motion";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useCallback, useEffect, useState } from "react";

import { CustomCursor } from "@/components/CustomCursor";

type MeUser = {
  id: number;
  name: string;
  email: string;
  tenantId: number;
  role: string;
  tenantName: string;
  tenantSlug: string;
};

const nav = [
  { href: "/overview", label: "Overview" },
  { href: "/assets", label: "Assets" },
  { href: "/risk", label: "Risk" },
  { href: "/compliance", label: "Document compliance" },
];

/** Stable screen identifiers for audit / navigation (shown top-right). */
function screenTagForPath(pathname: string): string {
  if (pathname === "/" || pathname === "") return "S-1";
  if (pathname.startsWith("/overview")) return "S-2";
  if (pathname.startsWith("/assets")) return "S-3";
  if (pathname.startsWith("/risk/scope")) return "S-4a";
  if (pathname.startsWith("/risk/register")) return "S-4";
  if (pathname.startsWith("/risk/dashboard")) return "S-4b";
  if (pathname.startsWith("/risk")) return "S-4b";
  if (pathname.startsWith("/compliance/scope")) return "S-5a";
  if (pathname.startsWith("/compliance")) return "S-5";
  return "S-0";
}

function ScreenTag({ code }: { code: string }) {
  return (
    <span
      className="inline-flex shrink-0 items-center rounded-lg border border-rose-200/90 bg-rose-50 px-2.5 py-1 text-[11px] font-semibold uppercase tracking-wider text-rose-900"
      title={`Screen ${code}`}
    >
      {code}
    </span>
  );
}

function navItemActive(path: string, href: string): boolean {
  if (path === href) return true;
  if (href === "/risk" && path.startsWith("/risk")) return true;
  if (href === "/compliance" && path.startsWith("/compliance")) return true;
  return path.startsWith(`${href}/`);
}

const navEase = [0.33, 1, 0.68, 1] as const;

export function AppShell({ children }: { children: React.ReactNode }) {
  const path = usePathname();
  const router = useRouter();
  const reduceMotion = useReducedMotion();
  const [me, setMe] = useState<{ user: MeUser | null } | null>(null);

  useEffect(() => {
    let cancelled = false;
    void (async () => {
      const res = await fetch("/api/auth/me");
      const data = (await res.json()) as { user: MeUser | null };
      if (!cancelled) setMe(data);
    })();
    return () => {
      cancelled = true;
    };
  }, [path]);

  const authed = Boolean(me?.user);
  const user = me?.user;
  const screenCode = screenTagForPath(path);
  const riskShell = path.startsWith("/risk");

  const logout = useCallback(async () => {
    await fetch("/api/auth/logout", { method: "POST" });
    setMe({ user: null });
    router.push("/");
    router.refresh();
  }, [router]);

  const compactSignInHeader = path === "/" && !authed;

  return (
    <div
      className={
        riskShell
          ? "min-h-screen bg-slate-50 text-slate-900 antialiased"
          : "min-h-screen bg-neutral-50 text-neutral-900 antialiased"
      }
    >
      <CustomCursor />
      <header
        className={
          riskShell
            ? "border-b border-slate-200 bg-white"
            : "border-b border-neutral-200/90 bg-white"
        }
      >
        <div
          className={`mx-auto max-w-[1200px] px-4 sm:px-6 ${compactSignInHeader ? "py-3" : "py-5"}`}
        >
          <div
            className={`flex flex-col ${compactSignInHeader ? "gap-3" : "gap-5"}`}
          >
            <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
              <div>
                <p
                  className={
                    riskShell
                      ? "text-[11px] font-medium uppercase tracking-[0.12em] text-slate-500"
                      : "text-[11px] font-medium uppercase tracking-[0.12em] text-neutral-500"
                  }
                >
                  Compliance for certification
                </p>
                <h1
                  className={
                    riskShell
                      ? "mt-1 text-lg font-semibold tracking-tight text-slate-900 sm:text-xl"
                      : "mt-1 text-lg font-semibold tracking-tight text-neutral-950 sm:text-xl"
                  }
                >
                  ISMS Scope, Risk &amp; Evidence
                </h1>
                {authed && user ? (
                  <p
                    className={
                      riskShell
                        ? "mt-2 text-xs text-slate-500"
                        : "mt-2 text-xs text-neutral-500"
                    }
                  >
                    <span
                      className={
                        riskShell
                          ? "font-medium text-slate-800"
                          : "font-medium text-neutral-800"
                      }
                    >
                      {user.tenantName}
                    </span>{" "}
                    <span
                      className={riskShell ? "text-slate-400" : "text-neutral-400"}
                    >
                      ·
                    </span>{" "}
                    {user.email}
                  </p>
                ) : null}
              </div>
              <div className="flex w-full flex-col items-stretch gap-2 sm:w-auto sm:items-end">
                <ScreenTag code={screenCode} />
                {authed ? (
                  <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-end">
                    {path === "/assets" ? (
                      <button
                        type="button"
                        className="btn-secondary inline-flex items-center justify-center gap-2 whitespace-nowrap text-sm"
                        onClick={() => {
                          window.dispatchEvent(
                            new CustomEvent("cc-assets-download-report"),
                          );
                        }}
                      >
                        <FileDown className="h-4 w-4 shrink-0" aria-hidden />
                        Download report
                      </button>
                    ) : null}
                    <button
                      type="button"
                      className="btn-primary whitespace-nowrap text-sm"
                      onClick={() => void logout()}
                    >
                      Sign out
                    </button>
                  </div>
                ) : path !== "/" ? (
                  <Link href="/" className="btn-primary text-center text-sm">
                    Sign in
                  </Link>
                ) : null}
              </div>
            </div>
            {authed ? (
              <nav
                className={
                  riskShell
                    ? "flex flex-wrap gap-1 rounded-lg border border-slate-200 bg-slate-100/90 p-1"
                    : "flex flex-wrap gap-1 rounded-xl border border-neutral-200/80 bg-neutral-100/80 p-1"
                }
                aria-label="Primary"
              >
                {nav.map((item) => {
                  const active = navItemActive(path, item.href);
                  const cls = riskShell
                    ? `rounded-md px-3.5 py-2 text-sm font-medium transition duration-200 ease-out ${
                        active
                          ? "bg-sky-50 font-semibold text-sky-900 shadow-sm ring-1 ring-sky-200/80"
                          : "cc-interactive-glow text-slate-600 hover:bg-white/80 hover:text-slate-900"
                      }`
                    : `rounded-lg px-3.5 py-2 text-sm font-medium transition duration-200 ease-out ${
                        active
                          ? "bg-white text-neutral-950 shadow-sm ring-1 ring-neutral-200/80"
                          : "cc-interactive-glow text-neutral-600 hover:bg-white/60 hover:text-neutral-950"
                      }`;
                  const link = (
                    <Link href={item.href} className={cls}>
                      {item.label}
                    </Link>
                  );
                  if (reduceMotion) {
                    return (
                      <span key={item.href} className="inline-flex">
                        {link}
                      </span>
                    );
                  }
                  return (
                    <motion.span
                      key={item.href}
                      className="inline-flex"
                      transition={{ duration: 0.2, ease: navEase }}
                      whileHover={{ scale: 1.02, y: -2 }}
                    >
                      {link}
                    </motion.span>
                  );
                })}
              </nav>
            ) : null}
          </div>
        </div>
      </header>
      <main
        className={
          path === "/"
            ? "mx-auto max-w-[1200px] px-4 pb-10 pt-3 sm:px-6 sm:pt-4"
            : "mx-auto max-w-[1200px] px-4 py-10 sm:px-6"
        }
      >
        {children}
      </main>
    </div>
  );
}
