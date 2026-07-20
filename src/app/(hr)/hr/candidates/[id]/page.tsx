import { redirect } from "next/navigation";

export default async function CandidateDetailRedirect({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  redirect(`/hr/candidates?id=${id}`);
}
