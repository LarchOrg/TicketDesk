import { Plus, Search, Ticket } from "lucide-react";
import { useEffect, useState } from "react";
import { redirect, useNavigate, useNavigation } from "react-router";
import DateRangeFilter from "~/components/DateRangeFilter";
import { TicketListSkeleton } from "../components/LoadingComponents";
import StatusBadge from "../components/StatusBadge";
import { Button } from "../components/ui/button";
import { Card, CardContent } from "../components/ui/card";
import { Input } from "../components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "../components/ui/select";
import { createSupabaseServerClient } from "../lib/supabase-server";
import type { TicketFilters, Ticket as TicketType } from "../lib/types";
import { createServices } from "../services";
import type { Route } from "./+types/my-tickets";

interface MyTicketsLoaderData {
  tickets: TicketType[];
  total: number;
  filters: TicketFilters;
  error?: string;
}

export async function loader({
  request,
}: Route.LoaderArgs): Promise<MyTicketsLoaderData> {
  try {
    const { supabase, response } = createSupabaseServerClient(request);

    // Use getUser() instead of getSession() for security
    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser();

    if (authError || !user) {
      throw redirect("/login", {
        headers: response.headers,
      });
    }

    const url = new URL(request.url);
    const status = url.searchParams.get("status");
    const priority = url.searchParams.get("priority");
    // Remove search and date range from URL params

    const filters: TicketFilters = {
      created_by: user.id, // Only show user's own tickets
      status: status as any,
      priority: priority as any,
      search: undefined, // Will be handled locally
      date_from: undefined, // Will be handled locally
      date_to: undefined, // Will be handled locally
      sortBy: "created_at",
      sortOrder: "desc",
      limit: 50,
      offset: 0,
    };

    const services = createServices(supabase);
    const result = await services.tickets.getTickets(filters);

    return {
      tickets: result.tickets,
      total: result.total,
      filters,
    };
  } catch (error) {
    // If it's a redirect response, re-throw it so Remix can handle it
    if (error instanceof Response) {
      throw error;
    }

    console.error("Error loading my tickets:", error);
    return {
      tickets: [],
      total: 0,
      filters: {
        created_by: "",
        sortBy: "created_at",
        sortOrder: "desc",
        limit: 50,
        offset: 0,
      },
      error: "Failed to load your tickets",
    };
  }
}

export const meta = () => {
  return [
    { title: "My Tickets - Support Portal" },
    {
      name: "description",
      content: "View and manage your submitted support tickets",
    },
  ];
};
function FilterPanel({
  filters,
  onFilterChange,
  onDateRangeChange,
  disabled = false,
}: {
  filters: TicketFilters;
  onFilterChange: (filters: Partial<TicketFilters>) => void;
  onDateRangeChange: (dateFrom?: string, dateTo?: string) => void;
  disabled?: boolean;
}) {
  return (
    <div className="w-full rounded-lg space-y-4">
      {/* Header */}
      <h2 className="text-base font-semibold">Filters</h2>

      {/* Filter Controls */}
      <div className="flex flex-wrap items-center gap-6">
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
          dateFrom={filters.date_from}
          dateTo={filters.date_to}
          onDateRangeChange={onDateRangeChange}
          disabled={disabled}
        />
      </div>
    </div>
  );
}

function TicketsList({ tickets }: { tickets: TicketType[] }) {
  const navigate = useNavigate();

  if (tickets.length === 0) {
    return (
      <Card>
        <CardContent className="text-center py-12">
          <Ticket className="mx-auto h-12 w-12 text-muted-foreground mb-4" />
          <h3 className="text-lg font-medium mb-2">No tickets found</h3>
          <p className="text-muted-foreground mb-4">
            You haven't submitted any tickets yet, or none match your current
            filters.
          </p>
          <Button onClick={() => navigate("/newtickets")}>
            <Plus className="mr-2 h-4 w-4" />
            Create Your First Ticket
          </Button>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-4">
      {tickets.map((ticket) => (
        <Card
          key={ticket.id}
          className="hover:shadow-md transition-shadow cursor-pointer"
        >
          <CardContent
            className="p-6"
            onClick={() => navigate(`/tickets/${ticket.id}`)}
          >
            <div className="flex items-start justify-between">
              <div className="flex-1">
                <div className="flex items-center space-x-2 mb-2">
                  <h3 className="font-semibold text-lg">{ticket.title}</h3>
                  <span
                    className={`px-2 py-1 text-xs rounded-full ${
                      ticket.priority === "critical"
                        ? "bg-red-100 text-red-800"
                        : ticket.priority === "high"
                          ? "bg-orange-100 text-orange-800"
                          : ticket.priority === "medium"
                            ? "bg-yellow-100 text-yellow-800"
                            : "bg-green-100 text-green-800"
                    }`}
                  >
                    {ticket.priority}
                  </span>
                </div>
                <p className="text-muted-foreground mb-3 line-clamp-2">
                  {ticket.description?.replace(/<[^>]*>/g, "") ||
                    "No description"}
                </p>
                <div className="flex items-center space-x-4 text-sm text-muted-foreground">
                  <span>#{ticket.id}</span>
                  <span>
                    Created {new Date(ticket.created_at).toLocaleDateString()}
                  </span>
                  {ticket.updated_at &&
                    ticket.updated_at !== ticket.created_at && (
                      <span>
                        Updated{" "}
                        {new Date(ticket.updated_at).toLocaleDateString()}
                      </span>
                    )}
                  {ticket.assigned_to_profile && (
                    <span>Assigned to {ticket.assigned_to_profile.name}</span>
                  )}
                </div>
              </div>
              <div className="ml-4">
                <StatusBadge status={ticket.status} />
              </div>
            </div>
          </CardContent>
        </Card>
      ))}
    </div>
  );
}
export default function MyTickets({ loaderData }: Route.ComponentProps) {
  const { tickets, filters: initialFilters, error } = loaderData;
  const navigate = useNavigate();
  const navigation = useNavigation();

  // Local state for search and date range (not in URL)
  const [localSearch, setLocalSearch] = useState("");
  const [localDateFrom, setLocalDateFrom] = useState("");
  const [localDateTo, setLocalDateTo] = useState("");
  const [searchTimeout, setSearchTimeout] = useState<NodeJS.Timeout | null>(
    null
  );

  const [filters, setFilters] = useState(initialFilters);
  const [isFilterLoading, setIsFilterLoading] = useState(false);

  // Client-side filtered tickets
  const [filteredTickets, setFilteredTickets] = useState(tickets);

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
  }, [tickets, localSearch, localDateFrom, localDateTo]);

  // Check if we're navigating to this route or if filters are being applied
  const isLoading = navigation.state === "loading" || isFilterLoading;

  const handleFilterChange = (newFilters: Partial<TicketFilters>) => {
    // Only handle server-side filters (status, priority)
    const serverFilters = { ...filters };
    let shouldNavigate = false;

    if (newFilters.status !== undefined) {
      serverFilters.status = newFilters.status;
      shouldNavigate = true;
    }
    if (newFilters.priority !== undefined) {
      serverFilters.priority = newFilters.priority;
      shouldNavigate = true;
    }

    if (shouldNavigate) {
      setFilters(serverFilters);
      setIsFilterLoading(true);

      // Update URL with new filters (exclude search and date range)
      const params = new URLSearchParams();
      if (serverFilters.status) params.set("status", serverFilters.status);
      if (serverFilters.priority)
        params.set("priority", serverFilters.priority);

      navigate(`/my-tickets?${params.toString()}`, { replace: true });

      // Reset loading state after a short delay to allow navigation to complete
      setTimeout(() => setIsFilterLoading(false), 500);
    }
  };

  // Simplified search timeout for UX
  useEffect(() => {
    if (searchTimeout) {
      clearTimeout(searchTimeout);
    }

    const timeout = setTimeout(() => {
      // The filtering is now handled by the client-side filter effect
    }, 300);

    setSearchTimeout(timeout);

    return () => {
      if (timeout) {
        clearTimeout(timeout);
      }
    };
  }, [localSearch]);

  if (error) {
    return (
      <div className="container mx-auto px-4 py-8">
        <div className="text-center">
          <Ticket className="mx-auto h-12 w-12 text-destructive mb-4" />
          <h1 className="text-2xl font-bold mb-2">Error Loading Tickets</h1>
          <p className="text-muted-foreground mb-4">{error}</p>
          <Button onClick={() => window.location.reload()}>Try Again</Button>
        </div>
      </div>
    );
  }

  return (
    <div className="container mx-auto px-7 py-8">
      <div className="mb-8">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold">My Tickets</h1>
            <p className="text-muted-foreground">
              View and manage your submitted support tickets (
              {filteredTickets.length} total)
            </p>
          </div>
          <Button onClick={() => navigate("/newtickets")}>
            <Plus className="mr-2 h-4 w-4" />
            New Ticket
          </Button>
        </div>
      </div>

      {/* Search Bar */}
      <div className="mb-9">
        <div className="flex items-center space-x-2">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-2.5 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Search your tickets..."
              value={localSearch}
              onChange={(e) => setLocalSearch(e.target.value)}
              className="pl-10"
              disabled={isLoading}
            />
          </div>
        </div>
      </div>

      <div className="grid gap-6 ">
        {/* Filters Sidebar */}
        <div className="">
          <FilterPanel
            filters={{
              ...filters,
              search: localSearch,
              date_from: localDateFrom,
              date_to: localDateTo,
            }}
            onFilterChange={handleFilterChange}
            onDateRangeChange={(dateFrom, dateTo) => {
              setLocalDateFrom(dateFrom || "");
              setLocalDateTo(dateTo || "");
            }}
            disabled={isLoading}
          />
        </div>

        {/* Tickets List */}
        <div className="">
          {isLoading ? (
            <TicketListSkeleton />
          ) : (
            <TicketsList tickets={filteredTickets} />
          )}
        </div>
      </div>
    </div>
  );
}
