import { type RouteConfig, index, route } from "@react-router/dev/routes";

export default [
  // Authentication routes
  route("login", "routes/login.tsx"),
  route("signup", "routes/signup.tsx"),

  // Unified dashboard route
  index("routes/dashboard.tsx"), // Default dashboard (redirects to unified-dashboard)
  // Ticket management routes
  route("tickets", "routes/tickets.tsx"),
  route("newtickets", "routes/newtickets.tsx"),
  route("tickets/:ticketId", "routes/tickets.$ticketId.tsx"),
  route("my-tickets", "routes/my-tickets.tsx"),

  // Reports route (for agents and admins)
  route("reports", "routes/reports.tsx"),
] satisfies RouteConfig;
