import Link from "next/link";
import { HireOpsLogo } from "@/components/brand/hireops-logo";
import { BRAND } from "@/lib/brand";

export default function NotFound() {
  return (
    <div className="min-h-screen flex flex-col items-center justify-center gap-4 p-8 text-center app-shell-bg">
      <div className="h-14 w-14 rounded-2xl overflow-hidden ring-1 ring-white/10">
        <HireOpsLogo size={56} variant="full" className="h-14 w-14" />
      </div>
      <div>
        <h1 className="text-2xl font-semibold tracking-tight">Page not found</h1>
        <p className="text-sm text-muted-foreground mt-1.5 max-w-sm">
          The page you requested does not exist in {BRAND.name}.
        </p>
      </div>
      <Link
        href="/"
        className="inline-flex h-9 items-center rounded-lg px-4 text-sm font-medium gradient-brand text-white"
      >
        Back to {BRAND.name}
      </Link>
      <p className="text-[11px] text-muted-foreground mt-6">{BRAND.copyright}</p>
    </div>
  );
}
