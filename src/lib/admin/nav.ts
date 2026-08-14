import {
  CreditCard,
  Database,
  FileText,
  Image as ImageIcon,
  LayoutDashboard,
  MessageSquareQuote,
  Package,
  PackageCheck,
  Percent,
  RotateCcw,
  XCircle,
  ShoppingCart,
  Sparkles,
  Truck,
  Users,
} from "lucide-react";
import type { AdminModule } from "./permissions";
import type { AdminInboxScope } from "./use-admin-inbox";

export type AdminNavItem = {
  to:
    | "/admin"
    | "/admin/products"
    | "/admin/categories"
    | "/admin/orders"
    | "/admin/deliveries"
    | "/admin/cancellations"
    | "/admin/returns"
    | "/admin/invoices"
    | "/admin/payments"
    | "/admin/customers"
    | "/admin/reviews"
    | "/admin/homepage"
    | "/admin/media"
    | "/admin/shipping"
    | "/admin/coupons"
    | "/admin/system";
  label: string;
  icon: typeof Package;
  module?: AdminModule;
  /** Sidebar unread badge source. */
  badge?: AdminInboxScope;
  /** Restricted to the permanent super-admin allowlist. */
  superAdminOnly?: boolean;
};

export const ADMIN_NAV: AdminNavItem[] = [
  { to: "/admin", label: "Overview", icon: LayoutDashboard },
  { to: "/admin/products", label: "Products", icon: Package, module: "products" },
  { to: "/admin/categories", label: "Categories", icon: Sparkles, module: "products" },
  { to: "/admin/orders", label: "Orders", icon: ShoppingCart, module: "orders", badge: "orders" },
  { to: "/admin/deliveries", label: "Deliveries", icon: PackageCheck, module: "orders" },
  { to: "/admin/cancellations", label: "Cancellations", icon: XCircle, module: "orders" },
  { to: "/admin/returns", label: "Returns", icon: RotateCcw, module: "orders" },
  { to: "/admin/invoices", label: "Invoices", icon: FileText, module: "payments" },
  {
    to: "/admin/payments",
    label: "Payments",
    icon: CreditCard,
    module: "payments",
    badge: "payments",
  },
  { to: "/admin/customers", label: "Customers", icon: Users, module: "customers" },
  { to: "/admin/reviews", label: "Reviews", icon: MessageSquareQuote, module: "reviews" },
  { to: "/admin/homepage", label: "Homepage", icon: Sparkles, module: "homepage" },
  { to: "/admin/media", label: "Media", icon: ImageIcon, module: "media" },
  { to: "/admin/coupons", label: "Coupons", icon: Percent, module: "coupons" },
  { to: "/admin/shipping", label: "Shipping", icon: Truck, module: "shipping" },
  {
    to: "/admin/system",
    label: "Database & Logs",
    icon: Database,
    superAdminOnly: true,
  },
];


