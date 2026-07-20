"use client";

import { BRAND } from "@/lib/brand";

export default function GlobalError({
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  return (
    <html lang="en" className="dark">
      <body className="min-h-screen flex flex-col items-center justify-center gap-4 p-8 text-center bg-[#0a0e16] text-white">
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img src="/HireOps.png" alt={BRAND.name} width={56} height={56} className="rounded-2xl ring-1 ring-white/10" />
        <div>
          <h1 className="text-xl font-semibold">Something went wrong</h1>
          <p className="text-sm text-white/60 mt-1.5">{BRAND.name} hit an unexpected error.</p>
        </div>
        <button
          type="button"
          onClick={reset}
          className="h-9 px-4 rounded-lg text-sm font-medium bg-blue-600 text-white cursor-pointer"
        >
          Try again
        </button>
        <p className="text-[11px] text-white/40 mt-4">{BRAND.copyright}</p>
      </body>
    </html>
  );
}
