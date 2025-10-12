import { Grid, List, Plus } from "lucide-react";
import { useEffect, useRef, useState } from "react";
import {
  redirect,
  useActionData,
  useNavigate,
  useNavigation,
  useSubmit,
} from "react-router";
import {
  DashboardSkeleton,
  TicketListSkeleton,
} from "~/components/LoadingComponents";
import TicketCard from "~/components/TicketCard";
import TicketTable from "~/components/TicketTable";
import { ToastContainer, useToast } from "~/components/Toast";
import { Button } from "~/components/ui/button";
import { Card, CardContent } from "~/components/ui/card";
import { useAuth } from "~/contexts/AuthContext";
import { ROLE_PERMISSIONS } from "~/lib/role-utils";
import { createSupabaseServerClient } from "~/lib/supabase-server";
import type { Ticket, TicketFilters, TicketStats } from "~/lib/types";
import { createServices } from "~/services";
import type { Route } from "./+types/tickets";

// Types
interface TicketsLoaderData {
  tickets: Ticket[];
  stats: TicketStats;
  total: number;
  filters: {
    status: string;
    priority: string;
    search: string;
  };
  error?: string;
}

interface TicketsActionData {
  success: boolean;
  message: string;
  error?: string;
}

type ViewMode = "grid" | "list";
type ActionType = "deleteTicket";

// Constants
const DEFAULT_FILTERS: TicketFilters = {
  sortBy: "created_at",
  sortOrder: "desc",
  limit: 50,
  offset: 0,
};

const STATS_CONFIG = [
  { key: "total", label: "Total Tickets", color: "text-foreground" },
  { key: "open", label: "Open", color: "text-red-600" },
  { key: "in_progress", label: "In Progress", color: "text-yellow-600" },
  { key: "resolved", label: "Resolved", color: "text-purple-600" },
  { key: "reopened", label: "Reopened", color: "text-orange-600" },
  { key: "closed", label: "Closed", color: "text-green-600" },
] as const;

// Utility functions
function parseFiltersFromUrl(url: URL): TicketFilters {
  return {
    status: url.searchParams.get("status") || undefined,
    priority: url.searchParams.get("priority") || undefined,
    search: url.searchParams.get("search") || undefined,
    sortBy: url.searchParams.get("sortBy") || DEFAULT_FILTERS.sortBy,
    sortOrder:
      (url.searchParams.get("sortOrder") as "asc" | "desc") ||
      DEFAULT_FILTERS.sortOrder,
    limit: parseInt(
      url.searchParams.get("limit") || String(DEFAULT_FILTERS.limit)
    ),
    offset: parseInt(
      url.searchParams.get("offset") || String(DEFAULT_FILTERS.offset)
    ),
  };
}

function createEmptyStats(): TicketStats {
  return {
    total: 0,
    open: 0,
    in_progress: 0,
    resolved: 0,
    reopened: 0,
    closed: 0,
  };
}

// Meta function
export const meta = () => {
  return [
    { title: "Ticket Queue - Support Portal" },
    { name: "description", content: "Manage and view all support tickets" },
  ];
};

// Loader function
export async function loader({
  request,
}: Route.LoaderArgs): Promise<TicketsLoaderData> {
  const url = new URL(request.url);
  const filters = parseFiltersFromUrl(url);

  try {
    const { supabase, response } = createSupabaseServerClient(request);

    // Use getUser() instead of getSession() for security
    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser();

    if (authError) {
      console.error("Auth error in tickets loader:", authError);
      return {
        tickets: [],
        stats: createEmptyStats(),
        total: 0,
        filters: {
          status: filters.status || "",
          priority: filters.priority || "",
          search: filters.search || "",
        },
        error: "Authentication error",
      };
    }

    if (!user) {
      console.log("No user found, redirecting to login");
      throw redirect("/login", { headers: response.headers });
    }

    const services = createServices(supabase);

    const [ticketsResult, stats] = await Promise.all([
      services.tickets.getTickets(filters),
      services.tickets.getTicketStats(),
    ]);

    console.log(`Loaded ${ticketsResult.tickets.length} tickets`);

    return {
      tickets: ticketsResult.tickets,
      stats,
      total: ticketsResult.total,
      filters: {
        status: filters.status || "",
        priority: filters.priority || "",
        search: filters.search || "",
      },
    };
  } catch (error) {
    console.error("Tickets loader error:", error);

    // If it's a redirect, re-throw it
    if (error instanceof Response) {
      throw error;
    }

    return {
      tickets: [],
      stats: createEmptyStats(),
      total: 0,
      filters: {
        status: filters.status || "",
        priority: filters.priority || "",
        search: filters.search || "",
      },
      error: "Failed to fetch tickets",
    };
  }
}

// Action function
export async function action({
  request,
}: Route.ActionArgs): Promise<TicketsActionData> {
  const { supabase } = createSupabaseServerClient(request);
  const services = createServices(supabase);

  // Check authentication
  const {
    data: { user },
    error: authError,
  } = await supabase.auth.getUser();
  if (authError || !user) {
    throw new Response("Authentication required", { status: 401 });
  }

  const formData = await request.formData();
  const actionType = formData.get("actionType") as ActionType;
  console.log(actionType, "Action type received");

  try {
    switch (actionType) {
      case "deleteTicket": {
        const ticketId = formData.get("ticketId") as string;
        console.log("Delete ticket action called with ID:", ticketId);

        if (!ticketId) {
          console.log("No ticket ID provided");
          return {
            success: false,
            message: "Ticket ID is required",
            error: "Missing ticket ID",
          };
        }

        // Check if user has permission to delete tickets
        // Get user profile to check role
        console.log("Checking user permissions for user:", user.id);
        const { data: profile, error: profileError } = await supabase
          .from("profiles")
          .select("role")
          .eq("id", user.id)
          .single();

        if (profileError) {
          console.error("Error fetching user profile:", profileError);
          return {
            success: false,
            message: "Failed to verify user permissions",
            error: profileError.message,
          };
        }

        console.log("User profile:", profile);
        const userRole = profile?.role as
          | "admin"
          | "agent"
          | "user"
          | undefined;
        const permissions = userRole
          ? ROLE_PERMISSIONS[userRole]
          : ROLE_PERMISSIONS.user;

        console.log(
          "User role:",
          userRole,
          "Can delete:",
          permissions.canDeleteTickets
        );

        if (!permissions.canDeleteTickets) {
          console.log("Permission denied for user role:", userRole);
          return {
            success: false,
            message: "Permission denied",
            error: "You don't have permission to delete tickets",
          };
        }

        console.log("Attempting to delete ticket:", ticketId);

        // First, let's check if the ticket exists
        const { data: existingTicket, error: fetchError } = await supabase
          .from("tickets")
          .select("id, title")
          .eq("id", ticketId)
          .single();

        if (fetchError) {
          console.error("Error fetching ticket to delete:", fetchError);
          return {
            success: false,
            message: "Ticket not found",
            error: fetchError.message,
          };
        }

        console.log("Found ticket to delete:", existingTicket);

        // Pass user context to the delete service
        const result = await services.tickets.deleteTicket(
          ticketId,
          user.id,
          userRole || "user"
        );
        console.log("Delete result:", result);

        if (!result || !result.success) {
          console.error("Delete failed:", result);
          return {
            success: false,
            message: "Failed to delete ticket",
            error: result?.error || "Unknown error occurred",
          };
        }

        console.log("Ticket deleted successfully");
        return { success: true, message: "Ticket deleted successfully" };
      }

      default:
        return {
          success: false,
          message: "Invalid action type",
          error: "Unknown action",
        };
    }
  } catch (error) {
    console.error("Tickets action error:", error);
    return {
      success: false,
      message: "Failed to perform action",
      error: error instanceof Error ? error.message : "Unknown error",
    };
  }
}

// Component: View Mode Toggle
function ViewModeToggle({
  viewMode,
  onViewModeChange,
}: {
  viewMode: ViewMode;
  onViewModeChange: (mode: ViewMode) => void;
}) {
  return (
    <div className="flex items-center border rounded-lg">
      <button
        onClick={() => onViewModeChange("grid")}
        className={`p-2 transition-colors ${
          viewMode === "grid"
            ? "bg-primary text-primary-foreground"
            : "text-muted-foreground hover:text-foreground"
        }`}
        aria-label="Grid view"
      >
        <Grid className="w-4 h-4" />
      </button>
      <button
        onClick={() => onViewModeChange("list")}
        className={`p-2 transition-colors ${
          viewMode === "list"
            ? "bg-primary text-primary-foreground"
            : "text-muted-foreground hover:text-foreground"
        }`}
        aria-label="List view"
      >
        <List className="w-4 h-4" />
      </button>
    </div>
  );
}

// Component: Page Header
function PageHeader({
  onCreateTicket,
  viewMode,
  onViewModeChange,
}: {
  onCreateTicket: () => void;
  viewMode: ViewMode;
  onViewModeChange: (mode: ViewMode) => void;
}) {
  if (typeof window !== "undefined") {
    setTimeout(() => {
      const el = document.querySelector(
        "h1.text-3xl.font-bold.text-foreground"
      );
      if (el) {
        el.textContent = "Ticket Queue";
      }
    }, 0);
  }
  return (
    <div className="flex items-center justify-between">
      <div>
        <h1 className="text-3xl font-bold text-foreground">All Tickets</h1>
        <p className="text-muted-foreground">
          Manage and track all support tickets
        </p>
      </div>
      <div className="flex items-center space-x-4">
        <ViewModeToggle
          viewMode={viewMode}
          onViewModeChange={onViewModeChange}
        />
        <Button
          onClick={onCreateTicket}
          className="flex items-center space-x-2"
        >
          <Plus className="w-4 h-4" />
          <span>New Ticket</span>
        </Button>
      </div>
    </div>
  );
}

// Component: Stats Card
function StatsCard({
  value,
  label,
  color,
}: {
  value: number;
  label: string;
  color: string;
}) {
  return (
    <Card>
      <CardContent className="p-6">
        <div className={`text-2xl font-bold ${color}`}>{value}</div>
        <p className="text-sm text-muted-foreground">{label}</p>
      </CardContent>
    </Card>
  );
}

// Component: Stats Grid
function StatsGrid({ stats }: { stats: TicketStats }) {
  return (
    <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4 mb-6">
      {STATS_CONFIG.map((config) => (
        <StatsCard
          key={config.key}
          value={stats[config.key as keyof TicketStats]}
          label={config.label}
          color={config.color}
        />
      ))}
    </div>
  );
}

// Component: Empty State
function EmptyState({ onCreateTicket }: { onCreateTicket: () => void }) {
  return (
    <div className="text-center py-12">
      <p className="text-muted-foreground mb-4">
        No tickets found matching your criteria.
      </p>
      <Button onClick={onCreateTicket}>Create your first ticket</Button>
    </div>
  );
}

// Component: Tickets Grid
function TicketsGrid({
  tickets,
  onTicketClick,
  onDeleteTicket,
  canDelete,
}: {
  tickets: Ticket[];
  onTicketClick: (ticket: Ticket) => void;
  onDeleteTicket?: (ticketId: string) => Promise<void>;
  canDelete?: boolean;
}) {
  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
      {tickets.map((ticket) => (
        <TicketCard
          key={ticket.id}
          ticket={ticket}
          onClick={() => onTicketClick(ticket)}
          onDelete={onDeleteTicket}
          canDelete={canDelete}
        />
      ))}
    </div>
  );
}

// Component: Error Display
function ErrorDisplay({ error }: { error: string }) {
  return (
    <div className="text-center py-12">
      <div className="bg-destructive/10 border border-destructive/20 rounded-lg p-6 max-w-md mx-auto">
        <h3 className="font-semibold text-destructive mb-2">
          Error Loading Tickets
        </h3>
        <p className="text-sm text-destructive/80">{error}</p>
        <Button
          onClick={() => window.location.reload()}
          variant="outline"
          className="mt-4"
        >
          Try Again
        </Button>
      </div>
    </div>
  );
}

// Custom hook for ticket management
function useTicketManagement() {
  const navigate = useNavigate();
  const submit = useSubmit();
  const [viewMode, setViewMode] = useState<ViewMode>("grid");

  const handleCreateTicket = () => {
    navigate("/newtickets");
  };

  const handleTicketClick = (ticket: Ticket) => {
    navigate(`/tickets/${ticket.id}`);
  };

  const handleEditTicket = (ticket: Ticket) => {
    navigate(`/tickets/${ticket.id}`);
  };

  const handleDeleteTicket = async (ticketId: string): Promise<void> => {
    const formData = new FormData();
    formData.append("actionType", "deleteTicket");
    formData.append("ticketId", ticketId);

    submit(formData, { method: "POST" });
  };

  return {
    viewMode,
    setViewMode,
    handleCreateTicket,
    handleTicketClick,
    handleEditTicket,
    handleDeleteTicket,
  };
}

// Main component
export default function TicketsPage({ loaderData }: Route.ComponentProps) {
  const navigation = useNavigation();
  const actionData = useActionData() as TicketsActionData | undefined;
  const { user, profile } = useAuth();
  const { toasts, removeToast, success, error } = useToast();
  const lastActionDataRef = useRef<TicketsActionData | undefined>(undefined);

  if (!loaderData) {
    return <DashboardSkeleton />;
  }

  const {
    tickets,
    stats,
    error: loaderError,
  } = loaderData as TicketsLoaderData;

  const {
    viewMode,
    setViewMode,
    handleCreateTicket,
    handleTicketClick,
    handleEditTicket,
    handleDeleteTicket,
  } = useTicketManagement();

  // Check user permissions - get role from profile instead of user metadata
  const userRole = profile?.role as "admin" | "agent" | "user" | undefined;
  const permissions = userRole
    ? ROLE_PERMISSIONS[userRole]
    : ROLE_PERMISSIONS.user;
  const canDelete = permissions.canDeleteTickets;

  // Handle action feedback - prevent duplicate toasts
  useEffect(() => {
    if (actionData && actionData !== lastActionDataRef.current) {
      lastActionDataRef.current = actionData;
      if (actionData.success) {
        success("Success", actionData.message);
      } else {
        error("Error", actionData.message);
      }
    }
  }, [actionData, success, error]);

  // Show loading state during navigation
  const isLoading = navigation.state === "loading";

  // Handle error state
  if (loaderError) {
    return (
      <>
        <div className="min-h-screen bg-background">
          <div className="max-w-full mx-auto p-6">
            <PageHeader
              onCreateTicket={handleCreateTicket}
              viewMode={viewMode}
              onViewModeChange={setViewMode}
            />
            <ErrorDisplay error={loaderError} />
          </div>
        </div>
        <ToastContainer toasts={toasts} onRemove={removeToast} />
      </>
    );
  }

  return (
    <>
      <div className="min-h-screen bg-background">
        <div className="max-w-full mx-auto p-6">
          <PageHeader
            onCreateTicket={handleCreateTicket}
            viewMode={viewMode}
            onViewModeChange={setViewMode}
          />

          <StatsGrid stats={stats} />

          {/* Tickets Display */}
          {isLoading ? (
            <TicketListSkeleton />
          ) : tickets.length === 0 ? (
            <EmptyState onCreateTicket={handleCreateTicket} />
          ) : viewMode === "grid" ? (
            <TicketsGrid
              tickets={tickets}
              onTicketClick={handleTicketClick}
              onDeleteTicket={handleDeleteTicket}
              canDelete={canDelete}
            />
          ) : (
            <TicketTable
              tickets={tickets}
              onTicketClick={handleTicketClick}
              onEdit={handleEditTicket}
              onDelete={(ticket: Ticket) => handleDeleteTicket(ticket.id)}
            />
          )}
        </div>
      </div>
      <ToastContainer toasts={toasts} onRemove={removeToast} />
    </>
  );
}
