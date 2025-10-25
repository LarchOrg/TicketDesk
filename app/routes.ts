import { type RouteConfig, index, route } from "@react-router/dev/routes";

export default [
  // Authentication routes
  route("login", "routes/login.tsx"),
  route("signup", "routes/signup.tsx"),
  route("forgot-password", "routes/forgot-password.tsx"),
  route("reset-password", "routes/reset-password.tsx"),
  route("profile", "routes/profile.tsx"),

  // API routes - using proper React Router v7 structure
  route("api/notifications", "routes/api/notifications/route.tsx"),
  route(
    "api/notifications/mark-read",
    "routes/api/notifications/mark-read.tsx"
  ),
  route(
    "api/notifications/mark-all-read",
    "routes/api/notifications/mark-all-read.tsx"
  ),

  index("routes/dashboard.tsx"),
  route("tickets", "routes/tickets.tsx"),
  route("newtickets", "routes/newtickets.tsx"),
  route("tickets/:ticketId", "routes/tickets.$ticketId.tsx"),
  route("my-tickets", "routes/my-tickets.tsx"),
  route("reports", "routes/reports.tsx"),
  route("analytics", "routes/analytics.tsx"),

  route("admin/settings", "routes/admin/settings.tsx"),
  route("admin/users", "routes/admin/users.tsx"),
] satisfies RouteConfig;
