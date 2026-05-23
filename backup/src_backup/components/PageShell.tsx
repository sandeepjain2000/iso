import type { ReactNode } from "react";

import { InfoHint } from "@/components/InfoHint";
import { MotionSurface } from "@/components/motion/MotionSurface";
import { cn } from "@/lib/utils";

/**
 * v0-style page header: white card, neutral border, soft shadow, optional action.
 * `tone="slate-admin"` matches slate/sky list-admin UIs (bolder title, md radius).
 */
export function PageShell({
  title,
  description,
  descriptionIconOnly = false,
  action,
  tone = "neutral",
}: {
  title: string;
  description?: ReactNode;
  /** When true, description is only shown in the info icon next to the title (no paragraph). */
  descriptionIconOnly?: boolean;
  action?: ReactNode;
  tone?: "neutral" | "slate-admin";
}) {
  const shell =
    tone === "slate-admin"
      ? "mb-8 flex flex-col gap-4 rounded-lg border border-slate-200 bg-white p-6 shadow-sm sm:flex-row sm:items-start sm:justify-between"
      : "mb-8 flex flex-col gap-4 rounded-2xl border border-neutral-200/80 bg-white p-6 shadow-[0_1px_2px_0_rgb(0_0_0_/_0.04)] sm:flex-row sm:items-start sm:justify-between";

  const titleCls =
    tone === "slate-admin"
      ? "text-2xl font-bold tracking-tight text-slate-800 sm:text-3xl"
      : "text-xl font-semibold tracking-tight text-neutral-950";

  const descCls =
    tone === "slate-admin"
      ? "mt-2 max-w-3xl text-sm leading-relaxed text-slate-600 [&_strong]:font-semibold [&_strong]:text-slate-800"
      : "mt-2 max-w-3xl text-sm leading-relaxed text-neutral-600";

  return (
    <MotionSurface className={shell}>
      <div className="min-w-0 flex-1">
        <h1
          className={cn(
            titleCls,
            description && descriptionIconOnly
              ? "flex flex-wrap items-center gap-x-2 gap-y-1"
              : undefined,
          )}
        >
          <span>{title}</span>
          {description && descriptionIconOnly ? (
            <InfoHint>{description}</InfoHint>
          ) : null}
        </h1>
        {description && !descriptionIconOnly ? (
          <div className={descCls}>{description}</div>
        ) : null}
      </div>
      {action ? (
        <div className="flex shrink-0 flex-col items-stretch gap-2 sm:flex-row sm:items-center">
          {action}
        </div>
      ) : null}
    </MotionSurface>
  );
}
