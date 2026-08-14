import type { ReactNode } from "react";
import { AdminGuard } from "./AdminGuard";
import { AdminShell } from "./AdminShell";
import { useAdminSession } from "@/lib/admin/use-admin-session";
import type { AdminAction, AdminModule } from "@/lib/admin/permissions";

export function AdminPage({
  module: moduleName,
  action = "view",
  eyebrow,
  title,
  description,
  actions,
  children,
}: {
  module?: AdminModule;
  action?: AdminAction;
  eyebrow?: string;
  title: string;
  description?: string;
  actions?: ReactNode;
  children: ReactNode;
}) {
  return (
    <AdminGuard module={moduleName} action={action}>
      <AdminPageInner
        eyebrow={eyebrow}
        title={title}
        description={description}
        actions={actions}
      >
        {children}
      </AdminPageInner>
    </AdminGuard>
  );
}

function AdminPageInner({
  eyebrow,
  title,
  description,
  actions,
  children,
}: {
  eyebrow?: string;
  title: string;
  description?: string;
  actions?: ReactNode;
  children: ReactNode;
}) {
  const { role, roles, email, signOut } = useAdminSession();
  return (
    <AdminShell role={role} roles={roles} email={email} onSignOut={() => void signOut()}>
      <div className="flex flex-wrap items-end justify-between gap-4 border-b border-border pb-6">
        <div>
          {eyebrow ? <p className="eyebrow">{eyebrow}</p> : null}
          <h1 className="mt-2 font-display text-3xl tracking-tight sm:text-4xl">{title}</h1>
          {description ? (
            <p className="mt-2 max-w-2xl text-sm text-muted-foreground">{description}</p>
          ) : null}
        </div>
        {actions ? <div className="flex flex-wrap items-center gap-3">{actions}</div> : null}
      </div>
      <div className="mt-8">{children}</div>
    </AdminShell>
  );
}

export const adminField =
  "w-full rounded-lg border border-input bg-background/60 px-4 py-2.5 text-sm text-foreground placeholder:text-muted-foreground focus:border-gold/60 focus:outline-none";

export const adminLabel =
  "mb-1.5 block text-[10px] tracking-[0.2em] text-muted-foreground uppercase";

export const goldButton =
  "inline-flex items-center justify-center gap-2 rounded-full bg-[image:var(--gradient-gold)] px-6 py-3 text-[10px] font-semibold tracking-[0.24em] text-primary-foreground uppercase transition-all hover:brightness-110 disabled:opacity-60";

export const ghostButton =
  "inline-flex items-center justify-center gap-2 rounded-full border border-border px-5 py-2.5 text-[10px] font-semibold tracking-[0.2em] text-muted-foreground uppercase transition-colors hover:border-gold/60 hover:text-gold disabled:opacity-60";

export const dangerButton =
  "inline-flex items-center justify-center gap-2 rounded-full border border-destructive/50 px-5 py-2.5 text-[10px] font-semibold tracking-[0.2em] text-destructive uppercase transition-colors hover:bg-destructive/10 disabled:opacity-60";
