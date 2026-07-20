"use client";

import { motion } from "framer-motion";
import {
  Bot,
  CalendarClock,
  Search,
  LineChart,
  HeartHandshake,
  Route,
  Sparkles,
  Rocket,
  ArrowRight,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { PageHeader } from "@/components/shared/page-header";
import { toast } from "sonner";
import { cn } from "@/lib/utils";

const features = [
  {
    icon: Bot,
    title: "Agentic AI Recruiter",
    description: "A fully autonomous AI agent that sources, screens, interviews, and shortlists candidates end-to-end with human-in-the-loop approval gates.",
    quarter: "Q1 2027",
    readiness: 62,
    color: "from-blue-500 to-indigo-600",
  },
  {
    icon: CalendarClock,
    title: "Autonomous Interview Scheduling",
    description: "AI negotiates interview times directly with candidates and panelists across time zones, resolving conflicts without human coordination.",
    quarter: "Q4 2026",
    readiness: 78,
    color: "from-cyan-500 to-blue-600",
  },
  {
    icon: Search,
    title: "AI Talent Pool Discovery",
    description: "Proactively identifies and engages passive candidates across public and professional networks matching strategic talent needs.",
    quarter: "Q2 2027",
    readiness: 45,
    color: "from-violet-500 to-purple-600",
  },
  {
    icon: LineChart,
    title: "Predictive Hiring",
    description: "Forecasts hiring demand by department using workforce trends, project pipelines, and attrition signals up to two quarters in advance.",
    quarter: "Q1 2027",
    readiness: 55,
    color: "from-emerald-500 to-teal-600",
  },
  {
    icon: HeartHandshake,
    title: "Employee Retention Prediction",
    description: "Identifies flight-risk employees using engagement, performance, and market signals — enabling proactive retention strategies.",
    quarter: "Q3 2027",
    readiness: 30,
    color: "from-amber-500 to-orange-600",
  },
  {
    icon: Route,
    title: "Career Path Intelligence",
    description: "Maps optimal internal career trajectories for employees, aligning individual growth with long-term organizational talent strategy.",
    quarter: "Q3 2027",
    readiness: 28,
    color: "from-rose-500 to-pink-600",
  },
];

const roadmap = [
  { period: "Q4 2026", label: "Autonomous Scheduling GA" },
  { period: "Q1 2027", label: "Agentic Recruiter Beta + Predictive Hiring" },
  { period: "Q2 2027", label: "Talent Pool Discovery Rollout" },
  { period: "Q3 2027", label: "Retention & Career Intelligence Suite" },
];

export default function FutureVisionPage() {
  return (
    <div>
      <PageHeader title="Future Vision" description="The next generation of autonomous, predictive talent intelligence for HireOps." />

      <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} className="glass-card p-8 mb-6 relative overflow-hidden">
        <div className="absolute inset-0 -z-0">
          <motion.div animate={{ x: [0, 30, 0] }} transition={{ duration: 12, repeat: Infinity }} className="absolute -top-10 right-0 h-64 w-64 rounded-full bg-blue-600/20 blur-[90px]" />
        </div>
        <div className="relative z-10 flex items-start gap-4">
          <div className="h-12 w-12 rounded-2xl gradient-brand flex items-center justify-center shrink-0 glow-ring-sm">
            <Rocket className="h-6 w-6 text-white" />
          </div>
          <div>
            <Badge variant="outline" className="bg-blue-500/10 text-blue-300 border-blue-500/20 mb-2">
              <Sparkles className="h-3 w-3 mr-1" /> Roadmap Preview
            </Badge>
            <h2 className="text-xl font-semibold">Where HireOps is headed next</h2>
            <p className="text-sm text-muted-foreground mt-1.5 max-w-2xl leading-relaxed">
              Building on today&apos;s AI-powered matching, interviewing, and scoring capabilities, the roadmap below outlines
              upcoming autonomous and predictive capabilities designed to keep HireOps at the forefront of enterprise talent
              acquisition technology.
            </p>
          </div>
        </div>
      </motion.div>

      <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4 mb-6">
        {features.map((f, i) => (
          <motion.div
            key={f.title}
            initial={{ opacity: 0, y: 16 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.35, delay: i * 0.06 }}
            className="glass-card card-hover p-6 flex flex-col"
          >
            <div className={cn("h-12 w-12 rounded-2xl bg-gradient-to-br flex items-center justify-center mb-4", f.color)}>
              <f.icon className="h-6 w-6 text-white" />
            </div>
            <p className="font-semibold">{f.title}</p>
            <p className="text-sm text-muted-foreground mt-2 leading-relaxed flex-1">{f.description}</p>

            <div className="mt-4">
              <div className="flex items-center justify-between text-xs mb-1.5">
                <span className="text-muted-foreground">Development readiness</span>
                <span className="font-medium">{f.readiness}%</span>
              </div>
              <div className="h-1.5 rounded-full bg-white/5 overflow-hidden">
                <motion.div
                  initial={{ width: 0 }}
                  animate={{ width: `${f.readiness}%` }}
                  transition={{ duration: 0.8, delay: 0.1 + i * 0.05 }}
                  className={cn("h-full rounded-full bg-gradient-to-r", f.color)}
                />
              </div>
            </div>

            <div className="flex items-center justify-between mt-4 pt-4 border-t border-white/10">
              <Badge variant="outline" className="bg-white/5 border-white/10 text-[10px]">
                Target {f.quarter}
              </Badge>
              <Button
                size="sm"
                variant="ghost"
                className="text-xs gap-1 text-blue-300 hover:text-blue-200"
                onClick={() => toast.success(`You'll be notified when ${f.title} launches`)}
              >
                Notify Me <ArrowRight className="h-3 w-3" />
              </Button>
            </div>
          </motion.div>
        ))}
      </div>

      <div className="glass-card p-6">
        <h3 className="text-sm font-semibold mb-6">Delivery Roadmap</h3>
        <div className="flex flex-col sm:flex-row gap-4">
          {roadmap.map((r, i) => (
            <div key={r.period} className="flex-1 flex sm:flex-col items-center sm:items-start gap-3">
              <div className="flex flex-col items-center sm:flex-row sm:items-center gap-2 sm:gap-3 w-full">
                <div className="h-8 w-8 rounded-full gradient-brand flex items-center justify-center text-xs font-bold text-white shrink-0">
                  {i + 1}
                </div>
                {i < roadmap.length - 1 && <div className="hidden sm:block h-px flex-1 bg-white/10" />}
              </div>
              <div>
                <p className="text-sm font-semibold">{r.period}</p>
                <p className="text-xs text-muted-foreground mt-0.5">{r.label}</p>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
