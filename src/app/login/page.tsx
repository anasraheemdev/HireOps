"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { motion } from "framer-motion";
import {
  Mail,
  Lock,
  Eye,
  EyeOff,
  User,
  Phone,
  Briefcase,
  ShieldCheck,
  Loader2,
  ArrowRight,
  Sparkles,
  BarChart3,
  Users,
  Bot,
  AlertCircle,
  MailCheck,
  CheckCircle2,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Checkbox } from "@/components/ui/checkbox";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
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

  // Mode: "signin" | "signup"
  const [mode, setMode] = useState<"signin" | "signup">("signin");

  // Sign in state
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [email, setEmail] = useState("hr.demo@oia.gov.om");
  const [password, setPassword] = useState("OiaHr#2026");
  const [error, setError] = useState<string | null>(null);
  const [magicLinkLoading, setMagicLinkLoading] = useState(false);
  const [magicLinkSent, setMagicLinkSent] = useState(false);

  // Candidate signup state
  const [signupFullName, setSignupFullName] = useState("");
  const [signupEmail, setSignupEmail] = useState("");
  const [signupPassword, setSignupPassword] = useState("");
  const [signupPhone, setSignupPhone] = useState("");
  const [signupHeadline, setSignupHeadline] = useState("");
  const [signupLoading, setSignupLoading] = useState(false);

  const supabase = createClient();

  const getRedirectTo = () => {
    if (typeof window === "undefined") return "/";
    return new URLSearchParams(window.location.search).get("redirectTo") || "/";
  };

  const friendlyAuthError = (message: string) => {
    if (/failed to fetch|networkerror|fetch failed/i.test(message)) {
      return "Cannot reach authentication service. Check your connection then try again.";
    }
    if (message === "Invalid login credentials") {
      return "Incorrect email or password. Please try again.";
    }
    return message;
  };

  const handleSignIn = async (e: React.FormEvent) => {
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
      router.push(getRedirectTo());
      router.refresh();
    } catch (err) {
      const message = err instanceof Error ? err.message : "Unexpected login error";
      setError(friendlyAuthError(message));
    } finally {
      setLoading(false);
    }
  };

  const handleCandidateSignUp = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setSignupLoading(true);

    try {
      const { data: authData, error: signUpError } = await supabase.auth.signUp({
        email: signupEmail,
        password: signupPassword,
        options: {
          data: {
            full_name: signupFullName,
            portal_role: "candidate",
            phone: signupPhone,
            headline: signupHeadline,
          },
        },
      });

      if (signUpError) {
        setError(signUpError.message);
        setSignupLoading(false);
        return;
      }

      // Automatically sign in candidate
      const { error: autoSignInErr } = await supabase.auth.signInWithPassword({
        email: signupEmail,
        password: signupPassword,
      });

      if (autoSignInErr) {
        toast.success("Candidate account created! Please sign in with your email and password.");
        setMode("signin");
        setEmail(signupEmail);
        setPassword(signupPassword);
      } else {
        toast.success(`Welcome ${signupFullName}! Your candidate account is ready.`);
        router.push("/candidate/jobs");
        router.refresh();
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : "Signup failed");
    } finally {
      setSignupLoading(false);
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

  const fillDemo = (role: "hr" | "candidate" | "admin") => {
    setError(null);
    setMode("signin");
    if (role === "hr") {
      setEmail("hr.demo@oia.gov.om");
      setPassword("OiaHr#2026");
    } else if (role === "candidate") {
      setEmail("candidate.demo@example.com");
      setPassword("OiaCand#2026");
    } else {
      setEmail("s.alamri@oia.gov.om");
      setPassword("OiaDemo#2026");
    }
  };

  return (
    <div className="min-h-screen w-full flex app-shell-bg" dir={dir}>
      {/* Left branding panel */}
      <div className="hidden lg:flex lg:w-[50%] relative overflow-hidden flex-col justify-between p-12 border-r border-white/10">
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
            <p className="mt-5 text-muted-foreground max-w-md leading-relaxed text-sm">
              AI Recruitment Operations Platform. Automate resume screening, candidate matching, AI interviews, assessments, and hiring workflows.
            </p>
          </motion.div>

          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6, delay: 0.25 }}
            className="grid grid-cols-3 gap-3 mt-8 max-w-lg"
          >
            {[
              { icon: Users, label: "HR & Team", sub: "Recruitment Pipeline" },
              { icon: Bot, label: "AI Interviewer", sub: "STAR Evaluation" },
              { icon: BarChart3, label: "Assessments", sub: "Auto-Scored Exams" },
            ].map((s, i) => (
              <div key={i} className="glass-card p-3.5">
                <s.icon className="h-4 w-4 text-blue-300 mb-1.5" />
                <p className="text-xs font-semibold">{s.label}</p>
                <p className="text-[10px] text-muted-foreground">{s.sub}</p>
              </div>
            ))}
          </motion.div>
        </div>

        <motion.p initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 0.5 }} className="text-xs text-muted-foreground/70">
          {BRAND.copyrightFull}
        </motion.p>
      </div>

      {/* Right form panel */}
      <div className="flex-1 flex flex-col min-w-0">
        <div className="flex justify-end p-6">
          <LanguageSwitcher />
        </div>

        <div className="flex-1 flex items-center justify-center p-6 overflow-y-auto">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.4 }}
            className="w-full max-w-md"
          >
            <div className="lg:hidden flex items-center gap-3 mb-6 justify-center">
              <div className="h-10 w-10 rounded-xl overflow-hidden ring-1 ring-white/10">
                <HireOpsLogo size={40} variant="full" priority className="h-10 w-10" />
              </div>
              <div>
                <p className="font-semibold text-sm">{BRAND.name}</p>
                <p className="text-[11px] text-muted-foreground">{BRAND.tagline}</p>
              </div>
            </div>

            <div className="glass-card p-7">
              {/* Form Tabs: Sign In vs Candidate Sign Up */}
              <Tabs value={mode} onValueChange={(v) => { setMode(v as "signin" | "signup"); setError(null); }} className="w-full mb-6">
                <TabsList className="grid grid-cols-2 w-full bg-white/5 border border-white/10">
                  <TabsTrigger value="signin" className="text-xs font-semibold cursor-pointer">
                    Sign In
                  </TabsTrigger>
                  <TabsTrigger value="signup" className="text-xs font-semibold cursor-pointer gap-1">
                    <Sparkles className="h-3 w-3 text-primary" /> Candidate Signup
                  </TabsTrigger>
                </TabsList>
              </Tabs>

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

              {/* MODE 1: SIGN IN */}
              {mode === "signin" && (
                <>
                  <h2 className="text-xl font-semibold tracking-tight">{t("welcomeBack")}</h2>
                  <p className="text-xs text-muted-foreground mt-1 mb-6">Sign in to access your HR workspace or candidate portal.</p>

                  <form onSubmit={handleSignIn} className="space-y-3.5">
                    <div className="space-y-1">
                      <Label htmlFor="email" className="text-xs">{t("email")}</Label>
                      <div className="relative">
                        <Mail className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                        <Input
                          id="email"
                          type="email"
                          required
                          value={email}
                          onChange={(e) => setEmail(e.target.value)}
                          className="pl-9 h-10 text-xs bg-white/5 border-white/10"
                          placeholder="name@example.com"
                        />
                      </div>
                    </div>

                    <div className="space-y-1">
                      <Label htmlFor="password" className="text-xs">{t("password")}</Label>
                      <div className="relative">
                        <Lock className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                        <Input
                          id="password"
                          type={showPassword ? "text" : "password"}
                          required
                          value={password}
                          onChange={(e) => setPassword(e.target.value)}
                          className="pl-9 pr-10 h-10 text-xs bg-white/5 border-white/10"
                          placeholder="••••••••••"
                        />
                        <button
                          type="button"
                          onClick={() => setShowPassword((s) => !s)}
                          className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground cursor-pointer"
                        >
                          {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                        </button>
                      </div>
                    </div>

                    <div className="flex items-center justify-between text-xs pt-1">
                      <label className="flex items-center gap-2 text-muted-foreground cursor-pointer">
                        <Checkbox defaultChecked />
                        {t("rememberMe")}
                      </label>
                    </div>

                    <Button type="submit" disabled={loading} className="w-full h-10 gradient-brand text-white font-medium text-xs cursor-pointer gap-2">
                      {loading ? (
                        <>
                          <Loader2 className="h-4 w-4 animate-spin" /> Authenticating…
                        </>
                      ) : (
                        <>
                          {t("signIn")}
                          <ArrowRight className="h-3.5 w-3.5" />
                        </>
                      )}
                    </Button>
                  </form>

                  {/* Demo Quick-Fill Buttons */}
                  <div className="mt-6 pt-4 border-t border-white/10 space-y-2">
                    <p className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground text-center">
                      Quick Demo Logins
                    </p>
                    <div className="grid grid-cols-3 gap-1.5 text-[11px]">
                      <Button variant="outline" size="sm" className="h-7 text-[10px] bg-white/5 border-white/10 cursor-pointer" onClick={() => fillDemo("hr")}>
                        HR Demo
                      </Button>
                      <Button variant="outline" size="sm" className="h-7 text-[10px] bg-white/5 border-white/10 cursor-pointer" onClick={() => fillDemo("candidate")}>
                        Candidate
                      </Button>
                      <Button variant="outline" size="sm" className="h-7 text-[10px] bg-white/5 border-white/10 cursor-pointer" onClick={() => fillDemo("admin")}>
                        Super Admin
                      </Button>
                    </div>
                  </div>
                </>
              )}

              {/* MODE 2: CANDIDATE SIGN UP */}
              {mode === "signup" && (
                <>
                  <h2 className="text-xl font-semibold tracking-tight">Candidate Registration</h2>
                  <p className="text-xs text-muted-foreground mt-1 mb-5">Create a candidate account to apply for open roles, take exams &amp; AI interviews.</p>

                  <form onSubmit={handleCandidateSignUp} className="space-y-3">
                    <div className="space-y-1">
                      <Label htmlFor="signupFullName" className="text-xs">Full Name *</Label>
                      <div className="relative">
                        <User className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                        <Input
                          id="signupFullName"
                          required
                          value={signupFullName}
                          onChange={(e) => setSignupFullName(e.target.value)}
                          className="pl-9 h-9 text-xs bg-white/5 border-white/10"
                          placeholder="Salim Al-Rawahi"
                        />
                      </div>
                    </div>

                    <div className="space-y-1">
                      <Label htmlFor="signupEmail" className="text-xs">Email Address *</Label>
                      <div className="relative">
                        <Mail className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                        <Input
                          id="signupEmail"
                          type="email"
                          required
                          value={signupEmail}
                          onChange={(e) => setSignupEmail(e.target.value)}
                          className="pl-9 h-9 text-xs bg-white/5 border-white/10"
                          placeholder="candidate@example.com"
                        />
                      </div>
                    </div>

                    <div className="space-y-1">
                      <Label htmlFor="signupPassword" className="text-xs">Password *</Label>
                      <div className="relative">
                        <Lock className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                        <Input
                          id="signupPassword"
                          type="password"
                          required
                          minLength={8}
                          value={signupPassword}
                          onChange={(e) => setSignupPassword(e.target.value)}
                          className="pl-9 h-9 text-xs bg-white/5 border-white/10"
                          placeholder="At least 8 characters"
                        />
                      </div>
                    </div>

                    <div className="grid grid-cols-2 gap-2">
                      <div className="space-y-1">
                        <Label htmlFor="signupHeadline" className="text-xs">Headline / Role</Label>
                        <div className="relative">
                          <Briefcase className="absolute left-3 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-muted-foreground" />
                          <Input
                            id="signupHeadline"
                            value={signupHeadline}
                            onChange={(e) => setSignupHeadline(e.target.value)}
                            className="pl-8 h-9 text-xs bg-white/5 border-white/10"
                            placeholder="e.g. Software Engineer"
                          />
                        </div>
                      </div>
                      <div className="space-y-1">
                        <Label htmlFor="signupPhone" className="text-xs">Phone Number</Label>
                        <div className="relative">
                          <Phone className="absolute left-3 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-muted-foreground" />
                          <Input
                            id="signupPhone"
                            value={signupPhone}
                            onChange={(e) => setSignupPhone(e.target.value)}
                            className="pl-8 h-9 text-xs bg-white/5 border-white/10"
                            placeholder="+968 9123 4567"
                          />
                        </div>
                      </div>
                    </div>

                    <Button type="submit" disabled={signupLoading} className="w-full h-10 gradient-brand text-white font-medium text-xs cursor-pointer gap-2 mt-2">
                      {signupLoading ? (
                        <>
                          <Loader2 className="h-4 w-4 animate-spin" /> Creating Account…
                        </>
                      ) : (
                        <>
                          <CheckCircle2 className="h-4 w-4" /> Create Candidate Account &amp; Apply
                        </>
                      )}
                    </Button>
                  </form>
                </>
              )}
            </div>
          </motion.div>
        </div>
      </div>
    </div>
  );
}
