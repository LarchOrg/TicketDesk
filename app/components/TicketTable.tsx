import {
  ArrowUpDown,
  ChevronDown,
  ChevronUp,
  Edit,
  Eye,
  Filter,
  MoreHorizontal,
  Trash2,
} from "lucide-react";
import React, { useState } from "react";
import type { Ticket } from "../lib/types";
import { formatDate, getShortId } from "../lib/utils";
import PriorityBadge from "./PriorityBadge";
import StatusBadge from "./StatusBadge";

interface Column {
  key: keyof Ticket | "actions";
  label: string;
  sortable?: boolean;
  width?: string;
  render?: (value: any, ticket: Ticket) => React.ReactNode;
}

interface TicketTableProps {
  tickets: Ticket[];
  onTicketClick?: (ticket: Ticket) => void;
  onEdit?: (ticket: Ticket) => void;
  onDelete?: (ticket: Ticket) => void;
  loading?: boolean;
  className?: string;
}

type SortDirection = "asc" | "desc" | null;

export default function TicketTable({
  tickets,
  onTicketClick,
  onEdit,
  onDelete,
  loading = false,
  className = "",
}: TicketTableProps) {
  const [sortColumn, setSortColumn] = useState<keyof Ticket | null>(null);
  const [sortDirection, setSortDirection] = useState<SortDirection>(null);
  const [selectedTickets, setSelectedTickets] = useState<string[]>([]);
  const [showActions, setShowActions] = useState<string | null>(null);

  console.log(tickets, "tickets in table");

  const columns: Column[] = [
    {
      key: "title",
      label: "Title",
      sortable: true,
      width: "flex-1 min-w-0",
      render: (value, _ticket) => (
        <div className="min-w-0">
          <p className="font-medium text-gray-900 dark:text-white truncate">
            {value}
          </p>
        </div>
      ),
    },
    {
      key: "id",
      label: "ID",
      sortable: true,
      width: "w-20",
      render: (value) => (
        <span className="font-mono text-xs text-gray-500 dark:text-gray-400">
          #{getShortId(value)}
        </span>
      ),
    },
    {
      key: "status",
      label: "Status",
      sortable: true,
      width: "w-32",
      render: (value) => <StatusBadge status={value} />,
    },
    {
      key: "priority",
      label: "Priority",
      sortable: true,
      width: "w-32",
      render: (value) => <PriorityBadge priority={value} />,
    },
    {
      key: "created_at",
      label: "Created",
      sortable: true,
      width: "w-32",
      render: (value) => (
        <span className="text-sm text-gray-600 dark:text-gray-400">
          {formatDate(value)}
        </span>
      ),
    },
    {
      key: "created_by",
      label: "Creator",
      sortable: true,
      width: "w-32",
      render: (value, _ticket) => (
        <div className="flex items-center space-x-2">
          <div className="w-6 h-6 bg-blue-500 rounded-full flex items-center justify-center text-white text-xs font-medium">
            {value?.charAt(0)?.toUpperCase() || "U"}
          </div>
          <span className="text-sm text-gray-600 dark:text-gray-400 truncate">
            {value || "Unknown"}
          </span>
        </div>
      ),
    },
    {
      key: "actions",
      label: "",
      width: "w-16",
      render: (_value, _ticket) => (
        <div className="relative">
          <button
            onClick={(e) => {
              e.stopPropagation();
              setShowActions(showActions === _ticket.id ? null : _ticket.id);
            }}
            className="p-1 text-gray-400 hover:text-gray-600 dark:hover:text-gray-300 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-800 transition-all"
          >
            <MoreHorizontal className="w-4 h-4" />
          </button>

          {showActions === _ticket.id && (
            <div className="absolute right-0 top-8 z-10 w-48 bg-white dark:bg-gray-800 rounded-lg shadow-lg border border-gray-200 dark:border-gray-700 py-1">
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  onTicketClick?.(_ticket);
                  setShowActions(null);
                }}
                className="w-full flex items-center px-3 py-2 text-sm text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700"
              >
                <Eye className="w-4 h-4 mr-2" />
                View Details
              </button>
              {onEdit && (
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    onEdit(_ticket);
                    setShowActions(null);
                  }}
                  className="w-full flex items-center px-3 py-2 text-sm text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700"
                >
                  <Edit className="w-4 h-4 mr-2" />
                  Edit
                </button>
              )}
              {onDelete && (
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    onDelete(_ticket);
                    setShowActions(null);
                  }}
                  className="w-full flex items-center px-3 py-2 text-sm text-red-600 dark:text-red-400 hover:bg-red-50 dark:hover:bg-red-900/20"
                >
                  <Trash2 className="w-4 h-4 mr-2" />
                  Delete
                </button>
              )}
            </div>
          )}
        </div>
      ),
    },
  ];

  const handleSort = (column: keyof Ticket) => {
    if (sortColumn === column) {
      setSortDirection(
        sortDirection === "asc"
          ? "desc"
          : sortDirection === "desc"
            ? null
            : "asc"
      );
      if (sortDirection === "desc") {
        setSortColumn(null);
      }
    } else {
      setSortColumn(column);
      setSortDirection("asc");
    }
  };

  const sortedTickets = React.useMemo(() => {
    if (!sortColumn || !sortDirection) return tickets;

    return [...tickets].sort((a, b) => {
      const aValue = a[sortColumn];
      const bValue = b[sortColumn];

      if (aValue === null || aValue === undefined) return 1;
      if (bValue === null || bValue === undefined) return -1;

      let comparison = 0;
      if (typeof aValue === "string" && typeof bValue === "string") {
        comparison = aValue.localeCompare(bValue);
      } else if (aValue < bValue) {
        comparison = -1;
      } else if (aValue > bValue) {
        comparison = 1;
      }

      return sortDirection === "desc" ? -comparison : comparison;
    });
  }, [tickets, sortColumn, sortDirection]);

  const handleSelectAll = (checked: boolean) => {
    if (checked) {
      setSelectedTickets(tickets.map((t) => t.id));
    } else {
      setSelectedTickets([]);
    }
  };

  const handleSelectTicket = (ticketId: string, checked: boolean) => {
    if (checked) {
      setSelectedTickets((prev) => [...prev, ticketId]);
    } else {
      setSelectedTickets((prev) => prev.filter((id) => id !== ticketId));
    }
  };

  // Close actions dropdown when clicking outside
  React.useEffect(() => {
    const handleClickOutside = () => setShowActions(null);
    document.addEventListener("click", handleClickOutside);
    return () => document.removeEventListener("click", handleClickOutside);
  }, []);

  if (loading) {
    return (
      <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700">
        <div className="p-8 text-center">
          <div className="animate-spin w-8 h-8 border-2 border-blue-600 border-t-transparent rounded-full mx-auto mb-4"></div>
          <p className="text-gray-500 dark:text-gray-400">Loading tickets...</p>
        </div>
      </div>
    );
  }

  if (tickets.length === 0) {
    return (
      <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700">
        <div className="p-8 text-center">
          <div className="w-16 h-16 mx-auto mb-4 bg-gray-100 dark:bg-gray-700 rounded-full flex items-center justify-center">
            <Filter className="w-8 h-8 text-gray-400" />
          </div>
          <p className="text-lg font-medium text-gray-900 dark:text-white mb-2">
            No tickets found
          </p>
          <p className="text-gray-500 dark:text-gray-400">
            Try adjusting your search or filter criteria
          </p>
        </div>
      </div>
    );
  }

  return (
    <div
      className={`bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 overflow-hidden ${className}`}
    >
      {/* Table Header */}
      <div className="px-6 py-4 border-b border-gray-200 dark:border-gray-700">
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-4">
            <label className="flex items-center">
              <input
                type="checkbox"
                checked={selectedTickets.length === tickets.length}
                onChange={(e) => handleSelectAll(e.target.checked)}
                className="w-4 h-4 text-blue-600 border-gray-300 dark:border-gray-600 rounded focus:ring-blue-500"
              />
              <span className="ml-2 text-sm text-gray-600 dark:text-gray-400">
                {selectedTickets.length > 0
                  ? `${selectedTickets.length} selected`
                  : `${tickets.length} tickets`}
              </span>
            </label>
          </div>

          {selectedTickets.length > 0 && (
            <div className="flex items-center space-x-2">
              <button className="px-3 py-1 text-sm text-blue-600 dark:text-blue-400 hover:bg-blue-50 dark:hover:bg-blue-900/20 rounded-lg transition-colors">
                Bulk Edit
              </button>
              <button className="px-3 py-1 text-sm text-red-600 dark:text-red-400 hover:bg-red-50 dark:hover:bg-red-900/20 rounded-lg transition-colors">
                Delete Selected
              </button>
            </div>
          )}
        </div>
      </div>

      {/* Table */}
      <div className="overflow-x-auto">
        <table className="w-full">
          <thead className="bg-gray-50 dark:bg-gray-900/50">
            <tr>
              <th className="w-12 px-6 py-3">{/* Checkbox column */}</th>
              {columns.map((column) => (
                <th
                  key={column.key}
                  className={`px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider ${column.width || ""}`}
                >
                  {column.sortable && column.key !== "actions" ? (
                    <button
                      onClick={() => handleSort(column.key as keyof Ticket)}
                      className="flex items-center space-x-1 hover:text-gray-700 dark:hover:text-gray-300 transition-colors"
                    >
                      <span>{column.label}</span>
                      {sortColumn === column.key ? (
                        sortDirection === "asc" ? (
                          <ChevronUp className="w-4 h-4" />
                        ) : (
                          <ChevronDown className="w-4 h-4" />
                        )
                      ) : (
                        <ArrowUpDown className="w-4 h-4 opacity-50" />
                      )}
                    </button>
                  ) : (
                    column.label
                  )}
                </th>
              ))}
            </tr>
          </thead>
          <tbody className="bg-white dark:bg-gray-800 divide-y divide-gray-200 dark:divide-gray-700">
            {sortedTickets.map((ticket) => (
              <tr
                key={ticket.id}
                onClick={() => onTicketClick?.(ticket)}
                className="hover:bg-gray-50 dark:hover:bg-gray-700/50 cursor-pointer transition-colors"
              >
                <td className="px-6 py-4">
                  <input
                    type="checkbox"
                    checked={selectedTickets.includes(ticket.id)}
                    onChange={(e) => {
                      e.stopPropagation();
                      handleSelectTicket(ticket.id, e.target.checked);
                    }}
                    className="w-4 h-4 text-blue-600 border-gray-300 dark:border-gray-600 rounded focus:ring-blue-500"
                  />
                </td>
                {columns.map((column) => (
                  <td
                    key={column.key}
                    className={`px-6 py-4 whitespace-nowrap ${column.width || ""}`}
                  >
                    {column.render
                      ? column.render(
                          ticket[column.key as keyof Ticket],
                          ticket
                        )
                      : String(ticket[column.key as keyof Ticket] || "")}
                  </td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
