import { Calendar, ChevronDown, Filter, User, X } from "lucide-react";
import { useState } from "react";
import type { TicketFilters } from "../lib/types";

interface FilterPanelProps {
  filters: TicketFilters;
  onFiltersChange: (filters: TicketFilters) => void;
  isOpen: boolean;
  onClose: () => void;
}

export default function FilterPanel({
  filters,
  onFiltersChange,
  isOpen,
  onClose,
}: FilterPanelProps) {
  const [localFilters, setLocalFilters] = useState(filters);

  const statusOptions: { value: string; label: string }[] = [
    { value: "all", label: "All Status" },
    { value: "open", label: "Open" },
    { value: "in_progress", label: "In Progress" },
    { value: "resolved", label: "Resolved" },
    { value: "reopened", label: "Reopened" },
    { value: "closed", label: "Closed" },
  ];

  const priorityOptions: { value: string; label: string }[] = [
    { value: "all", label: "All Priorities" },
    { value: "critical", label: "Critical" },
    { value: "high", label: "High" },
    { value: "medium", label: "Medium" },
    { value: "low", label: "Low" },
  ];

  const handleApplyFilters = () => {
    onFiltersChange(localFilters);
    onClose();
  };

  const handleResetFilters = () => {
    const resetFilters = { status: "all", priority: "all", search: "" };
    setLocalFilters(resetFilters);
    onFiltersChange(resetFilters);
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 overflow-hidden">
      {/* Backdrop */}
      <div
        className="absolute inset-0 bg-black/50"
        onClick={onClose}
      />

      {/* Panel */}
      <div className="absolute right-0 top-0 h-full w-96 bg-card shadow-2xl transform transition-transform border-l border-border">
        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b border-border">
          <div className="flex items-center space-x-3">
            <div className="w-10 h-10 bg-gradient-to-br from-primary to-primary/80 rounded-xl flex items-center justify-center">
              <Filter className="w-5 h-5 text-primary-foreground" />
            </div>
            <div>
              <h2 className="text-lg font-bold text-foreground">
                Filter Tickets
              </h2>
              <p className="text-sm text-muted-foreground">
                Refine your search results
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-2 text-muted-foreground hover:text-foreground hover:bg-muted rounded-xl transition-all"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Content */}
        <div className="p-6 space-y-8">
          {/* Status Filter */}
          <div>
            <label className="block text-sm font-semibold text-foreground mb-4">
              Status
            </label>
            <div className="space-y-3">
              {statusOptions.map((option) => (
                <label
                  key={option.value}
                  className="flex items-center space-x-3 cursor-pointer group"
                >
                  <input
                    type="radio"
                    name="status"
                    value={option.value}
                    checked={localFilters.status === option.value}
                    onChange={(e) =>
                      setLocalFilters({
                        ...localFilters,
                        status: e.target.value,
                      })
                    }
                    className="w-4 h-4 text-primary border-border focus:ring-primary"
                  />
                  <span className="text-sm font-medium text-muted-foreground group-hover:text-foreground transition-colors">
                    {option.label}
                  </span>
                </label>
              ))}
            </div>
          </div>

          {/* Priority Filter */}
          <div>
            <label className="block text-sm font-semibold text-foreground mb-4">
              Priority
            </label>
            <div className="space-y-3">
              {priorityOptions.map((option) => (
                <label
                  key={option.value}
                  className="flex items-center space-x-3 cursor-pointer group"
                >
                  <input
                    type="radio"
                    name="priority"
                    value={option.value}
                    checked={localFilters.priority === option.value}
                    onChange={(e) =>
                      setLocalFilters({
                        ...localFilters,
                        priority: e.target.value,
                      })
                    }
                    className="w-4 h-4 text-primary border-border focus:ring-primary"
                  />
                  <span className="text-sm font-medium text-muted-foreground group-hover:text-foreground transition-colors">
                    {option.label}
                  </span>
                </label>
              ))}
            </div>
          </div>

          {/* Date Range */}
          <div>
            <label className="block text-sm font-semibold text-foreground mb-4">
              Date Range
            </label>
            <div className="space-y-4">
              <div>
                <label className="block text-xs font-medium text-muted-foreground mb-2">
                  From
                </label>
                <div className="relative">
                  <Calendar className="absolute left-3 top-1/2 transform -translate-y-1/2 text-muted-foreground w-4 h-4" />
                  <input
                    type="date"
                    value={localFilters.date_from || ""}
                    onChange={(e) =>
                      setLocalFilters({
                        ...localFilters,
                        date_from: e.target.value,
                      })
                    }
                    className="w-full pl-10 pr-4 py-3 bg-muted/50 border border-border rounded-xl text-sm text-foreground focus:ring-2 focus:ring-primary focus:border-transparent transition-all"
                  />
                </div>
              </div>
              <div>
                <label className="block text-xs font-medium text-muted-foreground mb-2">
                  To
                </label>
                <div className="relative">
                  <Calendar className="absolute left-3 top-1/2 transform -translate-y-1/2 text-muted-foreground w-4 h-4" />
                  <input
                    type="date"
                    value={localFilters.date_to || ""}
                    onChange={(e) =>
                      setLocalFilters({
                        ...localFilters,
                        date_to: e.target.value,
                      })
                    }
                    className="w-full pl-10 pr-4 py-3 bg-muted/50 border border-border rounded-xl text-sm text-foreground focus:ring-2 focus:ring-primary focus:border-transparent transition-all"
                  />
                </div>
              </div>
            </div>
          </div>

          {/* Assignee */}
          <div>
            <label className="block text-sm font-semibold text-foreground mb-4">
              Assignee
            </label>
            <div className="relative">
              <User className="absolute left-3 top-1/2 transform -translate-y-1/2 text-muted-foreground w-4 h-4" />
              <select
                value={localFilters.assigned_to || "all"}
                onChange={(e) =>
                  setLocalFilters({
                    ...localFilters,
                    assigned_to:
                      e.target.value === "all" ? undefined : e.target.value,
                  })
                }
                className="w-full pl-10 pr-10 py-3 bg-muted/50 border border-border rounded-xl text-sm text-foreground focus:ring-2 focus:ring-primary focus:border-transparent transition-all appearance-none"
              >
                <option value="all">All Assignees</option>
                <option value="unassigned">Unassigned</option>
                <option value="john-doe">John Doe</option>
                <option value="jane-smith">Jane Smith</option>
              </select>
              <ChevronDown className="absolute right-3 top-1/2 transform -translate-y-1/2 text-muted-foreground w-4 h-4 pointer-events-none" />
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="absolute bottom-0 left-0 right-0 p-6 bg-muted/30 border-t border-border">
          <div className="flex space-x-3">
            <button
              onClick={handleResetFilters}
              className="flex-1 px-4 py-3 text-muted-foreground bg-card border border-border rounded-xl font-semibold hover:bg-muted transition-all"
            >
              Reset
            </button>
            <button
              onClick={handleApplyFilters}
              className="flex-1 px-4 py-3 bg-primary hover:bg-primary/90 text-primary-foreground rounded-xl font-semibold transition-all shadow-lg hover:shadow-xl"
            >
              Apply Filters
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
