import { Bell, Filter, Plus, Search, Settings, User } from "lucide-react";
import { useState } from "react";
import type { Ticket, TicketFilters } from "~/lib/types";
import TicketCard from "./TicketCard";

interface DashboardProps {
  tickets: Ticket[];
  onCreateTicket?: () => void;
  onTicketClick?: (ticket: Ticket) => void;
}

export default function Dashboard({
  tickets,
  onCreateTicket,
  onTicketClick,
}: DashboardProps) {
  const [filters, setFilters] = useState<TicketFilters>({
    status: "all",
    priority: "all",
    search: "",
  });

  const [viewMode, setViewMode] = useState<"grid" | "list">("grid");

  // Filter tickets based on current filters
  const filteredTickets = tickets.filter((ticket) => {
    const matchesStatus =
      filters.status === "all" || ticket.status === filters.status;
    const matchesPriority =
      filters.priority === "all" || ticket.priority === filters.priority;
    const matchesSearch =
      filters.search === "" ||
      ticket.title.toLowerCase().includes(filters.search.toLowerCase()) ||
      ticket.description.toLowerCase().includes(filters.search.toLowerCase());

    return matchesStatus && matchesPriority && matchesSearch;
  });

  // Get ticket counts for status filters
  const statusCounts = {
    all: tickets.length,
    open: tickets.filter((t) => t.status === "open").length,
    in_progress: tickets.filter((t) => t.status === "in_progress").length,
    resolved: tickets.filter((t) => t.status === "resolved").length,
    reopened: tickets.filter((t) => t.status === "reopened").length,
    closed: tickets.filter((t) => t.status === "closed").length,
  };

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900">
      {/* Header */}
      <header className="bg-white dark:bg-gray-800 border-b border-gray-200 dark:border-gray-700">
        <div className="px-6 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-4">
              <h1 className="text-2xl font-bold text-gray-900 dark:text-white">
                Ticket Dashboard
              </h1>
              <div className="flex items-center space-x-2">
                <span className="text-sm text-gray-500 dark:text-gray-400">
                  {filteredTickets.length} tickets
                </span>
              </div>
            </div>

            <div className="flex items-center space-x-4">
              <button className="p-2 text-gray-400 hover:text-gray-600 dark:hover:text-gray-300">
                <Bell className="w-5 h-5" />
              </button>
              <button className="p-2 text-gray-400 hover:text-gray-600 dark:hover:text-gray-300">
                <Settings className="w-5 h-5" />
              </button>
              <button className="p-2 text-gray-400 hover:text-gray-600 dark:hover:text-gray-300">
                <User className="w-5 h-5" />
              </button>
            </div>
          </div>
        </div>
      </header>

      <div className="flex">
        {/* Sidebar */}
        <aside className="w-64 bg-white dark:bg-gray-800 border-r border-gray-200 dark:border-gray-700 min-h-screen">
          <div className="p-6">
            {/* Create Button */}
            <button
              onClick={onCreateTicket}
              className="w-full flex items-center justify-center px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg font-medium transition-colors"
            >
              <Plus className="w-4 h-4 mr-2" />
              New Ticket
            </button>

            {/* Status Filters */}
            <div className="mt-8">
              <h3 className="text-sm font-medium text-gray-900 dark:text-white mb-4">
                Status
              </h3>
              <div className="space-y-2">
                {Object.entries(statusCounts).map(([status, count]) => (
                  <button
                    key={status}
                    onClick={() => setFilters((prev) => ({ ...prev, status }))}
                    className={`w-full flex items-center justify-between px-3 py-2 rounded-lg text-sm transition-colors ${
                      filters.status === status
                        ? "bg-blue-50 dark:bg-blue-900/20 text-blue-700 dark:text-blue-300"
                        : "text-gray-600 dark:text-gray-400 hover:bg-gray-50 dark:hover:bg-gray-700"
                    }`}
                  >
                    <span className="capitalize">
                      {status === "all"
                        ? "All Tickets"
                        : status.replace("_", " ")}
                    </span>
                    <span className="text-xs bg-gray-100 dark:bg-gray-700 px-2 py-1 rounded-full">
                      {count}
                    </span>
                  </button>
                ))}
              </div>
            </div>

            {/* Priority Filters */}
            <div className="mt-8">
              <h3 className="text-sm font-medium text-gray-900 dark:text-white mb-4">
                Priority
              </h3>
              <div className="space-y-2">
                {["all", "critical", "high", "medium", "low"].map(
                  (priority) => (
                    <button
                      key={priority}
                      onClick={() =>
                        setFilters((prev) => ({ ...prev, priority }))
                      }
                      className={`w-full flex items-center justify-between px-3 py-2 rounded-lg text-sm transition-colors ${
                        filters.priority === priority
                          ? "bg-blue-50 dark:bg-blue-900/20 text-blue-700 dark:text-blue-300"
                          : "text-gray-600 dark:text-gray-400 hover:bg-gray-50 dark:hover:bg-gray-700"
                      }`}
                    >
                      <span className="capitalize">
                        {priority === "all" ? "All Priorities" : priority}
                      </span>
                      <span className="text-xs bg-gray-100 dark:bg-gray-700 px-2 py-1 rounded-full">
                        {priority === "all"
                          ? tickets.length
                          : tickets.filter((t) => t.priority === priority)
                              .length}
                      </span>
                    </button>
                  )
                )}
              </div>
            </div>
          </div>
        </aside>

        {/* Main Content */}
        <main className="flex-1 p-6">
          {/* Search and Filters */}
          <div className="mb-6">
            <div className="flex items-center space-x-4">
              <div className="flex-1 relative">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-4 h-4" />
                <input
                  type="text"
                  placeholder="Search tickets..."
                  value={filters.search}
                  onChange={(e) =>
                    setFilters((prev) => ({ ...prev, search: e.target.value }))
                  }
                  className="w-full pl-10 pr-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-800 text-gray-900 dark:text-white placeholder-gray-500 dark:placeholder-gray-400 focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                />
              </div>

              <button className="flex items-center px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-800 text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-700">
                <Filter className="w-4 h-4 mr-2" />
                Filter
              </button>

              <div className="flex items-center space-x-2">
                <button
                  onClick={() => setViewMode("grid")}
                  className={`p-2 rounded-lg ${
                    viewMode === "grid"
                      ? "bg-blue-100 dark:bg-blue-900/20 text-blue-600 dark:text-blue-400"
                      : "text-gray-400 hover:text-gray-600 dark:hover:text-gray-300"
                  }`}
                >
                  <div className="w-4 h-4 grid grid-cols-2 gap-0.5">
                    <div className="bg-current rounded-sm"></div>
                    <div className="bg-current rounded-sm"></div>
                    <div className="bg-current rounded-sm"></div>
                    <div className="bg-current rounded-sm"></div>
                  </div>
                </button>
                <button
                  onClick={() => setViewMode("list")}
                  className={`p-2 rounded-lg ${
                    viewMode === "list"
                      ? "bg-blue-100 dark:bg-blue-900/20 text-blue-600 dark:text-blue-400"
                      : "text-gray-400 hover:text-gray-600 dark:hover:text-gray-300"
                  }`}
                >
                  <div className="w-4 h-4 flex flex-col space-y-1">
                    <div className="h-0.5 bg-current rounded"></div>
                    <div className="h-0.5 bg-current rounded"></div>
                    <div className="h-0.5 bg-current rounded"></div>
                  </div>
                </button>
              </div>
            </div>
          </div>

          {/* Tickets Grid/List */}
          {filteredTickets.length === 0 ? (
            <div className="text-center py-12">
              <div className="text-gray-400 dark:text-gray-500 mb-4">
                <Search className="w-12 h-12 mx-auto mb-4" />
                <p className="text-lg font-medium">No tickets found</p>
                <p className="text-sm">
                  Try adjusting your filters or create a new ticket
                </p>
              </div>
              {onCreateTicket && (
                <button
                  onClick={onCreateTicket}
                  className="mt-4 px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg font-medium transition-colors"
                >
                  Create New Ticket
                </button>
              )}
            </div>
          ) : (
            <div
              className={
                viewMode === "grid"
                  ? "grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6"
                  : "space-y-4"
              }
            >
              {filteredTickets.map((ticket) => (
                <TicketCard
                  key={ticket.id}
                  ticket={ticket}
                  onClick={() => onTicketClick?.(ticket)}
                  className={viewMode === "list" ? "w-full" : ""}
                />
              ))}
            </div>
          )}
        </main>
      </div>
    </div>
  );
}
