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

  const columns: Column[] = [
    {
      key: "title",
      label: "Title",
      sortable: true,
      render: (value, _ticket) => (
        <div className="min-w-0 max-w-xs">
          <p className="font-medium text-foreground truncate">{value}</p>
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
      key: "created_by",
      label: "Creator",
      sortable: true,
      render: (value, _ticket) => (
        <div className="flex items-center space-x-2">
          <div className="w-8 h-8 bg-primary rounded-full flex items-center justify-center text-primary-foreground text-xs font-medium">
            {value?.charAt(0)?.toUpperCase() || "U"}
          </div>
          <span className="text-sm text-muted-foreground truncate max-w-24">
            {value || "Unknown"}
          </span>
        </div>
      ),
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
            {onDelete && (
              <>
                <DropdownMenuSeparator />
                <DropdownMenuItem
                  onClick={(e) => {
                    e.stopPropagation();
                    onDelete(_ticket);
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
    <div className={`space-y-4 ${className}`}>
      {/* Table Header with Bulk Actions */}
      <div className="flex items-center justify-between">
        <div className="flex items-center space-x-4">
          <div className="flex items-center space-x-2">
            <Checkbox
              checked={selectedTickets.length === tickets.length}
              onCheckedChange={handleSelectAll}
            />
            <span className="text-sm text-muted-foreground">
              {selectedTickets.length > 0
                ? `${selectedTickets.length} selected`
                : `${tickets.length} tickets`}
            </span>
          </div>
        </div>

        {selectedTickets.length > 0 && (
          <div className="flex items-center space-x-2">
            <Button variant="outline" size="sm">
              Bulk Edit
            </Button>
            <Button
              variant="outline"
              size="sm"
              className="text-destructive hover:text-destructive"
            >
              Delete Selected
            </Button>
          </div>
        )}
      </div>

      {/* Table */}
      <div className="rounded-md border">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead className="w-12">{/* Checkbox column */}</TableHead>
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
                <TableCell>
                  <Checkbox
                    checked={selectedTickets.includes(ticket.id)}
                    onCheckedChange={(checked) => {
                      handleSelectTicket(ticket.id, checked as boolean);
                    }}
                    onClick={(e) => e.stopPropagation()}
                  />
                </TableCell>
                {columns.map((column) => (
                  <TableCell key={column.key}>
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
