"use client";

import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { useCallback, useEffect, useRef, useState } from "react";
import { DEMO_PASSWORD, DEMO_TENANTS } from "@/lib/demo-tenants";
import { cn } from "@/lib/utils";

export function LandingPage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const nextRaw = searchParams.get("next");
  const safeNext =
    nextRaw && nextRaw.startsWith("/") && !nextRaw.startsWith("//")
      ? nextRaw
      : "/overview";

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [alreadyAuthed, setAlreadyAuthed] = useState(false);
  const demoSectionRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    let cancelled = false;
    void (async () => {
      const res = await fetch("/api/auth/me");
      const data = (await res.json()) as { user?: unknown };
      if (!cancelled && data.user) setAlreadyAuthed(true);
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  const applyDemo = useCallback((demoEmail: string) => {
    const next = demoEmail.trim().toLowerCase();
    setEmail(next);
    setPassword(DEMO_PASSWORD);
    setError(null);
  }, []);

  const onDemoListClick = useCallback(
    (e: React.MouseEvent<HTMLUListElement>) => {
      const btn = (e.target as HTMLElement).closest(
        "button[data-demo-email]",
      );
      if (!btn || !(btn instanceof HTMLButtonElement)) return;
      const raw = btn.dataset.demoEmail?.trim();
      if (!raw) return;
      e.preventDefault();
      e.stopPropagation();
      applyDemo(raw);
    },
    [applyDemo],
  );

  const onSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setBusy(true);
    setError(null);
    try {
      const res = await fetch("/api/auth/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          email: email.trim().toLowerCase(),
          password,
        }),
      });
      const data = (await res.json().catch(() => ({}))) as {
        error?: string;
      };
      if (!res.ok) {
        if (res.status === 401) {
          const dev =
            process.env.NODE_ENV === "development"
              ? "\n\nDeveloper: run npm run db:seed:demo (or npm run db:migrate) once if this account is missing from the database."
              : "";
          setError(
            `Invalid email or password. Check spelling, use password ${DEMO_PASSWORD} for a demo account, or tap a row in Demo accounts below.${dev}`,
          );
          requestAnimationFrame(() => {
            demoSectionRef.current?.scrollIntoView({
              behavior: "smooth",
              block: "nearest",
            });
          });
        } else {
          setError(data.error ?? "Sign-in failed");
        }
        return;
      }
      router.push(safeNext);
      router.refresh();
    } catch {
      setError("Network error. Try again.");
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="relative z-0 mx-auto max-w-3xl space-y-4 sm:space-y-5">
      {alreadyAuthed ? (
        <div className="relative z-20 rounded-2xl border border-neutral-200/90 bg-neutral-50 px-4 py-3 text-sm text-neutral-900 shadow-[0_1px_2px_0_rgb(0_0_0_/_0.04)]">
          You are already signed in.{" "}
          <Link
            href={safeNext}
            className="font-semibold text-neutral-950 underline decoration-neutral-300 underline-offset-2 hover:text-neutral-700"
          >
            Continue to the app
          </Link>
        </div>
      ) : null}

      <div
        id="sign-in-card"
        className="relative z-10 max-h-[min(880px,calc(100dvh-7.5rem))] overflow-y-auto overscroll-contain rounded-3xl border border-neutral-200/80 bg-white p-7 shadow-[0_8px_30px_rgb(0_0_0_/_0.06)] sm:p-8"
      >
        <h2 className="text-lg font-semibold tracking-tight text-neutral-950">
          Sign in
        </h2>
        <p className="mt-2 text-sm leading-relaxed text-neutral-600">
          Each demo organisation has its own isolated data. Unique Schools holds
          the seeded compliance tree; other tenants start with an empty register
          and default asset types.
        </p>

        <form
          onSubmit={(e) => void onSubmit(e)}
          className="mt-6 space-y-5"
        >
          <label className="block text-xs font-medium text-neutral-700">
            Email
            <input
              type="email"
              autoComplete="username"
              className={cn(
                "mt-1.5 w-full rounded-full border border-slate-200/90 bg-slate-50 px-4 py-2.5 text-sm text-neutral-900 shadow-sm",
                "transition duration-200 ease-out placeholder:text-neutral-400",
                "focus:border-neutral-400 focus:outline-none focus:ring-2 focus:ring-slate-200/80 focus-visible:ring-neutral-400",
              )}
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
            />
          </label>
          <label className="block text-xs font-medium text-neutral-700">
            Password
            <input
              type="password"
              autoComplete="current-password"
              className={cn(
                "mt-1.5 w-full rounded-full border border-slate-200/90 bg-slate-50 px-4 py-2.5 text-sm text-neutral-900 shadow-sm",
                "transition duration-200 ease-out placeholder:text-neutral-400",
                "focus:border-neutral-400 focus:outline-none focus:ring-2 focus:ring-slate-200/80 focus-visible:ring-neutral-400",
              )}
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
            />
          </label>
          {error ? (
            <div
              className="rounded-xl border border-red-200/90 bg-red-50/90 px-3 py-2.5 text-sm text-red-900"
              role="alert"
            >
              <p className="whitespace-pre-wrap leading-relaxed">{error}</p>
            </div>
          ) : null}
          <button
            type="submit"
            className={cn(
              "btn-primary w-full sm:w-auto",
              "rounded-full px-8 py-2.5 font-semibold",
            )}
            disabled={busy}
          >
            {busy ? "Signing in…" : "Sign in"}
          </button>
        </form>

        <div
          id="demo-accounts"
          ref={demoSectionRef}
          className="relative z-20 mt-8 scroll-mt-4 border-t border-neutral-100 pt-8"
        >
          <h3 className="text-xs font-semibold uppercase tracking-wide text-neutral-500">
            Demo accounts
          </h3>
          <p className="mt-1 text-xs text-neutral-500">
            Password for all:{" "}
            <code className="rounded-md bg-neutral-100 px-1.5 py-0.5 text-neutral-800">
              {DEMO_PASSWORD}
            </code>
            . Tap a row to fill email and password above.
          </p>
          <ul
            className="mt-3 touch-manipulation select-none divide-y divide-neutral-100 rounded-2xl border border-neutral-200/80 bg-white shadow-[0_1px_2px_0_rgb(0_0_0_/_0.04)]"
            onClick={onDemoListClick}
          >
            {DEMO_TENANTS.map((t) => (
              <li key={t.slug}>
                <button
                  type="button"
                  data-demo-email={t.email}
                  style={{ WebkitTapHighlightColor: "transparent" }}
                  className="flex w-full min-h-[3.25rem] cursor-pointer flex-col gap-0.5 px-4 py-4 text-left transition hover:bg-neutral-50 active:bg-neutral-100"
                >
                  <span className="pointer-events-none font-medium text-neutral-950">
                    {t.name}
                  </span>
                  <span className="pointer-events-none text-xs text-neutral-600">
                    {t.email}
                  </span>
                </button>
              </li>
            ))}
          </ul>
        </div>
      </div>
    </div>
  );
}
