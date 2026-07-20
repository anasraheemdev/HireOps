"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { motion } from "framer-motion";
import {
  Mail,
  Lock,
  User,
  Eye,
  EyeOff,
  Loader2,
  ArrowRight,
  AlertCircle,
  Sparkles,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { createClient } from "@/lib/supabase/client";
import { toast } from "sonner";
import { HireOpsLogo } from "@/components/brand/hireops-logo";
import { BRAND } from "@/lib/brand";

export default function PublicCandidateSignupPage() {
  const router = useRouter();
  const supabase = createClient();
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [fullName, setFullName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setLoading(true);

    const { error: signUpError } = await supabase.auth.signUp({
      email,
      password,
      options: {
        data: { full_name: fullName, portal_role: "candidate" },
        emailRedirectTo: `${window.location.origin}/auth/callback?redirectTo=${encodeURIComponent("/candidate")}`,
      },
    });

    setLoading(false);
    if (signUpError) {
      setError(signUpError.message);
      return;
    }

    toast.success("Account created — check your email to confirm, then sign in.");
    router.push("/login");
  };

  return (
    <div className="min-h-screen flex flex-col lg:flex-row">
      <div className="hidden lg:flex lg:w-[48%] flex-col justify-between p-10 xl:p-14 relative overflow-hidden">
        <div className="absolute inset-0 bg-gradient-to-br from-blue-950/80 via-slate-950 to-slate-950" />
        <div className="absolute inset-0 opacity-40 bg-[radial-gradient(ellipse_at_top_left,oklch(0.45_0.15_250),transparent_55%)]" />
        <div className="relative z-10">
          <div className="flex items-center gap-3 mb-16">
            <div className="h-10 w-10 rounded-xl overflow-hidden ring-1 ring-white/10">
              <HireOpsLogo size={40} variant="full" priority className="h-10 w-10" />
            </div>
            <div>
              <p className="text-sm font-semibold">{BRAND.name}</p>
              <p className="text-xs text-muted-foreground">Candidate Career Portal</p>
            </div>
          </div>
          <span className="inline-flex items-center gap-1.5 text-xs font-medium text-blue-300 bg-blue-500/10 border border-blue-500/20 rounded-full px-3 py-1 mb-5">
            <Sparkles className="h-3 w-3" /> Join the HireOps talent network
          </span>
          <h1 className="text-4xl font-semibold tracking-tight leading-tight max-w-md">
            Build your career with <span className="gradient-text">purpose</span>.
          </h1>
          <p className="mt-4 text-muted-foreground max-w-sm leading-relaxed text-sm">
            Create a candidate account to apply to roles, take assessments, and interview with AI-assisted workflows on{" "}
            {BRAND.name}.
          </p>
        </div>
        <p className="relative z-10 text-xs text-muted-foreground/70">{BRAND.copyright}</p>
      </div>

      <div className="flex-1 flex items-center justify-center p-6">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.45 }}
          className="w-full max-w-md"
        >
          <div className="lg:hidden flex items-center gap-3 mb-8 justify-center">
            <div className="h-10 w-10 rounded-xl overflow-hidden ring-1 ring-white/10">
              <HireOpsLogo size={40} variant="full" priority className="h-10 w-10" />
            </div>
            <p className="font-semibold">{BRAND.name}</p>
          </div>

          <div className="glass-card p-8">
            <h2 className="text-2xl font-semibold tracking-tight">Create account</h2>
            <p className="text-sm text-muted-foreground mt-1.5 mb-7">Sign up as a candidate with email and password.</p>

            {error && (
              <div className="flex items-start gap-2 rounded-lg bg-rose-500/10 border border-rose-500/20 px-3 py-2.5 mb-4">
                <AlertCircle className="h-4 w-4 text-rose-400 shrink-0 mt-0.5" />
                <p className="text-xs text-rose-300 leading-relaxed">{error}</p>
              </div>
            )}

            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="space-y-1.5">
                <Label htmlFor="fullName">Full name</Label>
                <div className="relative">
                  <User className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                  <Input
                    id="fullName"
                    required
                    value={fullName}
                    onChange={(e) => setFullName(e.target.value)}
                    className="pl-9 h-11 bg-white/5 border-white/10"
                    placeholder="Your full name"
                  />
                </div>
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="email">Email</Label>
                <div className="relative">
                  <Mail className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                  <Input
                    id="email"
                    type="email"
                    required
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    className="pl-9 h-11 bg-white/5 border-white/10"
                    placeholder="you@example.com"
                  />
                </div>
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="password">Password</Label>
                <div className="relative">
                  <Lock className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                  <Input
                    id="password"
                    type={showPassword ? "text" : "password"}
                    required
                    minLength={8}
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    className="pl-9 pr-10 h-11 bg-white/5 border-white/10"
                    placeholder="At least 8 characters"
                  />
                  <button
                    type="button"
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground cursor-pointer"
                    onClick={() => setShowPassword((v) => !v)}
                    aria-label={showPassword ? "Hide password" : "Show password"}
                  >
                    {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                  </button>
                </div>
              </div>
              <Button type="submit" disabled={loading} className="w-full h-11 gradient-brand text-white gap-2 cursor-pointer">
                {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : <ArrowRight className="h-4 w-4" />}
                {loading ? "Creating…" : "Create account"}
              </Button>
            </form>

            <p className="text-xs text-muted-foreground mt-6 text-center">
              Already have an account?{" "}
              <Link href="/login" className="text-primary hover:underline">
                Sign in
              </Link>
            </p>
          </div>
        </motion.div>
      </div>
    </div>
  );
}
