import { Grid, List, X } from "lucide-react";
import { useEffect, useRef, useState } from "react";
import {
  redirect,
  useActionData,
  useNavigate,
  useNavigation,
  useSubmit,
} from "react-router";
import DateRangeFilter from "~/components/DateRangeFilter";
import {
  DashboardSkeleton,
  TicketListSkeleton,
} from "~/components/LoadingComponents";
import TicketCard from "~/components/TicketCard";
import TicketTable from "~/components/TicketTable";
import { ToastContainer, useToast } from "~/components/Toast";
import { Button } from "~/components/ui/button";
import { Card, CardContent } from "~/components/ui/card";
import { Input } from "~/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "~/components/ui/select";
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
    date_from: string;
    date_to: string;
  };
  error?: string;
}

interface TicketsActionData {
  success: boolean;
  message: string;
  error?: string;
}

type ViewMode = "grid" | "list";

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
  { key: "closed", label: "Closed", color: "text-gray-600" },
] as const;

// Utility functions
function parseFiltersFromUrl(url: URL): TicketFilters {
  return {
    status: url.searchParams.get("status") || undefined,
    priority: url.searchParams.get("priority") || undefined,
    // Remove search and date range from URL params
    search: undefined,
    date_from: undefined,
    date_to: undefined,
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
          date_from: filters.date_from || "",
          date_to: filters.date_to || "",
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
        date_from: filters.date_from || "",
        date_to: filters.date_to || "",
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
        date_from: filters.date_from || "",
        date_to: filters.date_to || "",
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
  const actionType = formData.get("actionType");
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
      case "bulkDeleteTickets": {
        const ticketIds = formData.getAll("ticketIds[]") as string[];
        console.log("Bulk delete action called with IDs:", ticketIds);

        if (!ticketIds || ticketIds.length === 0) {
          return {
            success: false,
            message: "No tickets provided for deletion",
            error: "Missing ticket IDs",
          };
        }

        // 🔐 check auth and permissions (same as before)
        const { data: profile, error: profileError } = await supabase
          .from("profiles")
          .select("role")
          .eq("id", user.id)
          .single();

        if (profileError) {
          console.error("Error fetching profile:", profileError);
          return {
            success: false,
            message: "Failed to verify permissions",
            error: profileError.message,
          };
        }

        const userRole = profile?.role as
          | "admin"
          | "agent"
          | "user"
          | undefined;
        const permissions = userRole
          ? ROLE_PERMISSIONS[userRole]
          : ROLE_PERMISSIONS.user;

        if (!permissions.canDeleteTickets) {
          return {
            success: false,
            message: "Permission denied",
            error: "You don't have permission to delete tickets",
          };
        }

        // 🗑️ Perform delete for each ticket
        const deleteResults = await Promise.all(
          ticketIds.map(async (id) => {
            const result = await services.tickets.deleteTicket(
              id,
              user.id,
              userRole || "user"
            );
            return { id, success: result?.success, error: result?.error };
          })
        );

        const failed = deleteResults.filter((r) => !r.success);
        if (failed.length > 0) {
          return {
            success: false,
            message: `${failed.length} of ${ticketIds.length} tickets failed to delete`,
            error: failed.map((f) => f.error).join(", "),
          };
        }

        console.log("✅ Bulk delete completed successfully");
        return { success: true, message: "All tickets deleted successfully" };
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
  // viewMode,
  // onViewModeChange,
}: {
  onCreateTicket: () => void;
  // viewMode: ViewMode;
  // onViewModeChange: (mode: ViewMode) => void;
}) {
  if (typeof window !== "undefined") {
    setTimeout(() => {
      const el = document.querySelector(
        "h1.text-2xl.font-bold.text-foreground"
      );
      if (el) {
        el.textContent = "Ticket Queue";
      }
    }, 0);
  }
  return (
    <div className="flex items-center justify-between">
      <div className="p-2">
        <h1 className="text-2xl font-bold text-foreground">All Tickets</h1>
        <p className="text-muted-foreground">
          Manage and track all support tickets
        </p>
      </div>
      <div className="flex items-center space-x-4">
        {/* <ViewModeToggle
          viewMode={viewMode}
          onViewModeChange={onViewModeChange}
        /> */}
        <Button
          onClick={onCreateTicket}
          className="flex items-center space-x-2"
        >
          <span>Create New Ticket</span>
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
      <Button onClick={onCreateTicket}>Create Ticket</Button>
    </div>
  );
}

// Component: Filter Panel
function FilterPanel({
  filters,
  onFilterChange,
  onSearchChange,
  onDateRangeChange,
  disabled = false,
}: {
  filters: {
    status: string;
    priority: string;
    search: string;
    date_from: string;
    date_to: string;
  };
  onFilterChange: (filters: Partial<TicketFilters>) => void;
  onSearchChange: (search: string) => void;
  onDateRangeChange: (dateFrom?: string, dateTo?: string) => void;
  disabled?: boolean;
}) {
  const isFiltered =
    filters.status ||
    filters.priority ||
    filters.search ||
    filters.date_from ||
    filters.date_to;
  const handleClearFilters = () => {
    onFilterChange({
      status: undefined,
      priority: undefined,
    });
    onSearchChange("");
    onDateRangeChange(undefined, undefined);
  };

  return (
    <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4 w-full px-5 py-4">
      {/* Header */}
      <div className="flex items-center gap-6">
        <h2 className="text-lg font-semibold">Filters</h2>
        {filters && isFiltered && (
          <Button
            variant="outline"
            size="sm"
            onClick={() => handleClearFilters()}
            className="px-2 py-1 h-8"
          >
            <X className="h-3 w-3" />
            Clear filters
          </Button>
        )}
      </div>

      {/* Filter Controls */}
      <div className="flex flex-wrap items-center gap-6">
        {/* Search Filter */}
        <div className="flex items-center gap-2">
          <label className="text-sm font-medium text-muted-foreground">
            Search
          </label>
          <Input
            type="text"
            placeholder="Search tickets by title..."
            value={filters.search}
            onChange={(e) => onSearchChange(e.target.value)}
            className="w-64"
            disabled={disabled}
          />
        </div>

        {/* Status Filter */}
        <div className="flex items-center gap-2">
          <label className="text-sm font-medium text-muted-foreground">
            Status
          </label>
          <Select
            value={filters.status || "all"}
            onValueChange={(value) =>
              onFilterChange({
                status: value === "all" ? undefined : (value as string),
              })
            }
            disabled={disabled}
          >
            <SelectTrigger className="w-40">
              <SelectValue placeholder="All statuses" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Statuses</SelectItem>
              <SelectItem value="open">Open</SelectItem>
              <SelectItem value="in_progress">In Progress</SelectItem>
              <SelectItem value="resolved">Resolved</SelectItem>
              <SelectItem value="reopened">Reopened</SelectItem>
              <SelectItem value="closed">Closed</SelectItem>
            </SelectContent>
          </Select>
        </div>

        {/* Priority Filter */}
        <div className="flex items-center gap-2">
          <label className="text-sm font-medium text-muted-foreground">
            Priority
          </label>
          <Select
            value={filters.priority || "all"}
            onValueChange={(value) =>
              onFilterChange({
                priority: value === "all" ? undefined : (value as string),
              })
            }
            disabled={disabled}
          >
            <SelectTrigger className="w-40">
              <SelectValue placeholder="All priorities" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Priorities</SelectItem>
              <SelectItem value="low">Low</SelectItem>
              <SelectItem value="medium">Medium</SelectItem>
              <SelectItem value="high">High</SelectItem>
              <SelectItem value="critical">Critical</SelectItem>
            </SelectContent>
          </Select>
        </div>

        {/* Date Range Filter */}
        <DateRangeFilter
          dateFrom={filters.date_from || undefined}
          dateTo={filters.date_to || undefined}
          onDateRangeChange={onDateRangeChange}
          disabled={disabled}
        />
      </div>
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
          onDelete={
            onDeleteTicket
              ? async (ticketId: string) => {
                  try {
                    await onDeleteTicket(ticketId);
                  } catch (error) {
                    console.error("Failed to delete ticket", error);
                  }
                }
              : undefined
          }
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
  // const [viewMode, setViewMode] = useState<ViewMode>("grid");

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

  const handleBulkDeleteTickets = async (
    ticketIds: string[]
  ): Promise<void> => {
    const formData = new FormData();
    formData.append("actionType", "bulkDeleteTickets");
    ticketIds.forEach((id) => formData.append("ticketIds[]", id));
    submit(formData, { method: "POST" });
  };

  return {
    handleCreateTicket,
    handleTicketClick,
    handleEditTicket,
    handleDeleteTicket,
    handleBulkDeleteTickets,
  };
}

// Main component
export default function TicketsPage({ loaderData }: Route.ComponentProps) {
  const navigation = useNavigation();
  const actionData = useActionData() as TicketsActionData | undefined;
  const { profile } = useAuth();
  const { toasts, removeToast, success, error } = useToast();
  const lastActionDataRef = useRef<TicketsActionData | undefined>(undefined);

  if (!loaderData) {
    return <DashboardSkeleton />;
  }

  const {
    tickets,
    stats,
    filters,
    error: loaderError,
  } = loaderData as TicketsLoaderData;
  console.log(tickets);

  const navigate = useNavigate();

  const {
    handleCreateTicket,
    handleTicketClick,
    handleEditTicket,
    handleDeleteTicket,
    handleBulkDeleteTickets,
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

  // Local state for search and date range (not in URL)
  const [localSearch, setLocalSearch] = useState("");
  const [localDateFrom, setLocalDateFrom] = useState("");
  const [localDateTo, setLocalDateTo] = useState("");
  const [searchTimeout, setSearchTimeout] = useState<NodeJS.Timeout | null>(
    null
  );

  // Client-side filtered tickets
  const [filteredTickets, setFilteredTickets] = useState(tickets);
  const [filteredStats, setFilteredStats] = useState(stats);

  // Function to apply client-side filters
  const applyClientFilters = (
    ticketList: typeof tickets,
    search: string,
    dateFrom: string,
    dateTo: string
  ) => {
    let filtered = [...ticketList];

    // Apply search filter
    if (search.trim()) {
      const searchLower = search.toLowerCase();
      filtered = filtered.filter(
        (ticket) =>
          ticket.title.toLowerCase().includes(searchLower) ||
          ticket.description.toLowerCase().includes(searchLower)
      );
    }

    // Apply date range filter
    if (dateFrom) {
      const fromDate = new Date(dateFrom);
      filtered = filtered.filter(
        (ticket) => new Date(ticket.created_at) >= fromDate
      );
    }

    if (dateTo) {
      const toDate = new Date(dateTo);
      toDate.setDate(toDate.getDate() + 1); // Include the entire end date
      filtered = filtered.filter(
        (ticket) => new Date(ticket.created_at) < toDate
      );
    }

    return filtered;
  };

  // Update filtered tickets when tickets or local filters change
  useEffect(() => {
    const filtered = applyClientFilters(
      tickets,
      localSearch,
      localDateFrom,
      localDateTo
    );
    setFilteredTickets(filtered);

    // Recalculate stats for filtered tickets
    const newStats = {
      total: filtered.length,
      open: filtered.filter((t) => t.status === "open").length,
      in_progress: filtered.filter((t) => t.status === "in_progress").length,
      resolved: filtered.filter((t) => t.status === "resolved").length,
      closed: filtered.filter((t) => t.status === "closed").length,
      reopened: filtered.filter((t) => t.status === "reopened").length,
      low: filtered.filter((t) => t.priority === "low").length,
      medium: filtered.filter((t) => t.priority === "medium").length,
      high: filtered.filter((t) => t.priority === "high").length,
      critical: filtered.filter((t) => t.priority === "critical").length,
    };
    setFilteredStats(newStats);
  }, [tickets, localSearch, localDateFrom, localDateTo]);

  // Delayed search effect (simplified)
  useEffect(() => {
    if (searchTimeout) {
      clearTimeout(searchTimeout);
    }

    const timeout = setTimeout(() => {
      // The filtering is now handled by the useEffect above
      // This timeout is just for UX to show that search is being processed
    }, 300); // Reduced delay since it's client-side

    setSearchTimeout(timeout);

    return () => {
      if (timeout) {
        clearTimeout(timeout);
      }
    };
  }, [localSearch]);

  // Handle filter changes
  const handleFilterChange = (newFilters: Partial<TicketFilters>) => {
    const url = new URL(window.location.href);

    // Update URL parameters (exclude search and date range)
    Object.entries(newFilters).forEach(([key, value]) => {
      // Skip search and date range - these are handled locally
      if (key === "search" || key === "date_from" || key === "date_to") {
        return;
      }

      if (value === undefined || value === "") {
        url.searchParams.delete(key);
      } else {
        url.searchParams.set(key, String(value));
      }
    });

    // Navigate to the new URL
    navigate(`${url.pathname}${url.search}`, { replace: true });
  };

  // Handle error state
  if (loaderError) {
    return (
      <>
        <div className="min-h-screen bg-background">
          <div className="max-w-full mx-auto p-6">
            <PageHeader
              onCreateTicket={handleCreateTicket}
              // viewMode={viewMode}
              // onViewModeChange={setViewMode}
            />
            <ErrorDisplay error={loaderError} />
          </div>
        </div>
        <StatsGrid stats={filteredStats} />
        <ToastContainer toasts={toasts} onRemove={removeToast} />
      </>
    );
  }

  return (
    <>
      <div className="min-h-screen bg-background">
        <div className="max-w-full mx-auto px-6 py-6 space-y-6">
          <PageHeader onCreateTicket={handleCreateTicket} />

          <StatsGrid stats={stats} />
          <Card>
            <FilterPanel
              filters={{
                ...filters,
                search: localSearch,
                date_from: localDateFrom,
                date_to: localDateTo,
              }}
              onFilterChange={handleFilterChange}
              onSearchChange={setLocalSearch}
              onDateRangeChange={(dateFrom, dateTo) => {
                setLocalDateFrom(dateFrom || "");
                setLocalDateTo(dateTo || "");
              }}
              disabled={isLoading}
            />

            {/* Tickets Display */}
            {isLoading ? (
              <TicketListSkeleton />
            ) : filteredTickets.length === 0 ? (
              <EmptyState onCreateTicket={handleCreateTicket} />
            ) : (
              <TicketTable
                tickets={filteredTickets}
                onTicketClick={handleTicketClick}
                onEdit={handleEditTicket}
                onDelete={(ticket: Ticket) => handleDeleteTicket(ticket.id)}
                onBulkDelete={(ticketIds: string[]) =>
                  handleBulkDeleteTickets(ticketIds)
                }
                canDelete={canDelete}
                userRole={userRole}
              />
            )}
          </Card>
        </div>
      </div>
      <ToastContainer toasts={toasts} onRemove={removeToast} />
    </>
  );
}
