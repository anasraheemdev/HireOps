"use client";

import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { toast } from "sonner";
import { Plus } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetDescription,
  SheetTrigger,
  SheetFooter,
  SheetClose,
} from "@/components/ui/sheet";
import { useState } from "react";
import { Loader2 } from "lucide-react";
import { useCreateJobMutation } from "@/lib/queries/use-jobs";

const jobSchema = z.object({
  title: z.string().min(3, "Job title is required"),
  department: z.string().min(1, "Select a department"),
  location: z.string().min(2, "Location is required"),
  type: z.enum(["Full-time", "Part-time", "Contract"], { message: "Select a type" }),
  level: z.string().min(1, "Level is required"),
  minExperience: z.coerce.number().min(0).max(30),
  salaryRange: z.string().optional(),
  description: z.string().min(10, "Please provide a short description"),
  requiredSkills: z.string().min(2, "List at least one skill"),
});

type JobFormValues = z.infer<typeof jobSchema>;

export function JobFormSheet() {
  const [open, setOpen] = useState(false);
  const createJob = useCreateJobMutation();
  const {
    register,
    handleSubmit,
    reset,
    setValue,
    formState: { errors },
  } = useForm<JobFormValues>({
    resolver: zodResolver(jobSchema) as never,
    defaultValues: {
      title: "",
      department: "",
      location: "Muscat, Oman",
      type: "Full-time",
      level: "",
      minExperience: 3,
      salaryRange: "",
      description: "",
      requiredSkills: "",
    },
  });

  const onSubmit = (values: JobFormValues) => {
    createJob.mutate(values, {
      onSuccess: (job) => {
        toast.success(`"${job.title}" job posting created as a draft`);
        reset();
        setOpen(false);
      },
      onError: (err) => toast.error(err instanceof Error ? err.message : "Failed to create job"),
    });
  };

  return (
    <Sheet open={open} onOpenChange={setOpen}>
      <SheetTrigger render={<Button className="gradient-brand text-white gap-2" />}>
        <Plus className="h-4 w-4" /> Post New Job
      </SheetTrigger>
      <SheetContent side="right" className="w-full sm:max-w-lg overflow-y-auto scrollbar-thin bg-popover border-white/10">
        <SheetHeader>
          <SheetTitle>Post a New Job</SheetTitle>
          <SheetDescription>Define the role and AI will begin sourcing matched candidates automatically.</SheetDescription>
        </SheetHeader>
        <form onSubmit={handleSubmit(onSubmit)} className="px-4 pb-6 space-y-4">
          <div className="space-y-1.5">
            <Label>Job Title</Label>
            <Input {...register("title")} placeholder="e.g. Senior Investment Analyst" className="bg-white/5 border-white/10" />
            {errors.title && <p className="text-xs text-rose-400">{errors.title.message}</p>}
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <Label>Department</Label>
              <Select onValueChange={(v) => { if (typeof v === "string") setValue("department", v); }}>
                <SelectTrigger className="bg-white/5 border-white/10 w-full">
                  <SelectValue placeholder="Select" />
                </SelectTrigger>
                <SelectContent>
                  {["Investments", "Technology", "Risk Management", "Legal & Compliance", "Human Capital", "Real Estate", "Strategy"].map((d) => (
                    <SelectItem key={d} value={d}>
                      {d}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              {errors.department && <p className="text-xs text-rose-400">{errors.department.message}</p>}
            </div>
            <div className="space-y-1.5">
              <Label>Employment Type</Label>
              <Select onValueChange={(v) => { if (typeof v === "string") setValue("type", v as JobFormValues["type"]); }}>
                <SelectTrigger className="bg-white/5 border-white/10 w-full">
                  <SelectValue placeholder="Select" />
                </SelectTrigger>
                <SelectContent>
                  {["Full-time", "Part-time", "Contract"].map((t) => (
                    <SelectItem key={t} value={t}>
                      {t}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              {errors.type && <p className="text-xs text-rose-400">{errors.type.message}</p>}
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <Label>Location</Label>
              <Input {...register("location")} className="bg-white/5 border-white/10" />
            </div>
            <div className="space-y-1.5">
              <Label>Level</Label>
              <Input {...register("level")} placeholder="e.g. Senior" className="bg-white/5 border-white/10" />
              {errors.level && <p className="text-xs text-rose-400">{errors.level.message}</p>}
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <Label>Min. Experience (years)</Label>
              <Input type="number" {...register("minExperience")} className="bg-white/5 border-white/10" />
            </div>
            <div className="space-y-1.5">
              <Label>Salary Range</Label>
              <Input {...register("salaryRange")} placeholder="OMR 1,800 – 2,500 / mo" className="bg-white/5 border-white/10" />
              {errors.salaryRange && <p className="text-xs text-rose-400">{errors.salaryRange.message}</p>}
            </div>
          </div>

          <div className="space-y-1.5">
            <Label>Required Skills</Label>
            <Input {...register("requiredSkills")} placeholder="Comma-separated, e.g. Python, MLOps, Kubernetes" className="bg-white/5 border-white/10" />
            {errors.requiredSkills && <p className="text-xs text-rose-400">{errors.requiredSkills.message}</p>}
          </div>

          <div className="space-y-1.5">
            <Label>Role Description</Label>
            <Textarea {...register("description")} rows={4} className="bg-white/5 border-white/10" placeholder="Describe the role, responsibilities, and impact..." />
            {errors.description && <p className="text-xs text-rose-400">{errors.description.message}</p>}
          </div>

          <SheetFooter className="px-0 flex-row gap-2">
            <SheetClose render={<Button type="button" variant="outline" className="flex-1 bg-white/5 border-white/10" />}>
              Cancel
            </SheetClose>
            <Button type="submit" className="flex-1 gradient-brand text-white" disabled={createJob.isPending}>
              {createJob.isPending ? <Loader2 className="h-4 w-4 animate-spin" /> : "Publish Job"}
            </Button>
          </SheetFooter>
        </form>
      </SheetContent>
    </Sheet>
  );
}
