"use client";

import { Languages } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { useLang, type Lang } from "@/lib/i18n";
import { cn } from "@/lib/utils";

const OPTIONS: { value: Lang; label: string; native: string }[] = [
  { value: "en", label: "English", native: "English" },
  { value: "ar", label: "Arabic", native: "العربية" },
];

export function LanguageSwitcher({
  variant = "button",
  className,
}: {
  variant?: "button" | "compact" | "menu";
  className?: string;
}) {
  const { lang, setLang, toggleLang, t } = useLang();

  if (variant === "compact") {
    return (
      <Button
        type="button"
        variant="ghost"
        size="sm"
        onClick={toggleLang}
        className={cn("gap-1.5 text-xs font-semibold cursor-pointer", className)}
        aria-label={t("language")}
      >
        <Languages className="h-4 w-4" />
        {lang === "en" ? "العربية" : "English"}
      </Button>
    );
  }

  return (
    <DropdownMenu>
      <DropdownMenuTrigger
        render={
          <Button
            type="button"
            variant="ghost"
            size="sm"
            className={cn("gap-1.5 text-xs font-semibold cursor-pointer", className)}
          />
        }
      >
        <Languages className="h-4 w-4" />
        <span>{lang === "en" ? "EN" : "ع"}</span>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="min-w-[140px]">
        {OPTIONS.map((opt) => (
          <DropdownMenuItem
            key={opt.value}
            className="cursor-pointer"
            onClick={() => setLang(opt.value)}
          >
            <span className={cn(lang === opt.value && "font-semibold text-primary")}>
              {opt.native}
            </span>
          </DropdownMenuItem>
        ))}
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
