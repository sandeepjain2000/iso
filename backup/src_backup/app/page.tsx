import { Suspense } from "react";
import { LandingPage } from "@/components/LandingPage";

export default function HomePage() {
  return (
    <Suspense
      fallback={
        <p className="text-sm text-zinc-500">Loading sign-in…</p>
      }
    >
      <LandingPage />
    </Suspense>
  );
}
