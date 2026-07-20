import Link from "next/link";
import { AlertTriangle } from "lucide-react";
import { Button } from "@/components/ui/button";

export default function AuthCodeErrorPage() {
  return (
    <div className="min-h-screen w-full flex items-center justify-center app-shell-bg">
      <div className="glass-card p-8 max-w-md text-center">
        <div className="h-12 w-12 rounded-2xl bg-rose-500/10 flex items-center justify-center mx-auto mb-4">
          <AlertTriangle className="h-6 w-6 text-rose-400" />
        </div>
        <h1 className="text-lg font-semibold">Sign-in link expired or invalid</h1>
        <p className="text-sm text-muted-foreground mt-2 leading-relaxed">
          This authentication link is no longer valid. Please request a new magic link or sign in again.
        </p>
        <Link href="/login">
          <Button className="mt-6 gradient-brand text-white">Back to Sign In</Button>
        </Link>
      </div>
    </div>
  );
}
