import { redirect } from "next/navigation";

/** Fallback if config redirects are skipped — prefer next.config + middleware. */
export default function RootPage() {
  redirect("/login");
}
