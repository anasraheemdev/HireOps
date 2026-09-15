"use client";

import { useState } from "react";
import { Plus, MoreVertical, Loader2, AlertTriangle, Copy } from "lucide-react";
import { useForm, useWatch } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { toast } from "sonner";
import { PageHeader } from "@/components/shared/page-header";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
  DialogClose,
  DialogTrigger,
} from "@/components/ui/dialog";
import {
  DropdownMenu,
  DropdownMenuTrigger,
  DropdownMenuContent,
  DropdownMenuItem,
} from "@/components/ui/dropdown-menu";
import { LabeledSelect } from "@/components/shared/labeled-select";
import { EmptyState } from "@/components/shared/enterprise-ui";
import { cn } from "@/lib/utils";
import {
  useAdminUsersQuery,
  useInviteUserMutation,
  useUpdateUserMutation,
  useAdminRolesQuery,
  type AdminUser,
} from "@/lib/queries/use-admin";

const statusStyle: Record<string, string> = {
  active: "bg-emerald-500/15 text-emerald-300 border-emerald-500/25",
  invited: "bg-blue-500/15 text-blue-300 border-blue-500/25",
  suspended: "bg-rose-500/15 text-rose-300 border-rose-500/25",
};

const portalLabel: Record<string, string> = {
  super_admin: "Admin",
  hr: "HR",
  candidate: "Candidate",
};

const avatarColors = [
  "from-blue-500 to-indigo-600",
  "from-cyan-500 to-blue-600",
  "from-violet-500 to-purple-600",
  "from-emerald-500 to-teal-600",
  "from-amber-500 to-orange-600",
  "from-rose-500 to-pink-600",
];

function initialsFor(name: string | null, email: string) {
  const source = name?.trim() || email;
  const parts = source.split(/\s+/).filter(Boolean);
  if (parts.length >= 2) return (parts[0][0] + parts[1][0]).toUpperCase();
  return source.slice(0, 2).toUpperCase();
}

const inviteSchema = z.object({
  email: z.string().email("Enter a valid email"),
  fullName: z.string().optional(),
  portalRole: z.enum(["super_admin", "hr", "candidate"]),
  roleId: z.string().optional(),
});
type InviteFormValues = z.infer<typeof inviteSchema>;

function InviteUserDialog() {
  const [open, setOpen] = useState(false);
  const [actionLink, setActionLink] = useState<string | null>(null);
  const invite = useInviteUserMutation();
  const { data: rolesData } = useAdminRolesQuery();
  const {
    register,
    handleSubmit,
    reset,
    setValue,
    control,
    formState: { errors },
  } = useForm<InviteFormValues>({
    resolver: zodResolver(inviteSchema),
    defaultValues: { email: "", fullName: "", portalRole: "hr", roleId: "" },
  });
  const portalRoleValue = useWatch({ control, name: "portalRole" });
  const roleIdValue = useWatch({ control, name: "roleId" });

  const onSubmit = (values: InviteFormValues) => {
    invite.mutate(
      {
        email: values.email,
        fullName: values.fullName || undefined,
        portalRole: values.portalRole,
        roleId: values.roleId || undefined,
      },
      {
        onSuccess: (result) => {
          toast.success(`Invited ${values.email}`);
          setActionLink(result.actionLink);
          if (!result.actionLink) {
            reset();
            setOpen(false);
          }
        },
        onError: (err) => toast.error(err instanceof Error ? err.message : "Failed to invite user"),
      }
    );
  };

  return (
    <Dialog
      open={open}
      onOpenChange={(next) => {
        setOpen(next);
        if (!next) {
          reset();
          setActionLink(null);
        }
      }}
    >
      <DialogTrigger render={<Button className="gradient-brand text-white gap-2 cursor-pointer" />}>
        <Plus className="h-4 w-4" /> Invite user
      </DialogTrigger>
      <DialogContent className="sm:max-w-md bg-popover border-white/10">
        <DialogHeader>
          <DialogTitle>Invite a user</DialogTitle>
          <DialogDescription>They&apos;ll receive an invite link to set their password and sign in.</DialogDescription>
        </DialogHeader>

        {actionLink ? (
          <div className="space-y-3">
            <p className="text-xs text-muted-foreground">
              Email delivery isn&apos;t configured for this environment. Share this invite link with the user directly:
            </p>
            <div className="flex items-center gap-2">
              <Input readOnly value={actionLink} className="bg-white/5 border-white/10 text-xs font-mono" />
              <Button
                type="button"
                size="icon"
                variant="outline"
                className="bg-white/5 border-white/10 shrink-0 cursor-pointer"
                onClick={() => {
                  navigator.clipboard.writeText(actionLink);
                  toast.success("Invite link copied");
                }}
              >
                <Copy className="h-4 w-4" />
              </Button>
            </div>
            <DialogFooter className="px-0">
              <Button
                type="button"
                className="gradient-brand text-white cursor-pointer"
                onClick={() => {
                  reset();
                  setActionLink(null);
                  setOpen(false);
                }}
              >
                Done
              </Button>
            </DialogFooter>
          </div>
        ) : (
          <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
            <div className="space-y-1.5">
              <Label>Email</Label>
              <Input {...register("email")} placeholder="name@company.com" className="bg-white/5 border-white/10" />
              {errors.email && <p className="text-xs text-rose-400">{errors.email.message}</p>}
            </div>
            <div className="space-y-1.5">
              <Label>Full name</Label>
              <Input {...register("fullName")} placeholder="Optional" className="bg-white/5 border-white/10" />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <Label>Portal</Label>
                <LabeledSelect
                  value={portalRoleValue}
                  onValueChange={(v) => setValue("portalRole", v as InviteFormValues["portalRole"])}
                  options={[
                    { value: "super_admin", label: "Admin" },
                    { value: "hr", label: "HR" },
                    { value: "candidate", label: "Candidate" },
                  ]}
                />
              </div>
              <div className="space-y-1.5">
                <Label>Role</Label>
                <LabeledSelect
                  value={roleIdValue}
                  onValueChange={(v) => setValue("roleId", v)}
                  placeholder="No role"
                  options={(rolesData?.roles ?? []).map((r) => ({ value: r.id, label: r.name }))}
                />
              </div>
            </div>
            <DialogFooter className="px-0">
              <DialogClose render={<Button type="button" variant="outline" className="bg-white/5 border-white/10 cursor-pointer" />}>
                Cancel
              </DialogClose>
              <Button type="submit" className="gradient-brand text-white cursor-pointer" disabled={invite.isPending}>
                {invite.isPending ? <Loader2 className="h-4 w-4 animate-spin" /> : "Send invite"}
              </Button>
            </DialogFooter>
          </form>
        )}
      </DialogContent>
    </Dialog>
  );
}

function ManageUserDialog({ user, open, onOpenChange }: { user: AdminUser; open: boolean; onOpenChange: (v: boolean) => void }) {
  const { data: rolesData } = useAdminRolesQuery();
  const update = useUpdateUserMutation();
  const [portalRole, setPortalRole] = useState(user.portalRole ?? "hr");
  const [roleId, setRoleId] = useState(user.roleId ?? "");
  const [status, setStatus] = useState(user.status);

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md bg-popover border-white/10">
        <DialogHeader>
          <DialogTitle>Manage {user.fullName ?? user.email}</DialogTitle>
          <DialogDescription>Update portal access, role, and account status.</DialogDescription>
        </DialogHeader>
        <div className="space-y-4">
          <div className="space-y-1.5">
            <Label>Portal</Label>
            <LabeledSelect
              value={portalRole}
              onValueChange={(v) => setPortalRole(v as typeof portalRole)}
              options={[
                { value: "super_admin", label: "Admin" },
                { value: "hr", label: "HR" },
                { value: "candidate", label: "Candidate" },
              ]}
            />
          </div>
          <div className="space-y-1.5">
            <Label>Role</Label>
            <LabeledSelect
              value={roleId}
              onValueChange={setRoleId}
              placeholder="No role"
              options={(rolesData?.roles ?? []).map((r) => ({ value: r.id, label: r.name }))}
            />
          </div>
          <div className="space-y-1.5">
            <Label>Status</Label>
            <LabeledSelect
              value={status}
              onValueChange={(v) => setStatus(v as typeof status)}
              options={[
                { value: "active", label: "Active" },
                { value: "invited", label: "Invited" },
                { value: "suspended", label: "Suspended" },
              ]}
            />
          </div>
        </div>
        <DialogFooter className="px-0">
          <DialogClose render={<Button type="button" variant="outline" className="bg-white/5 border-white/10 cursor-pointer" />}>
            Cancel
          </DialogClose>
          <Button
            type="button"
            className="gradient-brand text-white cursor-pointer"
            disabled={update.isPending}
            onClick={() =>
              update.mutate(
                { id: user.id, portalRole: portalRole as "super_admin" | "hr" | "candidate", roleId: roleId || null, status: status as "active" | "invited" | "suspended" },
                {
                  onSuccess: () => {
                    toast.success("User updated");
                    onOpenChange(false);
                  },
                  onError: (err) => toast.error(err instanceof Error ? err.message : "Failed to update user"),
                }
              )
            }
          >
            {update.isPending ? <Loader2 className="h-4 w-4 animate-spin" /> : "Save changes"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

export default function AdminUsersPage() {
  const { data: users, isLoading, isError, error, refetch } = useAdminUsersQuery();
  const update = useUpdateUserMutation();
  const [managingUser, setManagingUser] = useState<AdminUser | null>(null);

  return (
    <div>
      <PageHeader
        title="Users"
        description="Manage accounts across Admin, HR, and Candidate portals."
        actions={<InviteUserDialog />}
      />

      {isLoading && (
        <div className="ws-panel rounded-md overflow-hidden">
          {Array.from({ length: 5 }).map((_, i) => (
            <div key={i} className="flex items-center gap-3 px-3 py-2 border-b border-white/5 last:border-0">
              <Skeleton className="h-7 w-7 rounded-full" />
              <Skeleton className="h-3.5 w-40" />
            </div>
          ))}
        </div>
      )}

      {isError && (
        <div className="ws-panel rounded-md p-10 text-center">
          <AlertTriangle className="h-8 w-8 text-rose-400 mx-auto mb-3" />
          <p className="text-sm font-medium">Couldn&apos;t load users</p>
          <p className="text-xs text-muted-foreground mt-1">{error instanceof Error ? error.message : "Unknown error"}</p>
          <Button variant="outline" className="mt-4 bg-white/5 border-white/10 cursor-pointer" onClick={() => refetch()}>
            Try again
          </Button>
        </div>
      )}

      {!isLoading && !isError && (users?.length ?? 0) === 0 && (
        <EmptyState title="No users yet" description="Invite your first teammate to get started." />
      )}

      {!isLoading && !isError && (users?.length ?? 0) > 0 && (
        <div className="ws-panel rounded-md overflow-hidden">
          <div className="hidden md:grid grid-cols-[2fr_1.4fr_1fr_0.9fr_0.9fr_auto] px-4 py-3 border-b border-white/10 text-xs font-medium text-muted-foreground">
            <span>Name</span>
            <span>Email</span>
            <span>Role</span>
            <span>Status</span>
            <span>Portal</span>
            <span />
          </div>
          {users!.map((u, i) => (
            <div
              key={u.id}
              className="grid grid-cols-1 md:grid-cols-[2fr_1.4fr_1fr_0.9fr_0.9fr_auto] items-center gap-2 md:gap-0 px-4 py-3 border-b border-white/5 last:border-0 hover:bg-white/5 transition-colors"
            >
              <div className="flex items-center gap-3 min-w-0">
                <Avatar className="h-9 w-9 border border-white/10 shrink-0">
                  <AvatarFallback className={cn("bg-gradient-to-br text-white text-[11px] font-semibold", avatarColors[i % avatarColors.length])}>
                    {initialsFor(u.fullName, u.email)}
                  </AvatarFallback>
                </Avatar>
                <p className="text-sm font-medium truncate">{u.fullName ?? u.email}</p>
              </div>
              <p className="text-sm text-muted-foreground truncate">{u.email}</p>
              <p className="text-sm text-muted-foreground">{u.roleName ?? "—"}</p>
              <Badge variant="outline" className={cn("text-[10px] w-fit capitalize", statusStyle[u.status])}>
                {u.status}
              </Badge>
              <Badge variant="outline" className="bg-white/5 border-white/10 text-[10px] w-fit">
                {portalLabel[u.portalRole ?? "hr"] ?? u.portalRole}
              </Badge>
              <DropdownMenu>
                <DropdownMenuTrigger render={<Button size="icon" variant="ghost" className="h-8 w-8 cursor-pointer" />}>
                  <MoreVertical className="h-4 w-4" />
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end">
                  <DropdownMenuItem onClick={() => setManagingUser(u)}>Manage access</DropdownMenuItem>
                  {u.status !== "active" && (
                    <DropdownMenuItem
                      onClick={() =>
                        update.mutate({ id: u.id, status: "active" }, {
                          onSuccess: () => toast.success(`${u.fullName ?? u.email} activated`),
                          onError: (err) => toast.error(err instanceof Error ? err.message : "Failed to update"),
                        })
                      }
                    >
                      Activate
                    </DropdownMenuItem>
                  )}
                  {u.status !== "suspended" && (
                    <DropdownMenuItem
                      variant="destructive"
                      onClick={() =>
                        update.mutate({ id: u.id, status: "suspended" }, {
                          onSuccess: () => toast.success(`${u.fullName ?? u.email} suspended`),
                          onError: (err) => toast.error(err instanceof Error ? err.message : "Failed to update"),
                        })
                      }
                    >
                      Suspend
                    </DropdownMenuItem>
                  )}
                </DropdownMenuContent>
              </DropdownMenu>
            </div>
          ))}
        </div>
      )}

      {managingUser && (
        <ManageUserDialog user={managingUser} open={!!managingUser} onOpenChange={(v) => !v && setManagingUser(null)} />
      )}
    </div>
  );
}
