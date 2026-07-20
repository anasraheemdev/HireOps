"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { motion } from "framer-motion";
import {
  Mail,
  Lock,
  Eye,
  EyeOff,
  ShieldCheck,
  Loader2,
  ArrowRight,
  Sparkles,
  BarChart3,
  Users,
  Bot,
  AlertCircle,
  MailCheck,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Checkbox } from "@/components/ui/checkbox";
import { useLang } from "@/lib/i18n";
import { LanguageSwitcher } from "@/components/shared/language-switcher";
import { cn } from "@/lib/utils";
import { createClient } from "@/lib/supabase/client";
import { toast } from "sonner";
import { HireOpsLogo } from "@/components/brand/hireops-logo";
import { BRAND } from "@/lib/brand";

export default function LoginPage() {
  const router = useRouter();
  const { t, dir } = useLang();
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [magicLinkLoading, setMagicLinkLoading] = useState(false);
  const [oauthLoading, setOauthLoading] = useState<"azure" | "google" | null>(null);
  const [email, setEmail] = useState("s.alamri@oia.gov.om");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [magicLinkSent, setMagicLinkSent] = useState(false);

  const supabase = createClient();
  const getRedirectTo = () => {
    if (typeof window === "undefined") return "/";
    return new URLSearchParams(window.location.search).get("redirectTo") || "/";
  };

  const friendlyAuthError = (message: string) => {
    if (/failed to fetch|networkerror|fetch failed/i.test(message)) {
      return "Cannot reach authentication service. Check your internet connection, disable ad-blockers/privacy extensions for this site, then try again.";
    }
    if (message === "Invalid login credentials") {
      return "Incorrect email or password. Please try again.";
    }
    return message;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setLoading(true);

    try {
      const { error: signInError } = await supabase.auth.signInWithPassword({ email, password });
      if (signInError) {
        setError(friendlyAuthError(signInError.message));
        return;
      }
      toast.success("Welcome back — signing you in.");
      // Let proxy route to the correct portal (/admin, /hr, /candidate)
      router.push(getRedirectTo());
      router.refresh();
    } catch (err) {
      const message = err instanceof Error ? err.message : "Unexpected login error";
      setError(friendlyAuthError(message));
    } finally {
      setLoading(false);
    }
  };

  const handleMagicLink = async () => {
    if (!email) {
      setError("Enter your email address first.");
      return;
    }
    setError(null);
    setMagicLinkLoading(true);
    const { error: otpError } = await supabase.auth.signInWithOtp({
      email,
      options: {
        emailRedirectTo: `${window.location.origin}/auth/callback?redirectTo=${encodeURIComponent(getRedirectTo())}`,
      },
    });
    setMagicLinkLoading(false);
    if (otpError) {
      setError(otpError.message);
      return;
    }
    setMagicLinkSent(true);
  };

  const handleForgotPassword = async () => {
    if (!email) {
      setError("Enter your email address first, then click “Forgot password?” again.");
      return;
    }
    setError(null);
    const { error: resetError } = await supabase.auth.resetPasswordForEmail(email, {
      redirectTo: `${window.location.origin}/auth/callback?redirectTo=/settings`,
    });
    if (resetError) {
      setError(resetError.message);
      return;
    }
    toast.success(`Password reset link sent to ${email}`);
  };

  const handleOAuth = async (provider: "azure" | "google") => {
    setOauthLoading(provider);
    const { error: oauthError } = await supabase.auth.signInWithOAuth({
      provider,
      options: { redirectTo: `${window.location.origin}/auth/callback?redirectTo=${encodeURIComponent(getRedirectTo())}` },
    });
    if (oauthError) {
      setOauthLoading(null);
      toast.error(
        `${provider === "azure" ? "Microsoft" : "Google"} SSO isn't enabled for this project yet — enable it under Supabase → Authentication → Providers.`
      );
    }
    // On success the browser navigates away to the provider, so no further
    // state update is needed here.
  };

  return (
    <div className="min-h-screen w-full flex app-shell-bg" dir={dir}>
      {/* Left branding panel */}
      <div className="hidden lg:flex lg:w-[52%] relative overflow-hidden flex-col justify-between p-12 border-r border-white/10">
        <div className="absolute inset-0 -z-10">
          <motion.div
            animate={{ x: [0, 30, 0], y: [0, -20, 0] }}
            transition={{ duration: 14, repeat: Infinity, ease: "easeInOut" }}
            className="absolute -top-24 -left-24 h-[28rem] w-[28rem] rounded-full bg-blue-600/30 blur-[100px]"
          />
          <motion.div
            animate={{ x: [0, -20, 0], y: [0, 30, 0] }}
            transition={{ duration: 16, repeat: Infinity, ease: "easeInOut" }}
            className="absolute bottom-0 right-0 h-[26rem] w-[26rem] rounded-full bg-indigo-600/25 blur-[100px]"
          />
          <motion.div
            animate={{ x: [0, 20, 0], y: [0, 20, 0] }}
            transition={{ duration: 18, repeat: Infinity, ease: "easeInOut" }}
            className="absolute top-1/3 left-1/2 h-[22rem] w-[22rem] rounded-full bg-cyan-500/15 blur-[110px]"
          />
        </div>

        <motion.div initial={{ opacity: 0, y: -12 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.5 }} className="flex items-center gap-3">
          <div className="h-12 w-12 rounded-2xl overflow-hidden ring-1 ring-white/15 shadow-lg shadow-primary/20">
            <HireOpsLogo size={48} variant="full" priority className="h-12 w-12" />
          </div>
          <div>
            <p className="text-base font-semibold tracking-tight">{BRAND.name}</p>
            <p className="text-xs text-muted-foreground">{BRAND.tagline}</p>
          </div>
        </motion.div>

        <div>
          <motion.div initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.6, delay: 0.1 }}>
            <span className="inline-flex items-center gap-1.5 text-xs font-medium text-blue-300 bg-blue-500/10 border border-blue-500/20 rounded-full px-3 py-1 mb-5">
              <Sparkles className="h-3 w-3" /> Enterprise AI Recruitment
            </span>
            <h1 className="text-4xl xl:text-5xl font-semibold tracking-tight leading-[1.1] max-w-lg">
              Welcome to <span className="gradient-text">{BRAND.name}</span>
            </h1>
            <p className="mt-5 text-muted-foreground max-w-md leading-relaxed">
              {BRAND.tagline}. Automate resume screening, candidate matching, AI interviews, assessments, and hiring
              workflows with explainable intelligence.
            </p>
          </motion.div>

          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6, delay: 0.25 }}
            className="grid grid-cols-3 gap-4 mt-10 max-w-lg"
          >
            {[
              { icon: Users, label: "4,218", sub: "Active Candidates" },
              { icon: Bot, label: "27", sub: "AI Interviews Today" },
              { icon: BarChart3, label: "82.4%", sub: "Avg Match Score" },
            ].map((s, i) => (
              <div key={i} className="glass-card p-4">
                <s.icon className="h-4 w-4 text-blue-300 mb-2" />
                <p className="text-xl font-semibold">{s.label}</p>
                <p className="text-[11px] text-muted-foreground">{s.sub}</p>
              </div>
            ))}
          </motion.div>
        </div>

        <motion.p initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 0.5 }} className="text-xs text-muted-foreground/70">
          {BRAND.copyrightFull}
        </motion.p>
      </div>

      {/* Right form panel */}
      <div className="flex-1 flex flex-col">
        <div className="flex justify-end p-6">
          <LanguageSwitcher />
        </div>

        <div className="flex-1 flex items-center justify-center p-6">
          <motion.div
            initial={{ opacity: 0, y: 24, scale: 0.98 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            transition={{ duration: 0.5, ease: [0.22, 1, 0.36, 1] }}
            className="w-full max-w-md"
          >
            <div className="lg:hidden flex items-center gap-3 mb-8 justify-center">
              <div className="h-10 w-10 rounded-xl overflow-hidden ring-1 ring-white/10">
                <HireOpsLogo size={40} variant="full" priority className="h-10 w-10" />
              </div>
              <div>
                <p className="font-semibold">{BRAND.name}</p>
                <p className="text-[11px] text-muted-foreground">{BRAND.tagline}</p>
              </div>
            </div>

            <div className="glass-card p-8">
              {magicLinkSent ? (
                <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="text-center py-4">
                  <div className="h-12 w-12 rounded-2xl bg-emerald-500/10 flex items-center justify-center mx-auto mb-4">
                    <MailCheck className="h-6 w-6 text-emerald-400" />
                  </div>
                  <h2 className="text-lg font-semibold">Check your inbox</h2>
                  <p className="text-sm text-muted-foreground mt-2 leading-relaxed">
                    We sent a sign-in link to <span className="text-foreground">{email}</span>. Click it to access your dashboard.
                  </p>
                  <Button variant="outline" className="mt-6 bg-white/5 border-white/10" onClick={() => setMagicLinkSent(false)}>
                    Back to sign in
                  </Button>
                </motion.div>
              ) : (
                <>
                  <h2 className="text-2xl font-semibold tracking-tight">{t("welcomeBack")}</h2>
                  <p className="text-sm text-muted-foreground mt-1.5 mb-7">{t("loginSubtitle")}</p>

                  {error && (
                    <motion.div
                      initial={{ opacity: 0, y: -6 }}
                      animate={{ opacity: 1, y: 0 }}
                      className="flex items-start gap-2 rounded-lg bg-rose-500/10 border border-rose-500/20 px-3 py-2.5 mb-4"
                    >
                      <AlertCircle className="h-4 w-4 text-rose-400 shrink-0 mt-0.5" />
                      <p className="text-xs text-rose-300 leading-relaxed">{error}</p>
                    </motion.div>
                  )}

                  <form onSubmit={handleSubmit} className="space-y-4">
                    <div className="space-y-1.5">
                      <Label htmlFor="email">{t("email")}</Label>
                      <div className="relative">
                        <Mail className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                        <Input
                          id="email"
                          type="email"
                          required
                          value={email}
                          onChange={(e) => setEmail(e.target.value)}
                          className="pl-9 h-11 bg-white/5 border-white/10"
                          placeholder="name@oia.gov.om"
                        />
                      </div>
                    </div>

                    <div className="space-y-1.5">
                      <Label htmlFor="password">{t("password")}</Label>
                      <div className="relative">
                        <Lock className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                        <Input
                          id="password"
                          type={showPassword ? "text" : "password"}
                          required
                          value={password}
                          onChange={(e) => setPassword(e.target.value)}
                          className="pl-9 pr-10 h-11 bg-white/5 border-white/10"
                          placeholder="••••••••••"
                        />
                        <button
                          type="button"
                          onClick={() => setShowPassword((s) => !s)}
                          className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
                        >
                          {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                        </button>
                      </div>
                    </div>

                    <div className="flex items-center justify-between text-sm pt-1">
                      <label className="flex items-center gap-2 text-muted-foreground cursor-pointer">
                        <Checkbox defaultChecked />
                        {t("rememberMe")}
                      </label>
                      <button type="button" onClick={handleForgotPassword} className="text-blue-400 hover:text-blue-300 font-medium">
                        {t("forgotPassword")}
                      </button>
                    </div>

                    <Button type="submit" disabled={loading} className="w-full h-11 gradient-brand text-white font-medium group">
                      {loading ? (
                        <>
                          <Loader2 className="h-4 w-4 animate-spin" /> Authenticating...
                        </>
                      ) : (
                        <>
                          {t("signIn")}
                          <ArrowRight className={cn("h-4 w-4 transition-transform group-hover:translate-x-0.5", dir === "rtl" && "rotate-180")} />
                        </>
                      )}
                    </Button>

                    <button
                      type="button"
                      onClick={handleMagicLink}
                      disabled={magicLinkLoading}
                      className="w-full text-center text-xs text-muted-foreground hover:text-foreground transition-colors flex items-center justify-center gap-1.5"
                    >
                      {magicLinkLoading ? <Loader2 className="h-3 w-3 animate-spin" /> : <Mail className="h-3 w-3" />}
                      Email me a magic sign-in link instead
                    </button>
                  </form>

                  <div className="flex items-center gap-3 my-6">
                    <div className="h-px flex-1 bg-white/10" />
                    <span className="text-xs text-muted-foreground">OR</span>
                    <div className="h-px flex-1 bg-white/10" />
                  </div>

                  <div className="space-y-2.5">
                    <Button
                      variant="outline"
                      className="w-full h-11 bg-white/5 border-white/10 gap-2"
                      onClick={() => handleOAuth("azure")}
                      disabled={oauthLoading !== null}
                    >
                      {oauthLoading === "azure" ? <Loader2 className="h-4 w-4 animate-spin" /> : <ShieldCheck className="h-4 w-4 text-emerald-400" />}
                      {t("ssoLogin")}
                    </Button>
                  </div>

                  <p className="text-center text-[11px] text-muted-foreground mt-6">
                    Protected by government-grade encryption &amp; MFA. Unauthorized access is prohibited and monitored.
                  </p>
                </>
              )}
            </div>
          </motion.div>
        </div>
      </div>
    </div>
  );
}
