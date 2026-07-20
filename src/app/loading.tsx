/** Lightweight server-safe loader — no framer-motion / next/image (faster on Amplify). */
export default function RootLoading() {
  return (
    <div className="min-h-svh flex flex-col items-center justify-center gap-3 p-8 app-shell-bg">
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img src="/logo.png" alt="HireOps" width={40} height={40} className="rounded-lg" />
      <p className="text-sm font-semibold tracking-tight">HireOps</p>
      <p className="text-[12px] text-muted-foreground">Loading…</p>
    </div>
  );
}
