import { useEffect, type ReactNode } from "react";
import { useNavigate } from "@tanstack/react-router";
import { Loader2 } from "lucide-react";
import { useAdminSession } from "@/lib/admin/use-admin-session";
import { can, type AdminAction, type AdminModule } from "@/lib/admin/permissions";
import { Unauthorized } from "./Unauthorized";

/**
 * Route guard for every /admin surface.
 * - No session  -> redirect to the hidden admin login.
 * - Customer account (no admin role) -> professional 403 screen.
 * - Missing module permission -> 403 screen scoped to that module.
 */
export function AdminGuard({
  children,
  module: moduleName,
  action = "view",
}: {
  children: ReactNode;
  module?: AdminModule;
  action?: AdminAction;
}) {
  const navigate = useNavigate();
  const { status, roles, signOut } = useAdminSession();

  useEffect(() => {
    if (status === "unauthenticated") {
      navigate({ to: "/admin/login", replace: true });
    }
  }, [status, navigate]);

  if (status === "loading" || status === "unauthenticated") {
    return (
      <div className="grid min-h-screen place-items-center bg-background">
        <Loader2 className="size-6 animate-spin text-gold" />
      </div>
    );
  }

  if (status === "unauthorized") {
    return <Unauthorized onSignOut={() => void signOut()} />;
  }

  if (status === "unverified") {
    return (
      <Unauthorized
        title="Email verification required"
        message="Entry into the Admin Control Room must be authorised from the verification link sent to your operator inbox. Sign in again to request a fresh link."
        onSignOut={() => void signOut()}
      />
    );
  }

  if (moduleName && !can(roles, moduleName, action)) {
    return (
      <Unauthorized
        title="Insufficient permissions"
        message="Your role does not include access to this module. Contact a Super Admin if you believe this is a mistake."
        onSignOut={() => void signOut()}
      />
    );
  }

  return <>{children}</>;
}
