import {
  ArrowUpDown,
  ChevronDown,
  ChevronUp,
  Download,
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
import { useToast } from "./Toast";
import { Button } from "./ui/button";
import { Checkbox } from "./ui/checkbox";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "./ui/dropdown-menu";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "./ui/table";

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
  onBulkDelete?: (ticketIds: string[]) => void;
  canDelete?: boolean;
  userRole?: string;
  loading?: boolean;
  className?: string;
}

type SortDirection = "asc" | "desc" | null;

export default function TicketTable({
  tickets,
  onTicketClick,
  onEdit,
  onDelete,
  onBulkDelete,
  canDelete = false,
  userRole = "user",
  loading = false,
  className = "",
}: TicketTableProps) {
  const [sortColumn, setSortColumn] = useState<keyof Ticket | null>(null);
  const [sortDirection, setSortDirection] = useState<SortDirection>(null);
  const [selectedTickets, setSelectedTickets] = useState<string[]>([]);
  const { toasts, removeToast, success, error, info, warning } = useToast();

  const columns: Column[] = [
    {
      key: "title",
      label: "Title",
      sortable: true,
      render: (value, _ticket) => (
        <div className="min-w-0 max-w-xs">
          <p className="font-medium text-blue-700 truncate">{value}</p>
        </div>
      ),
    },
    {
      key: "id",
      label: "ID",
      sortable: true,
      render: (value) => (
        <span className="font-mono text-xs text-muted-foreground">
          #{getShortId(value)}
        </span>
      ),
    },
    {
      key: "status",
      label: "Status",
      sortable: true,
      render: (value) => <StatusBadge status={value} />,
    },
    {
      key: "priority",
      label: "Priority",
      sortable: true,
      render: (value) => <PriorityBadge priority={value} />,
    },
    {
      key: "created_at",
      label: "Created",
      sortable: true,
      render: (value) => (
        <span className="text-sm text-muted-foreground">
          {formatDate(value)}
        </span>
      ),
    },
    {
      key: "created_by_profile",
      label: "Creator",
      sortable: true,
      render: (value, _ticket) => {
        const name = value?.name || "Unknown";
        return (
          <div className="flex items-center space-x-2">
            <div className="w-8 h-8 bg-primary rounded-full flex items-center justify-center text-primary-foreground text-xs font-medium">
              {name.charAt(0).toUpperCase()}
            </div>
            <span className="text-sm text-muted-foreground truncate max-w-24">
              {name}
            </span>
          </div>
        );
      },
    },
    {
      key: "assigned_to_profile",
      label: "Assignee",
      sortable: true,
      render: (value, _ticket) => {
        const name = value?.name || "Unknown";
        return (
          <div className="flex items-center space-x-2">
            <div className="w-8 h-8 bg-blue-800 rounded-full flex items-center justify-center text-primary-foreground text-xs font-medium">
              {name.charAt(0).toUpperCase()}
            </div>
            <span className="text-sm text-muted-foreground truncate max-w-24">
              {name}
            </span>
          </div>
        );
      },
    },

    {
      key: "actions",
      label: "",
      render: (_value, _ticket) => (
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button
              variant="ghost"
              size="sm"
              className="h-8 w-8 p-0"
              onClick={(e) => e.stopPropagation()}
            >
              <MoreHorizontal className="h-4 w-4" />
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end" className="w-48">
            <DropdownMenuItem
              onClick={(e) => {
                e.stopPropagation();
                onTicketClick?.(_ticket);
              }}
            >
              <Eye className="w-4 h-4 mr-2" />
              View Details
            </DropdownMenuItem>
            {onEdit && (
              <DropdownMenuItem
                onClick={(e) => {
                  e.stopPropagation();
                  onEdit(_ticket);
                }}
              >
                <Edit className="w-4 h-4 mr-2" />
                Edit
              </DropdownMenuItem>
            )}
            {onDelete && canDelete && (
              <>
                <DropdownMenuSeparator />
                <DropdownMenuItem
                  onClick={(e) => {
                    e.stopPropagation();
                    onDelete(_ticket);
                    success(
                      "Ticket Deleted",
                      "The ticket was successfully deleted."
                    );
                  }}
                  className="text-destructive focus:text-destructive"
                >
                  <Trash2 className="w-4 h-4 mr-2" />
                  Delete
                </DropdownMenuItem>
              </>
            )}
          </DropdownMenuContent>
        </DropdownMenu>
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

      if (typeof aValue === "string" && typeof bValue === "string") {
        return sortDirection === "asc"
          ? aValue.localeCompare(bValue)
          : bValue.localeCompare(aValue);
      }

      if (aValue < bValue) return sortDirection === "asc" ? -1 : 1;
      if (aValue > bValue) return sortDirection === "asc" ? 1 : -1;
      return 0;
    });
  }, [tickets, sortColumn, sortDirection]);

  const handleSelectAll = (checked: boolean) => {
    setSelectedTickets(checked ? tickets.map((ticket) => ticket.id) : []);
  };

  const handleSelectTicket = (ticketId: string, checked: boolean) => {
    setSelectedTickets((prev) =>
      checked ? [...prev, ticketId] : prev.filter((id) => id !== ticketId)
    );
  };

  if (loading) {
    return (
      <div className="rounded-md border">
        <div className="p-8 text-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto mb-4"></div>
          <p className="text-muted-foreground">Loading tickets...</p>
        </div>
      </div>
    );
  }

  if (tickets.length === 0) {
    return (
      <div className="rounded-md border">
        <div className="p-8 text-center">
          <div className="w-16 h-16 mx-auto mb-4 bg-muted rounded-full flex items-center justify-center">
            <Filter className="w-8 h-8 text-muted-foreground" />
          </div>
          <p className="text-lg font-medium text-foreground mb-2">
            No tickets found
          </p>
          <p className="text-muted-foreground">
            Try adjusting your search or filter criteria
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className={`${className}`}>
      {userRole !== "user" && (
        <div className="flex justify-end border-t p-3">
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button
                variant="outline"
                size="sm"
                disabled={selectedTickets.length === 0}
                className="flex items-center"
              >
                <span>{selectedTickets.length} selected</span>
                <ChevronDown className="h-4 w-4" />
              </Button>
            </DropdownMenuTrigger>

            <DropdownMenuContent align="end" className="w-44">
              {canDelete && onBulkDelete && (
                <DropdownMenuItem
                  disabled={selectedTickets.length === 0}
                  onClick={() => {
                    console.log("🗑️ Delete rows:", selectedTickets);
                    onBulkDelete(selectedTickets);
                    success(
                      "Tickets Deleted",
                      `${selectedTickets.length} ticket(s) deleted successfully`
                    );
                  }}
                  className="text-destructive focus:text-destructive"
                >
                  <Trash2 className="h-4 w-4 mr-2" />
                  Delete Selected
                </DropdownMenuItem>
              )}

              <DropdownMenuItem
                disabled={selectedTickets.length === 0}
                onClick={() => {
                  console.log("📤 Export rows:", selectedTickets);
                  success(
                    "Export Successful",
                    "The selected tickets were successfully exported."
                  );
                }}
              >
                <Download className="h-4 w-4 mr-2" />
                Export Selected
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      )}

      {/* Table */}
      <div className="rounded-sm">
        <Table>
          <TableHeader>
            <TableRow className="border">
              {userRole !== "user" && (
                <TableHead className="w-12">
                  <Checkbox
                    checked={
                      selectedTickets.length > 0 &&
                      selectedTickets.length === tickets.length
                    }
                    onCheckedChange={handleSelectAll}
                    aria-label="Select all tickets"
                  />
                </TableHead>
              )}

              {columns.map((column) => (
                <TableHead key={column.key} className={column.width}>
                  {column.sortable && column.key !== "actions" ? (
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => handleSort(column.key as keyof Ticket)}
                      className="h-auto p-0 font-medium hover:bg-transparent"
                    >
                      <span>{column.label}</span>
                      {sortColumn === column.key ? (
                        sortDirection === "asc" ? (
                          <ChevronUp className="ml-2 h-4 w-4" />
                        ) : (
                          <ChevronDown className="ml-2 h-4 w-4" />
                        )
                      ) : (
                        <ArrowUpDown className="ml-2 h-4 w-4 opacity-50" />
                      )}
                    </Button>
                  ) : (
                    column.label
                  )}
                </TableHead>
              ))}
            </TableRow>
          </TableHeader>

          <TableBody>
            {sortedTickets.map((ticket) => (
              <TableRow
                key={ticket.id}
                onClick={() => onTicketClick?.(ticket)}
                className="cursor-pointer"
                data-state={
                  selectedTickets.includes(ticket.id) ? "selected" : undefined
                }
              >
                {userRole !== "user" && (
                  <TableCell>
                    <Checkbox
                      checked={selectedTickets.includes(ticket.id)}
                      onCheckedChange={(checked) => {
                        handleSelectTicket(ticket.id, checked as boolean);
                      }}
                      onClick={(e) => e.stopPropagation()}
                    />
                  </TableCell>
                )}
                {columns.map((column) => (
                  <TableCell key={column.key} className="text-blue">
                    {column.render
                      ? column.render(
                          ticket[column.key as keyof Ticket],
                          ticket
                        )
                      : String(ticket[column.key as keyof Ticket] || "")}
                  </TableCell>
                ))}
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>
    </div>
  );
}
