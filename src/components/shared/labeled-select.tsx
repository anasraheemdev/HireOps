"use client";

import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

export function LabeledSelect({
  value,
  defaultValue,
  onValueChange,
  options,
  className,
  placeholder,
}: {
  value?: string;
  defaultValue?: string;
  onValueChange?: (v: string) => void;
  options: { value: string; label: string }[];
  className?: string;
  placeholder?: string;
}) {
  const map = Object.fromEntries(options.map((o) => [o.value, o.label]));
  return (
    <Select
      value={value}
      defaultValue={defaultValue}
      onValueChange={(v) => {
        if (v != null) onValueChange?.(v);
      }}
    >
      <SelectTrigger className={className ?? "bg-white/5 border-white/10 w-full"}>
        <SelectValue placeholder={placeholder}>{(v: string) => map[v] ?? placeholder ?? v}</SelectValue>
      </SelectTrigger>
      <SelectContent>
        {options.map((o) => (
          <SelectItem key={o.value} value={o.value}>
            {o.label}
          </SelectItem>
        ))}
      </SelectContent>
    </Select>
  );
}
