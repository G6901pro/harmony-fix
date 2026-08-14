import { createFileRoute, Outlet } from "@tanstack/react-router";

/** Hidden admin area — never linked from public navigation, never indexed. */
export const Route = createFileRoute("/admin")({
  head: () => ({
    meta: [
      { title: "Restricted area" },
      { name: "robots", content: "noindex, nofollow, noarchive, nosnippet" },
      { name: "googlebot", content: "noindex, nofollow" },
      { name: "referrer", content: "no-referrer" },
    ],
  }),
  component: () => <Outlet />,
});
