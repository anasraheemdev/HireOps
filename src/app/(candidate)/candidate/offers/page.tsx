"use client";

import Link from "next/link";
import { Award } from "lucide-react";
import { PageHeader } from "@/components/shared/page-header";
import { EmptyState, ErrorState, PageSkeleton } from "@/components/shared/enterprise-ui";
import { MotionPage, MotionList, MotionItem } from "@/components/shared/motion";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { useOffersQuery, useOfferRespondMutation } from "@/lib/queries/use-candidate-portal";
import { toast } from "sonner";

export default function CandidateOffersPage() {
  const { data: offers = [], isLoading, isError, error, refetch } = useOffersQuery();
  const respond = useOfferRespondMutation();

  return (
    <MotionPage>
      <PageHeader title="Offers" description="Review and respond to employment offers." />
      {isLoading && <PageSkeleton rows={2} />}
      {isError && (
        <ErrorState title="Could not load offers" description={error instanceof Error ? error.message : ""} onRetry={() => refetch()} />
      )}
      {!isLoading && !isError && offers.length === 0 && (
        <EmptyState
          icon={Award}
          title="No offers yet"
          description="When HR extends an offer, you can accept or decline here."
          actionLabel="Browse open roles"
          onAction={() => {
            window.location.href = "/candidate/jobs";
          }}
        />
      )}
      <MotionList className="space-y-3">
        {offers.map((offer) => (
          <MotionItem key={String(offer.id)}>
            <div className="glass-card p-5">
              <div className="flex items-start justify-between gap-3">
                <div>
                  <p className="text-sm font-semibold">Offer</p>
                  <p className="text-xs text-muted-foreground mt-1">
                    {offer.salary_text ? String(offer.salary_text) : "Compensation details enclosed"}
                    {offer.start_date ? ` · Start ${String(offer.start_date)}` : ""}
                  </p>
                </div>
                <Badge variant="outline" className="capitalize text-[10px]">
                  {String(offer.status)}
                </Badge>
              </div>
              {(offer.status === "sent" || offer.status === "pending" || offer.status === "draft") && (
                <div className="flex gap-2 mt-4">
                  <Button
                    className="gradient-brand text-white cursor-pointer"
                    disabled={respond.isPending}
                    onClick={async () => {
                      try {
                        await respond.mutateAsync({ offerId: String(offer.id), status: "accepted" });
                        toast.success("Offer accepted");
                      } catch (e) {
                        toast.error(e instanceof Error ? e.message : "Failed");
                      }
                    }}
                  >
                    Accept
                  </Button>
                  <Button
                    variant="outline"
                    className="cursor-pointer"
                    disabled={respond.isPending}
                    onClick={async () => {
                      try {
                        await respond.mutateAsync({ offerId: String(offer.id), status: "declined" });
                        toast.success("Offer declined");
                      } catch (e) {
                        toast.error(e instanceof Error ? e.message : "Failed");
                      }
                    }}
                  >
                    Decline
                  </Button>
                </div>
              )}
              <Link href="/candidate/jobs" className="text-xs text-primary mt-3 inline-block hover:underline">
                Browse other roles
              </Link>
            </div>
          </MotionItem>
        ))}
      </MotionList>
    </MotionPage>
  );
}
